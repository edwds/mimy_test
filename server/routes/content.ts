
import { Router } from "express";
import { db } from "../db/index.js";
import { users, shops, content, comments, likes, users_ranking, users_wantstogo, clusters } from "../db/schema.js";
import { eq, desc, and, sql, not, count, ilike, or, inArray, gt, gte, ne, lte } from "drizzle-orm";

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
                id: users.id,
                nickname: users.nickname,
                account_id: users.account_id,
                profile_image: users.profile_image,
                cluster_name: clusters.name
            }
        })
            .from(content)
            .leftJoin(users, eq(content.user_id, users.id))
            .leftJoin(clusters, sql`CAST(${users.taste_cluster} AS INTEGER) = ${clusters.cluster_id} `)
            .where(and(
                eq(content.is_deleted, false),
                eq(content.visibility, true)
            ))
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
        const rankMap = new Map<string, number>(); // key: `${ userId } -${ shopId } `
        // Refactored: visitCountMap removed, using contentVisitRankMap
        const contentVisitRankMap = new Map<number, number>(); // contentId -> Nth visit

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
            rankings.forEach(r => rankMap.set(`${r.user_id} -${r.shop_id} `, r.rank));

            // Visit Counts (Ordinal Logic) - Optimized with Parallel Queries (Postgres Compatible)
            // Reverting from Window Function to 20 parallel COUNT queries for Safety & Stability.
            // 20 small queries is very fast and avoids complex SQL casting errors.

            const visitCountPromises = feedItems.map(async (item) => {
                if (item.type !== 'review' || !item.review_prop) return null;
                const prop = item.review_prop as any;
                if (!prop.shop_id) return null;

                const sid = Number(prop.shop_id);
                // Safe Date
                const targetDate = item.created_at ? new Date(item.created_at) : new Date();

                try {
                    // Postgres JSON syntax: ->> returns text, cast to int
                    const countRes = await db.select({ count: count(content.id) })
                        .from(content)
                        .where(and(
                            eq(content.user_id, item.user_id),
                            eq(content.type, 'review'),
                            eq(content.is_deleted, false),
                            // Safe JSON check for Postgres
                            sql`(${content.review_prop}->>'shop_id')::int = ${sid}`,
                            lte(content.created_at, targetDate)
                        ));

                    return { id: item.id, count: countRes[0].count };
                } catch (err) {
                    console.error("Error counting visits for item", item.id, err);
                    return null;
                }
            });

            const visitCounts = await Promise.all(visitCountPromises);
            visitCounts.forEach(vc => {
                if (vc) contentVisitRankMap.set(vc.id, vc.count);
            });
        }

        // 3.5 Batch Fetch Likes & Comments Counts + IsLiked
        const contentIds = feedItems.map(i => i.id);
        const likeCountMap = new Map<number, number>();
        const commentCountMap = new Map<number, number>();
        const likedSet = new Set<number>();
        const currentUserId = req.query.user_id ? parseInt(req.query.user_id as string) : null;

        if (contentIds.length > 0) {
            // Like Counts
            const likeCounts = await db.select({
                target_id: likes.target_id,
                count: sql<number>`count(*)`
            })
                .from(likes)
                .where(and(
                    eq(likes.target_type, 'content'),
                    inArray(likes.target_id, contentIds)
                ))
                .groupBy(likes.target_id);

            likeCounts.forEach(l => likeCountMap.set(l.target_id, Number(l.count)));

            // Comment Counts
            const commentCounts = await db.select({
                content_id: comments.content_id,
                count: sql<number>`count(*)`
            })
                .from(comments)
                .where(and(
                    inArray(comments.content_id, contentIds),
                    eq(comments.is_deleted, false)
                ))
                .groupBy(comments.content_id);

            commentCounts.forEach(c => commentCountMap.set(c.content_id, Number(c.count)));

            // Is Liked
            if (currentUserId && !isNaN(currentUserId)) {
                const myLikes = await db.select({
                    target_id: likes.target_id
                })
                    .from(likes)
                    .where(and(
                        eq(likes.target_type, 'content'),
                        eq(likes.user_id, currentUserId),
                        inArray(likes.target_id, contentIds)
                    ));

                myLikes.forEach(l => likedSet.add(l.target_id));
            }
        }

        // 3.6 Batch Fetch Preview Comments (Latest 2)
        const previewCommentsMap = new Map<number, any[]>();
        if (contentIds.length > 0) {
            // Fetch recent comments for these posts
            // NOTE: Ideally use a window function, but for small batch size, fetching all recent valid comments is ok
            // Optimally: we want "latest 2 per post".
            // Strategy: Fetch all comments for these posts, order by created_at desc, then slice in JS.
            // Limit total to safe amount (e.g., 100) per post or just fetch all if batch is small (20 posts).
            const recentComments = await db.select({
                id: comments.id,
                content_id: comments.content_id,
                text: comments.text,
                created_at: comments.created_at,
                user: {
                    nickname: users.nickname,
                    profile_image: users.profile_image
                }
            })
                .from(comments)
                .leftJoin(users, eq(comments.user_id, users.id))
                .where(and(
                    inArray(comments.content_id, contentIds),
                    eq(comments.is_deleted, false)
                ))
                .orderBy(desc(comments.created_at));

            recentComments.forEach(c => {
                const list = previewCommentsMap.get(c.content_id) || [];
                if (list.length < 2) {
                    list.push(c);
                    previewCommentsMap.set(c.content_id, list);
                }
            });
        }

        // 4. Enrich
        const result = feedItems.map(item => {
            let enrichedProp = item.review_prop as any;

            if (item.type === 'review' && enrichedProp?.shop_id) {
                const sid = Number(enrichedProp.shop_id);
                const shop = shopMap.get(sid);
                const rank = rankMap.get(`${item.user_id} -${sid} `);
                // Use ordinal rank specific to this content item
                const visitCount = contentVisitRankMap.get(item.id) || 1;

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
                user: item.user || { id: item.user_id, nickname: 'Unknown', account_id: 'unknown', profile_image: null },
                text: item.text,
                images: item.img || [],
                created_at: item.created_at,
                type: item.type,
                review_prop: enrichedProp,
                stats: {
                    likes: likeCountMap.get(item.id) || 0,
                    comments: commentCountMap.get(item.id) || 0,
                    is_liked: likedSet.has(item.id),
                    is_saved: false // Existing placeholder
                },
                preview_comments: previewCommentsMap.get(item.id) || []
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
                        eq(content.type, 'review'),
                        eq(content.is_deleted, false),
                        eq(content.visibility, true)
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
        let userId = parseInt(req.params.userId);

        // If not numeric, try looking up by account_id
        if (isNaN(userId)) {
            const user = await db.select({ id: users.id })
                .from(users)
                .where(eq(users.account_id, req.params.userId))
                .limit(1);

            if (user.length > 0) {
                userId = user[0].id;
            } else {
                return res.status(404).json({ error: "User not found" });
            }
        }

        // 1. Fetch content + User Info (for the content creator)
        const userContent = await db.select({
            id: content.id,
            user_id: content.user_id,
            type: content.type,
            text: content.text,
            img: content.img,
            created_at: content.created_at,
            review_prop: content.review_prop,
            keyword: content.keyword,
            user: {
                id: users.id,
                nickname: users.nickname,
                account_id: users.account_id,
                profile_image: users.profile_image,
                cluster_name: clusters.name
            }
        })
            .from(content)
            .leftJoin(users, eq(content.user_id, users.id))
            .leftJoin(clusters, sql`CAST(${users.taste_cluster} AS INTEGER) = ${clusters.cluster_id} `)
            .where(and(
                eq(content.user_id, userId),
                eq(content.is_deleted, false),
                eq(content.visibility, true)
            ))
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
        // Refactored: visitCountMap removed, using contentVisitRankMap
        const contentVisitRankMap = new Map<number, number>();

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

            // Visit Counts (Ordinal)
            const allUserReviews = await db.select({
                id: content.id,
                prop: content.review_prop,
                created_at: content.created_at
            }).from(content)
                .where(
                    and(
                        eq(content.user_id, userId),
                        eq(content.type, 'review')
                    )
                )
                .orderBy(content.created_at);

            const shopCounter = new Map<number, number>();
            // contentVisitRankMap is now in outer scope

            allUserReviews.forEach(r => {
                const p = r.prop as any;
                if (p && p.shop_id) {
                    const sid = Number(p.shop_id);
                    if (idsList.includes(sid)) {
                        const current = (shopCounter.get(sid) || 0) + 1;
                        shopCounter.set(sid, current);
                        contentVisitRankMap.set(r.id, current);
                    }
                }
            });
        }

        // 3.5 Batch Fetch Likes & Comments Counts + IsLiked
        const contentIds = userContent.map(i => i.id);
        const likeCountMap = new Map<number, number>();
        const commentCountMap = new Map<number, number>();
        const likedSet = new Set<number>();
        // Check "viewer_id" or "user_id" from query to see if *I* liked this user's content
        const viewerId = req.query.user_id ? parseInt(req.query.user_id as string) : null;

        if (contentIds.length > 0) {
            // Like Counts
            const likeCounts = await db.select({
                target_id: likes.target_id,
                count: sql<number>`count(*)`
            })
                .from(likes)
                .where(and(
                    eq(likes.target_type, 'content'),
                    inArray(likes.target_id, contentIds)
                ))
                .groupBy(likes.target_id);

            likeCounts.forEach(l => likeCountMap.set(l.target_id, Number(l.count)));

            // Comment Counts
            const commentCounts = await db.select({
                content_id: comments.content_id,
                count: sql<number>`count(*)`
            })
                .from(comments)
                .where(and(
                    inArray(comments.content_id, contentIds),
                    eq(comments.is_deleted, false)
                ))
                .groupBy(comments.content_id);

            commentCounts.forEach(c => commentCountMap.set(c.content_id, Number(c.count)));

            // Is Liked (by viewer)
            if (viewerId && !isNaN(viewerId)) {
                const myLikes = await db.select({
                    target_id: likes.target_id
                })
                    .from(likes)
                    .where(and(
                        eq(likes.target_type, 'content'),
                        eq(likes.user_id, viewerId),
                        inArray(likes.target_id, contentIds)
                    ));

                myLikes.forEach(l => likedSet.add(l.target_id));
            }
        }

        // 3.6 Batch Fetch Preview Comments (Latest 2)
        const previewCommentsMap = new Map<number, any[]>();
        if (contentIds.length > 0) {
            const recentComments = await db.select({
                id: comments.id,
                content_id: comments.content_id,
                text: comments.text,
                created_at: comments.created_at,
                user: {
                    nickname: users.nickname,
                    profile_image: users.profile_image
                }
            })
                .from(comments)
                .leftJoin(users, eq(comments.user_id, users.id))
                .where(and(
                    inArray(comments.content_id, contentIds),
                    eq(comments.is_deleted, false)
                ))
                .orderBy(desc(comments.created_at));

            recentComments.forEach(c => {
                const list = previewCommentsMap.get(c.content_id) || [];
                if (list.length < 2) {
                    list.push(c);
                    previewCommentsMap.set(c.content_id, list);
                }
            });
        }

        // 4. Transform Data
        const result = userContent.map(item => {
            let enrichedProp = item.review_prop as any;
            if (item.type === 'review' && enrichedProp?.shop_id && shopMap.has(enrichedProp.shop_id)) {
                const shop = shopMap.get(enrichedProp.shop_id);
                const rank = rankMap.get(enrichedProp.shop_id);
                const visitCount = contentVisitRankMap.get(item.id) || 1;

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
                user: item.user || { id: item.user_id, nickname: 'Unknown', account_id: 'unknown', profile_image: null },
                text: item.text,
                images: item.img || [], // Assuming jsonb stores string[]
                created_at: item.created_at,
                type: item.type,
                review_prop: enrichedProp,
                stats: {
                    likes: likeCountMap.get(item.id) || 0,
                    comments: commentCountMap.get(item.id) || 0,
                    is_liked: likedSet.has(item.id),
                    is_saved: false
                },
                preview_comments: previewCommentsMap.get(item.id) || []
            };
        });

        res.json(result);
    } catch (error) {
        console.error("Fetch user content error:", error);
        res.status(500).json({ error: "Failed to fetch content" });
    }
});

