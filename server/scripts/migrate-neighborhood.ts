import { db } from '../db/index.js';
import { sql } from 'drizzle-orm';

async function migrate() {
    console.log('Starting neighborhood migration...');

    // 1. Create neighborhood_translations table
    console.log('1. Creating neighborhood_translations table...');
    await db.execute(sql`
        CREATE TABLE IF NOT EXISTS "neighborhood_translations" (
            "id" serial PRIMARY KEY NOT NULL,
            "country_code" varchar(5) NOT NULL,
            "local_name" varchar(100) NOT NULL,
            "english_name" varchar(100),
            "created_at" timestamp DEFAULT now(),
            CONSTRAINT "neighborhood_translations_country_code_local_name_unique" UNIQUE("country_code", "local_name")
        )
    `);

    // 2. Create index
    console.log('2. Creating index...');
    await db.execute(sql`
        CREATE INDEX IF NOT EXISTS "idx_neighborhood_country" ON "neighborhood_translations" USING btree ("country_code")
    `);

    // 3. Migrate existing neighborhood data
    console.log('3. Migrating existing neighborhood data...');
    await db.execute(sql`
        INSERT INTO "neighborhood_translations" ("country_code", "local_name")
        SELECT
            CASE
                WHEN position(':' in "neighborhood") > 0 THEN split_part("neighborhood", ':', 1)
                ELSE 'KR'
            END as "country_code",
            CASE
                WHEN position(':' in "neighborhood") > 0 THEN split_part("neighborhood", ':', 2)
                ELSE "neighborhood"
            END as "local_name"
        FROM "users"
        WHERE "neighborhood" IS NOT NULL AND "neighborhood" != ''
        ON CONFLICT ("country_code", "local_name") DO NOTHING
    `);

    // 4. Add neighborhood_id column
    console.log('4. Adding neighborhood_id column...');
    await db.execute(sql`
        ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "neighborhood_id" integer
    `);

    // 5. Update users with neighborhood_id
    console.log('5. Updating users with neighborhood_id...');
    await db.execute(sql`
        UPDATE "users" u
        SET "neighborhood_id" = nt.id
        FROM "neighborhood_translations" nt
        WHERE u."neighborhood" IS NOT NULL
          AND u."neighborhood" != ''
          AND (
            (position(':' in u."neighborhood") > 0 AND nt."country_code" = split_part(u."neighborhood", ':', 1) AND nt."local_name" = split_part(u."neighborhood", ':', 2))
            OR
            (position(':' in u."neighborhood") = 0 AND nt."country_code" = 'KR' AND nt."local_name" = u."neighborhood")
          )
    `);

    // 6. Add FK constraint (if not exists)
    console.log('6. Adding FK constraint...');
    try {
        await db.execute(sql`
            ALTER TABLE "users" ADD CONSTRAINT "users_neighborhood_id_neighborhood_translations_id_fk"
            FOREIGN KEY ("neighborhood_id") REFERENCES "public"."neighborhood_translations"("id")
            ON DELETE set null ON UPDATE no action
        `);
    } catch (e: any) {
        if (e.message?.includes('already exists')) {
            console.log('   FK constraint already exists, skipping...');
        } else {
            throw e;
        }
    }

    // 7. Create index on neighborhood_id
    console.log('7. Creating index on neighborhood_id...');
    await db.execute(sql`
        CREATE INDEX IF NOT EXISTS "idx_users_neighborhood_id" ON "users" USING btree ("neighborhood_id")
    `);

    console.log('\n=== Migration completed! ===\n');

    // Check results
    const translations = await db.execute(sql`SELECT * FROM neighborhood_translations`);
    console.log('Neighborhood translations created:', translations.rows.length);

    const usersWithNeighborhood = await db.execute(sql`SELECT id, neighborhood, neighborhood_id FROM users WHERE neighborhood_id IS NOT NULL`);
    console.log('Users migrated with neighborhood_id:', usersWithNeighborhood.rows.length);

    if (translations.rows.length > 0) {
        console.log('\nTranslations:');
        for (const t of translations.rows) {
            console.log(`  - ${(t as any).country_code}:${(t as any).local_name} (id: ${(t as any).id})`);
        }
    }

    process.exit(0);
}

migrate().catch(e => {
    console.error('Migration failed:', e);
    process.exit(1);
});
