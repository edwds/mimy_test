import { Router } from "express";
import { db } from "../db/index.js";
import { users, shops, content, comments, likes, users_ranking, users_wantstogo, clusters, users_follow } from "../db/schema.js";
import { eq, desc, and, sql, count, inArray, gt, gte, ne, lte } from "drizzle-orm";
import { getOrSetCache, invalidatePattern, redis } from "../redis.js";
import { ListService } from "../services/ListService.js";
import { LeaderboardService } from "../services/LeaderboardService.js";
import { requireAuth, optionalAuth } from "../middleware/auth.js";
import { getShopReviewStats } from "../utils/enricher.js";
import { createNotification } from "./notifications.js";

const router = Router();

// Helper: Update users_ranking latest review data
async function updateRankingLatestReview(userId: number, shopId: number) {
    try {
        // Fetch latest review for this user+shop
        const latestReview = await db.select({
            text: content.text,
            img: content.img
        })
            .from(content)
            .where(and(
                eq(content.user_id, userId),
                eq(content.type, 'review'),
                eq(content.is_deleted, false),
                sql`CAST(${content.review_prop}->>'shop_id' AS INTEGER) = ${shopId}`
            ))
            .orderBy(desc(content.created_at))
            .limit(1);

        if (latestReview.length > 0) {
            await db.update(users_ranking)
                .set({
                    latest_review_text: latestReview[0].text,
                    latest_review_images: latestReview[0].img
                })
                .where(and(
                    eq(users_ranking.user_id, userId),
                    eq(users_ranking.shop_id, shopId)
                ));
        }
    } catch (error) {
        console.error('[updateRankingLatestReview] Error:', error);
    }
}

// Helper: Pre-warm User Lists (Fire & Forget)
async function prewarmUserLists(userId: number) {
    try {
        console.log(`[Pre-warm] Starting for user ${userId}`);
        const listKey = `lists:${userId}`;

        // 1. Fetch & Cache Main Lists
        const lists = await ListService.fetchUserLists(userId);
        if (lists && redis) {
            await redis.set(listKey, JSON.stringify(lists), { ex: 3600 });
            console.log(`[Pre-warm] Main lists cached for user ${userId}`);

            // 2. Fetch & Cache Details (Only for active lists)
            // We can iterate over the lists we just fetched to know what to pre-warm
            for (const list of lists) {
                const type = list.type;
                const value = list.value || 'all'; // value is undefined for OVERALL
                const detailKey = `lists:${userId}:detail:${type}:${value}`;

                // Fetch detail
                const detail = await ListService.fetchUserListDetail(userId, type, list.value);
                if (redis) await redis.set(detailKey, JSON.stringify(detail), { ex: 3600 });
            }
            console.log(`[Pre-warm] Detail lists cached for user ${userId}`);
        }
    } catch (error) {
        console.error(`[Pre-warm] Failed for user ${userId}`, error);
    }
}

// Helper for standardized rank key
const getRankKey = (userId: number, shopId: number) => `${userId}:${shopId}`;

