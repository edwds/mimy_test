
import { Router } from "express";
import { db } from "../db/index.js";
import { users_ranking, shops, content } from "../db/schema.js";
import { eq, and, asc, desc, sql } from "drizzle-orm";
import { invalidatePattern } from "../redis.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

// --- 5-Tier Constants ---
// GOAT(4), BEST(3): ranked tiers (binary comparison)
// GOOD(2), OK(1), BAD(0): bucket tiers (no comparison)
const TIER_GOAT = 4;
const TIER_BEST = 3;
const TIER_GOOD = 2;
const TIER_OK = 1;
const TIER_BAD = 0;

const GOAT_RATIO = 0.05; // 5%
const BEST_RATIO = 0.15; // 15%

const mapSatisfactionToTier = (s: string): number => {
    switch (s) {
        case 'goat': return TIER_GOAT;
        case 'best': return TIER_BEST;
        case 'good': return TIER_GOOD;
        case 'ok': return TIER_OK;
        case 'bad': return TIER_BAD;
        default: return TIER_GOOD;
    }
};

const tierNameFromNum = (tier: number): string => {
    switch (tier) {
        case 4: return 'goat';
        case 3: return 'best';
        case 2: return 'good';
        case 1: return 'ok';
        case 0: return 'bad';
        default: return 'good';
    }
};

/**
 * Calculate tier limits based on total ranking count.
 * Returns { goatMax, bestMax }
 */
const getTierLimits = (totalCount: number) => ({
    goatMax: Math.ceil(totalCount * GOAT_RATIO),
    bestMax: Math.ceil(totalCount * BEST_RATIO),
});

/**
 * Cascading demotion: if GOAT or BEST exceed their limits,
 * move lowest-ranked items to the next tier down.
 * Should be called within a transaction after any tier modification.
 */
const applyCascadingDemotion = async (tx: any, userId: number) => {
    // Get all rankings sorted by tier desc, rank asc
    const allRankings = await tx.select({
        id: users_ranking.id,
        shop_id: users_ranking.shop_id,
        rank: users_ranking.rank,
        satisfaction_tier: users_ranking.satisfaction_tier,
    })
        .from(users_ranking)
        .where(eq(users_ranking.user_id, userId))
        .orderBy(desc(users_ranking.satisfaction_tier), asc(users_ranking.rank));

    const totalCount = allRankings.length;
    if (totalCount === 0) return [];

    const { goatMax, bestMax } = getTierLimits(totalCount);
    const demotions: { shopId: number; from: string; to: string }[] = [];

    // Split by tier
    const goats = allRankings.filter((r: any) => r.satisfaction_tier === TIER_GOAT);
    const bests = allRankings.filter((r: any) => r.satisfaction_tier === TIER_BEST);

    // Demote excess GOAT → BEST
    if (goats.length > goatMax) {
        const excess = goats.slice(goatMax); // lowest-ranked GOATs
        for (const item of excess) {
            await tx.update(users_ranking)
                .set({ satisfaction_tier: TIER_BEST, updated_at: new Date() })
                .where(eq(users_ranking.id, item.id));
            bests.unshift(item); // Add to top of BEST (they were bottom of GOAT)
            demotions.push({ shopId: item.shop_id, from: 'GOAT', to: 'BEST' });
        }
    }

    // Demote excess BEST → GOOD
    if (bests.length > bestMax) {
        const excess = bests.slice(bestMax);
        for (const item of excess) {
            await tx.update(users_ranking)
                .set({ satisfaction_tier: TIER_GOOD, updated_at: new Date() })
                .where(eq(users_ranking.id, item.id));
            demotions.push({ shopId: item.shop_id, from: 'BEST', to: 'GOOD' });
        }
    }

    return demotions;
};

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

