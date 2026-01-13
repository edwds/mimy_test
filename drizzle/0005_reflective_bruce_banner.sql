ALTER TABLE "users_ranking" ADD COLUMN "satisfaction_tier" integer DEFAULT 2 NOT NULL;--> statement-breakpoint

WITH ordered AS (
  SELECT
    id,
    user_id,
    satisfaction_tier,
    ROW_NUMBER() OVER (
      PARTITION BY user_id, satisfaction_tier
      ORDER BY rank ASC, id ASC
    ) AS new_rank
  FROM "users_ranking"
),
upd AS (
  UPDATE "users_ranking" ur
  SET rank = o.new_rank
  FROM ordered o
  WHERE ur.id = o.id
)
SELECT 1;--> statement-breakpoint

ALTER TABLE "users_ranking" ADD CONSTRAINT "users_ranking_user_id_satisfaction_tier_rank_unique" UNIQUE("user_id","satisfaction_tier","rank");