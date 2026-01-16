import { db } from "../db/index.js";
import { sql } from "drizzle-orm";

async function truncateContent() {
    console.log("Truncating 'content' table...");
    try {
        await db.execute(sql`TRUNCATE TABLE content CASCADE`);
        console.log("Successfully truncated 'content' table.");
    } catch (error) {
        console.error("Error truncating 'content' table:", error);
    } finally {
        process.exit(0);
    }
}

truncateContent();
