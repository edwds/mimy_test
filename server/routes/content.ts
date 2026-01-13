
import { Router } from "express";
import { db } from "../db/index.js";
import { content, users_ranking, shops, users } from "../db/schema.js";
import { eq, desc, inArray, and, gt, gte, ne, sql } from "drizzle-orm";

const router = Router();

// GET /api/content/feed
router.get("/feed", async (req, res) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const offset = (page - 1) * limit;

        // 1. Fetch Content + User Info
        const feedItems = await db.select({
            id: content.id,
            user_id: content.user_id,
            type: content.type,
            text: content.text,
            img: content.img,
            created_at: content.created_at,
            review_prop: content.review_prop,
            keyword: content.keyword,
            user: {
                nickname: users.nickname,
                account_id: users.account_id,
                profile_image: users.profile_image
            }
        })
            .from(content)
            .leftJoin(users, eq(content.user_id, users.id))
            .orderBy(desc(content.created_at))
            .limit(limit)
            .offset(offset);

        // 2. Collect IDs for enrichment
        const shopIds = new Set<number>();
        const userIds = new Set<number>();

        feedItems.forEach(item => {
            if (item.type === 'review' && item.review_prop) {
                const prop = item.review_prop as any;
                if (prop.shop_id) {
                    shopIds.add(Number(prop.shop_id));
                    userIds.add(item.user_id);
                }
            }
        });

        // 3. Batch Fetch Shops, Rankings, VisitCounts
        const shopMap = new Map();
        const rankMap = new Map<string, number>(); // key: `${userId}-${shopId}`
        const visitCountMap = new Map<string, number>(); // key: `${userId}-${shopId}`

        if (shopIds.size > 0) {
            const sIds = Array.from(shopIds);
            const uIds = Array.from(userIds);

            // Shops
            const shopList = await db.select().from(shops).where(inArray(shops.id, sIds));
            shopList.forEach(s => shopMap.set(s.id, s));

            // Rankings (Current rank for each user-shop pair)
            const rankings = await db.select().from(users_ranking)
                .where(and(
                    inArray(users_ranking.user_id, uIds),
                    inArray(users_ranking.shop_id, sIds)
                ));
            rankings.forEach(r => rankMap.set(`${r.user_id}-${r.shop_id}`, r.rank));

            // Visit Counts
            // Efficient aggregation: Group by user_id, shop_id
            // Since Drizzle simple aggregations are tricky with specific filters, 
            // we'll fetch relevant reviews OR use a raw query.
            // For MVP simplicity and small batch size (20 items * users), let's just count in memory from metadata 
            // BUT we need total count, not just what's in the feed.
            // Let's use a simpler approach: Select count per user/shop from content table.
            // "SELECT user_id, review_prop->>'shop_id', count(*) FROM content WHERE ..."

            // To avoid complex raw SQL right now, let's just fetch ALL reviews for these users/shops (might be heavy later)
            // Better: select ID and props only
            const allRelevantReviews = await db.select({
                user_id: content.user_id,
                prop: content.review_prop
            }).from(content)
                .where(and(
                    inArray(content.user_id, uIds),
                    eq(content.type, 'review')
                ));

            allRelevantReviews.forEach(r => {
                const p = r.prop as any;
                if (p && p.shop_id && sIds.includes(Number(p.shop_id))) {
                    const key = `${r.user_id}-${p.shop_id}`;
                    visitCountMap.set(key, (visitCountMap.get(key) || 0) + 1);
                }
            });
        }

        // 4. Enrich
        const result = feedItems.map(item => {
            let enrichedProp = item.review_prop as any;

            if (item.type === 'review' && enrichedProp?.shop_id) {
                const sid = Number(enrichedProp.shop_id);
                const shop = shopMap.get(sid);
                const rank = rankMap.get(`${item.user_id}-${sid}`);
                const visitCount = visitCountMap.get(`${item.user_id}-${sid}`) || 1;

                if (shop) {
                    enrichedProp = {
                        ...enrichedProp,
                        shop_name: shop.name,
                        shop_address: shop.address_region || shop.address_full,
                        thumbnail_img: shop.thumbnail_img,
                        rank: rank || null,
                        visit_count: visitCount
                    };
                }
            }

            return {
                id: item.id,
                user: item.user || { nickname: 'Unknown', account_id: 'unknown', profile_image: null },
                text: item.text,
                images: item.img || [],
                created_at: item.created_at,
                type: item.type,
                review_prop: enrichedProp,
                stats: {
                    likes: 0,
                    comments: 0,
                    is_liked: false,
                    is_saved: false
                }
            };
        });

        res.json(result);

    } catch (error) {
        console.error("Feed error:", error);
        res.status(500).json({ error: "Failed to fetch feed" });
    }
});

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
        let { satisfaction } = req.body; // Allow satisfaction to be passed

        if (!user_id || !shop_id || insert_index === undefined) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        // 1. Determine Satisfaction Tier
        if (!satisfaction) {
            // Fallback: Find latest review for this user/shop
            const latestContent = await db.select().from(content)
                .where(
                    and(
                        eq(content.user_id, user_id),
                        eq(content.type, 'review')
                    )
                )
                .orderBy(desc(content.created_at))
                .limit(10);

            satisfaction = 'good'; // default
            for (const c of latestContent) {
                const prop = c.review_prop as any;
                if (prop && Number(prop.shop_id) === Number(shop_id)) {
                    if (prop.satisfaction) satisfaction = prop.satisfaction;
                    break;
                }
            }
        }

        const new_tier = mapSatisfactionToTier(satisfaction);

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

            // A. If exists, remove it first to handle "Move" logic cleanly
            // (Closing the gap from old position)
            if (existing.length > 0) {
                const old_rank = existing[0].rank;

                await tx.delete(users_ranking)
                    .where(eq(users_ranking.id, existing[0].id));

                // Close gap (Global Shift Up)
                await tx.update(users_ranking)
                    .set({ rank: sql`${users_ranking.rank} - 1` })
                    .where(
                        and(
                            eq(users_ranking.user_id, user_id),
                            gt(users_ranking.rank, old_rank)
                        )
                    );
            }

            // B. Calculate New Global Rank
            // 1. Count items in HIGHER tiers
            const higherTierCountRes = await tx.select({ count: sql<number>`count(*)` })
                .from(users_ranking)
                .where(
                    and(
                        eq(users_ranking.user_id, user_id),
                        gt(users_ranking.satisfaction_tier, new_tier)
                    )
                );
            const higherTierCount = Number(higherTierCountRes[0]?.count || 0);

            // 2. Target Rank = (Count of higher tiers) + (Index in current tier) + 1
            // Note: insert_index is 0-based index WITHIN the tier (from frontend tournament)
            const new_global_rank = higherTierCount + insert_index + 1;

            // C. Open Gap (Global Shift Down) at new position
            await tx.update(users_ranking)
                .set({ rank: sql`${users_ranking.rank} + 1` })
                .where(
                    and(
                        eq(users_ranking.user_id, user_id),
                        gte(users_ranking.rank, new_global_rank)
                    )
                );

            // D. Insert at new global position
            await tx.insert(users_ranking).values({
                user_id,
                shop_id,
                satisfaction_tier: new_tier,
                rank: new_global_rank
            });
        });

        res.json({ success: true, shop_id, satisfaction_tier: new_tier });

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
        const visitCountMap = new Map<number, number>();

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

            // Visit Counts (based on review content)
            const reviews = await db.select({
                prop: content.review_prop
            }).from(content)
                .where(
                    and(
                        eq(content.user_id, userId),
                        eq(content.type, 'review')
                    )
                );

            reviews.forEach(r => {
                const p = r.prop as any;
                if (p && p.shop_id) {
                    const sid = Number(p.shop_id);
                    if (idsList.includes(sid)) {
                        visitCountMap.set(sid, (visitCountMap.get(sid) || 0) + 1);
                    }
                }
            });
        }

        // 4. Transform Data
        const result = userContent.map(item => {
            let enrichedProp = item.review_prop as any;
            if (item.type === 'review' && enrichedProp?.shop_id && shopMap.has(enrichedProp.shop_id)) {
                const shop = shopMap.get(enrichedProp.shop_id);
                const rank = rankMap.get(enrichedProp.shop_id);
                const visitCount = visitCountMap.get(enrichedProp.shop_id) || 1;

                enrichedProp = {
                    ...enrichedProp,
                    shop_name: shop.name,
                    shop_address: shop.address_region || shop.address_full,
                    thumbnail_img: shop.thumbnail_img,
                    rank: rank || null, // Add rank
                    visit_count: visitCount
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
