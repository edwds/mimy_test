
import { db } from '../db/index.js';
import { leaderboard } from '../db/schema.js';
import { sql } from 'drizzle-orm';

async function checkTypes() {
    const stats = await db.execute(sql`
        SELECT type, count(*) as c 
        FROM leaderboard 
        GROUP BY type
    `);
    console.table(stats.rows);
    process.exit(0);
}
checkTypes();
