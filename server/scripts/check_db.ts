
import { db } from "../db/index.js";
import { shared_links } from "../db/schema.js";
import crypto from 'crypto';
import { sql } from "drizzle-orm";

async function checkDb() {
    try {
        console.log("Checking DB connection...");

        console.log("Forcing table creation...");
        await db.execute(sql`
            CREATE TABLE IF NOT EXISTS shared_links (
                id SERIAL PRIMARY KEY,
                code VARCHAR(20) NOT NULL UNIQUE,
                type VARCHAR(20) NOT NULL,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                config JSONB NOT NULL,
                created_at TIMESTAMP DEFAULT NOW()
            );
        `);
        console.log("Table created.");

        // List tables
        const tables = await db.execute(sql`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
        `);
        console.log("Tables in public schema:", tables.rows.map((r: any) => r.table_name));

        const code = crypto.randomBytes(6).toString('hex');
        /*
                const res = await db.insert(shared_links).values({
                    code,
                    type: 'LIST',
                    user_id: 320, // Use a known valid ID or query one
                    config: { test: true }
                }).returning();
                
                console.log("DB Insert Success:", res);
        */
        process.exit(0);
    } catch (error) {
        console.error("DB Check Failed:", error);
        process.exit(1);
    }
}

checkDb();
