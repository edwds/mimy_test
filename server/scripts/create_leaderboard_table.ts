
import { db } from '../db/index.js';
import { sql } from 'drizzle-orm';

async function createTable() {
    console.log("Creating leaderboard table...");
    await db.execute(sql`
        CREATE TABLE IF NOT EXISTS leaderboard (
            id SERIAL PRIMARY KEY,
            type VARCHAR(20) NOT NULL,
            key VARCHAR(100),
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            rank INTEGER NOT NULL,
            score INTEGER NOT NULL,
            stats JSONB,
            created_at TIMESTAMP DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_leaderboard_type ON leaderboard(type, key);
    `);
    console.log("Table created.");
    process.exit(0);
}
createTable();
