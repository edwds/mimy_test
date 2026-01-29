import { db } from '../db/index.js';
import { sql } from 'drizzle-orm';

/**
 * 모든 유저의 랭킹을 올바르게 재계산하는 스크립트 (최적화 버전)
 *
 * 문제: satisfaction tier별로 rank가 1, 2, 3으로 시작됨
 * 해결: Good 1,2,3 -> OK 4,5,6 -> Bad 7,8,9 순으로 연속된 순위
 *
 * 최적화: SQL의 ROW_NUMBER() 함수로 한 번에 계산
 */

async function fixAllUserRankingsOptimized() {
  try {
    console.log('🔍 모든 유저의 랭킹을 재계산합니다...\n');

    // 1. 현재 상태 확인
    const countResult = await db.execute(sql`
      SELECT COUNT(*) as total FROM users_ranking
    `);
    const totalRankings = Number(countResult.rows[0].total);
    console.log(`📊 총 ${totalRankings}개의 랭킹 데이터\n`);

    // 2. 임시 테이블 생성 및 올바른 rank 계산
    console.log('⚙️  임시 테이블 생성 및 새로운 rank 계산 중...');

    await db.execute(sql`
      -- 임시 테이블 생성
      CREATE TEMP TABLE temp_new_rankings AS
      SELECT
        id,
        user_id,
        shop_id,
        satisfaction_tier,
        ROW_NUMBER() OVER (
          PARTITION BY user_id
          ORDER BY satisfaction_tier DESC, rank ASC
        ) as new_rank
      FROM users_ranking
    `);

    console.log('✅ 임시 테이블 생성 완료\n');

    // 3. 변경이 필요한 레코드 수 확인
    const changedResult = await db.execute(sql`
      SELECT COUNT(*) as changed_count
      FROM users_ranking ur
      JOIN temp_new_rankings tnr ON ur.id = tnr.id
      WHERE ur.rank != tnr.new_rank
    `);
    const changedCount = Number(changedResult.rows[0].changed_count);
    console.log(`📝 ${changedCount}개의 랭킹이 변경될 예정\n`);

    if (changedCount === 0) {
      console.log('✅ 모든 랭킹이 이미 올바른 상태입니다!\n');
      return;
    }

    // 4. 배치 업데이트 (한 번에 처리)
    console.log('🔄 랭킹 업데이트 중...');

    const updateResult = await db.execute(sql`
      UPDATE users_ranking ur
      SET
        rank = tnr.new_rank,
        updated_at = NOW()
      FROM temp_new_rankings tnr
      WHERE ur.id = tnr.id AND ur.rank != tnr.new_rank
    `);

    console.log(`✅ ${changedCount}개의 랭킹 업데이트 완료\n`);

    // 5. 검증 - 샘플 유저 확인
    console.log('🔎 검증 중...\n');

    const sampleUsers = await db.execute(sql`
      SELECT DISTINCT user_id
      FROM users_ranking
      LIMIT 3
    `);

    for (const user of sampleUsers.rows) {
      const userId = user.user_id;

      const rankings = await db.execute(sql`
        SELECT shop_id, rank, satisfaction_tier
        FROM users_ranking
        WHERE user_id = ${userId}
        ORDER BY rank
        LIMIT 10
      `);

      console.log(`유저 ${userId}의 상위 10개 랭킹:`);
      rankings.rows.forEach((r: any) => {
        const tierName = r.satisfaction_tier === 2 ? 'Good' : r.satisfaction_tier === 1 ? 'OK' : 'Bad';
        console.log(`  ${r.rank}위: Shop ${r.shop_id} (${tierName})`);
      });
      console.log('');
    }

    // 6. 통계 확인
    console.log('📊 최종 통계:\n');

    const stats = await db.execute(sql`
      SELECT
        COUNT(DISTINCT user_id) as total_users,
        COUNT(*) as total_rankings,
        AVG(rank) as avg_rank,
        MAX(rank) as max_rank
      FROM users_ranking
    `);

    const stat = stats.rows[0];
    console.log(`  - 전체 유저: ${stat.total_users}명`);
    console.log(`  - 전체 랭킹: ${stat.total_rankings}개`);
    console.log(`  - 평균 순위: ${Number(stat.avg_rank).toFixed(1)}위`);
    console.log(`  - 최대 순위: ${stat.max_rank}위\n`);

    console.log('✅ 모든 유저의 랭킹이 올바르게 수정되었습니다!\n');

  } catch (error) {
    console.error('❌ 에러 발생:', error);
    throw error;
  }
}

// 스크립트 실행
fixAllUserRankingsOptimized()
  .then(() => {
    console.log('🎉 스크립트 실행 완료');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 스크립트 실행 실패:', error);
    process.exit(1);
  });
