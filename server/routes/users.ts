import { Router } from "express";
import { db } from "../db/index.js";
import { users, clusters, shops, users_wantstogo, users_follow, content, likes, users_ranking, leaderboard } from "../db/schema.js";
import { eq, and, desc, sql, ilike, isNotNull, inArray } from "drizzle-orm";
import { getShopMatchScores, getShopReviewStats } from "../utils/enricher.js";
import { getOrSetCache } from "../redis.js";
import { requireAuth, optionalAuth } from "../middleware/auth.js";
import { createNotification } from "./notifications.js";

const router = Router();

router.get("/check-handle", async (req, res) => {
    try {
        const { handle } = req.query;
        if (!handle || typeof handle !== 'string') {
            return res.status(400).json({ error: "Handle is required" });
        }

        const existingUser = await db.select().from(users).where(eq(users.account_id, handle)).limit(1);

        if (existingUser.length > 0) {
            return res.json({ available: false });
        }
        res.json({ available: true });
    } catch (error) {
        console.error("Check handle error:", error);
        res.status(500).json({ error: "Failed to check handle" });
    }
});

// GET /leaderboard/keys - Get available keys for a type
router.get("/leaderboard/keys", async (req, res) => {
    try {
        const type = (req.query.type as string)?.toUpperCase() || 'COMPANY';

        if (type !== 'COMPANY' && type !== 'NEIGHBORHOOD') {
            return res.status(400).json({ error: "Type must be COMPANY or NEIGHBORHOOD" });
        }

        const cacheKey = `leaderboard:keys:${type}`;

        const result = await getOrSetCache(cacheKey, async () => {
            const keys = await db.execute(sql`
                SELECT DISTINCT key FROM leaderboard
                WHERE type = ${type} AND key IS NOT NULL
                ORDER BY key
            `);
            return keys.rows.map((r: any) => r.key);
        }, 3600);

        res.json(result);
    } catch (error) {
        console.error("Leaderboard keys error:", error);
        res.status(500).json({ error: "Failed to fetch leaderboard keys" });
    }
});

// GET /leaderboard
router.get("/leaderboard", async (req, res) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const filter = (req.query.filter as string) || '';
        const key = (req.query.key as string) || null;  // Group name or neighborhood
        let limit = parseInt(req.query.limit as string) || 20;

        // Determine Type
        let type = 'OVERALL';
        if (filter === 'company') {
            type = 'COMPANY';
        } else if (filter === 'neighborhood') {
            type = 'NEIGHBORHOOD';
        }

        if (filter === 'company' || filter === 'neighborhood') {
            limit = 100;
        }

        const offset = (page - 1) * limit;
        const cacheKey = `leaderboard:${type}:${key || 'all'}:${limit}:${page}`;

        const result = await getOrSetCache(cacheKey, async () => {
            // Build where condition
            let whereCondition;
            if (key && (type === 'COMPANY' || type === 'NEIGHBORHOOD')) {
                whereCondition = and(eq(leaderboard.type, type), eq(leaderboard.key, key));
            } else {
                whereCondition = eq(leaderboard.type, type);
            }

            // Query Cache
            const cachedLeaderboard = await db.select({
                id: users.id,
                nickname: users.nickname,
                account_id: users.account_id,
                email: users.email,
                profile_image: users.profile_image,
                cluster_name: clusters.name,
                taste_result: users.taste_result,
                group_id: users.group_id,
                neighborhood: users.neighborhood,
                rank: leaderboard.rank,
                score: leaderboard.score,
                stats: leaderboard.stats,
                leaderboard_key: leaderboard.key
            })
                .from(leaderboard)
                .innerJoin(users, eq(leaderboard.user_id, users.id))
                .leftJoin(clusters, sql`CAST(${users.taste_cluster} AS INTEGER) = ${clusters.cluster_id}`)
                .where(whereCondition)
                .orderBy(leaderboard.rank)
                .limit(limit)
                .offset(offset);

            // Map to response format
            return cachedLeaderboard.map(row => ({
                rank: row.rank,
                user: {
                    id: row.id,
                    nickname: row.nickname,
                    account_id: row.account_id,
                    profile_image: row.profile_image,
                    cluster_name: row.cluster_name,
                    taste_result: row.taste_result,
                    group_id: row.group_id,
                    neighborhood: row.neighborhood
                },
                score: row.score,
                key: row.leaderboard_key
            }));
        }, 3600); // 1 hour TTL

        res.json(result);

    } catch (error) {
        console.error("Leaderboard error:", error);
        res.status(500).json({ error: "Failed to fetch leaderboard" });
    }
});

