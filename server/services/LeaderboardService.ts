import { db } from '../db/index.js';
import { users, leaderboard, groups } from '../db/schema.js';
import { sql, eq } from 'drizzle-orm';
import { invalidatePattern } from '../redis.js';

export class LeaderboardService {
    static async refresh() {
        console.log("[LeaderboardService] Refreshing Leaderboard Cache...");

        try {
            // 1. Calculate aggregated stats per user (including group_id and neighborhood)
            const userStats = await db.execute(sql`
                SELECT
                    u.id,
                    u.email,
                    u.group_id,
                    u.neighborhood,
                    COUNT(DISTINCT c.id) as content_count,
                    COUNT(DISTINCT l.id) as received_likes
                FROM users u
                LEFT JOIN content c ON u.id = c.user_id AND c.is_deleted = false
                LEFT JOIN likes l ON c.id = l.target_id AND l.target_type = 'content'
                GROUP BY u.id, u.email, u.group_id, u.neighborhood
            `);

            // 2. Get all active groups for name mapping
            const allGroups = await db.select().from(groups).where(eq(groups.is_active, true));
            const groupMap = new Map(allGroups.map(g => [g.id, g.name]));

            // 3. Process and Score in Memory
            const allUsers = userStats.rows.map((row: any) => {
                const contentCount = Number(row.content_count);
                const receivedLikes = Number(row.received_likes);
                // Simple Scoring Algorithm
                const score = (contentCount * 5) + (receivedLikes * 3);

                return {
                    id: row.id,
                    email: row.email,
                    group_id: row.group_id,
                    group_name: row.group_id ? groupMap.get(row.group_id) : null,
                    neighborhood: row.neighborhood,
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
                console.log(`[LeaderboardService] Inserted ${entries.length} for ${type}${key ? `:${key}` : ''}`);
            };

            await db.transaction(async (tx) => {
                // Clear old DB table
                await tx.delete(leaderboard);

                // 1. OVERALL
                await insertLeaderboard('OVERALL', null, [...allUsers]);

                // 2. COMPANY - Group by group_id and create separate leaderboards per group
                const usersByGroup = new Map<string, any[]>();
                allUsers.forEach(u => {
                    if (u.group_id && u.group_name) {
                        if (!usersByGroup.has(u.group_name)) {
                            usersByGroup.set(u.group_name, []);
                        }
                        usersByGroup.get(u.group_name)!.push(u);
                    }
                });

                for (const [groupName, groupUsers] of usersByGroup) {
                    await insertLeaderboard('COMPANY', groupName, groupUsers);
                }

                // 3. NEIGHBORHOOD - Group by neighborhood and create separate leaderboards
                const usersByNeighborhood = new Map<string, any[]>();
                allUsers.forEach(u => {
                    if (u.neighborhood) {
                        if (!usersByNeighborhood.has(u.neighborhood)) {
                            usersByNeighborhood.set(u.neighborhood, []);
                        }
                        usersByNeighborhood.get(u.neighborhood)!.push(u);
                    }
                });

                for (const [neighborhood, neighborhoodUsers] of usersByNeighborhood) {
                    await insertLeaderboard('NEIGHBORHOOD', neighborhood, neighborhoodUsers);
                }
            });

            // 4. Invalidate Redis Cache so API fetches fresh DB data
            await invalidatePattern('leaderboard:*');
            console.log("[LeaderboardService] Refresh Complete & Cache Invalidated.");

        } catch (error) {
            console.error("[LeaderboardService] Failed to refresh:", error);
            throw error;
        }
    }

    /**
     * Get available keys for a leaderboard type
     */
    static async getKeys(type: 'COMPANY' | 'NEIGHBORHOOD'): Promise<string[]> {
        const result = await db.execute(sql`
            SELECT DISTINCT key FROM leaderboard
            WHERE type = ${type} AND key IS NOT NULL
            ORDER BY key
        `);
        return result.rows.map((r: any) => r.key);
    }

    /**
     * Add a user to a specific leaderboard when they register for group/neighborhood
     */
    static async addUserToLeaderboard(userId: number, type: 'COMPANY' | 'NEIGHBORHOOD', key: string) {
        try {
            console.log(`[LeaderboardService] Adding user ${userId} to ${type}:${key}`);

            // 1. Calculate user's current score
            const userStats = await db.execute(sql`
                SELECT
                    COUNT(DISTINCT c.id) as content_count,
                    COUNT(DISTINCT l.id) as received_likes
                FROM users u
                LEFT JOIN content c ON u.id = c.user_id AND c.is_deleted = false
                LEFT JOIN likes l ON c.id = l.target_id AND l.target_type = 'content'
                WHERE u.id = ${userId}
                GROUP BY u.id
            `);

            const row = userStats.rows[0] as any || { content_count: 0, received_likes: 0 };
            const contentCount = Number(row.content_count || 0);
            const receivedLikes = Number(row.received_likes || 0);
            const score = (contentCount * 5) + (receivedLikes * 3);

            // 2. Check if user already exists in this leaderboard
            const existing = await db.execute(sql`
                SELECT id FROM leaderboard
                WHERE type = ${type} AND key = ${key} AND user_id = ${userId}
            `);

            if (existing.rows.length > 0) {
                // User already in leaderboard, update their score
                await db.execute(sql`
                    UPDATE leaderboard
                    SET score = ${score}, stats = ${JSON.stringify({ content_count: contentCount, received_likes: receivedLikes })}
                    WHERE type = ${type} AND key = ${key} AND user_id = ${userId}
                `);
            } else {
                // Get current max rank for this leaderboard
                const maxRankResult = await db.execute(sql`
                    SELECT COALESCE(MAX(rank), 0) as max_rank FROM leaderboard
                    WHERE type = ${type} AND key = ${key}
                `);
                const maxRank = Number((maxRankResult.rows[0] as any)?.max_rank || 0);

                // Insert user at the end (rank will be recalculated on next refresh)
                await db.insert(leaderboard).values({
                    type,
                    key,
                    user_id: userId,
                    rank: maxRank + 1,
                    score,
                    stats: { content_count: contentCount, received_likes: receivedLikes }
                });
            }

            // 3. Invalidate cache for this leaderboard type
            await invalidatePattern(`leaderboard:${type}:${key}*`);
            console.log(`[LeaderboardService] User ${userId} added to ${type}:${key}`);

        } catch (error) {
            console.error(`[LeaderboardService] Failed to add user to leaderboard:`, error);
            // Don't throw - this is a non-critical operation
        }
    }
}
