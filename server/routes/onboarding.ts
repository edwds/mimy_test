import { Router } from "express";
import { db } from "../db/index.js";
import { shops, users, users_ranking, taste_analyses, hate_result, hate_prop, shop_naver_briefing } from "../db/schema.js";
import { eq, or, sql, and, asc } from "drizzle-orm";
import { requireAuth } from "../middleware/auth.js";
import { extractRestaurantNames, generateTasteAnalysis, type TasteAnalysisInput } from "../utils/gemini.js";
import { calculateTasteType, getTasteTypeProfile, type TasteScores } from "../utils/tasteType.js";
import crypto from "crypto";

const router = Router();

/**
 * POST /api/onboarding/analyze-screenshots
 * Analyze reservation screenshots using Gemini Vision to extract restaurant names.
 */
router.post("/analyze-screenshots", requireAuth, async (req, res) => {
    try {
        const { imageUrls } = req.body;

        if (!imageUrls || !Array.isArray(imageUrls) || imageUrls.length === 0) {
            return res.status(400).json({ error: "imageUrls array is required" });
        }

        if (imageUrls.length > 30) {
            return res.status(400).json({ error: "Maximum 30 images allowed" });
        }

        console.log(`[onboarding] Analyzing ${imageUrls.length} screenshots for user ${req.user!.id}`);

        // Process in batches of 5 to avoid Gemini API limits
        const BATCH_SIZE = 5;
        const allNames: string[] = [];

        for (let i = 0; i < imageUrls.length; i += BATCH_SIZE) {
            const batch = imageUrls.slice(i, i + BATCH_SIZE);
            console.log(`[onboarding] Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(imageUrls.length / BATCH_SIZE)} (${batch.length} images)`);
            const batchNames = await extractRestaurantNames(batch);
            allNames.push(...batchNames);
        }

        // Deduplicate names
        const extractedNames = [...new Set(allNames)];

        console.log(`[onboarding] Extracted ${extractedNames.length} unique restaurant names:`, extractedNames);

        res.json({ extractedNames });
    } catch (error) {
        console.error("[onboarding] Screenshot analysis error:", error);
        res.status(500).json({ error: "Failed to analyze screenshots" });
    }
});

/**
 * POST /api/onboarding/match-shops
 * Match extracted restaurant names against the shops database.
 */
router.post("/match-shops", requireAuth, async (req, res) => {
    try {
        const { names, catchtableRefs } = req.body;

        if (!names || !Array.isArray(names) || names.length === 0) {
            return res.status(400).json({ error: "names array is required" });
        }

        // Build a lookup map from name → shopRef for catchtable matching
        const refMap = new Map<string, string>();
        if (Array.isArray(catchtableRefs)) {
            for (const ref of catchtableRefs) {
                if (ref.name && ref.shopRef) {
                    refMap.set(ref.name, ref.shopRef);
                }
            }
        }

        const shopFields = {
            id: shops.id,
            name: shops.name,
            food_kind: shops.food_kind,
            thumbnail_img: shops.thumbnail_img,
            address_full: shops.address_full,
        };

        const matches: Array<{
            extractedName: string;
            matched: boolean;
            shop: {
                id: number;
                name: string;
                food_kind: string | null;
                thumbnail_img: string | null;
                address_full: string | null;
            } | null;
        }> = [];

        for (const name of names) {
            const normalizedName = name.replace(/\s+/g, '');
            let results: typeof matches[0]['shop'][] = [];

            // Priority 0: catchtable_ref exact match
            const shopRef = refMap.get(name);
            if (shopRef) {
                results = await db.select(shopFields)
                    .from(shops)
                    .where(eq(shops.catchtable_ref, shopRef))
                    .limit(1);
            }

            // Priority 1: Exact match (space-normalized, case-insensitive)
            if (results.length === 0) {
                results = await db.select(shopFields)
                    .from(shops)
                    .where(sql`REPLACE(${shops.name}, ' ', '') ILIKE ${normalizedName}`)
                    .limit(1);
            }

            // Priority 2: Partial match (extracted name in DB name)
            if (results.length === 0) {
                results = await db.select(shopFields)
                    .from(shops)
                    .where(sql`REPLACE(${shops.name}, ' ', '') ILIKE ${'%' + normalizedName + '%'}`)
                    .limit(1);
            }

            // Priority 3: Reverse partial match (DB name in extracted name)
            if (results.length === 0) {
                results = await db.select(shopFields)
                    .from(shops)
                    .where(sql`${normalizedName} ILIKE '%' || REPLACE(${shops.name}, ' ', '') || '%'`)
                    .limit(1);
            }

            matches.push({
                extractedName: name,
                matched: results.length > 0,
                shop: results.length > 0 ? results[0] : null,
            });
        }

        res.json({ matches });
    } catch (error) {
        console.error("[onboarding] Shop matching error:", error);
        res.status(500).json({ error: "Failed to match shops" });
    }
});

