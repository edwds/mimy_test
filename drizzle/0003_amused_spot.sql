CREATE TABLE IF NOT EXISTS "content" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"type" varchar(20) NOT NULL,
	"text" text,
	"images" jsonb,
	"shop_id" integer,
	"satisfaction" varchar(20),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "shops" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"category" varchar(100),
	"address" text,
	"rating" double precision,
	"image_url" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users_ranking" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"shop_id" integer NOT NULL,
	"rank" integer NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users_wantstogo" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"shop_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
-- ALTER TABLE "terms" DROP CONSTRAINT "terms_code_unique";
-- ALTER TABLE "content" ADD CONSTRAINT "content_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
-- ALTER TABLE "content" ADD CONSTRAINT "content_shop_id_shops_id_fk" FOREIGN KEY ("shop_id") REFERENCES "public"."shops"("id") ON DELETE no action ON UPDATE no action;
-- ALTER TABLE "users_ranking" ADD CONSTRAINT "users_ranking_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
-- ALTER TABLE "users_ranking" ADD CONSTRAINT "users_ranking_shop_id_shops_id_fk" FOREIGN KEY ("shop_id") REFERENCES "public"."shops"("id") ON DELETE no action ON UPDATE no action;
-- ALTER TABLE "users_wantstogo" ADD CONSTRAINT "users_wantstogo_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
-- ALTER TABLE "users_wantstogo" ADD CONSTRAINT "users_wantstogo_shop_id_shops_id_fk" FOREIGN KEY ("shop_id") REFERENCES "public"."shops"("id") ON DELETE no action ON UPDATE no action;