
import { db } from '../db/index';
import { sql } from 'drizzle-orm';

async function main() {
    console.log("Adding google_place_id column to shops table...");
    try {
        await db.execute(sql`ALTER TABLE shops ADD COLUMN IF NOT EXISTS google_place_id text UNIQUE;`);
        console.log("Success!");
    } catch (error) {
        console.error("Error adding column:", error);
    }
    process.exit(0);
}

main();
