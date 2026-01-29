import { db } from '../db/index.js';
import { content, users } from '../db/schema.js';
import { sql, desc } from 'drizzle-orm';

async function main() {
  console.log('Checking content data...\n');

  // 1. Check total content
  const totalContent = await db.execute(sql`
    SELECT COUNT(*) as total FROM content
  `);
  console.log(`Total content entries: ${totalContent.rows[0].total}`);

  // 2. Check content by type
  const contentByType = await db.execute(sql`
    SELECT type, COUNT(*) as count
    FROM content
    GROUP BY type
  `);
  console.log('\nContent by type:');
  contentByType.rows.forEach((row: any) => {
    console.log(`  ${row.type}: ${row.count}`);
  });

  // 3. Check visibility and deleted flags
  const contentFlags = await db.execute(sql`
    SELECT
      visibility,
      is_deleted,
      COUNT(*) as count
    FROM content
    GROUP BY visibility, is_deleted
  `);
  console.log('\nContent by visibility/deleted status:');
  contentFlags.rows.forEach((row: any) => {
    console.log(`  visibility=${row.visibility}, is_deleted=${row.is_deleted}: ${row.count}`);
  });

  // 4. Sample content entries
  const sampleContent = await db
    .select({
      id: content.id,
      user_id: content.user_id,
      type: content.type,
      text: content.text,
      visibility: content.visibility,
      is_deleted: content.is_deleted,
      created_at: content.created_at
    })
    .from(content)
    .orderBy(desc(content.created_at))
    .limit(5);

  console.log('\nSample content (5 most recent):');
  sampleContent.forEach((c) => {
    console.log(`\nID: ${c.id}`);
    console.log(`  User ID: ${c.user_id}`);
    console.log(`  Type: ${c.type}`);
    console.log(`  Text: ${c.text?.substring(0, 100)}...`);
    console.log(`  Visibility: ${c.visibility}, Deleted: ${c.is_deleted}`);
    console.log(`  Created: ${c.created_at}`);
  });

  // 5. Check user association
  const userCheck = await db.execute(sql`
    SELECT
      c.user_id,
      u.id as user_exists,
      u.nickname,
      COUNT(c.id) as content_count
    FROM content c
    LEFT JOIN users u ON c.user_id = u.id
    GROUP BY c.user_id, u.id, u.nickname
    HAVING u.id IS NULL
    LIMIT 10
  `);

  if (userCheck.rows.length > 0) {
    console.log('\n⚠️  WARNING: Found content with non-existent users:');
    userCheck.rows.forEach((row: any) => {
      console.log(`  User ID ${row.user_id}: ${row.content_count} contents`);
    });
  } else {
    console.log('\n✅ All content entries have valid user associations');
  }

  // 6. Check review_prop data
  const reviewPropCheck = await db.execute(sql`
    SELECT
      id,
      user_id,
      review_prop,
      created_at
    FROM content
    WHERE type = 'review'
    LIMIT 5
  `);

  console.log('\nSample review_prop data:');
  reviewPropCheck.rows.forEach((row: any) => {
    console.log(`\nContent ID: ${row.id}`);
    console.log(`  User ID: ${row.user_id}`);
    console.log(`  review_prop: ${JSON.stringify(row.review_prop)}`);
  });

  console.log('\n✅ Content check complete!');
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Check failed:', error);
    process.exit(1);
  });
