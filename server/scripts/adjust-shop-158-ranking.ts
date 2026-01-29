import { db } from '../db/index.js';
import { users_ranking, users, shops } from '../db/schema.js';
import { eq, and, sql } from 'drizzle-orm';

/**
 * 158번 샵을 방문한 유저의 랭킹을 조정하는 스크립트
 * 1. shop_id=158인 랭킹을 가진 모든 유저 찾기
 * 2. 각 유저에 대해 158번 샵을 1위, satisfaction_tier=2로 변경
 * 3. 기존 랭킹들 조정 (1위 이상은 +1)
 */

async function adjustShop158Ranking() {
  try {
    console.log('🔍 158번 샵을 방문한 유저 찾기...');

    // 1. 158번 샵에 랭킹을 등록한 유저들 찾기
    const rankingsFor158 = await db
      .select({
        id: users_ranking.id,
        user_id: users_ranking.user_id,
        shop_id: users_ranking.shop_id,
        rank: users_ranking.rank,
        satisfaction_tier: users_ranking.satisfaction_tier,
        nickname: users.nickname,
        account_id: users.account_id,
      })
      .from(users_ranking)
      .innerJoin(users, eq(users_ranking.user_id, users.id))
      .where(eq(users_ranking.shop_id, 158));

    if (rankingsFor158.length === 0) {
      console.log('❌ 158번 샵을 방문한 유저가 없습니다.');
      return;
    }

    console.log(`✅ ${rankingsFor158.length}명의 유저가 158번 샵을 방문했습니다:`);
    rankingsFor158.forEach((r) => {
      console.log(
        `  - 유저 ID: ${r.user_id} (@${r.account_id}, ${r.nickname}) | 현재 랭킹: ${r.rank}위 | 만족도: ${r.satisfaction_tier}`
      );
    });

    // 2. 각 유저에 대해 랭킹 조정
    for (const ranking of rankingsFor158) {
      const userId = ranking.user_id;
      const currentRank = ranking.rank;
      const currentTier = ranking.satisfaction_tier;

      console.log(`\n📝 유저 ${userId} (@${ranking.account_id})의 랭킹 조정 중...`);

      // 해당 유저의 모든 랭킹 조회
      const allUserRankings = await db
        .select()
        .from(users_ranking)
        .where(eq(users_ranking.user_id, userId))
        .orderBy(users_ranking.rank);

      console.log(`  현재 총 ${allUserRankings.length}개의 랭킹 보유`);

      // Transaction으로 처리
      await db.transaction(async (tx) => {
        // 2-1. 158번 샵이 이미 1위가 아니고 tier가 2가 아닌 경우
        if (currentRank !== 1 || currentTier !== 2) {
          // 먼저 기존 1위부터 현재 랭킹-1까지의 랭크를 +1 증가
          // (158번 샵을 1위로 만들기 위해 기존 1위~currentRank-1위를 뒤로 밀기)
          if (currentRank > 1) {
            // 기존 1위부터 currentRank-1위까지 +1
            await tx
              .update(users_ranking)
              .set({
                rank: sql`${users_ranking.rank} + 1`,
                updated_at: new Date(),
              })
              .where(
                and(
                  eq(users_ranking.user_id, userId),
                  sql`${users_ranking.rank} >= 1 AND ${users_ranking.rank} < ${currentRank}`
                )
              );

            console.log(`  ✓ 기존 1위~${currentRank - 1}위를 한 칸씩 뒤로 이동`);
          }

          // 158번 샵을 1위, satisfaction_tier=2로 변경
          await tx
            .update(users_ranking)
            .set({
              rank: 1,
              satisfaction_tier: 2,
              updated_at: new Date(),
            })
            .where(
              and(
                eq(users_ranking.user_id, userId),
                eq(users_ranking.shop_id, 158)
              )
            );

          console.log(`  ✓ 158번 샵을 1위 (Good tier)로 변경`);
        } else {
          console.log(`  ℹ️ 이미 1위이고 tier가 2입니다. 변경 없음.`);
        }
      });

      // 변경 후 결과 확인
      const updatedRankings = await db
        .select({
          id: users_ranking.id,
          shop_id: users_ranking.shop_id,
          rank: users_ranking.rank,
          satisfaction_tier: users_ranking.satisfaction_tier,
          shop_name: shops.name,
        })
        .from(users_ranking)
        .leftJoin(shops, eq(users_ranking.shop_id, shops.id))
        .where(eq(users_ranking.user_id, userId))
        .orderBy(users_ranking.rank)
        .limit(5);

      console.log(`  📊 변경 후 상위 5개 랭킹:`);
      updatedRankings.forEach((r) => {
        const star = r.shop_id === 158 ? '⭐' : '  ';
        console.log(
          `  ${star} ${r.rank}위: ${r.shop_name} (ID: ${r.shop_id}, Tier: ${r.satisfaction_tier})`
        );
      });
    }

    console.log('\n✅ 모든 유저의 랭킹 조정 완료!');
  } catch (error) {
    console.error('❌ 에러 발생:', error);
    throw error;
  }
}

// 스크립트 실행
adjustShop158Ranking()
  .then(() => {
    console.log('\n🎉 스크립트 실행 완료');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 스크립트 실행 실패:', error);
    process.exit(1);
  });
