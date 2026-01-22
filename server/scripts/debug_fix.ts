
import { db } from "../db/index.js";
import { users_ranking, content, users } from "../db/schema.js";
import { sql, eq, and, desc } from "drizzle-orm";

async function run() {
    console.log("Starting debug script fix...");
    try {
        const shopId = 1;

        // Simplified query WITHOUT ::jsonb cast
        console.log("Building simplified query...");
        let query = db.select({
            id: content.id,
            user_id: content.user_id,
            text: content.text,
            review_prop: content.review_prop,
            user: {
                id: users.id,
            }
        })
            .from(content)
            .innerJoin(users, eq(content.user_id, users.id))
            .leftJoin(users_ranking, and(
                eq(users_ranking.user_id, content.user_id),
                eq(users_ranking.shop_id, shopId)
            ))
            .where(and(
                eq(content.type, 'review'),
                eq(content.is_deleted, false),
                eq(content.visibility, true),
                // REMOVE ::jsonb cast. Assume it's already jsonb or Drizzle handles it.
                // ALSO remove ::text cast on parameter, just pass string.
                sql`${content.review_prop}->>'shop_id' = ${shopId.toString()}`
            ))
            .limit(5);

        console.log("Executing simplified query...");
        const reviews = await query;
        console.log(`Query returned ${reviews.length} rows.`);
        console.log("Success!");

    } catch (error) {
        console.error("DEBUG FIX FAILED:", error);
    }
    process.exit(0);
}

run();