// --- Likes & Comments Endpoints ---

// DELETE /api/content/:id (Soft Delete Content)
router.delete("/:id", async (req, res) => {
    try {
        const contentId = parseInt(req.params.id);
        const { user_id } = req.body;

        if (!user_id || isNaN(contentId)) {
            return res.status(400).json({ error: "Missing user_id or content ID" });
        }

        // Verify ownership (optional but recommended)
        const contentItem = await db.select().from(content).where(eq(content.id, contentId)).limit(1);
        if (contentItem.length === 0) {
            return res.status(404).json({ error: "Content not found" });
        }
        if (contentItem[0].user_id !== user_id) {
            return res.status(403).json({ error: "Unauthorized" });
        }

        await db.update(content)
            .set({
                is_deleted: true,
                visibility: false,
                updated_at: new Date()
            })
            .where(eq(content.id, contentId));

        res.json({ success: true });
    } catch (error) {
        console.error("Delete content error:", error);
        res.status(500).json({ error: "Failed to delete content" });
    }
});

// POST /api/content/:id/like (Add Like)
router.post("/:id/like", async (req, res) => {
    try {
        const contentId = parseInt(req.params.id);
        const { user_id } = req.body;

        if (!user_id || isNaN(contentId)) {
            return res.status(400).json({ error: "Missing user_id or content ID" });
        }

        // Check if already liked
        await db.insert(likes).values({
            target_type: 'content',
            target_id: contentId,
            user_id: user_id
        }).onConflictDoNothing();

        res.json({ success: true });
    } catch (error) {
        console.error("Add like error:", error);
        res.status(500).json({ error: "Failed to add like" });
    }
});

