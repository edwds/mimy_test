CREATE TABLE "comments" (
	"id" serial PRIMARY KEY NOT NULL,
	"content_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"parent_id" integer,
	"mention_user_id" integer,
	"text" text,
	"img" jsonb,
	"video" jsonb,
	"is_deleted" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "likes" (
	"id" serial PRIMARY KEY NOT NULL,
	"target_type" varchar(20) NOT NULL,
	"target_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "likes_target_type_target_id_user_id_unique" UNIQUE("target_type","target_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "phone_verifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"phone" varchar(20) NOT NULL,
	"country_code" varchar(5) NOT NULL,
	"code" varchar(6) NOT NULL,
	"expires_at" timestamp NOT NULL,
	"attempts" integer DEFAULT 0,
	"is_verified" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"verified_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "user_term_agreements" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"term_id" bigint NOT NULL,
	"term_version" varchar(20) NOT NULL,
	"is_agreed" boolean DEFAULT true NOT NULL,
	"agreed_at" timestamp DEFAULT now(),
	"ip_address" text,
	"user_agent" text,
	CONSTRAINT "user_term_agreements_user_id_term_id_term_version_unique" UNIQUE("user_id","term_id","term_version")
);
--> statement-breakpoint
CREATE TABLE "users_exp_event" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"event_type" text NOT NULL,
	"object_type" text NOT NULL,
	"object_id" integer NOT NULL,
	"delta_exp" integer NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users_exp_totals" (
	"user_id" integer PRIMARY KEY NOT NULL,
	"lifetime_xp" bigint DEFAULT 0,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users_follow" (
	"id" serial PRIMARY KEY NOT NULL,
	"follower_id" integer NOT NULL,
	"following_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "users_follow_follower_id_following_id_unique" UNIQUE("follower_id","following_id")
);
--> statement-breakpoint
CREATE TABLE "users_list_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"lists_id" integer NOT NULL,
	"shops_id" integer NOT NULL,
	"content_id" integer,
	"sort_key" double precision,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users_lists" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"img" text,
	"rules" jsonb,
	"visibility" boolean DEFAULT true,
	"is_deleted" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users_taste" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"taste_profile" jsonb,
	"cluster_profile" jsonb,
	"avoid_food" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "content" DROP CONSTRAINT "content_shop_id_shops_id_fk";
--> statement-breakpoint
ALTER TABLE "content" DROP CONSTRAINT "content_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "users_ranking" DROP CONSTRAINT "users_ranking_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "users_ranking" DROP CONSTRAINT "users_ranking_shop_id_shops_id_fk";
--> statement-breakpoint
ALTER TABLE "users_wantstogo" DROP CONSTRAINT "users_wantstogo_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "users_wantstogo" DROP CONSTRAINT "users_wantstogo_shop_id_shops_id_fk";
--> statement-breakpoint
ALTER TABLE "clusters" ALTER COLUMN "name" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "clusters" ALTER COLUMN "medoid_value" SET DATA TYPE text;--> statement-breakpoint
/* 
    Unfortunately in current drizzle-kit version we can't automatically get name for primary key.
    We are working on making it available!

    Meanwhile you can:
        1. Check pk name in your database, by running
            SELECT constraint_name FROM information_schema.table_constraints
            WHERE table_schema = 'public'
                AND table_name = 'quiz_matches'
                AND constraint_type = 'PRIMARY KEY';
        2. Uncomment code below and paste pk name manually
        
    Hope to release this update as soon as possible
*/

