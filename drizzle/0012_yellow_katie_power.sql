CREATE TABLE "email_verifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" varchar(255) NOT NULL,
	"user_id" integer NOT NULL,
	"code" varchar(6) NOT NULL,
	"expires_at" timestamp NOT NULL,
	"attempts" integer DEFAULT 0,
	"is_verified" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"verified_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "groups" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"type" varchar(20) NOT NULL,
	"allowed_domains" text[] NOT NULL,
	"logo_url" text,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "group_id" integer;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "group_email" varchar(255);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "group_joined_at" timestamp;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "neighborhood" varchar(100);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "neighborhood_joined_at" timestamp;--> statement-breakpoint
ALTER TABLE "email_verifications" ADD CONSTRAINT "email_verifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_email_verify_user" ON "email_verifications" USING btree ("user_id","is_verified");--> statement-breakpoint
CREATE INDEX "idx_email_verify_email" ON "email_verifications" USING btree ("email");--> statement-breakpoint
CREATE INDEX "idx_groups_type" ON "groups" USING btree ("type");--> statement-breakpoint
CREATE INDEX "idx_groups_name" ON "groups" USING btree ("name");--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_users_group_id" ON "users" USING btree ("group_id");--> statement-breakpoint
CREATE INDEX "idx_users_neighborhood" ON "users" USING btree ("neighborhood");