// DELETE /api/ranking/all
// Delete ALL rankings for the user (reset)
router.delete("/all", requireAuth, async (req, res) => {
    try {
        const user_id = req.user!.id;

        // 1. Delete all rankings
        const deleted = await db.delete(users_ranking)
            .where(eq(users_ranking.user_id, user_id))
            .returning({ shop_id: users_ranking.shop_id });

        // 2. Symbiotic: soft-delete all reviews
        await db.update(content)
            .set({ is_deleted: true, updated_at: new Date() })
            .where(and(
                eq(content.user_id, user_id),
                eq(content.type, 'review'),
                eq(content.is_deleted, false)
            ));

        // 3. Invalidate caches
        await invalidatePattern('feed:global:*');
        await invalidatePattern(`lists:${user_id}*`);
        for (const item of deleted) {
            await invalidatePattern(`shop:${item.shop_id}:reviews:*`);
        }

        console.log(`[Ranking Reset] User ${user_id}: deleted ${deleted.length} rankings`);
        res.json({ success: true, count: deleted.length });
    } catch (error) {
        console.error("Delete all rankings error:", error);
        res.status(500).json({ error: "Failed to delete all rankings" });
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

// GET /api/ranking/tier-limits
// Returns current tier limits and counts for the user
router.get("/tier-limits", requireAuth, async (req, res) => {
    try {
        const userId = req.user!.id;

        const rankings = await db.select({
            satisfaction_tier: users_ranking.satisfaction_tier,
        })
            .from(users_ranking)
            .where(eq(users_ranking.user_id, userId));

        const totalCount = rankings.length;
        const { goatMax, bestMax } = getTierLimits(totalCount);

        const counts = {
            goat: rankings.filter(r => r.satisfaction_tier === TIER_GOAT).length,
            best: rankings.filter(r => r.satisfaction_tier === TIER_BEST).length,
            good: rankings.filter(r => r.satisfaction_tier === TIER_GOOD).length,
            ok: rankings.filter(r => r.satisfaction_tier === TIER_OK).length,
            bad: rankings.filter(r => r.satisfaction_tier === TIER_BAD).length,
        };

        res.json({
            total: totalCount,
            limits: { goatMax, bestMax },
            counts,
        });
    } catch (error) {
        console.error("Tier limits error:", error);
        res.status(500).json({ error: "Failed to fetch tier limits" });
    }
});

// POST /api/ranking/batch
// Batch create rankings from relay mode
// items: { shop_id, satisfaction }[] - satisfaction: 'goat' | 'best' | 'good' | 'ok' | 'bad'
router.post("/batch", requireAuth, async (req, res) => {
    try {
        const user_id = req.user!.id;
        const { items } = req.body; // items: { shop_id, satisfaction }[]

        if (!Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ error: "Invalid parameters: items array required" });
        }

        let demotions: { shopId: number; from: string; to: string }[] = [];

        await db.transaction(async (tx) => {
            // 1. Get current max rank
            const maxRankRes = await tx.select({ maxRank: sql<number>`COALESCE(MAX(rank), 0)` })
                .from(users_ranking)
                .where(eq(users_ranking.user_id, user_id));
            let currentRank = Number(maxRankRes[0]?.maxRank || 0);

            // 2. Sort items by satisfaction tier (goat first, then best, good, ok, bad)
            const sortedItems = [...items].sort((a, b) => {
                const order: Record<string, number> = { goat: 0, best: 1, good: 2, ok: 3, bad: 4 };
                return (order[a.satisfaction] ?? 2) - (order[b.satisfaction] ?? 2);
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

            // 4. Apply cascading demotion
            demotions = await applyCascadingDemotion(tx, user_id);
        });

        // Invalidate cache
        await invalidatePattern(`lists:${user_id}*`);

        res.json({ success: true, count: items.length, demotions });
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

        let demotions: { shopId: number; from: string; to: string }[] = [];

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

            // Apply cascading demotion after reorder
            demotions = await applyCascadingDemotion(tx, user_id);
        });

        // Invalidate
        await invalidatePattern(`lists:${user_id}*`);

        res.json({ success: true, demotions });
    } catch (error) {
        console.error("Reorder ranking error:", error);
        res.status(500).json({ error: "Failed to reorder ranking" });
    }
});

export default router;
