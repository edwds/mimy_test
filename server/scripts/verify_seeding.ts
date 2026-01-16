import { db } from "../db/index.js";
import { sql } from "drizzle-orm";

async function verify() {
    try {
        const storageRes = await db.execute(sql`
      SELECT
          relname AS table_name,
          pg_size_pretty(pg_total_relation_size(relid)) AS total_size,
          pg_total_relation_size(relid) AS total_size_bytes
      FROM pg_catalog.pg_statio_user_tables
      ORDER BY pg_total_relation_size(relid) DESC;
    `);
        console.log("Storage usage:", storageRes.rows);

        const totalSize = storageRes.rows.reduce((acc: number, row: any) => acc + Number(row.total_size_bytes), 0);
        console.log(`Total DB Size: ${Math.round(totalSize / 1024 / 1024)} MB / 512 MB`);

        const shops = await db.execute(sql`SELECT count(*) FROM shops`);
        const content = await db.execute(sql`SELECT count(*) FROM content`);
        console.log('Final Counts - Shops:', shops.rows[0].count, 'Content:', content.rows[0].count);

        const sample = await db.execute(sql`SELECT * FROM content WHERE review_prop IS NOT NULL LIMIT 1`);
        console.log('Sample Content:', JSON.stringify(sample.rows[0], null, 2));

    } catch (e) {
        console.error("Verification failed:", e);
    } finally {
        process.exit(0);
    }
}

verify();