// DELETE /api/content/:id/like (Remove Like)
router.delete("/:id/like", async (req, res) => {
    try {
        const contentId = parseInt(req.params.id);
        const { user_id } = req.body; // Usually implicit in session/token, but assumed here

        if (!user_id || isNaN(contentId)) {
            return res.status(400).json({ error: "Missing user_id or content ID" });
        }

        await db.delete(likes).where(
            and(
                eq(likes.target_type, 'content'),
                eq(likes.target_id, contentId),
                eq(likes.user_id, user_id)
            )
        );

        res.json({ success: true });
    } catch (error) {
        console.error("Remove like error:", error);
        res.status(500).json({ error: "Failed to remove like" });
    }
});

// GET /api/content/:id/comments (List Comments)
router.get("/:id/comments", async (req, res) => {
    try {
        const contentId = parseInt(req.params.id);
        if (isNaN(contentId)) {
            return res.status(400).json({ error: "Invalid content ID" });
        }

        const commentList = await db.select({
            id: comments.id,
            text: comments.text,
            created_at: comments.created_at,
            user_id: comments.user_id,
            user: {
                id: users.id,
                nickname: users.nickname,
                profile_image: users.profile_image,
                cluster_name: clusters.name
            }
        })
            .from(comments)
            .leftJoin(users, eq(comments.user_id, users.id))
            .leftJoin(clusters, sql`CAST(${users.taste_cluster} AS INTEGER) = ${clusters.cluster_id} `)
            .where(and(eq(comments.content_id, contentId), eq(comments.is_deleted, false)))
            .orderBy(comments.created_at);

        res.json(commentList);
    } catch (error) {
        console.error("Fetch comments error:", error);
        res.status(500).json({ error: "Failed to fetch comments" });
    }
});

