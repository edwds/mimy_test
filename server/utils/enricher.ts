import { db } from "../db/index.js";
import { users, users_ranking, content } from "../db/schema.js";
import { eq, sql } from "drizzle-orm";
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
        // Optimized query: Only fetch necessary data
        const matchRows = await db.execute(sql.raw(`
            WITH eligible AS (
                SELECT user_id, count(*) as cnt 
                FROM users_ranking 
                GROUP BY user_id 
                HAVING count(*) >= 100
            )
            SELECT 
                (c.review_prop->>'shop_id')::int as shop_id,
                u.id as user_id,
                u.taste_result,
                ur.rank,
                e.cnt as total_cnt
            FROM content c
            JOIN eligible e ON c.user_id = e.user_id
            JOIN users u ON c.user_id = u.id
            JOIN users_ranking ur ON ur.user_id = u.id AND ur.shop_id = (c.review_prop->>'shop_id')::int
            WHERE c.type = 'review'
                AND c.is_deleted = false
                AND (c.review_prop->>'shop_id')::int IN (${shopIds.join(',')})
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
                tasteScores: tResult?.scores || null
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
