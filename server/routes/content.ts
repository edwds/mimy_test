
import { Router } from "express";
import { db } from "../db/index.js";
import { content, users_ranking, shops } from "../db/schema.js";
import { eq, desc, inArray, and, gt, gte, ne, sql } from "drizzle-orm";

const router = Router();

// POST /api/content (Create Review/Post)
router.post("/", async (req, res) => {
    try {
        const { user_id, type, text, img, video, review_prop, keyword } = req.body;

        // Validation
        if (!user_id || !type) {
            return res.status(400).json({ error: "user_id and type are required" });
        }

        // Insert content
        const result = await db.insert(content).values({
            user_id,
            type, // 'review' or 'post'
            text,
            img,
            video,
            review_prop, // { shop_id, visit_date, companions, satisfaction }
            keyword,
        }).returning();

        res.json(result[0]);
    } catch (error) {
        console.error("Create content error:", error);
        res.status(500).json({ error: "Failed to create content" });
    }
});

// Helper
function mapSatisfactionToTier(satisfaction: string): number {
    switch (satisfaction) {
        case 'best': return 3;
        case 'good': return 2;
        case 'ok': return 1;
        case 'bad': return 0;
        default: return 2; // Default to 'good'
    }
}

// POST /api/content/ranking/apply (Apply Ranking with Dense Rank Logic)
router.post("/ranking/apply", async (req, res) => {
    try {
        const { user_id, shop_id, insert_index } = req.body;

        if (!user_id || !shop_id || insert_index === undefined) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        // 1. Determine Satisfaction Tier from Latest Content
        // Find latest review for this user/shop
        const latestContent = await db.select().from(content)
            .where(
                and(
                    eq(content.user_id, user_id),
                    eq(content.type, 'review')
                )
            )
            .orderBy(desc(content.created_at))
            .limit(10); // Check recent few to find matching shop_id

        let satisfaction = 'good'; // default
        for (const c of latestContent) {
            const prop = c.review_prop as any;
            if (prop && Number(prop.shop_id) === Number(shop_id)) {
                if (prop.satisfaction) satisfaction = prop.satisfaction;
                break;
            }
        }

        const new_tier = mapSatisfactionToTier(satisfaction);
        const new_rank = insert_index + 1; // 1-based rank

        // 2. Execute Transaction
        await db.transaction(async (tx) => {
            // Check existing ranking
            const existing = await tx.select().from(users_ranking)
                .where(
                    and(
                        eq(users_ranking.user_id, user_id),
                        eq(users_ranking.shop_id, shop_id)
                    )
                ).limit(1);

            if (existing.length > 0) {
                const old_tier = existing[0].satisfaction_tier;
                const old_rank = existing[0].rank;

                // Case B: Existing row exists
                // 1. Remove temporarily (to avoid unique constraint during shift)
                await tx.delete(users_ranking)
                    .where(eq(users_ranking.id, existing[0].id));

                // 2. Close gap in OLD group
                await tx.update(users_ranking)
                    .set({ rank: sql`${users_ranking.rank} - 1` })
                    .where(
                        and(
                            eq(users_ranking.user_id, user_id),
                            eq(users_ranking.satisfaction_tier, old_tier),
                            gt(users_ranking.rank, old_rank)
                        )
                    );

                // 3. Open gap in NEW group
                // Note: If old_tier == new_tier, logic still holds because we deleted the row first.
                await tx.update(users_ranking)
                    .set({ rank: sql`${users_ranking.rank} + 1` })
                    .where(
                        and(
                            eq(users_ranking.user_id, user_id),
                            eq(users_ranking.satisfaction_tier, new_tier),
                            gte(users_ranking.rank, new_rank)
                        )
                    );

                // 4. Insert at new position
                await tx.insert(users_ranking).values({
                    user_id,
                    shop_id,
                    satisfaction_tier: new_tier,
                    rank: new_rank
                });

            } else {
                // Case A: New shop
                // 1. Shift down items in target group
                await tx.update(users_ranking)
                    .set({ rank: sql`${users_ranking.rank} + 1` })
                    .where(
                        and(
                            eq(users_ranking.user_id, user_id),
                            eq(users_ranking.satisfaction_tier, new_tier),
                            gte(users_ranking.rank, new_rank)
                        )
                    );

                // 2. Insert new row
                await tx.insert(users_ranking).values({
                    user_id,
                    shop_id,
                    satisfaction_tier: new_tier,
                    rank: new_rank
                });
            }
        });

        res.json({ success: true, shop_id, satisfaction_tier: new_tier, rank: new_rank });

    } catch (error) {
        console.error("Ranking apply error:", error);
        res.status(500).json({ error: "Failed to apply ranking" });
    }
});

