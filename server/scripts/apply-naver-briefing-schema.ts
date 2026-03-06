/**
 * Apply Naver AI Briefing schema changes
 * - Add naver_business_id column to shops table
 * - Create shop_naver_briefing table
 *
 * Run: npx tsx server/scripts/apply-naver-briefing-schema.ts
 */
import { db } from '../db/index.js';
import { sql } from 'drizzle-orm';

async function applySchema() {
    console.log('[Schema] Applying Naver AI Briefing schema changes...');

    try {
        // 1. Add naver_business_id to shops table
        console.log('[Schema] Adding naver_business_id to shops...');
        await db.execute(sql`
            DO $$ BEGIN
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'shops' AND column_name = 'naver_business_id') THEN
                    ALTER TABLE "shops" ADD COLUMN "naver_business_id" text;
                END IF;
            END $$;
        `);
        console.log('[Schema] naver_business_id column added.');

        // 2. Create shop_naver_briefing table
        console.log('[Schema] Creating shop_naver_briefing table...');
        await db.execute(sql`
            CREATE TABLE IF NOT EXISTS "shop_naver_briefing" (
                "id" serial PRIMARY KEY NOT NULL,
                "shop_id" integer NOT NULL,
                "briefing_text" text,
                "text_summaries" jsonb,
                "image_summaries" jsonb,
                "related_queries" jsonb,
                "source_business_id" text,
                "has_briefing" boolean DEFAULT false,
                "error_message" text,
                "fetched_at" timestamp DEFAULT now(),
                "created_at" timestamp DEFAULT now(),
                "updated_at" timestamp DEFAULT now()
            )
        `);

        // Add foreign key
        await db.execute(sql`
            DO $$ BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'shop_naver_briefing_shop_id_shops_id_fk') THEN
                    ALTER TABLE "shop_naver_briefing" ADD CONSTRAINT "shop_naver_briefing_shop_id_shops_id_fk"
                    FOREIGN KEY ("shop_id") REFERENCES "public"."shops"("id") ON DELETE cascade ON UPDATE no action;
                END IF;
            END $$;
        `);

        // Add unique constraint on shop_id
        await db.execute(sql`
            DO $$ BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'shop_naver_briefing_shop_id_unique') THEN
                    ALTER TABLE "shop_naver_briefing" ADD CONSTRAINT "shop_naver_briefing_shop_id_unique" UNIQUE ("shop_id");
                END IF;
            END $$;
        `);

        // Create indexes
        await db.execute(sql`CREATE INDEX IF NOT EXISTS "idx_shop_naver_briefing_shop" ON "shop_naver_briefing" USING btree ("shop_id")`);
        await db.execute(sql`CREATE INDEX IF NOT EXISTS "idx_shop_naver_briefing_has" ON "shop_naver_briefing" USING btree ("has_briefing")`);

        console.log('[Schema] shop_naver_briefing table created.');
        console.log('[Schema] All schema changes applied successfully!');

    } catch (error) {
        console.error('[Schema] Error applying schema:', error);
        throw error;
    }

    process.exit(0);
}

applySchema();
