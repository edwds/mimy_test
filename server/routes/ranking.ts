
import { Router } from "express";
import { db } from "../db/index.js";
import { users_ranking, shops, content } from "../db/schema.js";
import { eq, and, asc, sql } from "drizzle-orm";
import { invalidatePattern } from "../redis.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

// GET /api/ranking/all
// Fetch all rankings for the user, grouped or flat.
// We'll return a flat list sorted by Tier (desc) then Rank (asc).
router.get("/all", requireAuth, async (req, res) => {
    try {
        const userId = req.user!.id; // Get from JWT

        const rankings = await db.select({
            id: users_ranking.id,
            user_id: users_ranking.user_id,
            shop_id: users_ranking.shop_id,
            rank: users_ranking.rank,
            satisfaction_tier: users_ranking.satisfaction_tier,
            latest_review_text: users_ranking.latest_review_text,
            latest_review_images: users_ranking.latest_review_images,
            created_at: users_ranking.created_at,
            shop: {
                id: shops.id,
                name: shops.name,
                description: shops.description,
                category: shops.food_kind,
                thumbnail_img: shops.thumbnail_img,
                address_region: shops.address_region,
                address_full: shops.address_full,
                kind: shops.kind,
                food_kind: shops.food_kind,
                lat: shops.lat,
                lon: shops.lon
            }
        })
            .from(users_ranking)
            .leftJoin(shops, eq(users_ranking.shop_id, shops.id))
            .where(eq(users_ranking.user_id, userId))
            .orderBy(
                sql`${users_ranking.satisfaction_tier} DESC`,
                asc(users_ranking.rank)
            );

        res.json(rankings);
    } catch (error) {
        console.error("Fetch all rankings error:", error);
        res.status(500).json({ error: "Failed to fetch rankings" });
    }
});

// DELETE /api/ranking/:shopId
// Symbiotic Deletion: Deletes ranking AND associated content (reviews)
router.delete("/:shopId", requireAuth, async (req, res) => {
    try {
        const shopId = parseInt(req.params.shopId);
        const user_id = req.user!.id; // Get from JWT

        if (!shopId) {
            return res.status(400).json({ error: "Missing parameters" });
        }

        // 1. Delete Ranking
        const deletedRank = await db.delete(users_ranking)
            .where(and(
                eq(users_ranking.user_id, user_id),
                eq(users_ranking.shop_id, shopId)
            ))
            .returning();

        if (deletedRank.length === 0) {
            // Might already be deleted, check content anyway? No, safer to return 404 or success if idempotent.
            // But we assume if UI calls this, it thinks it exists.
            // Let's just proceed to content deletion to be safe (clean up).
        }

        // 2. Symbiotic: Delete associated content
        // Find content for this user & shop
        const contents = await db.select({ id: content.id }).from(content)
            .where(and(
                eq(content.user_id, user_id),
                eq(content.type, 'review'),
                sql`review_prop->>'shop_id' = ${shopId.toString()}`,
                eq(content.is_deleted, false)
            ));

        if (contents.length > 0) {
            await db.update(content)
                .set({ is_deleted: true, updated_at: new Date() })
                .where(and(
                    eq(content.user_id, user_id),
                    eq(content.type, 'review'),
                    sql`review_prop->>'shop_id' = ${shopId.toString()}`
                ));
            console.log(`[Ranking Delete] Symbiotic: ${contents.length} reviews for shop ${shopId} deleted`);
        }

        // Invalidate Cache
        await invalidatePattern('feed:global:*');
        await invalidatePattern(`lists:${user_id}*`);
        await invalidatePattern(`shop:${shopId}:reviews:*`);

        res.json({ success: true });
    } catch (error) {
        console.error("Delete ranking error:", error);
        res.status(500).json({ error: "Failed to delete ranking" });
    }
});

// POST /api/ranking/batch
// Batch create rankings from relay mode
// items: { shop_id, satisfaction }[] - satisfaction: 'good' | 'ok' | 'bad'
router.post("/batch", requireAuth, async (req, res) => {
    try {
        const user_id = req.user!.id;
        const { items } = req.body; // items: { shop_id, satisfaction }[]

        if (!Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ error: "Invalid parameters: items array required" });
        }

        const mapSatisfactionToTier = (s: string) => {
            switch (s) {
                case 'good': return 2;
                case 'ok': return 1;
                case 'bad': return 0;
                default: return 2;
            }
        };

        await db.transaction(async (tx) => {
            // 1. Get current max rank
            const maxRankRes = await tx.select({ maxRank: sql<number>`COALESCE(MAX(rank), 0)` })
                .from(users_ranking)
                .where(eq(users_ranking.user_id, user_id));
            let currentRank = Number(maxRankRes[0]?.maxRank || 0);

            // 2. Sort items by satisfaction tier (good first, then ok, then bad)
            const sortedItems = [...items].sort((a, b) => {
                const order = { good: 0, ok: 1, bad: 2 };
                return (order[a.satisfaction as keyof typeof order] || 2) - (order[b.satisfaction as keyof typeof order] || 2);
            });

            // 3. Insert each item
            for (const item of sortedItems) {
                // Skip if already exists
                const existing = await tx.select({ id: users_ranking.id })
                    .from(users_ranking)
                    .where(and(
                        eq(users_ranking.user_id, user_id),
                        eq(users_ranking.shop_id, item.shop_id)
                    ))
                    .limit(1);

                if (existing.length > 0) {
                    console.log(`[Ranking Batch] Shop ${item.shop_id} already ranked, skipping`);
                    continue;
                }

                currentRank++;
                const tier = mapSatisfactionToTier(item.satisfaction);

                await tx.insert(users_ranking).values({
                    user_id,
                    shop_id: item.shop_id,
                    satisfaction_tier: tier,
                    rank: currentRank,
                    latest_review_text: null,
                    latest_review_images: null
                });
            }
        });

        // Invalidate cache
        await invalidatePattern(`lists:${user_id}*`);

        res.json({ success: true, count: items.length });
    } catch (error) {
        console.error("Batch create ranking error:", error);
        res.status(500).json({ error: "Failed to batch create rankings" });
    }
});

// PUT /api/ranking/reorder
// Accepts list of items to update ranks/tiers
router.put("/reorder", requireAuth, async (req, res) => {
    try {
        const user_id = req.user!.id; // Get from JWT
        const { items } = req.body; // items: { shop_id, rank, satisfaction_tier }[]

        if (!Array.isArray(items)) {
            return res.status(400).json({ error: "Invalid parameters" });
        }

        await db.transaction(async (tx) => {
            for (const item of items) {
                await tx.update(users_ranking)
                    .set({
                        rank: item.rank,
                        satisfaction_tier: item.satisfaction_tier,
                        updated_at: new Date()
                    })
                    .where(and(
                        eq(users_ranking.user_id, user_id),
                        eq(users_ranking.shop_id, item.shop_id)
                    ));
            }
        });

        // Invalidate
        await invalidatePattern(`lists:${user_id}*`);

        res.json({ success: true });
    } catch (error) {
        console.error("Reorder ranking error:", error);
        res.status(500).json({ error: "Failed to reorder ranking" });
    }
});

export default router;