/**
 * POST /api/onboarding/taste-analysis
 * Generate a detailed taste analysis using Gemini, save to DB, and return share code.
 */
router.post("/taste-analysis", requireAuth, async (req, res) => {
    try {
        const userId = req.user!.id;

        // Get user's taste result
        const [user] = await db.select({
            taste_result: users.taste_result,
        })
            .from(users)
            .where(eq(users.id, userId));

        if (!user?.taste_result) {
            return res.status(400).json({ error: "No taste result found. Please complete the quiz first." });
        }

        const tasteResult = user.taste_result as any;
        const scores: TasteScores = tasteResult.scores || {};

        // Calculate taste type
        const tasteType = tasteResult.tasteType || calculateTasteType(scores);
        const tasteProfile = getTasteTypeProfile(tasteType, 'ko');

        if (!tasteProfile) {
            return res.status(400).json({ error: "Invalid taste type" });
        }

        // Get user's ranked shops with naver briefing
        const rankedShops = await db.select({
            name: shops.name,
            food_kind: shops.food_kind,
            description: shops.description,
            address_region: shops.address_region,
            satisfaction_tier: users_ranking.satisfaction_tier,
            rank: users_ranking.rank,
            briefing: shop_naver_briefing.briefing_text,
        })
            .from(users_ranking)
            .innerJoin(shops, eq(users_ranking.shop_id, shops.id))
            .leftJoin(shop_naver_briefing, eq(shops.id, shop_naver_briefing.shop_id))
            .where(eq(users_ranking.user_id, userId))
            .orderBy(asc(users_ranking.rank))
            .limit(30);

        // Get user's hated foods
        const hateItems = await db.select({ item: hate_prop.item })
            .from(hate_result)
            .innerJoin(hate_prop, eq(hate_result.prop_id, hate_prop.id))
            .where(and(eq(hate_result.user_id, userId), eq(hate_result.selection, 'NOT_EAT')));
        const hatedFoods = hateItems.map(h => h.item);

        // Generate LLM analysis
        const analysisInput: TasteAnalysisInput = {
            tasteType: {
                fullType: tasteType.fullType,
                baseCode: tasteType.baseCode,
                subtype: tasteType.subtype,
            },
            tasteProfile,
            scores,
            rankedShops: rankedShops.map(s => ({
                name: s.name,
                food_kind: s.food_kind,
                description: s.description,
                address_region: s.address_region,
                satisfaction_tier: s.satisfaction_tier,
                rank: s.rank,
                briefing: s.briefing,
            })),
            hatedFoods,
        };

        console.log(`[onboarding] Generating taste analysis for user ${userId}`);
        const analysis = await generateTasteAnalysis(analysisInput);

        // Match recommendation names against shops DB
        const matchedRecommendations = await Promise.all(
            analysis.recommendations.map(async (rec) => {
                const normalizedName = rec.name.replace(/\s+/g, '');
                const address = rec.address || '';
                const shopFields = {
                    id: shops.id,
                    name: shops.name,
                    food_kind: shops.food_kind,
                    thumbnail_img: shops.thumbnail_img,
                };

                // Priority 1: Name + address match
                let results: typeof matchedRecommendations extends Promise<(infer R)[]> ? any[] : any[] = [];
                if (address) {
                    results = await db.select(shopFields)
                        .from(shops)
                        .where(and(
                            sql`REPLACE(${shops.name}, ' ', '') ILIKE ${normalizedName}`,
                            sql`${shops.address_full} ILIKE ${'%' + address.replace(/\s+/g, '%') + '%'}`
                        ))
                        .limit(1);
                }

                // Priority 2: Exact name match
                if (results.length === 0) {
                    results = await db.select(shopFields)
                        .from(shops)
                        .where(sql`REPLACE(${shops.name}, ' ', '') ILIKE ${normalizedName}`)
                        .limit(1);
                }

                // Priority 3: Partial name match (LLM name in DB name)
                if (results.length === 0) {
                    results = await db.select(shopFields)
                        .from(shops)
                        .where(sql`REPLACE(${shops.name}, ' ', '') ILIKE ${'%' + normalizedName + '%'}`)
                        .limit(1);
                }

                // Priority 4: Reverse partial match (DB name in LLM name)
                if (results.length === 0) {
                    results = await db.select(shopFields)
                        .from(shops)
                        .where(sql`${normalizedName} ILIKE '%' || REPLACE(${shops.name}, ' ', '') || '%'`)
                        .limit(1);
                }

                // Priority 5: Strip common suffixes (본점, 강남점, etc.) and retry
                if (results.length === 0) {
                    const stripped = normalizedName.replace(/(본점|강남점|역삼점|신사점|청담점|압구정점|서울점|홍대점|이태원점|한남점|성수점|삼성점|잠실점|여의도점|판교점|분당점)$/, '');
                    if (stripped !== normalizedName && stripped.length >= 2) {
                        results = await db.select(shopFields)
                            .from(shops)
                            .where(sql`REPLACE(${shops.name}, ' ', '') ILIKE ${'%' + stripped + '%'}`)
                            .limit(1);
                    }
                }

                return {
                    name: rec.name,
                    reason: rec.reason,
                    shop: results.length > 0 ? results[0] : null,
                };
            })
        );

        // Generate unique share code
        const shareCode = crypto.randomBytes(6).toString('base64url').slice(0, 8);

        // Save or update analysis
        const existing = await db.select({ id: taste_analyses.id })
            .from(taste_analyses)
            .where(eq(taste_analyses.user_id, userId))
            .limit(1);

        if (existing.length > 0) {
            await db.update(taste_analyses)
                .set({
                    taste_type: tasteType.fullType,
                    taste_scores: scores,
                    ranked_shops_summary: rankedShops.slice(0, 20),
                    analysis,
                    share_code: shareCode,
                    updated_at: new Date(),
                })
                .where(eq(taste_analyses.user_id, userId));
        } else {
            await db.insert(taste_analyses).values({
                user_id: userId,
                share_code: shareCode,
                taste_type: tasteType.fullType,
                taste_scores: scores,
                ranked_shops_summary: rankedShops.slice(0, 20),
                analysis,
            });
        }

        console.log(`[onboarding] Taste analysis saved for user ${userId}, shareCode: ${shareCode}`);

        res.json({
            analysis,
            matchedRecommendations,
            shareCode,
            tasteType: {
                fullType: tasteType.fullType,
                baseCode: tasteType.baseCode,
                subtype: tasteType.subtype,
            },
            tasteProfile,
        });
    } catch (error) {
        console.error("[onboarding] Taste analysis error:", error);
        res.status(500).json({ error: "Failed to generate taste analysis" });
    }
});

