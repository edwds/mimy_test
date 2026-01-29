import { db } from '../db/index.js';
import { content, users } from '../db/schema.js';
import { sql } from 'drizzle-orm';

async function main() {
  console.log('Fixing is_deleted flags for distributed content...\n');

  // Get all content from dummy users
  const result = await db.execute(sql`
    UPDATE content
    SET is_deleted = false
    WHERE user_id IN (
      SELECT id FROM users WHERE email LIKE '%sample.com'
    )
    AND is_deleted = true
  `);

  console.log(`Updated ${result.rowCount} content entries`);

  // Verify the fix
  const checkResult = await db.execute(sql`
    SELECT
      is_deleted,
      COUNT(*) as count
    FROM content
    WHERE user_id IN (
      SELECT id FROM users WHERE email LIKE '%sample.com'
    )
    GROUP BY is_deleted
  `);

  console.log('\nContent status after fix:');
  checkResult.rows.forEach((row: any) => {
    console.log(`  is_deleted=${row.is_deleted}: ${row.count} entries`);
  });

  console.log('\n✅ Fix complete!');
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fix failed:', error);
    process.exit(1);
  });
