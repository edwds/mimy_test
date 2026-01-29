import { db } from '../db/index.js';
import { users, content, users_ranking } from '../db/schema.js';
import { sql } from 'drizzle-orm';

async function main() {
  console.log('Verifying content distribution...\n');

  // 1. Check content distribution
  const contentStats = await db.execute(sql`
    SELECT
      u.id,
      u.email,
      u.nickname,
      COUNT(c.id) as content_count
    FROM users u
    LEFT JOIN content c ON u.id = c.user_id
    WHERE u.email LIKE '%sample.com'
    GROUP BY u.id, u.email, u.nickname
    ORDER BY content_count DESC
    LIMIT 10
  `);

  console.log('Top 10 users by content count:');
  contentStats.rows.forEach((row: any, index: number) => {
    console.log(`${index + 1}. User ${row.id} (${row.nickname}): ${row.content_count} contents`);
  });

  // 2. Check total content
  const totalContent = await db.execute(sql`
    SELECT COUNT(*) as total FROM content
  `);
  console.log(`\nTotal content entries: ${totalContent.rows[0].total}`);

  // 3. Check ranking distribution
  const rankingStats = await db.execute(sql`
    SELECT
      u.id,
      u.email,
      u.nickname,
      COUNT(r.id) as ranking_count,
      SUM(CASE WHEN r.satisfaction_tier = 2 THEN 1 ELSE 0 END) as good_count,
      SUM(CASE WHEN r.satisfaction_tier = 1 THEN 1 ELSE 0 END) as ok_count,
      SUM(CASE WHEN r.satisfaction_tier = 0 THEN 1 ELSE 0 END) as bad_count
    FROM users u
    LEFT JOIN users_ranking r ON u.id = r.user_id
    WHERE u.email LIKE '%sample.com'
    GROUP BY u.id, u.email, u.nickname
    HAVING COUNT(r.id) > 0
    ORDER BY ranking_count DESC
    LIMIT 10
  `);

  console.log('\nTop 10 users by ranking count:');
  rankingStats.rows.forEach((row: any, index: number) => {
    console.log(`${index + 1}. User ${row.id} (${row.nickname}): ${row.ranking_count} rankings (Good: ${row.good_count}, OK: ${row.ok_count}, Bad: ${row.bad_count})`);
  });

  // 4. Check total rankings
  const totalRankings = await db.execute(sql`
    SELECT COUNT(*) as total FROM users_ranking
  `);
  console.log(`\nTotal ranking entries: ${totalRankings.rows[0].total}`);

  // 5. Check ranking integrity
  const rankingIntegrity = await db.execute(sql`
    SELECT
      user_id,
      satisfaction_tier,
      COUNT(*) as count,
      MIN(rank) as min_rank,
      MAX(rank) as max_rank
    FROM users_ranking
    WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%sample.com')
    GROUP BY user_id, satisfaction_tier
    LIMIT 10
  `);

  console.log('\nSample ranking integrity (first 10):');
  rankingIntegrity.rows.forEach((row: any) => {
    const tierName = row.satisfaction_tier === 2 ? 'Good' : row.satisfaction_tier === 1 ? 'OK' : 'Bad';
    console.log(`User ${row.user_id} - ${tierName}: ${row.count} shops, ranks ${row.min_rank}-${row.max_rank}`);
  });

  console.log('\n✅ Distribution verification complete!');
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Verification failed:', error);
    process.exit(1);
  });