// GET /:id (Get User Profile + Context)
router.get("/:id", async (req, res) => {
    try {
        const paramId = req.params.id;
        const viewerId = req.query.viewerId ? parseInt(req.query.viewerId as string) : null;

        // Define columns to select
        const userFields = {
            id: users.id,
            account_id: users.account_id,
            nickname: users.nickname,
            bio: users.bio,
            link: users.link,
            profile_image: users.profile_image,
            email: users.email,
            visible_rank: users.visible_rank,
            taste_cluster: users.taste_cluster,
            taste_result: users.taste_result,
            created_at: users.created_at,
            updated_at: users.updated_at
        };

        let user;
        // Check if paramId is a pure number
        if (/^\d+$/.test(paramId)) {
            user = await db.select(userFields).from(users).where(eq(users.id, parseInt(paramId))).limit(1);
        } else {
            user = await db.select(userFields).from(users).where(eq(users.account_id, paramId)).limit(1);
        }

        if (user.length === 0) {
            return res.status(404).json({ error: "User not found" });
        }
        const userData = user[0];
        const id = userData.id; // Correct numeric ID to use for stats

        let clusterInfo = null;

        if (userData.taste_cluster) {
            // taste_cluster is stored as string ID (e.g. "1")
            const clusterId = parseInt(userData.taste_cluster);
            if (!isNaN(clusterId)) {
                const cluster = await db.select().from(clusters).where(eq(clusters.cluster_id, clusterId)).limit(1);
                if (cluster.length > 0) {
                    clusterInfo = {
                        cluster_name: cluster[0].name,
                        cluster_tagline: cluster[0].tagline
                    };
                }
            }
        }

        // Stats Counts
        // Stats Counts & Is Following (Parallel)
        // Stats Counts
        // Wrapped in transaction to enforce "no parallel workers" setting to avoid "parallel worker failed to initialize" error
        const { contentCount, followerCount, followingCount, rankingCount, isFollowingRes } = await db.transaction(async (tx) => {
            // Disable parallel workers for this transaction
            await tx.execute(sql`SET LOCAL max_parallel_workers_per_gather = 0`);

            // 1. Content Count
            const contentCountRes = await tx.select({ count: sql<number>`count(*)` })
                .from(content)
                .where(and(eq(content.user_id, id), eq(content.is_deleted, false)));

            // 2. Follower Count
            const followerCountRes = await tx.select({ count: sql<number>`count(*)` })
                .from(users_follow)
                .where(eq(users_follow.following_id, id));

            // 3. Following Count
            const followingCountRes = await tx.select({ count: sql<number>`count(*)` })
                .from(users_follow)
                .where(eq(users_follow.follower_id, id));

            // 4. Ranking Count
            const rankingCountRes = await tx.select({ count: sql<number>`count(*)` })
                .from(users_ranking)
                .where(eq(users_ranking.user_id, id));

            // 5. Is Following Check
            let isFollowing = false;
            if (viewerId) {
                const check = await tx.select().from(users_follow)
                    .where(and(
                        eq(users_follow.follower_id, viewerId),
                        eq(users_follow.following_id, id)
                    )).limit(1);
                isFollowing = check.length > 0;
            }

            return {
                contentCount: Number(contentCountRes[0]?.count || 0),
                followerCount: Number(followerCountRes[0]?.count || 0),
                followingCount: Number(followingCountRes[0]?.count || 0),
                rankingCount: Number(rankingCountRes[0]?.count || 0),
                isFollowingRes: isFollowing
            };
        });



        res.json({
            ...userData,
            ...clusterInfo,
            stats: {
                content_count: contentCount,
                follower_count: followerCount,
                following_count: followingCount,
                ranking_count: rankingCount
            },
            is_following: isFollowingRes
        });
    } catch (error) {
        console.error("Fetch user error:", error);
        res.status(500).json({ error: "Failed to fetch user" });
    }
});

