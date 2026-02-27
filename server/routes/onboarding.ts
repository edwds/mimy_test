import { Router } from "express";
import { db } from "../db/index.js";
import { shops, users, users_ranking, taste_analyses } from "../db/schema.js";
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

        if (imageUrls.length > 5) {
            return res.status(400).json({ error: "Maximum 5 images allowed" });
        }

        console.log(`[onboarding] Analyzing ${imageUrls.length} screenshots for user ${req.user!.id}`);

        const extractedNames = await extractRestaurantNames(imageUrls);

        console.log(`[onboarding] Extracted ${extractedNames.length} restaurant names:`, extractedNames);

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
        const { names } = req.body;

        if (!names || !Array.isArray(names) || names.length === 0) {
            return res.status(400).json({ error: "names array is required" });
        }

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

            // Priority 1: Exact match (space-normalized, case-insensitive)
            let results = await db.select({
                id: shops.id,
                name: shops.name,
                food_kind: shops.food_kind,
                thumbnail_img: shops.thumbnail_img,
                address_full: shops.address_full,
            })
                .from(shops)
                .where(sql`REPLACE(${shops.name}, ' ', '') ILIKE ${normalizedName}`)
                .limit(1);

            // Priority 2: Partial match (extracted name in DB name)
            if (results.length === 0) {
                results = await db.select({
                    id: shops.id,
                    name: shops.name,
                    food_kind: shops.food_kind,
                    thumbnail_img: shops.thumbnail_img,
                    address_full: shops.address_full,
                })
                    .from(shops)
                    .where(sql`REPLACE(${shops.name}, ' ', '') ILIKE ${'%' + normalizedName + '%'}`)
                    .limit(1);
            }

            // Priority 3: Reverse partial match (DB name in extracted name)
            if (results.length === 0) {
                results = await db.select({
                    id: shops.id,
                    name: shops.name,
                    food_kind: shops.food_kind,
                    thumbnail_img: shops.thumbnail_img,
                    address_full: shops.address_full,
                })
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

        // Get user's ranked shops
        const rankedShops = await db.select({
            name: shops.name,
            food_kind: shops.food_kind,
            satisfaction_tier: users_ranking.satisfaction_tier,
            rank: users_ranking.rank,
        })
            .from(users_ranking)
            .innerJoin(shops, eq(users_ranking.shop_id, shops.id))
            .where(eq(users_ranking.user_id, userId))
            .orderBy(asc(users_ranking.rank));

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
                satisfaction_tier: s.satisfaction_tier,
                rank: s.rank,
            })),
        };

        console.log(`[onboarding] Generating taste analysis for user ${userId}`);
        const analysis = await generateTasteAnalysis(analysisInput);

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

        res.json({
            tasteType: result.taste_type,
            tasteScores: result.taste_scores,
            rankedShopsSummary: result.ranked_shops_summary,
            analysis: result.analysis,
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