-- ALTER TABLE "quiz_matches" DROP CONSTRAINT "<constraint_name>";--> statement-breakpoint
ALTER TABLE "quiz_matches" ALTER COLUMN "vector" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "terms" ALTER COLUMN "id" SET DATA TYPE bigserial;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "gender" SET DATA TYPE char(1);--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "taste_cluster" SET DATA TYPE varchar(10);--> statement-breakpoint
ALTER TABLE "content" ADD COLUMN "img" jsonb;--> statement-breakpoint
ALTER TABLE "content" ADD COLUMN "video" jsonb;--> statement-breakpoint
ALTER TABLE "content" ADD COLUMN "review_prop" jsonb;--> statement-breakpoint
ALTER TABLE "content" ADD COLUMN "keyword" jsonb;--> statement-breakpoint
ALTER TABLE "content" ADD COLUMN "visibility" boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE "content" ADD COLUMN "is_deleted" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "quiz_matches" ADD COLUMN "id" serial PRIMARY KEY NOT NULL;--> statement-breakpoint
ALTER TABLE "shops" ADD COLUMN "catchtable_id" integer;--> statement-breakpoint
ALTER TABLE "shops" ADD COLUMN "catchtable_ref" text;--> statement-breakpoint
ALTER TABLE "shops" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "shops" ADD COLUMN "address_full" text;--> statement-breakpoint
ALTER TABLE "shops" ADD COLUMN "address_region" text;--> statement-breakpoint
ALTER TABLE "shops" ADD COLUMN "name_i18n" text;--> statement-breakpoint
ALTER TABLE "shops" ADD COLUMN "description_i18n" text;--> statement-breakpoint
ALTER TABLE "shops" ADD COLUMN "address_i18n" text;--> statement-breakpoint
ALTER TABLE "shops" ADD COLUMN "kind" text;--> statement-breakpoint
ALTER TABLE "shops" ADD COLUMN "food_kind" text;--> statement-breakpoint
ALTER TABLE "shops" ADD COLUMN "lat" double precision;--> statement-breakpoint
ALTER TABLE "shops" ADD COLUMN "lon" double precision;--> statement-breakpoint
ALTER TABLE "shops" ADD COLUMN "thumbnail_img" text;--> statement-breakpoint
ALTER TABLE "shops" ADD COLUMN "sub_img" text;--> statement-breakpoint
ALTER TABLE "shops" ADD COLUMN "menu" text;--> statement-breakpoint
ALTER TABLE "shops" ADD COLUMN "status" integer DEFAULT 2;--> statement-breakpoint
ALTER TABLE "shops" ADD COLUMN "country_code" varchar(5);--> statement-breakpoint
ALTER TABLE "shops" ADD COLUMN "visibility" boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE "users_wantstogo" ADD COLUMN "channel" text;--> statement-breakpoint
ALTER TABLE "users_wantstogo" ADD COLUMN "folder" text;--> statement-breakpoint
ALTER TABLE "users_wantstogo" ADD COLUMN "memo" text;--> statement-breakpoint
ALTER TABLE "users_wantstogo" ADD COLUMN "visibility" boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE "users_wantstogo" ADD COLUMN "is_deleted" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "users_wantstogo" ADD COLUMN "updated_at" timestamp DEFAULT now();--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_content_id_content_id_fk" FOREIGN KEY ("content_id") REFERENCES "public"."content"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_mention_user_id_users_id_fk" FOREIGN KEY ("mention_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "likes" ADD CONSTRAINT "likes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_term_agreements" ADD CONSTRAINT "user_term_agreements_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_term_agreements" ADD CONSTRAINT "user_term_agreements_term_id_terms_id_fk" FOREIGN KEY ("term_id") REFERENCES "public"."terms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users_exp_event" ADD CONSTRAINT "users_exp_event_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users_exp_totals" ADD CONSTRAINT "users_exp_totals_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users_follow" ADD CONSTRAINT "users_follow_follower_id_users_id_fk" FOREIGN KEY ("follower_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users_follow" ADD CONSTRAINT "users_follow_following_id_users_id_fk" FOREIGN KEY ("following_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users_list_items" ADD CONSTRAINT "users_list_items_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users_list_items" ADD CONSTRAINT "users_list_items_lists_id_users_lists_id_fk" FOREIGN KEY ("lists_id") REFERENCES "public"."users_lists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users_list_items" ADD CONSTRAINT "users_list_items_shops_id_shops_id_fk" FOREIGN KEY ("shops_id") REFERENCES "public"."shops"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users_list_items" ADD CONSTRAINT "users_list_items_content_id_content_id_fk" FOREIGN KEY ("content_id") REFERENCES "public"."content"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users_lists" ADD CONSTRAINT "users_lists_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users_taste" ADD CONSTRAINT "users_taste_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_comments_content" ON "comments" USING btree ("content_id");--> statement-breakpoint
CREATE INDEX "idx_likes_target" ON "likes" USING btree ("target_type","target_id");--> statement-breakpoint
CREATE INDEX "idx_phone_verify_phone" ON "phone_verifications" USING btree ("phone","is_verified");--> statement-breakpoint
CREATE INDEX "idx_exp_totals_xp" ON "users_exp_totals" USING btree ("lifetime_xp");--> statement-breakpoint
CREATE INDEX "idx_follow_follower" ON "users_follow" USING btree ("follower_id");--> statement-breakpoint
CREATE INDEX "idx_follow_following" ON "users_follow" USING btree ("following_id");--> statement-breakpoint
CREATE INDEX "idx_users_taste_user_id" ON "users_taste" USING btree ("user_id");--> statement-breakpoint
ALTER TABLE "content" ADD CONSTRAINT "content_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users_ranking" ADD CONSTRAINT "users_ranking_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users_ranking" ADD CONSTRAINT "users_ranking_shop_id_shops_id_fk" FOREIGN KEY ("shop_id") REFERENCES "public"."shops"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users_wantstogo" ADD CONSTRAINT "users_wantstogo_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users_wantstogo" ADD CONSTRAINT "users_wantstogo_shop_id_shops_id_fk" FOREIGN KEY ("shop_id") REFERENCES "public"."shops"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_content_user" ON "content" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_content_created" ON "content" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_shops_food_kind" ON "shops" USING btree ("food_kind");--> statement-breakpoint
CREATE INDEX "idx_users_account_id" ON "users" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "idx_users_email" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "idx_users_phone" ON "users" USING btree ("phone");--> statement-breakpoint
CREATE INDEX "idx_ranking_user_rank" ON "users_ranking" USING btree ("user_id","rank");--> statement-breakpoint
CREATE INDEX "idx_wantstogo_user" ON "users_wantstogo" USING btree ("user_id");--> statement-breakpoint
ALTER TABLE "content" DROP COLUMN "images";--> statement-breakpoint
ALTER TABLE "content" DROP COLUMN "shop_id";--> statement-breakpoint
ALTER TABLE "content" DROP COLUMN "satisfaction";--> statement-breakpoint
ALTER TABLE "shops" DROP COLUMN "category";--> statement-breakpoint
ALTER TABLE "shops" DROP COLUMN "address";--> statement-breakpoint
ALTER TABLE "shops" DROP COLUMN "rating";--> statement-breakpoint
ALTER TABLE "shops" DROP COLUMN "image_url";--> statement-breakpoint
ALTER TABLE "quiz_matches" ADD CONSTRAINT "quiz_matches_vector_unique" UNIQUE("vector");--> statement-breakpoint
ALTER TABLE "users_ranking" ADD CONSTRAINT "users_ranking_user_id_shop_id_unique" UNIQUE("user_id","shop_id");--> statement-breakpoint
ALTER TABLE "users_wantstogo" ADD CONSTRAINT "users_wantstogo_user_id_shop_id_unique" UNIQUE("user_id","shop_id");