// GET /api/content/ranking/candidates (Fetch candidates for tournament)
router.get("/ranking/candidates", async (req, res) => {
    try {
        const { user_id, satisfaction, satisfaction_tier, exclude_shop_id } = req.query;
        if (!user_id) {
            return res.status(400).json({ error: "Missing parameters" });
        }

        const userId = parseInt(user_id as string);
        let tier = 2; // Default good

        if (satisfaction_tier) {
            tier = parseInt(satisfaction_tier as string);
        } else if (satisfaction) {
            tier = mapSatisfactionToTier(satisfaction as string);
        }

        const excludeId = exclude_shop_id ? parseInt(exclude_shop_id as string) : -1;

        // Fetch rankings directly from users_ranking
        const candidates = await db.select({
            shop_id: users_ranking.shop_id,
            rank: users_ranking.rank,
            shop_name: shops.name,
            food_kind: shops.food_kind
        })
            .from(users_ranking)
            .leftJoin(shops, eq(users_ranking.shop_id, shops.id))
            .where(
                and(
                    eq(users_ranking.user_id, userId),
                    eq(users_ranking.satisfaction_tier, tier),
                    ne(users_ranking.shop_id, excludeId)
                )
            )
            .orderBy(users_ranking.rank);

        res.json(candidates);
    } catch (error) {
        console.error("Fetch ranking candidates error:", error);
        res.status(500).json({ error: "Failed to fetch candidates" });
    }
});


// GET /api/content/user/:userId
router.get("/user/:userId", async (req, res) => {
    try {
        const userId = parseInt(req.params.userId);
        if (isNaN(userId)) {
            return res.status(400).json({ error: "Invalid user ID" });
        }

        // 1. Fetch content
        const userContent = await db.select().from(content)
            .where(eq(content.user_id, userId))
            .orderBy(desc(content.created_at)) // Latest first
            .limit(20);

        if (userContent.length === 0) {
            return res.json([]);
        }

        // 2. Collect Shop IDs
        const shopIds = new Set<number>();
        userContent.forEach(item => {
            if (item.type === 'review' && item.review_prop) {
                const prop = item.review_prop as any;
                if (prop.shop_id) shopIds.add(prop.shop_id);
            }
        });

        // 3. Fetch Shops and Rankings
        const shopMap = new Map();
        const rankMap = new Map<number, number>();

        if (shopIds.size > 0) {
            const idsList = Array.from(shopIds);

            // Shops
            const shopList = await db.select().from(shops)
                .where(inArray(shops.id, idsList));
            shopList.forEach(shop => shopMap.set(shop.id, shop));

            // Rankings
            const rankingList = await db.select().from(users_ranking)
                .where(
                    and(
                        eq(users_ranking.user_id, userId),
                        inArray(users_ranking.shop_id, idsList)
                    )
                );
            rankingList.forEach(r => rankMap.set(r.shop_id, r.rank));
        }

        // 4. Transform Data
        const result = userContent.map(item => {
            let enrichedProp = item.review_prop as any;
            if (item.type === 'review' && enrichedProp?.shop_id && shopMap.has(enrichedProp.shop_id)) {
                const shop = shopMap.get(enrichedProp.shop_id);
                const rank = rankMap.get(enrichedProp.shop_id);

                enrichedProp = {
                    ...enrichedProp,
                    shop_name: shop.name,
                    shop_address: shop.address_region || shop.address_full,
                    thumbnail_img: shop.thumbnail_img,
                    rank: rank || null, // Add rank
                    // satisfaction is already in enrichedProp from DB JSON
                };
            }

            return {
                id: item.id,
                text: item.text,
                images: item.img || [], // Assuming jsonb stores string[]
                created_at: item.created_at,
                type: item.type,
                review_prop: enrichedProp,
                stats: {
                    likes: 0, // Mock stats for now
                    comments: 0,
                    is_liked: false,
                    is_saved: false
                }
            };
        });

        res.json(result);
    } catch (error) {
        console.error("Fetch user content error:", error);
        res.status(500).json({ error: "Failed to fetch content" });
    }
});

export default router;