// Helper: Fetch Feed Content (Pure Logic)
async function fetchFeedContent(params: {
    page: number, limit: number, filter: string,
    lat: number | null, lon: number | null, user_id: number | null
}) {
    const { page, limit, filter, lat: userLat, lon: userLon, user_id: currentUserId } = params;
    const offset = (page - 1) * limit;

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
            taste_result: users.taste_result,
            ranking_count: sql<number>`(
                SELECT COUNT(*) 
                FROM ${users_ranking} 
                WHERE ${users_ranking.user_id} = ${users.id}
            )`
        },
        link_json: content.link_json,
    })
        .from(content)
        .leftJoin(users, eq(content.user_id, users.id))
        .leftJoin(clusters, sql`CAST(${users.taste_cluster} AS INTEGER) = ${clusters.cluster_id} `);

    const whereConditions = [
        eq(content.is_deleted, false),
        eq(content.visibility, true)
    ];

    if (filter === 'follow') {
        if (!currentUserId) return [];
        query = query.innerJoin(users_follow,
            and(
                eq(users_follow.follower_id, currentUserId),
                eq(users_follow.following_id, content.user_id)
            )
        );
    } else if (filter === 'like') {
        if (!currentUserId) return [];
        query = query.innerJoin(likes,
            and(
                eq(likes.target_type, 'content'),
                eq(likes.target_id, content.id),
                eq(likes.user_id, currentUserId)
            )
        );
    } else if (filter === 'near') {
        if (userLat === null || userLon === null) {
            return [];
        } else {
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
                ) <= 5
            `);
        }
    }

    const feedItems = await query
        .where(and(...whereConditions))
        .orderBy(desc(content.created_at))
        .limit(limit)
        .offset(offset);

    if (feedItems.length === 0) {
        return [];
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
    const visitCountMap = new Map<number, number>();

    // 3. Batch Fetching
    if (shopIds.size > 0 || companionIds.size > 0) {
        const sIds = Array.from(shopIds);
        const uIds = Array.from(userIds);
        const cIds = Array.from(companionIds);

        if (sIds.length > 0) {
            const shopList = await db.select().from(shops).where(inArray(shops.id, sIds));
            shopList.forEach(s => shopMap.set(s.id, s));

            const rankings = await db.select().from(users_ranking)
                .where(and(
                    inArray(users_ranking.user_id, uIds),
                    inArray(users_ranking.shop_id, sIds)
                ));
            rankings.forEach(r => rankMap.set(getRankKey(r.user_id, r.shop_id), r.rank));

            if (contentIds.length > 0) {
                const contentIdList = contentIds.join(',');
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

        if (cIds.length > 0) {
            const companions = await db.select({
                id: users.id, nickname: users.nickname, profile_image: users.profile_image
            }).from(users).where(inArray(users.id, cIds));
            companions.forEach(c => companionMap.set(c.id, c));
        }
    }

    // 3.5 Interactions (Likes, Comments, Saved) - USER SPECIFIC PART
    const likeCountMap = new Map<number, number>();
    const commentCountMap = new Map<number, number>();
    const likedSet = new Set<number>();
    const savedShopSet = new Set<number>();
    const followingAuthorSet = new Set<number>();
    const myRankMap = new Map<number, any>(); // shopId -> ranking row

    if (contentIds.length > 0) {
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

            if (userIds.size > 0) {
                const follows = await db.select({ following_id: users_follow.following_id }).from(users_follow)
                    .where(and(
                        eq(users_follow.follower_id, currentUserId),
                        inArray(users_follow.following_id, Array.from(userIds))
                    ));
                follows.forEach(f => followingAuthorSet.add(f.following_id));
            }

            if (shopIds.size > 0) {
                const myRankings = await db.select().from(users_ranking)
                    .where(and(
                        eq(users_ranking.user_id, currentUserId),
                        inArray(users_ranking.shop_id, Array.from(shopIds))
                    ));
                myRankings.forEach(r => myRankMap.set(r.shop_id, r));
            }
        }
    }

    // 3.6 Preview Comments
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

    // 4. Enrich & Respond
    return feedItems.map(item => {
        let enrichedProp = item.review_prop as any;
        let poi = undefined;

        if (item.type === 'review' && enrichedProp?.shop_id) {
            const sid = Number(enrichedProp.shop_id);
            const shop = shopMap.get(sid);
            const rank = rankMap.get(getRankKey(item.user_id, sid));
            const visitCount = visitCountMap.get(item.id) || 1;
            const isSaved = savedShopSet.has(sid);
            const myRank = myRankMap.get(sid);

            let myStats = null;
            if (myRank) {
                // Approximate stats for feed (we might not have total_reviews/percentile perfectly calculated without extra queries)
                // But for "Hiding button", existence is enough.
                // We map simplified stats.
                myStats = {
                    satisfaction: myRank.satisfaction_tier, // 2=good, 1=ok, 0=bad
                    rank: myRank.rank,
                    percentile: 0, // Placeholder
                    total_reviews: 0 // Placeholder
                };
            }

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
                    companions_info: displayCompanions,
                    my_review_stats: myStats
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
                    catchtable_ref: shop.catchtable_ref,
                    lat: shop.lat,
                    lon: shop.lon,
                    my_review_stats: myStats
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
                is_saved: poi?.is_bookmarked || false
            },
            preview_comments: previewCommentsMap.get(item.id) || []
        };
    });
}

// Helper: Enrich base feed with live stats (Likes/Comments Counts) - For ALL users
async function enrichFeedWithLiveStats(feed: any[]) {
    if (feed.length === 0) return feed;

    const contentIds = feed.map(i => i.id);

    // Fetch Live Counts
    const likeCountMap = new Map<number, number>();
    const commentCountMap = new Map<number, number>();

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

    // Fetch Live Preview Comments (Latest 2 per content)
    // Using window function to get top 2 efficiently
    const previewCommentsMap = new Map<number, any[]>();

    // SQLite/Postgres compatible Query
    // Note: Drizzle raw sql needed.
    if (contentIds.length > 0) {
        const idsStr = contentIds.join(',');
        const rawPreviews = await db.execute(sql.raw(`
            SELECT * FROM (
                SELECT 
                    c.id, c.content_id, c.text, c.created_at,
                    u.nickname, u.profile_image,
                    ROW_NUMBER() OVER (PARTITION BY c.content_id ORDER BY c.created_at DESC) as rn
                FROM comments c
                LEFT JOIN users u ON c.user_id = u.id
                WHERE c.content_id IN (${idsStr})
                  AND c.is_deleted = false
            ) t
            WHERE rn <= 2
        `));

        rawPreviews.rows.forEach((row: any) => {
            const cid = Number(row.content_id);
            if (!previewCommentsMap.has(cid)) {
                previewCommentsMap.set(cid, []);
            }
            previewCommentsMap.get(cid)?.push({
                id: row.id,
                content_id: cid,
                text: row.text,
                created_at: row.created_at,
                user: {
                    nickname: row.nickname,
                    profile_image: row.profile_image
                }
            });
        });
    }

    return feed.map(item => ({
        ...item,
        stats: {
            ...item.stats,
            likes: likeCountMap.get(item.id) || 0,
            comments: commentCountMap.get(item.id) || 0
        },
        preview_comments: previewCommentsMap.get(item.id) || []
    }));
}

// Helper: Enrich base feed with user-specific data (Is Liked, Is Saved, Is Following)
async function enrichFeedWithUserStatus(feed: any[], userId: number) {
    if (feed.length === 0) return feed;

    // Extract IDs
    const contentIds = feed.map(i => i.id);
    const shopIds = new Set<number>();
    const authorIds = new Set<number>();

    feed.forEach(item => {
        if (item.poi && item.poi.shop_id) shopIds.add(item.poi.shop_id);
        if (item.user && item.user.id) authorIds.add(item.user.id);
    });

    // Fetch Statuses
    const likedSet = new Set<number>();
    const savedShopSet = new Set<number>();
    const followingSet = new Set<number>();
    const myRankMap = new Map<number, any>();

    // 1. Likes
    const myLikes = await db.select({ target_id: likes.target_id }).from(likes)
        .where(and(
            eq(likes.target_type, 'content'),
            eq(likes.user_id, userId),
            inArray(likes.target_id, contentIds)
        ));
    myLikes.forEach(l => likedSet.add(l.target_id));

    // 2. Saved
    if (shopIds.size > 0) {
        const mySaved = await db.select({ shop_id: users_wantstogo.shop_id }).from(users_wantstogo)
            .where(and(
                eq(users_wantstogo.user_id, userId),
                inArray(users_wantstogo.shop_id, Array.from(shopIds)),
                eq(users_wantstogo.is_deleted, false)
            ));
        mySaved.forEach(s => savedShopSet.add(s.shop_id));
    }

    // 3. Following
    if (authorIds.size > 0) {
        const follows = await db.select({ following_id: users_follow.following_id }).from(users_follow)
            .where(and(
                eq(users_follow.follower_id, userId),
                inArray(users_follow.following_id, Array.from(authorIds))
            ));
        follows.forEach(f => followingSet.add(f.following_id));
    }

    // 4. Rankings
    if (shopIds.size > 0) {
        const myRankings = await db.select().from(users_ranking)
            .where(and(
                eq(users_ranking.user_id, userId),
                inArray(users_ranking.shop_id, Array.from(shopIds))
            ));
        myRankings.forEach(r => myRankMap.set(r.shop_id, r));
    }

    // Patch
    return feed.map(item => ({
        ...item,
        user: {
            ...item.user,
            is_following: followingSet.has(item.user.id)
        },
        poi: item.poi ? {
            ...item.poi,
            is_bookmarked: savedShopSet.has(item.poi.shop_id),
            my_review_stats: myRankMap.has(item.poi.shop_id) ? {
                satisfaction: myRankMap.get(item.poi.shop_id).satisfaction_tier,
                rank: myRankMap.get(item.poi.shop_id).rank,
                percentile: 0,
                total_reviews: 0
            } : null
        } : undefined,
        review_prop: (item.review_prop && item.review_prop.shop_id) ? {
            ...item.review_prop,
            my_review_stats: myRankMap.has(Number(item.review_prop.shop_id)) ? {
                satisfaction: myRankMap.get(Number(item.review_prop.shop_id)).satisfaction_tier,
                rank: myRankMap.get(Number(item.review_prop.shop_id)).rank,
                percentile: 0,
                total_reviews: 0
            } : null
        } : item.review_prop,
        stats: {
            ...item.stats,
            is_liked: likedSet.has(item.id),
            is_saved: item.poi ? savedShopSet.has(item.poi.shop_id) : false
        }
    }));
}

// GET /api/content/feed
router.get("/feed", optionalAuth, async (req, res) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const filter = (req.query.filter as string) || 'popular';

        // Location
        const rawLat = parseFloat(req.query.lat as string);
        const rawLon = parseFloat(req.query.lon as string);
        const userLat = Number.isFinite(rawLat) ? rawLat : null;
        const userLon = Number.isFinite(rawLon) ? rawLon : null;

        const currentUserId = req.user?.id || null; // Get from JWT if available

        // Caching Logic: Only for global feed (popular)
        const isGlobal = (filter === 'popular' || filter === '') && !userLat; // popular doesn't use location currently in code, but checking safety

        if (isGlobal) {
            const cacheKey = `feed:global:${page}`;

            // 1. Get Base Data (Cached or Fresh)
            // Note: We fetch with user_id=null to get "clean" data for cache
            let baseFeed = await getOrSetCache(cacheKey, async () => {
                return fetchFeedContent({
                    page, limit, filter, lat: null, lon: null, user_id: null
                });
            }, 300); // 5 min TTL

            // 2. Enrich with Live Stats (Likes/Comments Counts) - ALWAYS
            baseFeed = await enrichFeedWithLiveStats(baseFeed);

            // 3. Enrich if User
            if (currentUserId && baseFeed.length > 0) {
                const enriched = await enrichFeedWithUserStatus(baseFeed, currentUserId);
                return res.json(enriched);
            }

            return res.json(baseFeed);
        } else {
            // Dynamic Feed (No Cache)
            const result = await fetchFeedContent({
                page, limit, filter, lat: userLat, lon: userLon, user_id: currentUserId
            });
            res.json(result);
        }

    } catch (error) {
        console.error("Feed error:", error);
        res.status(500).json({ error: "Failed to fetch feed" });
    }
});

// POST /api/content (Create Review/Post)
router.post("/", requireAuth, async (req, res) => {
    try {
        const user_id = req.user!.id; // Get from JWT
        const { type, text, img, video, review_prop, keyword, link_json, img_text } = req.body;

        if (!type) {
            return res.status(400).json({ error: "type is required" });
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

        // ... (existing code)

        // Invalidation Strategy
        console.log(`[Content Create] Invalidation/Pre-warm starting for user ${user_id}`);

        // 1. Invalidate Global Feed (New post appears)
        await invalidatePattern('feed:global:*');

        // 2. Invalidate User Lists -> PRE-WARM
        console.log(`[Content Create] Invalidating & Pre-warming lists for ${user_id}`);
        await invalidatePattern(`lists:${user_id}*`);
        await invalidatePattern(`share:list:*`); // Invalidate shared lists
        prewarmUserLists(user_id).catch(err => console.error("[Pre-warm] Background Error:", err));

        // 3. Invalidate Shop Reviews if it's a review
        if (type === 'review' && review_prop?.shop_id) {
            const sid = review_prop.shop_id;
            await invalidatePattern(`shop:${sid}:reviews:*`);
            // Also invalidate shop stats if cached?

            // Update users_ranking latest review (Fire & Forget)
            updateRankingLatestReview(user_id, sid).catch(err =>
                console.error("[updateRankingLatestReview] Background Error:", err)
            );
        }

        console.log(`[Content Create] Done`);

        // 4. Refresh Leaderboard (Async/Background)
        // We don't await this to keep response fast, but catching error to prevent crash
        LeaderboardService.refresh().catch(err => console.error("[Leaderboard] Refresh Error:", err));

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
router.post("/ranking/apply", requireAuth, async (req, res) => {
    try {
        const user_id = req.user!.id; // Get from JWT
        const { shop_id, insert_index } = req.body;
        let { satisfaction } = req.body;

        if (!shop_id || insert_index === undefined) {
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

        const result = await db.transaction(async (tx) => {
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

            console.log('[Ranking Apply] Calculation:', {
                user_id,
                shop_id,
                satisfaction,
                new_tier,
                higherTierCount,
                insert_index,
                calculated_rank: higherTierCount + insert_index + 1
            });

            // Debug: Check what tiers exist
            const tierDebug = await tx.select({
                tier: users_ranking.satisfaction_tier,
                count: sql<number>`count(*)`
            })
                .from(users_ranking)
                .where(eq(users_ranking.user_id, user_id))
                .groupBy(users_ranking.satisfaction_tier);
            console.log('[Ranking Apply] Tier distribution:', tierDebug);

            const new_global_rank = higherTierCount + insert_index + 1;

            await tx.update(users_ranking)
                .set({ rank: sql`${users_ranking.rank} + 1` })
                .where(and(eq(users_ranking.user_id, user_id), gte(users_ranking.rank, new_global_rank)));

            // Fetch latest review for this shop
            const latestReview = await tx.select({
                text: content.text,
                img: content.img
            })
                .from(content)
                .where(and(
                    eq(content.user_id, user_id),
                    eq(content.type, 'review'),
                    eq(content.is_deleted, false),
                    sql`CAST(${content.review_prop}->>'shop_id' AS INTEGER) = ${shop_id}`
                ))
                .orderBy(desc(content.created_at))
                .limit(1);

            await tx.insert(users_ranking).values({
                user_id,
                shop_id,
                satisfaction_tier: new_tier,
                rank: new_global_rank,
                latest_review_text: latestReview[0]?.text || null,
                latest_review_images: latestReview[0]?.img || null
            });

            const totalCountRes = await tx.select({ count: sql<number>`count(*)` })
                .from(users_ranking)
                .where(eq(users_ranking.user_id, user_id));
            const totalCount = Number(totalCountRes[0]?.count || 0);

            return { new_global_rank, totalCount };
        });

        res.json({
            success: true,
            shop_id,
            satisfaction_tier: new_tier,
            rank: result.new_global_rank,
            total_count: result.totalCount
        });

        // Invalidate User Lists -> PRE-WARM
        console.log(`[Ranking Apply] Invalidating & Pre-warming lists for ${user_id}`);
        await invalidatePattern(`lists:${user_id}*`);
        await invalidatePattern(`share:list:*`); // Invalidate shared lists
        prewarmUserLists(user_id).catch(err => console.error("[Pre-warm] Background Error:", err));

        // Invalidate Shop Reviews (Ranks changed)
        await invalidatePattern(`shop:${shop_id}:reviews:*`);
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

        const totalCountRes = await db.select({ count: sql<number>`count(*)` })
            .from(users_ranking)
            .where(eq(users_ranking.user_id, userId));
        const totalCount = Number(totalCountRes[0]?.count || 0);

        // Count items in higher tiers to determine base rank if current tier is empty
        const higherTierCountRes = await db.select({ count: sql<number>`count(*)` })
            .from(users_ranking)
            .where(and(
                eq(users_ranking.user_id, userId),
                gt(users_ranking.satisfaction_tier, tier)
            ));
        const higherTierCount = Number(higherTierCountRes[0]?.count || 0);

        res.json({
            candidates,
            total_count: totalCount,
            higher_tier_count: higherTierCount
        });
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

        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const offset = (page - 1) * limit;

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
                taste_result: users.taste_result,
                ranking_count: sql<number>`(
                    SELECT COUNT(*) 
                    FROM ${users_ranking} 
                    WHERE ${users_ranking.user_id} = ${users.id}
                )`
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
            .limit(limit)
            .offset(offset);

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
        let reviewStatsMap = new Map<number, any>();
        if (shopIds.size > 0) {
            const sIds = Array.from(shopIds);
            const shopList = await db.select().from(shops).where(inArray(shops.id, sIds));
            shopList.forEach(s => shopMap.set(s.id, s));

            const rankings = await db.select().from(users_ranking)
                .where(and(eq(users_ranking.user_id, userId), inArray(users_ranking.shop_id, sIds)));
            rankings.forEach(r => rankMap.set(getRankKey(r.user_id, r.shop_id), r.rank));

            // Get my_review_stats for viewer (if viewing own content or if viewer is specified)
            if (viewerId) {
                reviewStatsMap = await getShopReviewStats(sIds, viewerId);
            }

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
                    const myReviewStats = reviewStatsMap.get(sid) || null;
                    enrichedProp = {
                        ...enrichedProp,
                        shop_name: shop.name,
                        shop_address: shop.address_region || shop.address_full,
                        thumbnail_img: shop.thumbnail_img,
                        rank: rank || null,
                        visit_count: visitCount,
                        companions_info: displayCompanions,
                        my_review_stats: myReviewStats
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
                        catchtable_ref: shop.catchtable_ref,
                        lat: shop.lat,
                        lon: shop.lon,
                        my_review_stats: myReviewStats
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
router.post("/:id/like", requireAuth, async (req, res) => {
    try {
        const contentId = parseInt(req.params.id);
        const user_id = req.user!.id; // Get from JWT

        if (!contentId) {
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

            // 좋아요 알림 생성 - 콘텐츠 작성자에게 알림
            const contentData = await db.select({ user_id: content.user_id })
                .from(content)
                .where(eq(content.id, contentId))
                .limit(1);

            if (contentData.length > 0) {
                await createNotification({
                    user_id: contentData[0].user_id,
                    type: 'like',
                    actor_id: user_id,
                    content_id: contentId,
                });
            }
        }

        // Return updated stats
        const stats = await fetchContentStats(contentId, user_id);
        res.json({ success: true, stats });
    } catch (error) {
        console.error("Like error:", error);
        res.status(500).json({ error: "Failed to like" });
    }
});

// DELETE /api/content/:id/like
router.delete("/:id/like", requireAuth, async (req, res) => {
    try {
        const contentId = parseInt(req.params.id);
        const user_id = req.user!.id; // Get from JWT

        if (!contentId) {
            return res.status(400).json({ error: "Missing parameters" });
        }

        await db.delete(likes)
            .where(and(
                eq(likes.target_type, 'content'),
                eq(likes.target_id, contentId),
                eq(likes.user_id, user_id)
            ));

        // Return updated stats
        const stats = await fetchContentStats(contentId, user_id);
        res.json({ success: true, stats });
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
router.post("/:id/comments", requireAuth, async (req, res) => {
    try {
        const contentId = parseInt(req.params.id);
        const user_id = req.user!.id; // Get from JWT
        const { text, parent_id, mention_user_id } = req.body;

        if (!contentId || !text) {
            return res.status(400).json({ error: "Missing parameters" });
        }

        const result = await db.insert(comments).values({
            content_id: contentId,
            user_id,
            text,
            parent_id: parent_id || null,
            mention_user_id: mention_user_id || null
        }).returning();

        // 댓글 알림 생성 - 콘텐츠 작성자에게 알림
        const contentData = await db.select({ user_id: content.user_id })
            .from(content)
            .where(eq(content.id, contentId))
            .limit(1);

        if (contentData.length > 0) {
            await createNotification({
                user_id: contentData[0].user_id,
                type: 'comment',
                actor_id: user_id,
                content_id: contentId,
                comment_id: result[0].id,
            });
        }

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

        // Fetch updated stats & preview comments
        const stats = await fetchContentStats(contentId, user_id);

        // Fetch Preview Comments (Latest 2)
        const rawComments = await db.execute(sql.raw(`
            SELECT 
                c.id, c.content_id, c.text, c.created_at,
                u.nickname, u.profile_image
            FROM comments c
            LEFT JOIN users u ON c.user_id = u.id
            WHERE c.content_id = ${contentId}
              AND c.is_deleted = false
            ORDER BY c.created_at DESC
            LIMIT 2
         `));

        const preview_comments = rawComments.rows.map((row: any) => ({
            id: row.id,
            content_id: Number(row.content_id),
            text: row.text,
            created_at: row.created_at,
            user: { nickname: row.nickname, profile_image: row.profile_image }
        }));

        res.json({
            new_comment: newComment,
            stats,
            preview_comments
        });
    } catch (error) {
        console.error("Create comment error:", error);
        res.status(500).json({ error: "Failed to create comment" });
    }
});

// Helper for single content stats
async function fetchContentStats(contentId: number, currentUserId?: number) {
    const likeCountRes = await db.select({ count: sql<number>`count(*)` })
        .from(likes)
        .where(and(eq(likes.target_type, 'content'), eq(likes.target_id, contentId)));
    const likeCount = Number(likeCountRes[0]?.count || 0);

    const commentCountRes = await db.select({ count: sql<number>`count(*)` })
        .from(comments)
        .where(and(eq(comments.content_id, contentId), eq(comments.is_deleted, false)));
    const commentCount = Number(commentCountRes[0]?.count || 0);

    let is_liked = false;
    let is_saved = false;

    if (currentUserId) {
        const likeCheck = await db.select().from(likes)
            .where(and(eq(likes.target_type, 'content'), eq(likes.target_id, contentId), eq(likes.user_id, currentUserId)))
            .limit(1);
        is_liked = likeCheck.length > 0;

        // Note: For is_saved, we need the shop_id. This might be expensive to fetch here every time if we don't have it.
        // But for consistency, let's fetch the content prop to get shop_id
        const contentItem = await db.select({ review_prop: content.review_prop }).from(content)
            .where(eq(content.id, contentId)).limit(1);

        if (contentItem.length > 0 && contentItem[0].review_prop) {
            const prop = contentItem[0].review_prop as any;
            if (prop.shop_id) {
                const saveCheck = await db.select().from(users_wantstogo)
                    .where(and(
                        eq(users_wantstogo.user_id, currentUserId),
                        eq(users_wantstogo.shop_id, Number(prop.shop_id)),
                        eq(users_wantstogo.is_deleted, false)
                    )).limit(1);
                is_saved = saveCheck.length > 0;
            }
        }
    }

    return { likes: likeCount, comments: commentCount, is_liked, is_saved };
}

// DELETE /api/content/:id
router.delete("/:id", requireAuth, async (req, res) => {
    try {
        const contentId = parseInt(req.params.id);
        const user_id = req.user!.id; // Get from JWT

        if (!contentId) {
            return res.status(400).json({ error: "Missing parameters" });
        }

        // Check ownership
        const target = await db.select().from(content).where(eq(content.id, contentId)).limit(1);
        if (target.length === 0) return res.status(404).json({ error: "Content not found" });
        if (target[0].user_id !== user_id) return res.status(403).json({ error: "Unauthorized" });

        // Soft Delete
        await db.update(content)
            .set({ is_deleted: true, updated_at: new Date() })
            .where(eq(content.id, contentId));

        // Invalidate Cache
        await invalidatePattern('feed:global:*');
        await invalidatePattern(`lists:${user_id}*`);
        await invalidatePattern(`share:list:*`); // Invalidate shared lists

        // If it was a shop review, invalidate shop reviews
        const reviewProp = target[0].review_prop as any;
        if (reviewProp?.shop_id) {
            await invalidatePattern(`shop:${reviewProp.shop_id}:reviews:*`);

            // Update users_ranking latest review (Fire & Forget)
            updateRankingLatestReview(user_id, reviewProp.shop_id).catch(err =>
                console.error("[updateRankingLatestReview] Background Error:", err)
            );
        }

        console.log(`[Content Delete] Content ${contentId} soft deleted by user ${user_id}`);

        res.json({ success: true });
    } catch (error) {
        console.error("Delete content error:", error);
        res.status(500).json({ error: "Failed to delete content" });
    }
});

// GET /api/content/:id - Get single content item
// This route must be defined AFTER all other /:id/* routes
router.get("/:id", optionalAuth, async (req, res) => {
    try {
        const contentId = parseInt(req.params.id);
        if (!contentId) {
            return res.status(400).json({ error: "Invalid content ID" });
        }

        const currentUserId = req.user?.id || null;

        // Fetch content with user info
        const contentItem = await db.select({
            id: content.id,
            user_id: content.user_id,
            type: content.type,
            text: content.text,
            img: content.img,
            created_at: content.created_at,
            review_prop: content.review_prop,
            keyword: content.keyword,
            img_text: content.img_text,
            link_json: content.link_json,
            user: {
                id: users.id,
                nickname: users.nickname,
                account_id: users.account_id,
                profile_image: users.profile_image,
                cluster_name: clusters.name,
                taste_result: users.taste_result,
                ranking_count: sql<number>`(
                    SELECT COUNT(*)
                    FROM ${users_ranking}
                    WHERE ${users_ranking.user_id} = ${users.id}
                )`
            }
        })
            .from(content)
            .leftJoin(users, eq(content.user_id, users.id))
            .leftJoin(clusters, sql`CAST(${users.taste_cluster} AS INTEGER) = ${clusters.cluster_id}`)
            .where(and(
                eq(content.id, contentId),
                eq(content.is_deleted, false)
            ))
            .limit(1);

        if (contentItem.length === 0) {
            return res.status(404).json({ error: "Content not found" });
        }

        const item = contentItem[0];

        // Fetch shop info if it's a review
        let poi = null;
        let rankInfo = null;
        let visitCount = null;
        let companionsInfo = null;

        if (item.type === 'review' && item.review_prop) {
            const prop = item.review_prop as any;
            if (prop.shop_id) {
                const shopId = Number(prop.shop_id);
                const shopList = await db.select().from(shops).where(eq(shops.id, shopId)).limit(1);
                if (shopList.length > 0) {
                    poi = { shop_id: shopId, ...shopList[0] };
                }

                // Fetch ranking info
                const rankingData = await db.select({
                    rank: users_ranking.rank,
                    satisfaction_tier: users_ranking.satisfaction_tier
                }).from(users_ranking)
                    .where(and(
                        eq(users_ranking.user_id, item.user_id),
                        eq(users_ranking.shop_id, shopId)
                    ))
                    .limit(1);

                if (rankingData.length > 0) {
                    rankInfo = rankingData[0];
                }

                // Count visit number
                const visitCountResult = await db.execute(sql`
                    SELECT COUNT(*) as count
                    FROM ${content}
                    WHERE user_id = ${item.user_id}
                        AND type = 'review'
                        AND is_deleted = false
                        AND CAST(review_prop->>'shop_id' AS INTEGER) = ${shopId}
                        AND created_at <= ${item.created_at}
                `);
                if (visitCountResult.rows.length > 0) {
                    visitCount = Number(visitCountResult.rows[0].count);
                }
            }

            // Fetch companion info
            if (prop.companions && Array.isArray(prop.companions) && prop.companions.length > 0) {
                const companionIds = prop.companions.map((id: any) => Number(id));
                const companions = await db.select({
                    id: users.id,
                    nickname: users.nickname,
                    profile_image: users.profile_image
                }).from(users).where(inArray(users.id, companionIds));
                companionsInfo = companions;
            }
        }

        // Fetch stats
        const stats = await fetchContentStats(contentId, currentUserId || undefined);

        // Enrich review_prop with additional data
        let enrichedReviewProp = item.review_prop;
        if (enrichedReviewProp && item.type === 'review') {
            enrichedReviewProp = {
                ...enrichedReviewProp,
                ...(rankInfo && {
                    rank: rankInfo.rank,
                    satisfaction: rankInfo.satisfaction_tier === 2 ? 'good' : rankInfo.satisfaction_tier === 1 ? 'ok' : 'bad'
                }),
                ...(visitCount && { visit_count: visitCount }),
                ...(companionsInfo && { companions_info: companionsInfo })
            };
        }

        // Return enriched content
        res.json({
            ...item,
            review_prop: enrichedReviewProp,
            poi,
            stats,
            images: item.img || [],
        });

    } catch (error) {
        console.error("Get content error:", error);
        res.status(500).json({ error: "Failed to fetch content" });
    }
});

export default router;
