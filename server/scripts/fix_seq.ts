
import { db } from "../db/index.js";
import { sql } from "drizzle-orm";

async function fixSequence() {
    try {
        console.log("Fixing users_id_seq...");

        // 1. Get Max ID
        const maxRes = await db.execute(sql`SELECT MAX(id) as max_id FROM users`);
        const maxId = maxRes.rows[0].max_id;
        console.log(`Current Max ID: ${maxId}`);

        if (maxId) {
            // 2. Set Sequence
            // Note: setval sets the state such that the NEXT nextval will be value + 1 if is_called is true (default).
            // So setting it to maxId is correct; next insert will get maxId + 1.
            await db.execute(sql`SELECT setval('users_id_seq', ${maxId})`);
            console.log(`Sequence reset to ${maxId}`);
        } else {
            console.log("No users found, sequence not updated.");
        }

    } catch (error) {
        console.error("Failed to fix sequence:", error);
    }
    process.exit(0);
}

fixSequence();