/**
 * GET /api/onboarding/taste/:code
 * Public endpoint to get shared taste analysis data.
 */
router.get("/taste/:code", async (req, res) => {
    try {
        const { code } = req.params;

        const [result] = await db.select({
            taste_type: taste_analyses.taste_type,
            taste_scores: taste_analyses.taste_scores,
            ranked_shops_summary: taste_analyses.ranked_shops_summary,
            analysis: taste_analyses.analysis,
            user_nickname: users.nickname,
            user_profile_image: users.profile_image,
            created_at: taste_analyses.created_at,
        })
            .from(taste_analyses)
            .innerJoin(users, eq(taste_analyses.user_id, users.id))
            .where(eq(taste_analyses.share_code, code))
            .limit(1);

        if (!result) {
            return res.status(404).json({ error: "Taste analysis not found" });
        }

        // Calculate taste type info for response
        const tasteProfile = getTasteTypeProfile(result.taste_type.split('-')[0], 'ko');
        const tasteProfileEn = getTasteTypeProfile(result.taste_type.split('-')[0], 'en');

        // Match recommendation names against shops DB
        const analysisData = result.analysis as any;
        const recs = Array.isArray(analysisData?.recommendations) ? analysisData.recommendations : [];
        const matchedRecommendations = await Promise.all(
            recs.map(async (rec: any) => {
                const name = rec.name || rec;
                const reason = rec.reason || '';
                const address = rec.address || '';
                const normalizedName = String(name).replace(/\s+/g, '');
                const shopFields = {
                    id: shops.id,
                    name: shops.name,
                    food_kind: shops.food_kind,
                    thumbnail_img: shops.thumbnail_img,
                };

                // Priority 1: Name + address
                let results: any[] = [];
                if (address) {
                    results = await db.select(shopFields)
                        .from(shops)
                        .where(and(
                            sql`REPLACE(${shops.name}, ' ', '') ILIKE ${normalizedName}`,
                            sql`${shops.address_full} ILIKE ${'%' + address.replace(/\s+/g, '%') + '%'}`
                        ))
                        .limit(1);
                }

                // Priority 2: Exact name
                if (results.length === 0) {
                    results = await db.select(shopFields)
                        .from(shops)
                        .where(sql`REPLACE(${shops.name}, ' ', '') ILIKE ${normalizedName}`)
                        .limit(1);
                }

                // Priority 3: Partial match
                if (results.length === 0) {
                    results = await db.select(shopFields)
                        .from(shops)
                        .where(sql`REPLACE(${shops.name}, ' ', '') ILIKE ${'%' + normalizedName + '%'}`)
                        .limit(1);
                }

                // Priority 4: Reverse partial
                if (results.length === 0) {
                    results = await db.select(shopFields)
                        .from(shops)
                        .where(sql`${normalizedName} ILIKE '%' || REPLACE(${shops.name}, ' ', '') || '%'`)
                        .limit(1);
                }

                // Priority 5: Strip suffixes
                if (results.length === 0) {
                    const stripped = normalizedName.replace(/(본점|강남점|역삼점|신사점|청담점|압구정점|서울점|홍대점|이태원점|한남점|성수점|삼성점|잠실점|여의도점|판교점|분당점)$/, '');
                    if (stripped !== normalizedName && stripped.length >= 2) {
                        results = await db.select(shopFields)
                            .from(shops)
                            .where(sql`REPLACE(${shops.name}, ' ', '') ILIKE ${'%' + stripped + '%'}`)
                            .limit(1);
                    }
                }

                return { name, reason, shop: results.length > 0 ? results[0] : null };
            })
        );

        res.json({
            tasteType: result.taste_type,
            tasteScores: result.taste_scores,
            rankedShopsSummary: result.ranked_shops_summary,
            analysis: result.analysis,
            matchedRecommendations,
            tasteProfile,
            tasteProfileEn,
            user: {
                nickname: result.user_nickname,
                profile_image: result.user_profile_image,
            },
            createdAt: result.created_at,
        });
    } catch (error) {
        console.error("[onboarding] Get taste share error:", error);
        res.status(500).json({ error: "Failed to get taste analysis" });
    }
});

export default router;
