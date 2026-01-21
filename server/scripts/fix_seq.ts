import { db } from "../db/index";
import { sql } from "drizzle-orm";

async function fixSequence() {
    console.log("Fixing content_id_seq...");
    try {
        // Reset sequence to max id + 1
        await db.execute(sql`SELECT setval('content_id_seq', (SELECT MAX(id) FROM content) + 1);`);
        console.log("Sequence fixed successfully.");
    } catch (e) {
        console.error("Failed to fix sequence:", e);
    }
    process.exit(0);
}

fixSequence();
