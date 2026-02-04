import { sql } from 'drizzle-orm';
import { db } from '../db/index.js';

async function createBannersTable() {
    try {
        await db.execute(sql`
            CREATE TABLE IF NOT EXISTS banners (
                id serial PRIMARY KEY,
                title text NOT NULL,
                description text,
                action_type varchar(20) NOT NULL,
                action_value text,
                background_gradient text DEFAULT 'linear-gradient(135deg, #FDFBF7 0%, #F5F3FF 100%)',
                icon_type varchar(20),
                icon_url text,
                is_active boolean DEFAULT true,
                display_order integer DEFAULT 0,
                start_date timestamp,
                end_date timestamp,
                created_at timestamp DEFAULT now(),
                updated_at timestamp DEFAULT now()
            );
        `);

        await db.execute(sql`
            CREATE INDEX IF NOT EXISTS idx_banners_active_order
            ON banners USING btree (is_active, display_order);
        `);

        console.log('✅ Banners table created successfully');
    } catch (error) {
        console.error('❌ Failed to create banners table:', error);
        process.exit(1);
    }

    process.exit(0);
}

createBannersTable();
