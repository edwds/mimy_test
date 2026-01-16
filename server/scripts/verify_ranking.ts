
import { db } from '../db';
import { users_ranking } from '../db/schema';
import { eq, sql, and, gte, lte } from 'drizzle-orm';

async function main() {
    // Check User 205 (from tsv dump first rows)
    const rankings = await db.select().from(users_ranking)
        .where(eq(users_ranking.user_id, 205));

    console.log(`User 205 has ${rankings.length} rankings.`);
    console.log('Sample rankings:', JSON.stringify(rankings.slice(0, 5), null, 2));


    // Check count for all target users
    const allRankings = await db.select({
        user_id: users_ranking.user_id,
        count: sql<number>`count(*)`
    })
        .from(users_ranking)
        .where(and(
            gte(users_ranking.user_id, 191),
            lte(users_ranking.user_id, 318)
        ))
        .groupBy(users_ranking.user_id);

    console.log(`\nVerified ${allRankings.length} users have rankings.`);

    // Check if any user has 0 rankings (unexpected if they have content)
    // We know 128 users were targetted.
    if (allRankings.length === 128) {
        console.log("SUCCESS: All 128 users have updated rankings.");
    } else {
        console.log(`WARNING: Only ${allRankings.length}/128 users have rankings. Some users might have no content.`);
    }

}

main().catch(console.error);
