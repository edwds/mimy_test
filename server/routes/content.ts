import { Router } from "express";
import { db } from "../db/index.js";
import { users, shops, content, comments, likes, users_ranking, users_wantstogo, clusters, users_follow } from "../db/schema.js";
import { eq, desc, and, sql, count, inArray, gt, gte, ne, lte } from "drizzle-orm";

const router = Router();

// Helper for standardized rank key
const getRankKey = (userId: number, shopId: number) => `${userId}:${shopId}`;

// GET /api/content/feed
router.get("/feed", async (req, res) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const offset = (page - 1) * limit;
        const filter = (req.query.filter as string) || 'popular';

        // Validation for location
        const rawLat = parseFloat(req.query.lat as string);
        const rawLon = parseFloat(req.query.lon as string);
        const userLat = Number.isFinite(rawLat) ? rawLat : null;
        const userLon = Number.isFinite(rawLon) ? rawLon : null;

        // TODO: Replace with secure session/token auth
        const currentUserId = req.query.user_id ? parseInt(req.query.user_id as string) : null;

        // 1. Fetch Content + User Info
        let query = db.select({
            id: content.id,
            user_id: content.user_id,
            type: content.type,
            text: content.text,
            img: content.img,
            created_at: content.created_at,
            review_prop: content.review_prop,
            keyword: content.keyword,
            img_text: content.img_text,
            user: {
                id: users.id,
                nickname: users.nickname,
                account_id: users.account_id,
                profile_image: users.profile_image,
                cluster_name: clusters.name,
                taste_result: users.taste_result
            },
            link_json: content.link_json,
        })
            .from(content)
            .leftJoin(users, eq(content.user_id, users.id))
            .leftJoin(clusters, sql`CAST(${users.taste_cluster} AS INTEGER) = ${clusters.cluster_id} `);

        // Fetch Current User's Taste Profile for 'popular' personalization - REMOVED (User requested logic removal)
        // let myScores: any = null;

        // Apply Filters
        const whereConditions = [
            eq(content.is_deleted, false),
            eq(content.visibility, true)
        ];

        if (filter === 'follow') {
            if (!currentUserId) return res.json([]);
            // Fix: Reassign query for explicit join
            query = query.innerJoin(users_follow,
                and(
                    eq(users_follow.follower_id, currentUserId),
                    eq(users_follow.following_id, content.user_id)
                )
            );
        } else if (filter === 'like') {
            if (!currentUserId) return res.json([]);
            // Fix: Reassign query
            query = query.innerJoin(likes,
                and(
                    eq(likes.target_type, 'content'),
                    eq(likes.target_id, content.id),
                    eq(likes.user_id, currentUserId)
                )
            );
        } else if (filter === 'near') {
            if (userLat === null || userLon === null) {
                // Spec fallback: return empty if location missing for 'near'
                return res.json([]);
            } else {
                // Fix: 10km radius
                query = query.innerJoin(shops,
                    sql`CAST(${content.review_prop}->>'shop_id' AS INTEGER) = ${shops.id}`
                );

                const R = 6371;
                whereConditions.push(sql`
                    (
                        ${R} * acos(
                            least(1.0, greatest(-1.0, 
                                cos(radians(${userLat})) * cos(radians(${shops.lat})) * 
                                cos(radians(${shops.lon}) - radians(${userLon})) + 
                                sin(radians(${userLat})) * sin(radians(${shops.lat}))
                            ))
                        )
                    ) <= 10
            ) <= 10
                `);
            }
        }
        // else if ((filter === 'popular' || filter === '') && myScores) { ... } // Removed logic

        const feedItems = await query
            .where(and(...whereConditions))
            .orderBy(desc(content.created_at))
            .limit(limit)
            .offset(offset);

        if (feedItems.length === 0) {
            return res.json([]);
        }

        // 2. Collection & Batching
        const shopIds = new Set<number>();
        const userIds = new Set<number>();
        const companionIds = new Set<number>();
        const contentIds = feedItems.map(i => i.id);

        feedItems.forEach(item => {
            if (item.type === 'review' && item.review_prop) {
                const prop = item.review_prop as any;
                if (prop.shop_id) {
                    shopIds.add(Number(prop.shop_id));
                    userIds.add(item.user_id);
                }
                if (prop.companions && Array.isArray(prop.companions)) {
                    prop.companions.forEach((cid: number) => companionIds.add(cid));
                }
            }
        });

        const shopMap = new Map();
        const rankMap = new Map<string, number>();
        const companionMap = new Map<number, any>();
        const visitCountMap = new Map<number, number>(); // ContentID -> Count

        // 3. Batch Fetching
        if (shopIds.size > 0 || companionIds.size > 0) {
            const sIds = Array.from(shopIds);
            const uIds = Array.from(userIds);
            const cIds = Array.from(companionIds);

            if (sIds.length > 0) {
                // Shops
                const shopList = await db.select().from(shops).where(inArray(shops.id, sIds));
                shopList.forEach(s => shopMap.set(s.id, s));

                // Rankings (User-Shop pairs)
                const rankings = await db.select().from(users_ranking)
                    .where(and(
                        inArray(users_ranking.user_id, uIds),
                        inArray(users_ranking.shop_id, sIds)
                    ));
                rankings.forEach(r => rankMap.set(getRankKey(r.user_id, r.shop_id), r.rank));

                // Visit Counts (N+1 Fix: Window Function / Subquery)
                // We need to know: For each content item (which represents a visit), what was its ordinal number?
                // "Rank of this content among all reviews by this user for this shop, ordered by created_at"
                if (contentIds.length > 0) {
                    const visitranks = await db.execute(sql`
                        WITH ranks AS (
                            SELECT 
                                id,
                                ROW_NUMBER() OVER (
                                    PARTITION BY user_id, (review_prop->>'shop_id')::int 
                                    ORDER BY created_at ASC
                                ) as visit_num
                            FROM ${content}
                            WHERE is_deleted = false 
                              AND type = 'review'
                              -- optimization: filter only relevant users/shops if dataset is huge, 
                              -- but global partition is safer for correctness if missing items
                              AND user_id IN ${uIds}
                              AND (review_prop->>'shop_id')::int IN ${sIds}
                        )
                        SELECT id, visit_num FROM ranks WHERE id IN ${contentIds}
                     `);
                    // Drizzle execute returns weird raw structure depending on driver. 
                    // Safe way with array params in template literal might be tricky in pure sql tag.
                    // Let's use simpler query builder or raw string mapping.
                    // The above `IN ${uIds}` might not expand correctly in standard Drizzle sql tag without `sql.raw`.
                    // Let's rely on a simpler aggregation if the above is risky.

                    // Safer Approach with Drizzle Query Builder using sql<T>:
                    // Hard to do complex Window in QB. Let's use formatting for IDs.
                    const contentIdList = contentIds.join(',');
                    // Only fetch for relevant items to save DB load

                    const rawVisits = await db.execute(sql.raw(`
                        WITH ranks AS (
                            SELECT 
                                id,
                                ROW_NUMBER() OVER (
                                    PARTITION BY user_id, (review_prop->>'shop_id')::int 
                                    ORDER BY created_at ASC
                                ) as visit_num
                            FROM content
                            WHERE is_deleted = false 
                              AND type = 'review'
                              AND user_id IN (${uIds.join(',')})
                              AND (review_prop->>'shop_id')::int IN (${sIds.join(',')})
                        )
                        SELECT id, visit_num FROM ranks WHERE id IN (${contentIdList})
                     `));

                    rawVisits.rows.forEach((row: any) => {
                        visitCountMap.set(Number(row.id), Number(row.visit_num));
                    });
                }
            }

            // Companions
            if (cIds.length > 0) {
                const companions = await db.select({
                    id: users.id, nickname: users.nickname, profile_image: users.profile_image
                }).from(users).where(inArray(users.id, cIds));
                companions.forEach(c => companionMap.set(c.id, c));
            }
        }

        // 3.5 Interactions (Likes, Comments, Saved)
        const likeCountMap = new Map<number, number>();
        const commentCountMap = new Map<number, number>();
        const likedSet = new Set<number>();
        const savedShopSet = new Set<number>();

        if (contentIds.length > 0) {
            // Counts
            const likesRes = await db.select({
                target_id: likes.target_id, count: sql<number>`count(*)`
            }).from(likes)
                .where(and(eq(likes.target_type, 'content'), inArray(likes.target_id, contentIds)))
                .groupBy(likes.target_id);
            likesRes.forEach(r => likeCountMap.set(r.target_id, Number(r.count)));

            const commentsRes = await db.select({
                content_id: comments.content_id, count: sql<number>`count(*)`
            }).from(comments)
                .where(and(inArray(comments.content_id, contentIds), eq(comments.is_deleted, false)))
                .groupBy(comments.content_id);
            commentsRes.forEach(r => commentCountMap.set(r.content_id, Number(r.count)));

            // User Specific Status
            if (currentUserId) {
                const myLikes = await db.select({ target_id: likes.target_id }).from(likes)
                    .where(and(
                        eq(likes.target_type, 'content'),
                        eq(likes.user_id, currentUserId),
                        inArray(likes.target_id, contentIds)
                    ));
                myLikes.forEach(l => likedSet.add(l.target_id));

                if (shopIds.size > 0) {
                    const mySaved = await db.select({ shop_id: users_wantstogo.shop_id }).from(users_wantstogo)
                        .where(and(
                            eq(users_wantstogo.user_id, currentUserId),
                            inArray(users_wantstogo.shop_id, Array.from(shopIds)),
                            eq(users_wantstogo.is_deleted, false)
                        ));
                    mySaved.forEach(s => savedShopSet.add(s.shop_id));
                }
            }
        }

        // 3.6 Preview Comments (N+1 Fix: Row Number Limit)
        const previewCommentsMap = new Map<number, any[]>();
        if (contentIds.length > 0) {
            const rawComments = await db.execute(sql.raw(`
                WITH ranked_comments AS (
                    SELECT 
                        c.id, c.content_id, c.text, c.created_at,
                        u.nickname, u.profile_image,
                        ROW_NUMBER() OVER (PARTITION BY c.content_id ORDER BY c.created_at DESC) as rn
                    FROM comments c
                    LEFT JOIN users u ON c.user_id = u.id
                    WHERE c.content_id IN (${contentIds.join(',')})
                      AND c.is_deleted = false
                )
                SELECT * FROM ranked_comments WHERE rn <= 2 ORDER BY created_at DESC
             `));

            rawComments.rows.forEach((row: any) => {
                const cid = Number(row.content_id);
                const list = previewCommentsMap.get(cid) || [];
                // Transform back to simple object
                list.push({
                    id: row.id,
                    content_id: cid,
                    text: row.text,
                    created_at: row.created_at,
                    user: { nickname: row.nickname, profile_image: row.profile_image }
                });
                previewCommentsMap.set(cid, list);
            });
        }

        // 3.8 Follow Status
        const followingAuthorSet = new Set<number>();
        if (currentUserId && userIds.size > 0) {
            const follows = await db.select({ following_id: users_follow.following_id }).from(users_follow)
                .where(and(
                    eq(users_follow.follower_id, currentUserId),
                    inArray(users_follow.following_id, Array.from(userIds))
                ));
            follows.forEach(f => followingAuthorSet.add(f.following_id));
        }

        // 4. Enrich & Respond
        const result = feedItems.map(item => {
            let enrichedProp = item.review_prop as any;
            let poi = undefined;

            if (item.type === 'review' && enrichedProp?.shop_id) {
                const sid = Number(enrichedProp.shop_id);
                const shop = shopMap.get(sid);
                const rank = rankMap.get(getRankKey(item.user_id, sid));
                const visitCount = visitCountMap.get(item.id) || 1;
                const isSaved = savedShopSet.has(sid);

                let displayCompanions = [];
                if (enrichedProp.companions && Array.isArray(enrichedProp.companions)) {
                    displayCompanions = enrichedProp.companions
                        .map((cid: number) => companionMap.get(cid))
                        .filter(Boolean);
                }

                if (shop) {
                    enrichedProp = {
                        ...enrichedProp,
                        shop_name: shop.name,
                        shop_address: shop.address_region || shop.address_full,
                        thumbnail_img: shop.thumbnail_img,
                        rank: rank || null,
                        visit_count: visitCount,
                        companions_info: displayCompanions
                    };

                    poi = {
                        shop_id: sid,
                        shop_name: shop.name,
                        shop_address: shop.address_region || shop.address_full,
                        thumbnail_img: shop.thumbnail_img,
                        rank: rank || null,
                        satisfaction: enrichedProp.satisfaction,
                        visit_count: visitCount,
                        is_bookmarked: isSaved, // Consistent with stats
                        catchtable_ref: shop.catchtable_ref
                    };
                }
            }

            return {
                id: item.id,
                user: {
                    ...(item.user || { id: item.user_id, nickname: 'Unknown', account_id: 'unknown', profile_image: null }),
                    is_following: followingAuthorSet.has(item.user_id)
                },
                text: item.text,
                images: item.img || [],
                img_texts: item.img_text || [],
                created_at: item.created_at,
                type: item.type,
                review_prop: enrichedProp,
                keyword: item.keyword || [],
                link_json: item.link_json || [],
                poi,
                stats: {
                    likes: likeCountMap.get(item.id) || 0,
                    comments: commentCountMap.get(item.id) || 0,
                    is_liked: likedSet.has(item.id),
                    is_saved: poi?.is_bookmarked || false // Fix: Correctly reflect saved status
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
        const { user_id, type, text, img, video, review_prop, keyword, link_json, img_text } = req.body;

        if (!user_id || !type) {
            return res.status(400).json({ error: "user_id and type are required" });
        }

        const result = await db.insert(content).values({
            user_id,
            type,
            text,
            img,
            video,
            review_prop,
            keyword,
            link_json,
            img_text
        }).returning();

        res.json(result[0]);
    } catch (error) {
        console.error("Create content error:", error);
        const detailedError = error instanceof Error ? error.message : String(error);
        const pgError = (error as any).code ? `PG Code: ${(error as any).code}` : '';
        res.status(500).json({ error: "Failed to create content", details: detailedError, pgError });
    }
});

function mapSatisfactionToTier(satisfaction: string): number {
    switch (satisfaction) {
        case 'good': return 2;
        case 'ok': return 1;
        case 'bad': return 0;
        default: return 2;
    }
}

// POST /api/content/ranking/apply
router.post("/ranking/apply", async (req, res) => {
    try {
        const { user_id, shop_id, insert_index } = req.body;
        let { satisfaction } = req.body;

        if (!user_id || !shop_id || insert_index === undefined) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        if (!satisfaction) {
            const latestContent = await db.select().from(content)
                .where(and(
                    eq(content.user_id, user_id),
                    eq(content.type, 'review'),
                    eq(content.is_deleted, false),
                    eq(content.visibility, true)
                ))
                .orderBy(desc(content.created_at))
                .limit(10);

            satisfaction = 'good';
            for (const c of latestContent) {
                const prop = c.review_prop as any;
                if (prop && Number(prop.shop_id) === Number(shop_id)) {
                    if (prop.satisfaction) satisfaction = prop.satisfaction;
                    break;
                }
            }
        }

        const new_tier = mapSatisfactionToTier(satisfaction);

        await db.transaction(async (tx) => {
            const existing = await tx.select().from(users_ranking)
                .where(and(eq(users_ranking.user_id, user_id), eq(users_ranking.shop_id, shop_id)))
                .limit(1);

            if (existing.length > 0) {
                const old_rank = existing[0].rank;
                await tx.delete(users_ranking).where(eq(users_ranking.id, existing[0].id));
                await tx.update(users_ranking)
                    .set({ rank: sql`${users_ranking.rank} - 1` })
                    .where(and(eq(users_ranking.user_id, user_id), gt(users_ranking.rank, old_rank)));
            }

            const higherTierCountRes = await tx.select({ count: sql<number>`count(*)` })
                .from(users_ranking)
                .where(and(eq(users_ranking.user_id, user_id), gt(users_ranking.satisfaction_tier, new_tier)));
            const higherTierCount = Number(higherTierCountRes[0]?.count || 0);

            const new_global_rank = higherTierCount + insert_index + 1;

            await tx.update(users_ranking)
                .set({ rank: sql`${users_ranking.rank} + 1` })
                .where(and(eq(users_ranking.user_id, user_id), gte(users_ranking.rank, new_global_rank)));

            await tx.insert(users_ranking).values({
                user_id, shop_id, satisfaction_tier: new_tier, rank: new_global_rank
            });
        });

        res.json({ success: true, shop_id, satisfaction_tier: new_tier });
    } catch (error) {
        console.error("Ranking apply error:", error);
        res.status(500).json({ error: "Failed to apply ranking" });
    }
});

// GET /api/content/ranking/candidates
router.get("/ranking/candidates", async (req, res) => {
    try {
        const { user_id, satisfaction, satisfaction_tier, exclude_shop_id } = req.query;
        if (!user_id) return res.status(400).json({ error: "Missing parameters" });

        const userId = parseInt(user_id as string);
        let tier = 2;
        if (satisfaction_tier) tier = parseInt(satisfaction_tier as string);
        else if (satisfaction) tier = mapSatisfactionToTier(satisfaction as string);

        const excludeId = exclude_shop_id ? parseInt(exclude_shop_id as string) : -1;

        const candidates = await db.select({
            shop_id: users_ranking.shop_id,
            rank: users_ranking.rank,
            shop_name: shops.name,
            food_kind: shops.food_kind
        })
            .from(users_ranking)
            .leftJoin(shops, eq(users_ranking.shop_id, shops.id))
            .where(and(
                eq(users_ranking.user_id, userId),
                eq(users_ranking.satisfaction_tier, tier),
                ne(users_ranking.shop_id, excludeId)
            ))
            .orderBy(users_ranking.rank);

        res.json(candidates);
    } catch (error) {
        console.error("Fetch ranking candidates error:", error);
        res.status(500).json({ error: "Failed to fetch candidates" });
    }
});

// GET /api/content/user/:userId
// Using simplified logic consistent with Feed (without complex filters for now, but enriched)
router.get("/user/:userId", async (req, res) => {
    try {
        let userId = parseInt(req.params.userId);
        if (isNaN(userId)) {
            const user = await db.select({ id: users.id }).from(users)
                .where(eq(users.account_id, req.params.userId)).limit(1);
            if (user.length > 0) userId = user[0].id;
            else return res.status(404).json({ error: "User not found" });
        }

        const viewerId = req.query.user_id ? parseInt(req.query.user_id as string) : null;

        // Fetch User Content
        const userContent = await db.select({
            id: content.id,
            user_id: content.user_id,
            type: content.type,
            text: content.text,
            img: content.img,
            created_at: content.created_at,
            review_prop: content.review_prop,
            keyword: content.keyword,
            img_text: content.img_text,
            user: {
                id: users.id,
                nickname: users.nickname,
                account_id: users.account_id,
                profile_image: users.profile_image,
                cluster_name: clusters.name,
                taste_result: users.taste_result
            },
            link_json: content.link_json
        })
            .from(content)
            .leftJoin(users, eq(content.user_id, users.id))
            .leftJoin(clusters, sql`CAST(${users.taste_cluster} AS INTEGER) = ${clusters.cluster_id} `)
            .where(and(
                eq(content.user_id, userId),
                eq(content.is_deleted, false),
                eq(content.visibility, true)
            ))
            .orderBy(desc(content.created_at))
            .limit(20);

        if (userContent.length === 0) return res.json([]);

        // Collect IDs
        const shopIds = new Set<number>();
        const contentIds = userContent.map(i => i.id);
        const companionIds = new Set<number>();

        userContent.forEach(item => {
            if (item.type === 'review' && item.review_prop) {
                const prop = item.review_prop as any;
                if (prop.shop_id) shopIds.add(Number(prop.shop_id));
                if (prop.companions && Array.isArray(prop.companions)) {
                    prop.companions.forEach((cid: number) => companionIds.add(cid));
                }
            }
        });

        const shopMap = new Map();
        const rankMap = new Map<string, number>();
        const companionMap = new Map<number, any>();
        const visitCountMap = new Map<number, number>();

        // Batch Fetching
        if (shopIds.size > 0) {
            const sIds = Array.from(shopIds);
            const shopList = await db.select().from(shops).where(inArray(shops.id, sIds));
            shopList.forEach(s => shopMap.set(s.id, s));

            const rankings = await db.select().from(users_ranking)
                .where(and(eq(users_ranking.user_id, userId), inArray(users_ranking.shop_id, sIds)));
            rankings.forEach(r => rankMap.set(getRankKey(r.user_id, r.shop_id), r.rank));

            // Visit Counts (N+1 Fix)
            const rawVisits = await db.execute(sql.raw(`
                WITH ranks AS (
                    SELECT 
                        id,
                        ROW_NUMBER() OVER (
                            PARTITION BY user_id, (review_prop->>'shop_id')::int 
                            ORDER BY created_at ASC
                        ) as visit_num
                    FROM content
                    WHERE is_deleted = false 
                      AND type = 'review'
                      AND user_id = ${userId}
                      AND (review_prop->>'shop_id')::int IN (${sIds.join(',')})
                )
                SELECT id, visit_num FROM ranks WHERE id IN (${contentIds.join(',')})
            `));
            rawVisits.rows.forEach((row: any) => visitCountMap.set(Number(row.id), Number(row.visit_num)));
        }

        if (companionIds.size > 0) {
            const cIds = Array.from(companionIds);
            const comps = await db.select({ id: users.id, nickname: users.nickname, profile_image: users.profile_image })
                .from(users).where(inArray(users.id, cIds));
            comps.forEach(c => companionMap.set(c.id, c));
        }

        // Stats & Interactions
        const likeCountMap = new Map<number, number>();
        const commentCountMap = new Map<number, number>();
        const likedSet = new Set<number>();
        const savedShopSet = new Set<number>();

        if (contentIds.length > 0) {
            const likesRes = await db.select({ target_id: likes.target_id, count: sql<number>`count(*)` })
                .from(likes).where(and(eq(likes.target_type, 'content'), inArray(likes.target_id, contentIds)))
                .groupBy(likes.target_id);
            likesRes.forEach(r => likeCountMap.set(r.target_id, Number(r.count)));

            const commsRes = await db.select({ content_id: comments.content_id, count: sql<number>`count(*)` })
                .from(comments).where(and(inArray(comments.content_id, contentIds), eq(comments.is_deleted, false)))
                .groupBy(comments.content_id);
            commsRes.forEach(r => commentCountMap.set(r.content_id, Number(r.count)));

            if (viewerId) {
                const myLikes = await db.select({ target_id: likes.target_id }).from(likes)
                    .where(and(eq(likes.target_type, 'content'), eq(likes.user_id, viewerId), inArray(likes.target_id, contentIds)));
                myLikes.forEach(l => likedSet.add(l.target_id));

                if (shopIds.size > 0) {
                    const mySaved = await db.select({ shop_id: users_wantstogo.shop_id }).from(users_wantstogo)
                        .where(and(eq(users_wantstogo.user_id, viewerId), inArray(users_wantstogo.shop_id, Array.from(shopIds)), eq(users_wantstogo.is_deleted, false)));
                    mySaved.forEach(s => savedShopSet.add(s.shop_id));
                }
            }
        }

        // Preview Comments (N+1 restriction)
        const previewCommentsMap = new Map<number, any[]>();
        if (contentIds.length > 0) {
            const rawComments = await db.execute(sql.raw(`
                WITH ranked_comments AS (
                    SELECT 
                        c.id, c.content_id, c.text, c.created_at,
                        u.nickname, u.profile_image,
                        ROW_NUMBER() OVER (PARTITION BY c.content_id ORDER BY c.created_at DESC) as rn
                    FROM comments c
                    LEFT JOIN users u ON c.user_id = u.id
                    WHERE c.content_id IN (${contentIds.join(',')})
                      AND c.is_deleted = false
                )
                SELECT * FROM ranked_comments WHERE rn <= 2 ORDER BY created_at DESC
             `));

            rawComments.rows.forEach((row: any) => {
                const cid = Number(row.content_id);
                const list = previewCommentsMap.get(cid) || [];
                list.push({
                    id: row.id,
                    content_id: cid,
                    text: row.text,
                    created_at: row.created_at,
                    user: { nickname: row.nickname, profile_image: row.profile_image }
                });
                previewCommentsMap.set(cid, list);
            });
        }

        // Following status check for author (if viewer exists)
        let isFollowing = false;
        if (viewerId && userId !== viewerId) {
            const f = await db.select().from(users_follow).where(and(eq(users_follow.follower_id, viewerId), eq(users_follow.following_id, userId))).limit(1);
            isFollowing = f.length > 0;
        }

        const result = userContent.map(item => {
            let enrichedProp = item.review_prop as any;
            let poi = undefined;
            const visitCount = visitCountMap.get(item.id) || 1;

            if (item.type === 'review' && enrichedProp?.shop_id) {
                const sid = Number(enrichedProp.shop_id);
                const shop = shopMap.get(sid);
                const rank = rankMap.get(getRankKey(item.user_id, sid));
                const isSaved = savedShopSet.has(sid);

                let displayCompanions = [];
                if (enrichedProp.companions && Array.isArray(enrichedProp.companions)) {
                    displayCompanions = enrichedProp.companions.map((cid: number) => companionMap.get(cid)).filter(Boolean);
                }

                if (shop) {
                    enrichedProp = {
                        ...enrichedProp,
                        shop_name: shop.name,
                        shop_address: shop.address_region || shop.address_full,
                        thumbnail_img: shop.thumbnail_img,
                        rank: rank || null,
                        visit_count: visitCount,
                        companions_info: displayCompanions
                    };
                    poi = {
                        shop_id: sid,
                        shop_name: shop.name,
                        shop_address: shop.address_region || shop.address_full,
                        thumbnail_img: shop.thumbnail_img,
                        rank: rank || null,
                        satisfaction: enrichedProp.satisfaction,
                        visit_count: visitCount,
                        is_bookmarked: isSaved,
                        catchtable_ref: shop.catchtable_ref
                    };
                }
            }

            return {
                id: item.id,
                user: {
                    ...(item.user || { id: item.user_id, nickname: 'Unknown', account_id: 'unknown', profile_image: null }),
                    is_following: isFollowing // For user profile feed, this flag is if *we* follow the profile owner generally
                },
                text: item.text,
                images: item.img || [],
                img_texts: item.img_text || [],
                created_at: item.created_at,
                type: item.type,
                review_prop: enrichedProp,
                keyword: item.keyword || [],
                link_json: item.link_json || [],
                poi,
                stats: {
                    likes: likeCountMap.get(item.id) || 0,
                    comments: commentCountMap.get(item.id) || 0,
                    is_liked: likedSet.has(item.id),
                    is_saved: poi?.is_bookmarked || false
                },
                preview_comments: previewCommentsMap.get(item.id) || []
            };
        });

        res.json(result);
    } catch (error) {
        console.error("User feed error:", error);
        res.status(500).json({ error: "Failed to fetch user feed" });
    }
});

// POST /api/content/:id/like
router.post("/:id/like", async (req, res) => {
    try {
        const contentId = parseInt(req.params.id);
        const { user_id } = req.body;

        if (!contentId || !user_id) {
            return res.status(400).json({ error: "Missing parameters" });
        }

        const existing = await db.select().from(likes)
            .where(and(
                eq(likes.target_type, 'content'),
                eq(likes.target_id, contentId),
                eq(likes.user_id, user_id)
            )).limit(1);

        if (existing.length === 0) {
            await db.insert(likes).values({
                target_type: 'content',
                target_id: contentId,
                user_id
            });
        }

        res.json({ success: true });
    } catch (error) {
        console.error("Like error:", error);
        res.status(500).json({ error: "Failed to like" });
    }
});

// DELETE /api/content/:id/like
router.delete("/:id/like", async (req, res) => {
    try {
        const contentId = parseInt(req.params.id);
        const { user_id } = req.body;

        if (!contentId || !user_id) {
            return res.status(400).json({ error: "Missing parameters" });
        }

        await db.delete(likes)
            .where(and(
                eq(likes.target_type, 'content'),
                eq(likes.target_id, contentId),
                eq(likes.user_id, user_id)
            ));

        res.json({ success: true });
    } catch (error) {
        console.error("Unlike error:", error);
        res.status(500).json({ error: "Failed to unlike" });
    }
});

// GET /api/content/:id/comments
router.get("/:id/comments", async (req, res) => {
    try {
        const contentId = parseInt(req.params.id);
        if (!contentId) return res.status(400).json({ error: "Invalid content ID" });

        const commentsList = await db.select({
            id: comments.id,
            content_id: comments.content_id,
            text: comments.text,
            created_at: comments.created_at,
            parent_id: comments.parent_id,
            user: {
                id: users.id,
                nickname: users.nickname,
                profile_image: users.profile_image
            }
        })
            .from(comments)
            .leftJoin(users, eq(comments.user_id, users.id))
            .where(and(
                eq(comments.content_id, contentId),
                eq(comments.is_deleted, false)
            ))
            .orderBy(desc(comments.created_at));

        res.json(commentsList);
    } catch (error) {
        console.error("Fetch comments error:", error);
        res.status(500).json({ error: "Failed to fetch comments" });
    }
});

// POST /api/content/:id/comments
router.post("/:id/comments", async (req, res) => {
    try {
        const contentId = parseInt(req.params.id);
        const { user_id, text, parent_id, mention_user_id } = req.body;

        if (!contentId || !user_id || !text) {
            return res.status(400).json({ error: "Missing parameters" });
        }

        const result = await db.insert(comments).values({
            content_id: contentId,
            user_id,
            text,
            parent_id: parent_id || null,
            mention_user_id: mention_user_id || null
        }).returning();

        // Fetch user info for immediate display
        const user = await db.select({
            id: users.id,
            nickname: users.nickname,
            profile_image: users.profile_image
        })
            .from(users)
            .where(eq(users.id, user_id))
            .limit(1);

        const newComment = {
            ...result[0],
            user: user[0] || { nickname: 'Unknown', profile_image: null }
        };

        res.json(newComment);
    } catch (error) {
        console.error("Create comment error:", error);
        res.status(500).json({ error: "Failed to create comment" });
    }
});

export default router;
