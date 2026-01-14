ALTER TABLE "users" ALTER COLUMN "taste_cluster" SET DATA TYPE varchar(50);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "taste_result" jsonb;