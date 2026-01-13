/* 
   Manually modified to skip CREATE TABLE for existing tables.
   Only adding new columns and missing unique constraints.
*/

-- Add columns to content
ALTER TABLE "content" ADD COLUMN IF NOT EXISTS "img" jsonb;
ALTER TABLE "content" ADD COLUMN IF NOT EXISTS "video" jsonb;
ALTER TABLE "content" ADD COLUMN IF NOT EXISTS "review_prop" jsonb;
ALTER TABLE "content" ADD COLUMN IF NOT EXISTS "keyword" jsonb;
ALTER TABLE "content" ADD COLUMN IF NOT EXISTS "visibility" boolean DEFAULT true;
ALTER TABLE "content" ADD COLUMN IF NOT EXISTS "is_deleted" boolean DEFAULT false;

-- Add columns to shops
ALTER TABLE "shops" ADD COLUMN IF NOT EXISTS "catchtable_id" integer;
ALTER TABLE "shops" ADD COLUMN IF NOT EXISTS "catchtable_ref" text;
ALTER TABLE "shops" ADD COLUMN IF NOT EXISTS "description" text;
ALTER TABLE "shops" ADD COLUMN IF NOT EXISTS "address_full" text;
ALTER TABLE "shops" ADD COLUMN IF NOT EXISTS "address_region" text;
ALTER TABLE "shops" ADD COLUMN IF NOT EXISTS "name_i18n" text;
ALTER TABLE "shops" ADD COLUMN IF NOT EXISTS "description_i18n" text;
ALTER TABLE "shops" ADD COLUMN IF NOT EXISTS "address_i18n" text;
ALTER TABLE "shops" ADD COLUMN IF NOT EXISTS "kind" text;
ALTER TABLE "shops" ADD COLUMN IF NOT EXISTS "food_kind" text;
ALTER TABLE "shops" ADD COLUMN IF NOT EXISTS "lat" double precision;
ALTER TABLE "shops" ADD COLUMN IF NOT EXISTS "lon" double precision;
ALTER TABLE "shops" ADD COLUMN IF NOT EXISTS "thumbnail_img" text;
ALTER TABLE "shops" ADD COLUMN IF NOT EXISTS "sub_img" text;
ALTER TABLE "shops" ADD COLUMN IF NOT EXISTS "menu" text;
ALTER TABLE "shops" ADD COLUMN IF NOT EXISTS "status" integer DEFAULT 2;
ALTER TABLE "shops" ADD COLUMN IF NOT EXISTS "country_code" varchar(5);
ALTER TABLE "shops" ADD COLUMN IF NOT EXISTS "visibility" boolean DEFAULT true;

-- Add columns to users_wantstogo
ALTER TABLE "users_wantstogo" ADD COLUMN IF NOT EXISTS "channel" text;
ALTER TABLE "users_wantstogo" ADD COLUMN IF NOT EXISTS "folder" text;
ALTER TABLE "users_wantstogo" ADD COLUMN IF NOT EXISTS "memo" text;
ALTER TABLE "users_wantstogo" ADD COLUMN IF NOT EXISTS "visibility" boolean DEFAULT true;
ALTER TABLE "users_wantstogo" ADD COLUMN IF NOT EXISTS "is_deleted" boolean DEFAULT false;
ALTER TABLE "users_wantstogo" ADD COLUMN IF NOT EXISTS "updated_at" timestamp DEFAULT now();

-- Drop columns that were removed/renamed (Optional, commenting out to be safe)
-- ALTER TABLE "content" DROP COLUMN "images";
-- ALTER TABLE "content" DROP COLUMN "shop_id";
-- ALTER TABLE "content" DROP COLUMN "satisfaction";

-- Add Unique Constraints (THE FIX)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_ranking_user_id_shop_id_unique') THEN
        ALTER TABLE "users_ranking" ADD CONSTRAINT "users_ranking_user_id_shop_id_unique" UNIQUE("user_id","shop_id");
    END IF;
END $$;

DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_wantstogo_user_id_shop_id_unique') THEN
        ALTER TABLE "users_wantstogo" ADD CONSTRAINT "users_wantstogo_user_id_shop_id_unique" UNIQUE("user_id","shop_id");
    END IF;
END $$;