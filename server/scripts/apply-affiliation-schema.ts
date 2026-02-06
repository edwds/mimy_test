/**
 * Apply affiliation schema changes (groups, email_verifications tables, users columns)
 * Run: npx tsx server/scripts/apply-affiliation-schema.ts
 */
import { db } from '../db/index.js';
import { sql } from 'drizzle-orm';

async function applySchema() {
    console.log('[Schema] Applying affiliation schema changes...');

    try {
        // 1. Create groups table
        console.log('[Schema] Creating groups table...');
        await db.execute(sql`
            CREATE TABLE IF NOT EXISTS "groups" (
                "id" serial PRIMARY KEY NOT NULL,
                "name" varchar(100) NOT NULL,
                "type" varchar(20) NOT NULL,
                "allowed_domains" text[] NOT NULL,
                "logo_url" text,
                "is_active" boolean DEFAULT true,
                "created_at" timestamp DEFAULT now(),
                "updated_at" timestamp DEFAULT now()
            )
        `);

        // Create indexes for groups
        await db.execute(sql`CREATE INDEX IF NOT EXISTS "idx_groups_type" ON "groups" USING btree ("type")`);
        await db.execute(sql`CREATE INDEX IF NOT EXISTS "idx_groups_name" ON "groups" USING btree ("name")`);
        console.log('[Schema] Groups table created.');

        // 2. Create email_verifications table
        console.log('[Schema] Creating email_verifications table...');
        await db.execute(sql`
            CREATE TABLE IF NOT EXISTS "email_verifications" (
                "id" serial PRIMARY KEY NOT NULL,
                "email" varchar(255) NOT NULL,
                "user_id" integer NOT NULL,
                "code" varchar(6) NOT NULL,
                "expires_at" timestamp NOT NULL,
                "attempts" integer DEFAULT 0,
                "is_verified" boolean DEFAULT false,
                "created_at" timestamp DEFAULT now(),
                "verified_at" timestamp
            )
        `);

        // Add foreign key
        await db.execute(sql`
            DO $$ BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'email_verifications_user_id_users_id_fk') THEN
                    ALTER TABLE "email_verifications" ADD CONSTRAINT "email_verifications_user_id_users_id_fk"
                    FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
                END IF;
            END $$;
        `);

        // Create indexes for email_verifications
        await db.execute(sql`CREATE INDEX IF NOT EXISTS "idx_email_verify_user" ON "email_verifications" USING btree ("user_id", "is_verified")`);
        await db.execute(sql`CREATE INDEX IF NOT EXISTS "idx_email_verify_email" ON "email_verifications" USING btree ("email")`);
        console.log('[Schema] Email verifications table created.');

        // 3. Add columns to users table
        console.log('[Schema] Adding columns to users table...');

        // Add group_id column
        await db.execute(sql`
            DO $$ BEGIN
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'group_id') THEN
                    ALTER TABLE "users" ADD COLUMN "group_id" integer;
                END IF;
            END $$;
        `);

        // Add group_email column
        await db.execute(sql`
            DO $$ BEGIN
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'group_email') THEN
                    ALTER TABLE "users" ADD COLUMN "group_email" varchar(255);
                END IF;
            END $$;
        `);

        // Add group_joined_at column
        await db.execute(sql`
            DO $$ BEGIN
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'group_joined_at') THEN
                    ALTER TABLE "users" ADD COLUMN "group_joined_at" timestamp;
                END IF;
            END $$;
        `);

        // Add neighborhood column
        await db.execute(sql`
            DO $$ BEGIN
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'neighborhood') THEN
                    ALTER TABLE "users" ADD COLUMN "neighborhood" varchar(100);
                END IF;
            END $$;
        `);

        // Add neighborhood_joined_at column
        await db.execute(sql`
            DO $$ BEGIN
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'neighborhood_joined_at') THEN
                    ALTER TABLE "users" ADD COLUMN "neighborhood_joined_at" timestamp;
                END IF;
            END $$;
        `);

        // Add foreign key for group_id
        await db.execute(sql`
            DO $$ BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_group_id_groups_id_fk') THEN
                    ALTER TABLE "users" ADD CONSTRAINT "users_group_id_groups_id_fk"
                    FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE set null ON UPDATE no action;
                END IF;
            END $$;
        `);

        // Create indexes for users
        await db.execute(sql`CREATE INDEX IF NOT EXISTS "idx_users_group_id" ON "users" USING btree ("group_id")`);
        await db.execute(sql`CREATE INDEX IF NOT EXISTS "idx_users_neighborhood" ON "users" USING btree ("neighborhood")`);

        console.log('[Schema] Users table columns added.');

        console.log('[Schema] All schema changes applied successfully!');

    } catch (error) {
        console.error('[Schema] Error applying schema:', error);
        throw error;
    }

    process.exit(0);
}

applySchema();
