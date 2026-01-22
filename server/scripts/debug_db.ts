
import { db } from "../db/index.js";
import { users_ranking, content, users, shops } from "../db/schema.js";
import { sql, eq, and, desc, asc } from "drizzle-orm";
import fs from 'fs';
import path from 'path';

async function run() {
    console.log("Starting debug script v2...");
    try {
        const shopId = 1;

        // Mock getClusterName
        const getClusterName = (id: any) => "MockCluster";

        // Query with exact structure
        console.log("Building nested query...");
        let query = db.select({
            id: content.id,
            user_id: content.user_id,
            text: content.text,
            img: content.img,
            created_at: content.created_at,
            review_prop: content.review_prop,
            keyword: content.keyword,
            user: {
                id: users.id,
                nickname: users.nickname,
                profile_image: users.profile_image,
                taste_cluster: users.taste_cluster,
                taste_result: users.taste_result
            },
            rank: users_ranking.rank
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
                sql`(${content.review_prop}::jsonb)->>'shop_id' = ${shopId.toString()}::text`
            ))
            .orderBy(desc(content.created_at))
            .limit(5);

        console.log("Executing query...");
        const reviews = await query;
        console.log(`Query returned ${reviews.length} rows.`);

        // Map logic
        console.log("Mapping results...");
        const result = reviews.map(r => ({
            id: r.id,
            user: {
                ...r.user,
                cluster_name: getClusterName(r.user.taste_cluster)
            },
            text: r.text,
            images: r.img,
            created_at: r.created_at,
            review_prop: r.review_prop,
            poi: {
                shop_id: shopId,
                rank: r.rank,
                satisfaction: (r.review_prop as any)?.satisfaction
            },
            keyword: r.keyword,
        }));

        console.log("Mapping success. Sample:", JSON.stringify(result[0], null, 2));

    } catch (error) {
        console.error("DEBUG V2 FAILED:", error);
        // Log stack trace
        if (error instanceof Error) {
            console.error(error.stack);
        }
    }
    process.exit(0);
}

run();
