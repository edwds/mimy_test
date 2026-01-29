import { db } from '../db/index.js';
import { users_ranking } from '../db/schema.js';
import { eq, sql } from 'drizzle-orm';

/**
 * 모든 유저의 랭킹을 올바르게 재계산하는 스크립트
 *
 * 문제: satisfaction tier별로 rank가 1, 2, 3으로 시작됨
 * 해결: Good 1,2,3 -> OK 4,5,6 -> Bad 7,8,9 순으로 연속된 순위
 */

interface RankingItem {
  id: number;
  user_id: number;
  shop_id: number;
  rank: number;
  satisfaction_tier: number;
  created_at: Date | null;
}

async function fixAllUserRankings() {
  try {
    console.log('🔍 모든 유저의 랭킹 데이터 가져오는 중...\n');

    // 1. 모든 랭킹 데이터 가져오기
    const allRankings = await db
      .select()
      .from(users_ranking)
      .orderBy(users_ranking.user_id, users_ranking.satisfaction_tier, users_ranking.rank);

    console.log(`✅ 총 ${allRankings.length}개의 랭킹 데이터 발견\n`);

    // 2. 유저별로 그룹화
    const userRankingsMap = new Map<number, RankingItem[]>();

    for (const ranking of allRankings) {
      if (!userRankingsMap.has(ranking.user_id)) {
        userRankingsMap.set(ranking.user_id, []);
      }
      userRankingsMap.get(ranking.user_id)!.push(ranking);
    }

    console.log(`👥 총 ${userRankingsMap.size}명의 유저\n`);

    let totalUpdated = 0;
    let userCount = 0;

    // 3. 각 유저의 랭킹 재계산
    for (const [userId, rankings] of userRankingsMap) {
      userCount++;

      // satisfaction_tier 기준으로 정렬 (2=Good, 1=OK, 0=Bad)
      // 같은 tier 내에서는 기존 rank 순서 유지
      const sortedRankings = [...rankings].sort((a, b) => {
        if (a.satisfaction_tier !== b.satisfaction_tier) {
          return b.satisfaction_tier - a.satisfaction_tier; // 2, 1, 0 순서
        }
        return a.rank - b.rank; // 같은 tier 내에서는 rank 순서
      });

      // 새로운 연속된 rank 할당
      let needsUpdate = false;
      for (let i = 0; i < sortedRankings.length; i++) {
        const newRank = i + 1;
        if (sortedRankings[i].rank !== newRank) {
          needsUpdate = true;
          break;
        }
      }

      // 업데이트가 필요한 경우에만 처리
      if (needsUpdate) {
        await db.transaction(async (tx) => {
          for (let i = 0; i < sortedRankings.length; i++) {
            const ranking = sortedRankings[i];
            const newRank = i + 1;

            await tx
              .update(users_ranking)
              .set({
                rank: newRank,
                updated_at: new Date(),
              })
              .where(eq(users_ranking.id, ranking.id));

            totalUpdated++;
          }
        });

        if (userCount % 100 === 0) {
          console.log(`  처리 중... ${userCount}/${userRankingsMap.size} 유저 완료`);
        }
      }
    }

    console.log(`\n✅ 완료!`);
    console.log(`  - 처리된 유저: ${userRankingsMap.size}명`);
    console.log(`  - 업데이트된 랭킹: ${totalUpdated}개\n`);

    // 4. 검증 - 몇 명의 유저 샘플링해서 확인
    console.log('🔎 검증 중...\n');

    const sampleUserIds = Array.from(userRankingsMap.keys()).slice(0, 3);

    for (const userId of sampleUserIds) {
      const updated = await db
        .select({
          shop_id: users_ranking.shop_id,
          rank: users_ranking.rank,
          satisfaction_tier: users_ranking.satisfaction_tier,
        })
        .from(users_ranking)
        .where(eq(users_ranking.user_id, userId))
        .orderBy(users_ranking.rank)
        .limit(10);

      console.log(`유저 ${userId}의 상위 10개 랭킹:`);
      updated.forEach(r => {
        const tierName = r.satisfaction_tier === 2 ? 'Good' : r.satisfaction_tier === 1 ? 'OK' : 'Bad';
        console.log(`  ${r.rank}위: Shop ${r.shop_id} (${tierName})`);
      });
      console.log('');
    }

    console.log('✅ 모든 유저의 랭킹이 올바르게 수정되었습니다!\n');

  } catch (error) {
    console.error('❌ 에러 발생:', error);
    throw error;
  }
}

// 스크립트 실행
fixAllUserRankings()
  .then(() => {
    console.log('🎉 스크립트 실행 완료');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 스크립트 실행 실패:', error);
    process.exit(1);
  });