// POST /api/content/:id/comments (Add Comment)
router.post("/:id/comments", async (req, res) => {
    try {
        const contentId = parseInt(req.params.id);
        const { user_id, text } = req.body;

        if (!user_id || !text || isNaN(contentId)) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        const result = await db.insert(comments).values({
            content_id: contentId,
            user_id,
            text
        }).returning();

        // Fetch user info for immediate display
        const user = await db.select({
            id: users.id,
            nickname: users.nickname,
            profile_image: users.profile_image
        }).from(users).where(eq(users.id, user_id)).limit(1);

        res.json({ ...result[0], user: user[0] });
    } catch (error) {
        console.error("Add comment error:", error);
        res.status(500).json({ error: "Failed to add comment" });
    }
});

// DELETE /api/content/comments/:id (Delete Comment) - Note the path difference
// Moving delete comment to specific route /api/content/comments/:id for clarity if needed, 
// or keep consistent URL structure. Let's use /api/content/comments/:id as requested indirectly
router.delete("/comments/:id", async (req, res) => {
    try {
        const commentId = parseInt(req.params.id);
        // In real app, verify user_id ownership

        await db.update(comments)
            .set({ is_deleted: true })
            .where(eq(comments.id, commentId));

        res.json({ success: true });
    } catch (error) {
        console.error("Delete comment error:", error);
        res.status(500).json({ error: "Failed to delete comment" });
    }
});

export default router;
