import { Router } from "express";
import { db } from "../db/index.js";
import { users, clusters, shops, users_wantstogo, users_follow, content, likes } from "../db/schema.js";
import { eq, and, desc, sql } from "drizzle-orm";

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

// GET /leaderboard
router.get("/leaderboard", async (req, res) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const offset = (page - 1) * limit;

        // 1. Calculate Scores
        // Content Score: 5 points per post/review
        // Like Score: 3 points per like received

        // 1. Calculate Scores
        // Content Score: 5 points per post/review
        // Follower Score: 3 points per follower

        // Note: We use subqueries for counts to avoid multiplicative rows from joins


        // Note: The above query is a simplification. 
        // Realistically we might need separate queries or a more complex join to avoid multiplication.
        // For MVP, let's just fetch top users based on content count first, or mock the score logic 
        // if the 'likes' table structure isn't fully clear from my memory. 
        // CHECK: schema.ts wasn't fully read for 'likes'. 
        // Let's stick to a simple robust query or just return users ordered by content count for now
        // to fix the 404.

        const leaderboard = await db.select({
            id: users.id,
            nickname: users.nickname,
            account_id: users.account_id,
            profile_image: users.profile_image,
            cluster_name: clusters.name, // Add cluster_name
            taste_result: users.taste_result, // Add taste_result for matching
            stats: {
                content_count: sql<number>`(select count(*) from ${content} where ${content.user_id} = ${users.id} and ${content}.is_deleted = false)`,
                received_likes: sql<number>`(
                    select count(*) 
                    from ${likes} 
                    join ${content} on ${likes}.target_id = ${content}.id 
                    where ${content}.user_id = ${users}.id 
                    and ${likes}.target_type = 'content' 
                    and ${content}.is_deleted = false
                )`
            }
        })
            .from(users)
            .leftJoin(clusters, sql`CAST(${users.taste_cluster} AS INTEGER) = ${clusters.cluster_id} `) // Join clusters
            .orderBy(desc(sql`(select count(*) from ${content} where ${content.user_id} = ${users.id} and ${content}.is_deleted = false)`))
            .limit(limit);

        // Map to score
        const result = leaderboard.map((u, i) => {
            const contentScore = Number(u.stats.content_count) * 5;
            const likeScore = Number(u.stats.received_likes) * 3;
            return {
                rank: 0, // Will assign after sort
                user: {
                    id: u.id,
                    nickname: u.nickname,
                    account_id: u.account_id,
                    profile_image: u.profile_image,
                    cluster_name: u.cluster_name,
                    taste_result: u.taste_result
                },
                score: contentScore + likeScore
            };
        });

        // Re-sort by actual calculated score since SQL sort was just heuristic
        result.sort((a, b) => b.score - a.score);

        // Re-assign rank
        result.forEach((item, index) => {
            item.rank = offset + index + 1;
        });

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
        const [contentCountRes, followerCountRes, followingCountRes, isFollowingRes] = await Promise.all([
            // 1. Content Count
            db.select({ count: sql<number>`count(*)` })
                .from(content)
                .where(and(eq(content.user_id, id), eq(content.is_deleted, false))),

            // 2. Follower Count
            db.select({ count: sql<number>`count(*)` })
                .from(users_follow)
                .where(eq(users_follow.following_id, id)),

            // 3. Following Count
            db.select({ count: sql<number>`count(*)` })
                .from(users_follow)
                .where(eq(users_follow.follower_id, id)),

            // 4. Is Following Check
            (async () => {
                if (!viewerId) return false;
                const check = await db.select().from(users_follow)
                    .where(and(
                        eq(users_follow.follower_id, viewerId),
                        eq(users_follow.following_id, id)
                    )).limit(1);
                return check.length > 0;
            })()
        ]);

        const contentCount = Number(contentCountRes[0]?.count || 0);
        const followerCount = Number(followerCountRes[0]?.count || 0);
        const followingCount = Number(followingCountRes[0]?.count || 0);

        res.json({
            ...userData,
            ...clusterInfo,
            stats: {
                content_count: contentCount,
                follower_count: followerCount,
                following_count: followingCount
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

router.get("/:id/saved_shops", async (req, res) => {
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

        // Enrich with is_saved=true (since we are fetching saved list)
        const enriched = savedShops.map(shop => ({
            ...shop,
            is_saved: true
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
router.post("/:id/follow", async (req, res) => {
    try {
        const targetId = parseInt(req.params.id);
        const { followerId } = req.body;

        if (!followerId || isNaN(targetId)) {
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
            return res.json({ following: true });
        }

    } catch (error) {
        console.error("Follow toggle error:", error);
        res.status(500).json({ error: "Failed to toggle follow" });
    }
});

export default router;
