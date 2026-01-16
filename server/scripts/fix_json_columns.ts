
import { db } from '../db/index.js';
import { sql } from 'drizzle-orm';

async function fixColumns() {
    try {
        console.log("Fixing 'content' table columns to jsonb...");

        // Helper to check and alter
        const alterToJsonb = async (col: string) => {
            await db.execute(sql.raw(`ALTER TABLE content ALTER COLUMN "${col}" TYPE jsonb USING "${col}"::jsonb`));
            console.log(`Converted ${col} to jsonb.`);
        };

        await alterToJsonb('img');
        await alterToJsonb('video');
        await alterToJsonb('review_prop');
        await alterToJsonb('keyword');

        console.log("All columns fixed.");
    } catch (e) {
        console.error("Error fixing columns:", e);
    }
    process.exit(0);
}

fixColumns();
