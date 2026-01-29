import { db } from '../db/index.js';
import { content, users } from '../db/schema.js';
import { eq, and, sql } from 'drizzle-orm';

/**
 * 158번 샵에 대한 리뷰의 satisfaction을 2로 변경하는 스크립트
 */

async function updateShop158Reviews() {
  try {
    console.log('🔍 158번 샵에 대한 리뷰 찾기...');

    // 1. 158번 샵에 대한 모든 리뷰 찾기
    const reviews = await db
      .select({
        id: content.id,
        user_id: content.user_id,
        review_prop: content.review_prop,
        nickname: users.nickname,
        account_id: users.account_id,
      })
      .from(content)
      .innerJoin(users, eq(content.user_id, users.id))
      .where(
        and(
          eq(content.type, 'review'),
          sql`${content.review_prop}->>'shop_id' = '158'`
        )
      );

    if (reviews.length === 0) {
      console.log('❌ 158번 샵에 대한 리뷰가 없습니다.');
      return;
    }

    console.log(`✅ ${reviews.length}개의 리뷰를 찾았습니다:\n`);

    let updatedCount = 0;
    let alreadyCorrectCount = 0;

    for (const review of reviews) {
      const reviewProp = review.review_prop as any;
      const currentSatisfaction = reviewProp?.satisfaction;

      console.log(
        `  리뷰 ID: ${review.id} | 유저: @${review.account_id} (${review.nickname}) | 현재 만족도: ${currentSatisfaction}`
      );

      if (currentSatisfaction === 2) {
        alreadyCorrectCount++;
        continue;
      }

      // satisfaction을 2로 변경
      const updatedReviewProp = {
        ...reviewProp,
        satisfaction: 2,
      };

      await db
        .update(content)
        .set({
          review_prop: updatedReviewProp,
          updated_at: new Date(),
        })
        .where(eq(content.id, review.id));

      console.log(`    ✓ 만족도를 ${currentSatisfaction} → 2로 변경`);
      updatedCount++;
    }

    console.log('\n📊 작업 결과:');
    console.log(`  - 총 리뷰 수: ${reviews.length}개`);
    console.log(`  - 변경된 리뷰: ${updatedCount}개`);
    console.log(`  - 이미 만족도 2인 리뷰: ${alreadyCorrectCount}개`);
    console.log('\n✅ 모든 리뷰 업데이트 완료!');

  } catch (error) {
    console.error('❌ 에러 발생:', error);
    throw error;
  }
}

// 스크립트 실행
updateShop158Reviews()
  .then(() => {
    console.log('\n🎉 스크립트 실행 완료');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 스크립트 실행 실패:', error);
    process.exit(1);
  });
