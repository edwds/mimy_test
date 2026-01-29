import { redis, invalidatePattern } from '../redis.js';

/**
 * 5043번 샵의 캐시를 삭제하는 스크립트
 */

async function clearShop5043Cache() {
  try {
    console.log('🔍 5043번 샵 캐시 삭제 중...');

    if (!redis) {
      console.error('❌ Redis가 연결되지 않았습니다.');
      return;
    }

    // 1. 샵 상세 캐시 삭제
    const shopKey = 'shop:5043';
    const shopDeleted = await redis.del(shopKey);
    console.log(`✓ ${shopKey}: ${shopDeleted ? '삭제됨' : '존재하지 않음'}`);

    // 2. 리뷰 캐시 패턴 삭제
    const reviewPattern = 'shop:5043:reviews:*';
    console.log(`\n🔎 패턴 검색: ${reviewPattern}`);

    const keys = await redis.keys(reviewPattern);
    console.log(`✅ ${keys.length}개의 캐시 키 발견:`);

    if (keys.length > 0) {
      keys.forEach(key => console.log(`  - ${key}`));

      // 모든 키 삭제
      const deleted = await redis.del(...keys);
      console.log(`\n✓ ${deleted}개의 캐시 키 삭제 완료`);
    } else {
      console.log('  (캐시된 리뷰 없음)');
    }

    console.log('\n✅ 5043번 샵 캐시 삭제 완료!');
    console.log('💡 이제 새로 고침하면 업데이트된 데이터가 표시됩니다.');

  } catch (error) {
    console.error('❌ 에러 발생:', error);
    throw error;
  }
}

// 스크립트 실행
clearShop5043Cache()
  .then(() => {
    console.log('\n🎉 스크립트 실행 완료');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 스크립트 실행 실패:', error);
    process.exit(1);
  });
