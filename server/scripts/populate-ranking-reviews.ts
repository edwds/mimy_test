import { db } from '../db/index.js';
import { users_ranking, content } from '../db/schema.js';
import { sql, and, eq, desc } from 'drizzle-orm';

async function populateRankingReviews() {
    try {
        console.log('Starting to populate ranking reviews...\n');

        // 1. Count total rankings without review data
        const totalResult = await db.execute(sql`
            SELECT COUNT(*) as count
            FROM users_ranking
            WHERE latest_review_text IS NULL
        `);
        const total = Number(totalResult.rows[0]?.count || 0);
        console.log(`Total rankings to update: ${total}\n`);

        if (total === 0) {
            console.log('✅ All rankings already have review data!');
            return;
        }

        // 2. Process in batches
        const batchSize = 1000;
        let processed = 0;

        while (processed < total) {
            const startTime = Date.now();

            // Get batch of ranking IDs
            const batch = await db.execute(sql`
                SELECT id, user_id, shop_id
                FROM users_ranking
                WHERE latest_review_text IS NULL
                LIMIT ${batchSize}
            `);

            const batchRows = batch.rows;
            if (batchRows.length === 0) break;

            // Update using efficient single query with lateral join
            await db.execute(sql`
                UPDATE users_ranking ur
                SET
                    latest_review_text = review_data.text,
                    latest_review_images = review_data.img
                FROM (
                    SELECT DISTINCT ON (ur2.id)
                        ur2.id,
                        c.text,
                        c.img
                    FROM users_ranking ur2
                    LEFT JOIN LATERAL (
                        SELECT text, img
                        FROM content c
                        WHERE c.user_id = ur2.user_id
                        AND CAST(c.review_prop->>'shop_id' AS INTEGER) = ur2.shop_id
                        AND c.is_deleted = false
                        ORDER BY c.created_at DESC
                        LIMIT 1
                    ) c ON true
                    WHERE ur2.id = ANY(${sql.raw(`ARRAY[${batchRows.map((r: any) => r.id).join(',')}]`)})
                ) review_data
                WHERE ur.id = review_data.id
            `);

            processed += batchRows.length;
            const elapsed = Date.now() - startTime;
            const percent = ((processed / total) * 100).toFixed(1);

            console.log(`✅ Processed ${processed}/${total} (${percent}%) - ${elapsed}ms`);

            // Small delay to avoid overloading DB
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        console.log('\n🎉 All ranking reviews populated successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error populating ranking reviews:', error);
        process.exit(1);
    }
}

populateRankingReviews();
