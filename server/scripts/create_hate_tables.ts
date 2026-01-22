
import { db } from "../db/index.js";
import { sql } from "drizzle-orm";

async function createTables() {
    try {
        console.log("Creating hate_prop table...");
        await db.execute(sql`
            CREATE TABLE IF NOT EXISTS hate_prop (
                id SERIAL PRIMARY KEY,
                item TEXT NOT NULL,
                category TEXT,
                created_at TIMESTAMP DEFAULT NOW()
            );
        `);

        console.log("Creating hate_result table...");
        await db.execute(sql`
            CREATE TABLE IF NOT EXISTS hate_result (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                prop_id INTEGER NOT NULL REFERENCES hate_prop(id) ON DELETE CASCADE,
                selection VARCHAR(10) NOT NULL,
                created_at TIMESTAMP DEFAULT NOW(),
                CONSTRAINT unique_hate_vote UNIQUE (user_id, prop_id)
            );
        `);

        console.log("Creating index on hate_result...");
        await db.execute(sql`
            CREATE INDEX IF NOT EXISTS idx_hate_result_prop ON hate_result (prop_id);
        `);

        console.log("Tables created successfully!");
    } catch (e) {
        console.error("Error creating tables:", e);
    }
}

createTables().then(() => process.exit(0));
