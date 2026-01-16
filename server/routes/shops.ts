
import { Router } from "express";
import { db } from "../db/index.js";
import { shops, users_wantstogo, content, users } from "../db/schema.js";
import { ilike, or, eq, sql, and, desc, asc, not } from "drizzle-orm";
import fs from 'fs';
import path from 'path';

const router = Router();

// GET /api/shops/discovery?page=1&limit=20&seed=123
// Returns random shops consistently for the same seed
router.get("/discovery", async (req, res) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const seed = req.query.seed || 'default_seed';

        // Bounding Box Params
        const minLat = req.query.minLat ? parseFloat(req.query.minLat as string) : null;
        const maxLat = req.query.maxLat ? parseFloat(req.query.maxLat as string) : null;
        const minLon = req.query.minLon ? parseFloat(req.query.minLon as string) : null;
        const maxLon = req.query.maxLon ? parseFloat(req.query.maxLon as string) : null;

        let query = db.select({
            id: shops.id,
            name: shops.name,
            description: shops.description,
            address_full: shops.address_full,
            thumbnail_img: shops.thumbnail_img,
            kind: shops.kind,
            lat: shops.lat,
            lon: shops.lon,
            catchtable_ref: shops.catchtable_ref
        }).from(shops).$dynamic();

        if (minLat && maxLat && minLon && maxLon) {
            query = query.where(and(
                sql`${shops.lat} >= ${minLat}`,
                sql`${shops.lat} <= ${maxLat}`,
                sql`${shops.lon} >= ${minLon}`,
                sql`${shops.lon} <= ${maxLon}`
            ));
        }

        // Use MD5 hash of (id || seed) for consistent random sort
        const results = await query
            .orderBy(sql`md5(${shops.id}::text || ${seed})`)
            .limit(limit)
            .offset((page - 1) * limit);

        // If user is logged in (client sends header/param?), we should enrich `is_saved`.
        // For MVP, assuming client might fetch status or we assume generic feed first.
        // Let's check query `userId` for simple auth context if needed, or just return shops.
        // User requested: "Refresh resets".

        // Enrich with "is_saved" if userId is present in query header (custom simple auth)
        // Or handle in frontend. Let's try to handle it here if passed.
        const userId = req.headers['x-user-id'];

        if (userId) {
            const uid = parseInt(userId as string);
            const enriched = await Promise.all(results.map(async (shop) => {
                const saved = await db.select().from(users_wantstogo)
                    .where(and(
                        eq(users_wantstogo.user_id, uid),
                        eq(users_wantstogo.shop_id, shop.id),
                        eq(users_wantstogo.is_deleted, false)
                    ))
                    .limit(1);
                return {
                    ...shop,
                    is_saved: saved.length > 0,
                    saved_at: saved.length > 0 ? saved[0].created_at : null
                };
            }));
            return res.json(enriched);
        }

        res.json(results);
    } catch (error) {
        console.error("Discovery feed error:", error);
        res.status(500).json({ error: "Failed to fetch discovery feed" });
    }
});

// POST /api/shops/:id/save
// Toggle save status
router.post("/:id/save", async (req, res) => {
    try {
        const shopId = parseInt(req.params.id);
        const { userId } = req.body; // Expect userId in body for MVP auth

        if (!userId || isNaN(shopId)) {
            return res.status(400).json({ error: "Invalid parameters" });
        }

        // Check if exists
        const existing = await db.select().from(users_wantstogo)
            .where(and(
                eq(users_wantstogo.user_id, userId),
                eq(users_wantstogo.shop_id, shopId)
            ))
            .limit(1);

        let isSaved = false;

        if (existing.length > 0) {
            // Toggle deletion status or remove
            // Spec says "users_wantstogo" table has is_deleted.
            const current = existing[0];
            if (current.is_deleted) {
                // Restore
                await db.update(users_wantstogo)
                    .set({ is_deleted: false, updated_at: new Date() })
                    .where(eq(users_wantstogo.id, current.id));
                isSaved = true;
            } else {
                // Delete (Soft)
                await db.update(users_wantstogo)
                    .set({ is_deleted: true, updated_at: new Date() })
                    .where(eq(users_wantstogo.id, current.id));
                isSaved = false;
            }
        } else {
            // Insert
            await db.insert(users_wantstogo).values({
                user_id: userId,
                shop_id: shopId,
                channel: 'discovery', // Default channel
                is_deleted: false
            });
            isSaved = true;
        }

        res.json({ success: true, is_saved: isSaved });
    } catch (error) {
        console.error("Save shop error:", error);
        res.status(500).json({ error: "Failed to save shop" });
    }
});

