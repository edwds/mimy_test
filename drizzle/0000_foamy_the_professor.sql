CREATE TABLE IF NOT EXISTS "phone_verifications" (
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
CREATE TABLE IF NOT EXISTS "terms" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" varchar(50) NOT NULL,
	"title" varchar(200) NOT NULL,
	"content" text NOT NULL,
	"is_required" boolean DEFAULT true NOT NULL,
	"version" varchar(20) NOT NULL,
	"country_code" varchar(5) DEFAULT 'ALL',
	"effective_date" timestamp NOT NULL,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "terms_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_term_agreements" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"term_id" integer NOT NULL,
	"term_version" varchar(20) NOT NULL,
	"is_agreed" boolean DEFAULT true NOT NULL,
	"agreed_at" timestamp DEFAULT now(),
	CONSTRAINT "user_term_agreements_user_id_term_id_term_version_unique" UNIQUE("user_id","term_id","term_version")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"channel" integer DEFAULT 0 NOT NULL,
	"email" varchar(128),
	"phone" varchar(20) NOT NULL,
	"phone_country" varchar(5) NOT NULL,
	"phone_verified" boolean DEFAULT false,
	"account_id" varchar(30) NOT NULL,
	"nickname" varchar(20),
	"bio" text,
	"link" text,
	"profile_image" text,
	"visible_rank" integer DEFAULT 100,
	"birthdate" timestamp,
	"gender" varchar(1),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_phone_unique" UNIQUE("phone"),
	CONSTRAINT "users_account_id_unique" UNIQUE("account_id")
);
--> statement-breakpoint
-- ALTER TABLE "user_term_agreements" ADD CONSTRAINT "user_term_agreements_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
-- ALTER TABLE "user_term_agreements" ADD CONSTRAINT "user_term_agreements_term_id_terms_id_fk" FOREIGN KEY ("term_id") REFERENCES "public"."terms"("id") ON DELETE no action ON UPDATE no action;