router.put("/:id", async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { account_id, nickname, bio, link, profile_image, phone, birthdate, gender, taste_cluster, taste_result } = req.body;

        const updatedUser = await db.update(users)
            .set({
                account_id,
                nickname,
                bio,
                link,
                profile_image,
                phone,
                birthdate,
                gender,
                taste_cluster,
                taste_result,
                updated_at: new Date()
            })
            .where(eq(users.id, id))
            .returning();

        res.json(updatedUser[0]);
    } catch (error: any) {
        console.error("Update error:", error);
        if (error.code === '23505') {
            return res.status(409).json({ error: "Phone number or Account ID already in use" });
        }
        res.status(500).json({ error: "Failed to update user" });
    }
});

router.get("/:id/saved_shops", optionalAuth, async (req, res) => {
    try {
        const id = parseInt(req.params.id);

        // Fetch saved shops
        const savedShops = await db.select({
            id: shops.id,
            name: shops.name,
            description: shops.description,
            address_full: shops.address_full,
            thumbnail_img: shops.thumbnail_img,
            kind: shops.kind,
            food_kind: shops.food_kind,
            lat: shops.lat,
            lon: shops.lon,
            saved_at: users_wantstogo.created_at,
            catchtable_ref: shops.catchtable_ref
        })
            .from(users_wantstogo)
            .innerJoin(shops, eq(users_wantstogo.shop_id, shops.id))
            .where(and(
                eq(users_wantstogo.user_id, id),
                eq(users_wantstogo.is_deleted, false)
            ))
            .orderBy(desc(users_wantstogo.created_at));

        // Enrich with Match Score & My Rank
        const uid = req.user?.id || 0;

        const shopIds = savedShops.map(s => s.id);
        const matchScoresMap = await getShopMatchScores(shopIds, uid);
        const reviewStatsMap = await getShopReviewStats(shopIds, uid);

        // Fetch My Rank (if viewer is looking at their own saved list, or public list)
        // Usually 'my_rank' refers to the ranking of the VIEWER (uid), not the list owner (id).
        // If I am looking at someone else's list, 'my_rank' should be MY rank.
        // Assuming 'my_rank' means "Did I (viewer) visit this?".
        const myRanksMap = new Map<number, number>();
        if (uid > 0 && shopIds.length > 0) {
            const myRanks = await db.select({
                shop_id: users_ranking.shop_id,
                rank: users_ranking.rank
            }).from(users_ranking)
                .where(and(
                    eq(users_ranking.user_id, uid),
                    inArray(users_ranking.shop_id, shopIds)
                ));

            myRanks.forEach(r => myRanksMap.set(r.shop_id, r.rank));
        }

        // Enrich with is_saved=true, match_score, and my_review_stats
        const enriched = savedShops.map(shop => ({
            ...shop,
            is_saved: true,
            shop_user_match_score: matchScoresMap.get(shop.id) || null,
            my_rank: myRanksMap.get(shop.id) || null,
            my_review_stats: reviewStatsMap.get(shop.id) || null
        }));

        res.json(enriched);
    } catch (error) {
        console.error("Fetch saved shops error:", error);
        res.status(500).json({ error: "Failed to fetch saved shops" });
    }
});

// POST /:id/saved_shops removed (Use /api/shops/:id/save)