// GET /api/shops/search?q=query
router.get("/search", async (req, res) => {
    try {
        const { q } = req.query;
        if (!q || typeof q !== 'string') {
            return res.json([]);
        }

        const query = `%${q}%`;
        const results = await db.select()
            .from(shops)
            .where(
                or(
                    ilike(shops.name, query),
                    ilike(shops.address_full, query)
                )
            )
            .limit(20);

        res.json(results);
    } catch (error) {
        console.error("Shop search error:", error);
        res.status(500).json({ error: "Failed to search shops" });
    }
});

// GET /api/shops/:id
router.get("/:id", async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            return res.status(400).json({ error: "Invalid ID" });
        }
        const results = await db.select().from(shops).where(eq(shops.id, id)).limit(1);

        if (results.length === 0) {
            return res.status(404).json({ error: "Shop not found" });
        }
        res.json(results[0]);
    } catch (error) {
        console.error("Shop details error:", error);
        res.status(500).json({ error: "Failed to fetch shop details" });
    }
});


// GET /api/shops/:id/reviews
router.get("/:id/reviews", async (req, res) => {
    try {
        const shopId = parseInt(req.params.id);
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const sort = (req.query.sort as string) || 'popular'; // 'popular' | 'similar'
        const userId = req.query.user_id ? parseInt(req.query.user_id as string) : null;
        const offset = (page - 1) * limit;

        if (isNaN(shopId)) {
            return res.status(400).json({ error: "Invalid Shop ID" });
        }

        // 1. Base Query
        let query = db.select({
            id: content.id,
            user_id: content.user_id,
            text: content.text,
            img: content.img,
            created_at: content.created_at,
            review_prop: content.review_prop,
            keyword: content.keyword,
            user: {
                id: users.id,
                nickname: users.nickname,
                profile_image: users.profile_image,
                taste_cluster: users.taste_cluster,
                cluster_name: users.taste_cluster, // Map for ContentCard
                taste_result: users.taste_result
            }
        })
            .from(content)
            .innerJoin(users, eq(content.user_id, users.id))
            .where(and(
                eq(content.type, 'review'),
                eq(content.is_deleted, false),
                eq(content.visibility, true),
                sql`(${content.review_prop}::jsonb)->>'shop_id' = ${shopId.toString()}::text`
            )).$dynamic();

        // 2. Sorting Logic
        if (sort === 'similar' && userId) {
            // Fetch Requesting User's Cluster
            const requestingUser = await db.select({ taste_cluster: users.taste_cluster })
                .from(users)
                .where(eq(users.id, userId))
                .limit(1);

            const userCluster = requestingUser[0]?.taste_cluster;

            if (userCluster) {
                // Sort by: (user.taste_cluster == userCluster) DESC, created_at DESC
                query = query.orderBy(
                    sql`CASE WHEN ${users.taste_cluster} = ${userCluster}::text THEN 1 ELSE 0 END DESC`,
                    desc(content.created_at)
                );
            } else {
                // Fallback if no cluster
                query = query.orderBy(desc(content.created_at));
            }
        } else {
            // Default: Popular (Newest for now per spec "Inki is newest")
            query = query.orderBy(desc(content.created_at));
        }

        // 3. Execute & Pagination
        const reviews = await query.limit(limit).offset(offset);

        // 4. Enrich (Optional: Like counts, etc. if needed later, keeping it simple for now)
        // Similar to feed, we might want stats. adhering to "Review List" requirements.

        // Read cluster data for name mapping
        // Note: In a real app key-value cache or DB table is better.
        // Assuming we can read it once or cache it.
        // For now, let's just map it if we have the ID.
        // Since we can't easily import JSON with strict TS settings sometimes, we'll try reading or use a helper if available.
        // But to keep it simple within this file scope without top-level quirks:

        // Actually, let's just do it in the map loop if we can load the data.
        // Or better, let's assume the ID is what we have and we need to fetch the name.
        // Let's rely on `users` table potentially having it? No, schema says `taste_cluster` is varchar(50) and user usually only stores ID or Name?
        // Memory says users.taste_cluster stores ID.

        // Let's load the file at the top or here.
        const clusterPath = path.join(process.cwd(), 'server/data/cluster.json');
        const clusterData = JSON.parse(fs.readFileSync(clusterPath, 'utf-8')) as Array<{ cluster_id: string, cluster_name: string }>;
        const clusterMap = new Map(clusterData.map(c => [c.cluster_id, c.cluster_name]));

        const result = reviews.map(r => ({
            id: r.id,
            user: {
                ...r.user,
                cluster_name: r.user.taste_cluster ? (clusterMap.get(r.user.taste_cluster) || r.user.taste_cluster) : undefined
            },
            text: r.text,
            images: r.img,
            created_at: r.created_at,
            review_prop: r.review_prop,
            keyword: r.keyword,
        }));

        res.json(result);

    } catch (error) {
        console.error("Shop reviews error:", error);
        res.status(500).json({ error: "Failed to fetch shop reviews" });
    }
});

export default router;
