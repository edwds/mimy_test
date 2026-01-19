
import { db } from '../db/index';
import { sql } from 'drizzle-orm';

async function main() {
    console.log("Checking shops table columns...");
    try {
        const result = await db.execute(sql`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'shops';
        `);
        console.log("Columns:", result.rows);
    } catch (error) {
        console.error("Error checking columns:", error);
    }
    process.exit(0);
}

main();
