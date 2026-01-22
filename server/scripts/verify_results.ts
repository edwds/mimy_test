import { db } from '../db/index.js';
import { users, content, users_ranking } from '../db/schema.js';
import { eq, sql, and, gte, lte, desc } from 'drizzle-orm';

async function verify() {
    console.log("Verifying Redistribution Results...");

    // 1. Check User Count in target range
    const userCount = await db.execute(sql`SELECT COUNT(*) as count FROM users WHERE id >= 191 AND id <= 1318`);
    console.log(`User Count (191-1318): ${userCount.rows[0].count} (Expected 1128)`);

    // 2. Check Content Distribution
    // content of 191-318 (original owners) should now be spread across 191-1318.
    // Check min/max/avg content per user in range 191-1318.
    const contentStats = await db.execute(sql`
        SELECT 
            MIN(c) as min_count, 
            MAX(c) as max_count, 
            AVG(c) as avg_count,
            STDDEV(c) as std_dev
        FROM (
            SELECT COUNT(*) as c 
            FROM content 
            WHERE user_id >= 191 AND user_id <= 1318 
            GROUP BY user_id
        ) sub
    `);
    console.log("Content Stats per User (191-1318):", contentStats.rows[0]);

    // 3. Verify Ranking Logic for a sample user
    // Pick user 319 (a new user) if they have content
    const sampleUserId = 200; // An existing user who definitely had content
    console.log(`Checking Rankings for User ${sampleUserId}...`);

    const rankings = await db.select()
        .from(users_ranking)
        .where(eq(users_ranking.user_id, sampleUserId))
        .orderBy(users_ranking.rank);

    if (rankings.length === 0) {
        console.log("No rankings found for user", sampleUserId);
    } else {
        console.log(`Found ${rankings.length} ranking entries.`);
        // Verify sorting: Tier DESC, then Date DESC ?
        // We can't easily check date from here without joining, but let's check Tier.
        let prevTier = 100;
        let prevRank = 0;
        let valid = true;

        for (const r of rankings) {
            if (r.satisfaction_tier > prevTier) {
                console.log(`ERROR: Rank ${r.rank} has Higher Tier ${r.satisfaction_tier} than prev ${prevTier}`);
                valid = false;
            }
            if (r.rank !== prevRank + 1) {
                console.log(`ERROR: Rank Gap: ${prevRank} -> ${r.rank}`);
                valid = false;
            }
            prevTier = r.satisfaction_tier;
            prevRank = r.rank;
        }
        if (valid) console.log("Ranking Order (Tier & Continuous) Verified.");
    }

    process.exit(0);
}

verify().catch(console.error);
