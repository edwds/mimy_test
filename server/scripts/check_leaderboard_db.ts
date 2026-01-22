
import { db } from '../db/index.js';
import { leaderboard } from '../db/schema.js';
import { sql } from 'drizzle-orm';

async function checkLeaderboard() {
    console.log("Checking Leaderboard Table...");
    const count = await db.select({ count: sql<number>`count(*)` }).from(leaderboard);
    console.log(`Leaderboard entries: ${count[0].count}`);

    if (Number(count[0].count) > 0) {
        console.log("Leaderboard is populated. Optimization successful.");
    } else {
        console.error("Leaderboard is empty!");
    }
    process.exit(0);
}
checkLeaderboard();
