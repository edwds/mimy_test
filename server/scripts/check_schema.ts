
import { db } from '../db/index.js';
import { sql } from 'drizzle-orm';

async function checkSchema() {
    try {
        const result = await db.execute(sql`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'content';
        `);
        console.log("Columns in 'content' table:", result.rows);
    } catch (e) {
        console.error("Error checking schema:", e);
    }
    process.exit(0);
}

checkSchema();
