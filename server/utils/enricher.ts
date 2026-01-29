import { db } from "../db/index.js";
import { users, users_ranking, content } from "../db/schema.js";
import { eq, sql, and, inArray } from "drizzle-orm";
import { calculateShopMatchScore } from "./match.js";

/**
 * Batch calculates match scores for a given list of shop IDs and a viewer.
 * Returns a Map<shopId, score>.
 */
export async function getShopMatchScores(shopIds: number[], viewerId: number): Promise<Map<number, number | null>> {
    const scoresMap = new Map<number, number | null>();
    if (!viewerId || shopIds.length === 0) return scoresMap;

    try {
        // 1. Get Viewer Taste
        const viewerRes = await db.select({ taste_result: users.taste_result })
            .from(users)
            .where(eq(users.id, viewerId))
            .limit(1);

        if (viewerRes.length === 0 || !viewerRes[0].taste_result) {
            return scoresMap; // Viewer has no taste data
        }

        const viewerScores = (viewerRes[0].taste_result as any).scores;
        if (!viewerScores) return scoresMap;

        // 2. Fetch Reviewers for these shops
        // Changed to use users_ranking as base (no content requirement)
        const minRankings = parseInt(process.env.MIN_RANKINGS_FOR_MATCH || '30');
        const matchRows = await db.execute(sql.raw(`
            WITH eligible AS (
                SELECT user_id, count(*) as cnt
                FROM users_ranking
                GROUP BY user_id
                HAVING count(*) >= ${minRankings}
            )
            SELECT
                ur.shop_id,
                u.id as user_id,
                u.taste_result,
                ur.rank,
                ur.satisfaction_tier,
                e.cnt as total_cnt
            FROM users_ranking ur
            JOIN eligible e ON ur.user_id = e.user_id
            JOIN users u ON ur.user_id = u.id
            WHERE ur.shop_id IN (${shopIds.join(',')})
        `));

        const shopReviewersMap = new Map<number, any[]>();

        matchRows.rows.forEach((row: any) => {
            const sid = Number(row.shop_id);
            if (!shopReviewersMap.has(sid)) shopReviewersMap.set(sid, []);

            const tResult = typeof row.taste_result === 'string' ? JSON.parse(row.taste_result) : row.taste_result;

            shopReviewersMap.get(sid)?.push({
                userId: row.user_id,
                rankPosition: row.rank,
                totalRankedCount: row.total_cnt,
                tasteScores: tResult?.scores || null,
                satisfactionTier: row.satisfaction_tier !== undefined ? Number(row.satisfaction_tier) : undefined
            });
        });

        // 3. Compute Scores
        shopIds.forEach(sid => {
            const reviewers = shopReviewersMap.get(sid) || [];
            const score = calculateShopMatchScore(viewerScores, reviewers);
            scoresMap.set(sid, score);
        });

    } catch (error) {
        console.error("getShopMatchScores error:", error);
    }

    return scoresMap;
}

/**
 * Batch calculates review stats for a given list of shop IDs and a viewer.
 * Checks if viewer has reviewed the shop, and if so, returns rank/satisfaction/percentile.
 * Returns a Map<shopId, Stats>.
 */
export async function getShopReviewStats(shopIds: number[], viewerId: number): Promise<Map<number, any>> {
    const statsMap = new Map<number, any>();
    if (!viewerId || shopIds.length === 0) return statsMap;

    try {
        // Fetch viewer's ranking rows for these shops
        const myRankings = await db.select({
            shop_id: users_ranking.shop_id,
            rank: users_ranking.rank,
            satisfaction_tier: users_ranking.satisfaction_tier
        })
            .from(users_ranking)
            .where(and(
                eq(users_ranking.user_id, viewerId),
                inArray(users_ranking.shop_id, shopIds)
            ));

        // If user hasn't reviewed any of these shops, return empty
        if (myRankings.length === 0) return statsMap;

        // Get total ranked count for percentile calculation
        // Optimization: Counts could be cached in users table or redis
        const totalCountRes = await db.execute(sql`
            SELECT count(*) as cnt FROM users_ranking WHERE user_id = ${viewerId}
        `);
        const totalCount = Number(totalCountRes.rows[0].cnt);

        myRankings.forEach(row => {
            if (!row.shop_id) return;

            // Percentile: (rank / total) * 100 ?
            // Top 1% means rank 1 out of 100.
            // Formula: ceil((rank / total) * 100)
            let percentile = 0;
            if (totalCount > 0 && row.rank) {
                percentile = Math.ceil((row.rank / totalCount) * 100);
            }

            statsMap.set(row.shop_id, {
                satisfaction: row.satisfaction_tier, // 1=Good, 2=Ok, 3=Bad (approx, check schema)
                rank: row.rank,
                percentile: percentile,
                total_reviews: totalCount
            });
        });

    } catch (error) {
        console.error("getShopReviewStats error:", error);
    }

    return statsMap;
}