router.get("/:id/followers", async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const followers = await db.select({
            id: users.id,
            nickname: users.nickname,
            account_id: users.account_id,
            profile_image: users.profile_image,
            bio: users.bio
        })
            .from(users_follow)
            .innerJoin(users, eq(users_follow.follower_id, users.id))
            .where(eq(users_follow.following_id, id))
            .orderBy(desc(users_follow.created_at));

        res.json(followers);
    } catch (error) {
        console.error("Fetch followers error:", error);
        res.status(500).json({ error: "Failed to fetch followers" });
    }
});

router.get("/:id/following", async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const following = await db.select({
            id: users.id,
            nickname: users.nickname,
            account_id: users.account_id,
            profile_image: users.profile_image,
            bio: users.bio
        })
            .from(users_follow)
            .innerJoin(users, eq(users_follow.following_id, users.id))
            .where(eq(users_follow.follower_id, id))
            .orderBy(desc(users_follow.created_at));

        res.json(following);
    } catch (error) {
        console.error("Fetch following error:", error);
        res.status(500).json({ error: "Failed to fetch following" });
    }
});

// POST /:id/follow (Toggle Follow)
router.post("/:id/follow", requireAuth, async (req, res) => {
    try {
        const targetId = parseInt(req.params.id);
        const followerId = req.user!.id; // Get from JWT

        if (isNaN(targetId)) {
            return res.status(400).json({ error: "Invalid parameters" });
        }

        if (followerId === targetId) {
            return res.status(400).json({ error: "Cannot follow yourself" });
        }

        // Check if already following
        const existing = await db.select().from(users_follow)
            .where(and(
                eq(users_follow.follower_id, followerId),
                eq(users_follow.following_id, targetId)
            )).limit(1);

        if (existing.length > 0) {
            // Unfollow
            await db.delete(users_follow)
                .where(eq(users_follow.id, existing[0].id));
            return res.json({ following: false });
        } else {
            // Follow
            await db.insert(users_follow).values({
                follower_id: followerId,
                following_id: targetId
            });

            // 팔로우 알림 생성
            await createNotification({
                user_id: targetId,
                type: 'follow',
                actor_id: followerId,
            });

            return res.json({ following: true });
        }

    } catch (error) {
        console.error("Follow toggle error:", error);
        res.status(500).json({ error: "Failed to toggle follow" });
    }
});


import { ListService } from "../services/ListService.js";

// ... (existing imports, but remove unused ones if possible, though safe to keep for now)

// GET /:id/lists (Grouped Rankings)
router.get("/:id/lists", async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const cacheKey = `lists:${id}`;

        const lists = await getOrSetCache(cacheKey, async () => {
            return await ListService.fetchUserLists(id);
        }, 3600);

        if (!lists) return res.status(404).json({ error: "User not found" });

        res.json(lists);

    } catch (error) {
        console.error("Fetch lists error:", error);
        res.status(500).json({ error: "Failed to fetch lists" });
    }
});

// GET /:id/lists/detail
router.get("/:id/lists/detail", async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const type = req.query.type as string; // OVERALL, REGION, CATEGORY
        const value = req.query.value as string;
        const viewerId = req.query.viewer_id ? parseInt(req.query.viewer_id as string) : null;

        const cacheKey = `lists:${id}:detail:${type}:${value || 'all'}`;

        const results = await getOrSetCache(cacheKey, async () => {
            return await ListService.fetchUserListDetail(id, type, value);
        }, 3600);

        // If viewer_id is provided, enrich with viewer's ranking stats
        if (viewerId && results.length > 0) {
            const shopIds = results.map((item: any) => item.shop.id);
            const { getShopReviewStats } = await import("../utils/enricher.js");
            const reviewStatsMap = await getShopReviewStats(shopIds, viewerId);

            // Enrich each item with my_review_stats
            results.forEach((item: any) => {
                item.my_review_stats = reviewStatsMap.get(item.shop.id) || null;
            });
        }

        res.json(results);

    } catch (error) {
        console.error("Fetch list detail error:", error);
        res.status(500).json({ error: "Failed to fetch list detail" });
    }
});

export default router;
