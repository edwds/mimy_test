CREATE TABLE IF NOT EXISTS "taste_clusters" (
	"id" serial PRIMARY KEY NOT NULL,
	"cluster_id" integer NOT NULL,
	"name" varchar(100) NOT NULL,
	"tagline" text,
	"medoid_value" varchar(100),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "taste_clusters_cluster_id_unique" UNIQUE("cluster_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "quiz_matches" (
	"vector" varchar(50) PRIMARY KEY NOT NULL,
	"cluster_id" integer NOT NULL
);
