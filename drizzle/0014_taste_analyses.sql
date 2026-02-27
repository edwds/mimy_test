CREATE TABLE "taste_analyses" (
    "id" serial PRIMARY KEY NOT NULL,
    "user_id" integer NOT NULL,
    "share_code" varchar(20) NOT NULL,
    "taste_type" varchar(10) NOT NULL,
    "taste_scores" jsonb NOT NULL,
    "ranked_shops_summary" jsonb,
    "analysis" jsonb NOT NULL,
    "created_at" timestamp DEFAULT now(),
    "updated_at" timestamp DEFAULT now(),
    CONSTRAINT "taste_analyses_share_code_unique" UNIQUE("share_code")
);
--> statement-breakpoint
ALTER TABLE "taste_analyses" ADD CONSTRAINT "taste_analyses_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "idx_taste_analyses_user" ON "taste_analyses" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX "idx_taste_analyses_code" ON "taste_analyses" USING btree ("share_code");
