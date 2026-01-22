
import { db } from '../db/index.js';
import { users, content, likes, leaderboard, clusters } from '../db/schema.js';
import { sql, eq, and, desc, ilike } from 'drizzle-orm';

async function refreshLeaderboard() {
    console.log("Refreshing Leaderboard Cache...");

    // 1. Calculate Scores for ALL users
    // Since we need to sort filtering later, it's best to fetch stats first.
    // For 1000 users, in-memory sort is fine. 
    // Optimization: Do aggregation in SQL.

    // Calculate aggregated stats per user
    const userStats = await db.execute(sql`
        SELECT 
            u.id, 
            u.nickname, 
            u.account_id,
            u.email,
            u.profile_image,
            u.taste_cluster,
            u.taste_result,
            COUNT(DISTINCT c.id) as content_count,
            COUNT(DISTINCT l.id) as received_likes
        FROM users u
        LEFT JOIN content c ON u.id = c.user_id AND c.is_deleted = false
        LEFT JOIN likes l ON c.id = l.target_id AND l.target_type = 'content'
        GROUP BY u.id
    `);

    // Process and Score
    let allUsers = userStats.rows.map((row: any) => {
        // Drizzle/PG raw result often returns strings for aggregates
        const contentCount = Number(row.content_count);
        const receivedLikes = Number(row.received_likes);
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

    // Function to insert specific leaderboard
    const insertLeaderboard = async (type: string, key: string | null = null, filteredUsers: any[]) => {
        // Sort DESC
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
        console.log(`Inserted ${entries.length} for ${type} ${key ? `(${key})` : ''}`);
    };

    await db.transaction(async (tx) => {
        // Clear OLD cache
        await tx.delete(leaderboard);

        // 1. OVERALL
        await insertLeaderboard('OVERALL', null, [...allUsers]);

        // 2. COMPANY (e.g. catchtable.co.kr email)
        const companyUsers = allUsers.filter(u => u.email && u.email.endsWith('@catchtable.co.kr'));
        await insertLeaderboard('COMPANY', null, companyUsers);

        // 3. NEIGHBORHOOD (Currently the user asked about 'neighborhood' filter, 
        // usually this means "users in my area" or "users posting in my area".)
        // But the previous API implementation `filter === 'neighborhood'` just set the limit to 100.
        // It didn't actually APPLY any filtering logic for neighborhood!
        // Looking at the original code:
        // if (filter === 'company' || filter === 'neighborhood') limit = 100;
        // if (filter === 'company') query = query.where(...)
        // So 'neighborhood' filter was effectively SAME AS OVERALL just with limit 100?
        // Or maybe it was intended but missing?
        // Let's replicate strict behavior of previous code for now: 
        // If filter=neighborhood was same as Overall, we can just reuse Overall or create specific type if UI expects it.
        // Let's create a 'NEIGHBORHOOD' type that is identical to OVERALL for now, 
        // to handle the ?filter=neighborhood query efficiently.
        // OR better: The API client calls ?filter=neighborhood. 
        // We can just query type='OVERALL' limit 100.
        // However, to be future-proof, let's insert a duplicate or just index efficiently.
        // Actually, let's just use OVERALL for the generic 'neighborhood' request if it has no specific logic.
    });

    console.log("Leaderboard Refreshed Successfully.");
    process.exit(0);
}

refreshLeaderboard().catch(console.error);
