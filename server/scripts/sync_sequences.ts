import { db } from "../db/index.js";
import { sql } from "drizzle-orm";

async function syncSequences() {
    console.log("Synchronizing PostgreSQL sequences...");
    try {
        // Sync Shops
        const shopRes = await db.execute(sql`SELECT setval('shops_id_seq', (SELECT MAX(id) FROM shops))`);
        console.log("Shops sequence updated:", shopRes.rows[0]);

        // Sync Content
        const contentRes = await db.execute(sql`SELECT setval('content_id_seq', (SELECT MAX(id) FROM content))`);
        console.log("Content sequence updated:", contentRes.rows[0]);

        console.log("Sequence sync completed.");
    } catch (error) {
        console.error("Error syncing sequences:", error);
    } finally {
        process.exit(0);
    }
}

syncSequences();
