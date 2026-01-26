CREATE TABLE "hate_prop" (
	"id" serial PRIMARY KEY NOT NULL,
	"item" text NOT NULL,
	"category" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "hate_result" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"prop_id" integer NOT NULL,
	"selection" varchar(10) NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "hate_result_user_id_prop_id_unique" UNIQUE("user_id","prop_id")
);
--> statement-breakpoint
CREATE TABLE "leaderboard" (
	"id" serial PRIMARY KEY NOT NULL,
	"type" varchar(20) NOT NULL,
	"key" varchar(100),
	"user_id" integer NOT NULL,
	"rank" integer NOT NULL,
	"score" integer NOT NULL,
	"stats" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "vs_prop" (
	"id" serial PRIMARY KEY NOT NULL,
	"item_a" text NOT NULL,
	"item_b" text NOT NULL,
	"category" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "vs_result" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"prop_id" integer NOT NULL,
	"selected_value" varchar(1) NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "vs_result_user_id_prop_id_unique" UNIQUE("user_id","prop_id")
);
--> statement-breakpoint
ALTER TABLE "content" ADD COLUMN "img_text" jsonb;--> statement-breakpoint
ALTER TABLE "content" ADD COLUMN "link_json" jsonb;--> statement-breakpoint
ALTER TABLE "shops" ADD COLUMN "google_place_id" text;--> statement-breakpoint
ALTER TABLE "hate_result" ADD CONSTRAINT "hate_result_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hate_result" ADD CONSTRAINT "hate_result_prop_id_hate_prop_id_fk" FOREIGN KEY ("prop_id") REFERENCES "public"."hate_prop"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leaderboard" ADD CONSTRAINT "leaderboard_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vs_result" ADD CONSTRAINT "vs_result_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vs_result" ADD CONSTRAINT "vs_result_prop_id_vs_prop_id_fk" FOREIGN KEY ("prop_id") REFERENCES "public"."vs_prop"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_hate_result_prop" ON "hate_result" USING btree ("prop_id");--> statement-breakpoint
CREATE INDEX "idx_leaderboard_type" ON "leaderboard" USING btree ("type","key");--> statement-breakpoint
CREATE INDEX "idx_vs_result_prop" ON "vs_result" USING btree ("prop_id");--> statement-breakpoint
ALTER TABLE "shops" ADD CONSTRAINT "shops_google_place_id_unique" UNIQUE("google_place_id");