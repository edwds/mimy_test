import { db } from '../db/index.js';
import { users, leaderboard } from '../db/schema.js';
import { sql } from 'drizzle-orm';
import { invalidatePattern } from '../redis.js';

export class LeaderboardService {
    static async refresh() {
        console.log("[LeaderboardService] Refreshing Leaderboard Cache...");

        try {
            // 1. Calculate aggregated stats per user
            // We group by user to get content counts and likes
            const userStats = await db.execute(sql`
                SELECT 
                    u.id, 
                    u.email,
                    COUNT(DISTINCT c.id) as content_count,
                    COUNT(DISTINCT l.id) as received_likes
                FROM users u
                LEFT JOIN content c ON u.id = c.user_id AND c.is_deleted = false
                LEFT JOIN likes l ON c.id = l.target_id AND l.target_type = 'content'
                GROUP BY u.id
            `);

            // 2. Process and Score in Memory (for now)
            const allUsers = userStats.rows.map((row: any) => {
                const contentCount = Number(row.content_count);
                const receivedLikes = Number(row.received_likes);
                // Simple Scoring Algorithm
                const score = (contentCount * 5) + (receivedLikes * 3);

                return {
                    id: row.id,
                    email: row.email,
                    stats: {
                        content_count: contentCount,
                        received_likes: receivedLikes
                    },
                    score
                };
            });

            // Helper to insert specific rankings
            const insertLeaderboard = async (type: string, key: string | null = null, filteredUsers: any[]) => {
                // Sort DESC by score
                filteredUsers.sort((a, b) => b.score - a.score);

                // Take Top 100
                const top100 = filteredUsers.slice(0, 100);

                if (top100.length === 0) return;

                const entries = top100.map((u, index) => ({
                    type,
                    key,
                    user_id: u.id,
                    rank: index + 1,
                    score: u.score,
                    stats: u.stats
                }));

                await db.insert(leaderboard).values(entries);
                console.log(`[LeaderboardService] Inserted ${entries.length} for ${type}`);
            };

            await db.transaction(async (tx) => {
                // Clear old DB table
                // Note: In a real high-throughput system you might swap tables or upsert.
                // For now, delete-all-insert is fine for consistency.
                await tx.delete(leaderboard);

                // 1. OVERALL
                await insertLeaderboard('OVERALL', null, [...allUsers]);

                // 2. COMPANY
                const companyUsers = allUsers.filter(u => u.email && u.email.endsWith('@catchtable.co.kr'));
                await insertLeaderboard('COMPANY', null, companyUsers);
            });

            // 3. Invalidate Redis Cache so API fetches fresh DB data
            await invalidatePattern('leaderboard:*');
            console.log("[LeaderboardService] Refresh Complete & Cache Invalidated.");

        } catch (error) {
            console.error("[LeaderboardService] Failed to refresh:", error);
            throw error;
        }
    }
}
