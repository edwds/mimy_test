
import { db } from '../db/index.js';
import { sql } from 'drizzle-orm';

async function checkStorage() {
    try {
        const result = await db.execute(sql`
            SELECT
                relname AS table_name,
                pg_size_pretty(pg_total_relation_size(relid)) AS total_size,
                pg_total_relation_size(relid) AS total_size_bytes
            FROM pg_catalog.pg_statio_user_tables
            ORDER BY pg_total_relation_size(relid) DESC;
        `);
        console.table(result.rows);
    } catch (e) {
        console.error("Error checking storage:", e);
    }
    process.exit(0);
}

checkStorage();
