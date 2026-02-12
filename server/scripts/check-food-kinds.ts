import { db } from '../db/index.js';
import { sql } from 'drizzle-orm';

async function main() {
    const result = await db.execute(sql`
        SELECT food_kind, COUNT(*)::int as cnt 
        FROM shops 
        WHERE food_kind IS NOT NULL AND food_kind != ''
        GROUP BY food_kind 
        ORDER BY cnt DESC
    `);
    for (const row of result.rows) {
        console.log(`${String(row.cnt).padStart(5)}  ${row.food_kind}`);
    }
    console.log(`\nTotal distinct values: ${result.rows.length}`);
    process.exit(0);
}
main();
