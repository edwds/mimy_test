import { db } from '../db/index.js';
import { sql } from 'drizzle-orm';

async function migrate() {
    try {
        console.log('Creating taste_analyses table...');

        await db.execute(sql`
            CREATE TABLE IF NOT EXISTS taste_analyses (
                id serial PRIMARY KEY NOT NULL,
                user_id integer NOT NULL,
                share_code varchar(20) NOT NULL,
                taste_type varchar(10) NOT NULL,
                taste_scores jsonb NOT NULL,
                ranked_shops_summary jsonb,
                analysis jsonb NOT NULL,
                created_at timestamp DEFAULT now(),
                updated_at timestamp DEFAULT now(),
                CONSTRAINT taste_analyses_share_code_unique UNIQUE(share_code)
            )
        `);

        // Add FK only if not exists
        await db.execute(sql`
            DO $$ BEGIN
                ALTER TABLE taste_analyses
                ADD CONSTRAINT taste_analyses_user_id_users_id_fk
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE cascade ON UPDATE no action;
            EXCEPTION WHEN duplicate_object THEN NULL;
            END $$
        `);

        await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_taste_analyses_user ON taste_analyses USING btree (user_id)`);
        await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_taste_analyses_code ON taste_analyses USING btree (share_code)`);

        console.log('Migration successful!');
    } catch (e: any) {
        console.error('Migration error:', e.message);
    }
    process.exit(0);
}

migrate();
