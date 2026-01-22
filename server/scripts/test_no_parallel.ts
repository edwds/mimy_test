
import { db } from "../db/index.js";
import { content } from "../db/schema.js";
import { eq, and, sql } from "drizzle-orm";

async function run() {
    const id = 320;

    try {
        console.log("Starting transaction...");
        await db.transaction(async (tx) => {
            console.log("Disabling parallel workers...");
            // This sets the parameter for the current transaction
            await tx.execute(sql`SET LOCAL max_parallel_workers_per_gather = 0`);

            console.log("Fetching content count (with is_deleted)...");
            const contentCountRes = await tx.select({ count: sql<number>`count(*)` })
                .from(content)
                .where(and(eq(content.user_id, id), eq(content.is_deleted, false)));
            console.log("Content Count Res:", contentCountRes);
        });

        process.exit(0);
    } catch (error) {
        console.error("Error:", error);
        process.exit(1);
    }
}

run();
