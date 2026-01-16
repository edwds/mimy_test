
import { db } from '../db/index.js';
import { sql } from 'drizzle-orm';

async function checkContent() {
    try {
        const result = await db.execute(sql`SELECT id, length(img::text) as img_len, substring(img::text from 1 for 100) as img_preview FROM content LIMIT 5`);
        console.table(result.rows);
    } catch (e) {
        console.error("Error checking content:", e);
    }
    process.exit(0);
}

checkContent();
