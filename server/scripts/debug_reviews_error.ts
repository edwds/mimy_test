
import { db } from '../db/index.js';
import { content, users } from '../db/schema.js';
import { eq, and, sql, desc } from 'drizzle-orm';

async function debugReviews() {
    try {
        const shopId = 1254;
        const page = 2;
        const limit = 20;
        const sort = 'similar';
        const userId = 320;
        const offset = (page - 1) * limit;

        console.log(`Debugging reviews for Shop ${shopId}, Page ${page}, Sort ${sort}, User ${userId}`);

        // 1. Base Query
        let query = db.select({
            id: content.id,
            user_id: content.user_id,
            review_prop: content.review_prop,
            user: {
                id: users.id,
                taste_cluster: users.taste_cluster
            }
        })
            .from(content)
            .innerJoin(users, eq(content.user_id, users.id))
            .where(and(
                eq(content.type, 'review'),
                eq(content.is_deleted, false),
                eq(content.visibility, true),
                sql`(${content.review_prop}::jsonb)->>'shop_id' = ${shopId.toString()}::text`
            )).$dynamic();

        // 2. Sorting Logic
        if (sort === 'similar' && userId) {
            console.log("Fetching requester cluster...");
            const requestingUser = await db.select({ taste_cluster: users.taste_cluster })
                .from(users)
                .where(eq(users.id, userId))
                .limit(1);

            const userCluster = requestingUser[0]?.taste_cluster;
            console.log("Requester Cluster:", userCluster);

            if (userCluster) {
                console.log("Adding similar sort order...");
                query = query.orderBy(
                    sql`CASE WHEN ${users.taste_cluster} = ${userCluster}::text THEN 1 ELSE 0 END DESC`,
                    desc(content.created_at)
                );
            } else {
                console.log("No cluster found, fallback sort.");
                query = query.orderBy(desc(content.created_at));
            }
        } else {
            query = query.orderBy(desc(content.created_at));
        }

        console.log("Generated SQL:", query.toSQL());

        console.log("Executing query...");
        // 3. Execute & Pagination
        const reviews = await query.limit(limit).offset(offset);

        console.log(`Success! Found ${reviews.length} reviews.`);
        console.log(JSON.stringify(reviews.slice(0, 2), null, 2));

    } catch (error) {
        console.error("CAUGHT ERROR:");
        console.error(error);
    }
    process.exit(0);
}

debugReviews();
