import { Router } from "express";
import { db } from "../db/index.js";
import { users, clusters, shops, users_wantstogo, users_follow, content } from "../db/schema.js";
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

router.get("/:id", async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const user = await db.select().from(users).where(eq(users.id, id)).limit(1);

        if (user.length === 0) {
            return res.status(404).json({ error: "User not found" });
        }
        const userData = user[0];
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
        // 1. Content Count
        const contentCountRes = await db.select({ count: sql<number>`count(*)` })
            .from(content)
            .where(and(
                eq(content.user_id, id),
                eq(content.is_deleted, false)
                // Optional: Create simple posts vs reviews split if needed, effectively "Content" implies both
            ));
        const contentCount = Number(contentCountRes[0]?.count || 0);

        // 2. Follower Count (People following this user)
        const followerCountRes = await db.select({ count: sql<number>`count(*)` })
            .from(users_follow)
            .where(eq(users_follow.following_id, id));
        const followerCount = Number(followerCountRes[0]?.count || 0);

        // 3. Following Count (People this user follows)
        const followingCountRes = await db.select({ count: sql<number>`count(*)` })
            .from(users_follow)
            .where(eq(users_follow.follower_id, id));
        const followingCount = Number(followingCountRes[0]?.count || 0);

        res.json({
            ...userData,
            ...clusterInfo,
            stats: {
                content_count: contentCount,
                follower_count: followerCount,
                following_count: followingCount
            }
        });
    } catch (error) {
        console.error("Fetch user error:", error);
        res.status(500).json({ error: "Failed to fetch user" });
    }
});

router.put("/:id", async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { account_id, nickname, bio, link, profile_image, phone, birthdate, gender, taste_cluster } = req.body;

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
            saved_at: users_wantstogo.created_at
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

export default router;
