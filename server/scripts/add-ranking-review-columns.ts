import { db } from '../db/index.js';
import { sql } from 'drizzle-orm';

async function addColumns() {
    try {
        console.log('Adding latest_review_text and latest_review_images columns...');

        await db.execute(sql`
            ALTER TABLE users_ranking
            ADD COLUMN IF NOT EXISTS latest_review_text text,
            ADD COLUMN IF NOT EXISTS latest_review_images jsonb;
        `);

        console.log('✅ Columns added successfully!');

        // Optionally populate existing data
        console.log('\nPopulating existing data...');
        await db.execute(sql`
            UPDATE users_ranking ur
            SET
                latest_review_text = (
                    SELECT text FROM content c
                    WHERE c.user_id = ur.user_id
                    AND CAST(c.review_prop->>'shop_id' AS INTEGER) = ur.shop_id
                    AND c.is_deleted = false
                    ORDER BY c.created_at DESC
                    LIMIT 1
                ),
                latest_review_images = (
                    SELECT img FROM content c
                    WHERE c.user_id = ur.user_id
                    AND CAST(c.review_prop->>'shop_id' AS INTEGER) = ur.shop_id
                    AND c.is_deleted = false
                    ORDER BY c.created_at DESC
                    LIMIT 1
                )
            WHERE latest_review_text IS NULL;
        `);

        console.log('✅ Existing data populated!');
        process.exit(0);

    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

addColumns();
