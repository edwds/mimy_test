import { db } from '../db/index.js';
import { sql } from 'drizzle-orm';

/**
 * 3-tier → 5-tier 마이그레이션 스크립트
 *
 * 기존 3-tier (Good=2, OK=1, Bad=0) →
 * 새로운 5-tier (GOAT=4, BEST=3, GOOD=2, OK=1, BAD=0)
 *
 * 마이그레이션 규칙:
 *   - Good의 상위 5% (rank 기준) → GOAT (tier 4)
 *   - Good의 다음 15% → BEST (tier 3)
 *   - Good의 나머지 → GOOD (tier 2, 동일)
 *   - OK → OK (tier 1, 동일)
 *   - Bad → BAD (tier 0, 동일)
 *
 * 사용법: npx tsx server/scripts/migrate-5tier.ts
 */

const GOAT_RATIO = 0.05;
const BEST_RATIO = 0.15;

async function migrate5Tier() {
    try {
        console.log('🔄 5-tier 마이그레이션 시작...\n');

        // 1. 현재 상태 확인
        const stats = await db.execute(sql`
            SELECT
                satisfaction_tier,
                COUNT(*) as cnt
            FROM users_ranking
            GROUP BY satisfaction_tier
            ORDER BY satisfaction_tier DESC
        `);
        console.log('📊 현재 tier 분포:');
        for (const row of stats.rows) {
            const tierName = row.satisfaction_tier === 2 ? 'Good' : row.satisfaction_tier === 1 ? 'OK' : 'Bad';
            console.log(`   ${tierName} (tier ${row.satisfaction_tier}): ${row.cnt}개`);
        }

        // 2. 유저별 Good tier의 GOAT/BEST 승격 계산
        console.log('\n⚙️  유저별 승격 대상 계산 중...');

        // Get all users who have rankings
        const usersResult = await db.execute(sql`
            SELECT DISTINCT user_id FROM users_ranking ORDER BY user_id
        `);

        const totalUsers = usersResult.rows.length;
        console.log(`   총 ${totalUsers}명의 유저\n`);

        let totalGoatPromotions = 0;
        let totalBestPromotions = 0;
        let processedUsers = 0;

        for (const userRow of usersResult.rows) {
            const userId = userRow.user_id;

            // Get user's total ranking count
            const totalRes = await db.execute(sql`
                SELECT COUNT(*) as cnt FROM users_ranking WHERE user_id = ${userId}
            `);
            const totalCount = Number(totalRes.rows[0].cnt);

            // Get user's Good tier items, ordered by rank
            const goodItems = await db.execute(sql`
                SELECT id, rank
                FROM users_ranking
                WHERE user_id = ${userId} AND satisfaction_tier = 2
                ORDER BY rank ASC
            `);

            const goodCount = goodItems.rows.length;
            if (goodCount === 0) {
                processedUsers++;
                continue;
            }

            // Calculate limits based on total ranking count
            const goatMax = Math.ceil(totalCount * GOAT_RATIO);
            const bestMax = Math.ceil(totalCount * BEST_RATIO);

            // Promote top items
            const goatItems = goodItems.rows.slice(0, Math.min(goatMax, goodCount));
            const bestItems = goodItems.rows.slice(
                Math.min(goatMax, goodCount),
                Math.min(goatMax + bestMax, goodCount)
            );

            // Update GOAT promotions
            for (const item of goatItems) {
                await db.execute(sql`
                    UPDATE users_ranking
                    SET satisfaction_tier = 4, updated_at = NOW()
                    WHERE id = ${(item as any).id}
                `);
            }
            totalGoatPromotions += goatItems.length;

            // Update BEST promotions
            for (const item of bestItems) {
                await db.execute(sql`
                    UPDATE users_ranking
                    SET satisfaction_tier = 3, updated_at = NOW()
                    WHERE id = ${(item as any).id}
                `);
            }
            totalBestPromotions += bestItems.length;

            processedUsers++;
            if (processedUsers % 100 === 0) {
                console.log(`   처리 중: ${processedUsers}/${totalUsers} 유저`);
            }
        }

        console.log(`\n✅ 마이그레이션 완료:`);
        console.log(`   GOAT 승격: ${totalGoatPromotions}개`);
        console.log(`   BEST 승격: ${totalBestPromotions}개`);

        // 3. 결과 확인
        const newStats = await db.execute(sql`
            SELECT
                satisfaction_tier,
                COUNT(*) as cnt
            FROM users_ranking
            GROUP BY satisfaction_tier
            ORDER BY satisfaction_tier DESC
        `);

        console.log('\n📊 새로운 tier 분포:');
        const tierNames: Record<number, string> = { 4: 'GOAT', 3: 'BEST', 2: 'GOOD', 1: 'OK', 0: 'BAD' };
        for (const row of newStats.rows) {
            const tierNum = Number(row.satisfaction_tier);
            console.log(`   ${tierNames[tierNum] ?? 'Unknown'} (tier ${tierNum}): ${row.cnt}개`);
        }

        console.log('\n🎉 5-tier 마이그레이션 성공!');
    } catch (error) {
        console.error('❌ 마이그레이션 실패:', error);
        process.exit(1);
    }

    process.exit(0);
}

migrate5Tier();
