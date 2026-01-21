
import { db } from "../db/index.js";
import { sql } from "drizzle-orm";

async function main() {
    console.log("Syncing shops_id_seq...");

    try {
        await db.execute(sql`
            SELECT setval('shops_id_seq', (SELECT MAX(id) FROM shops));
        `);
        console.log("Successfully synced shops_id_seq to max(id)");
    } catch (error) {
        console.error("Error syncing sequence:", error);
    }

    process.exit(0);
}

main();
