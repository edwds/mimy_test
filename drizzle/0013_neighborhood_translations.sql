-- Create neighborhood_translations table
CREATE TABLE "neighborhood_translations" (
    "id" serial PRIMARY KEY NOT NULL,
    "country_code" varchar(5) NOT NULL,
    "local_name" varchar(100) NOT NULL,
    "english_name" varchar(100),
    "created_at" timestamp DEFAULT now(),
    CONSTRAINT "neighborhood_translations_country_code_local_name_unique" UNIQUE("country_code", "local_name")
);
--> statement-breakpoint
CREATE INDEX "idx_neighborhood_country" ON "neighborhood_translations" USING btree ("country_code");
--> statement-breakpoint
-- Migrate existing neighborhood data to new table
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
ON CONFLICT ("country_code", "local_name") DO NOTHING;
--> statement-breakpoint
-- Add neighborhood_id column to users
ALTER TABLE "users" ADD COLUMN "neighborhood_id" integer;
--> statement-breakpoint
-- Update users with neighborhood_id from translations
UPDATE "users" u
SET "neighborhood_id" = nt.id
FROM "neighborhood_translations" nt
WHERE u."neighborhood" IS NOT NULL
  AND u."neighborhood" != ''
  AND (
    (position(':' in u."neighborhood") > 0 AND nt."country_code" = split_part(u."neighborhood", ':', 1) AND nt."local_name" = split_part(u."neighborhood", ':', 2))
    OR
    (position(':' in u."neighborhood") = 0 AND nt."country_code" = 'KR' AND nt."local_name" = u."neighborhood")
  );
--> statement-breakpoint
-- Add foreign key constraint
ALTER TABLE "users" ADD CONSTRAINT "users_neighborhood_id_neighborhood_translations_id_fk" FOREIGN KEY ("neighborhood_id") REFERENCES "public"."neighborhood_translations"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
-- Create index on neighborhood_id
CREATE INDEX "idx_users_neighborhood_id" ON "users" USING btree ("neighborhood_id");
--> statement-breakpoint
-- Drop old neighborhood column and index
DROP INDEX IF EXISTS "idx_users_neighborhood";
--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN IF EXISTS "neighborhood";
