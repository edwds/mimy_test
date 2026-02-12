import { db } from '../db/index.js';
import { sql } from 'drizzle-orm';
import { expandFoodKindFilter } from '../utils/foodKindMap.js';

async function main() {
    // 1. DB의 모든 food_kind 값 가져오기
    const result = await db.execute(sql`
        SELECT food_kind, COUNT(*)::int as cnt 
        FROM shops 
        WHERE food_kind IS NOT NULL AND food_kind != ''
        GROUP BY food_kind 
        ORDER BY cnt DESC
    `);

    // 2. 역매핑의 모든 카테고리에서 커버하는 값 목록
    const categories = [
        '한식', '일식', '오마카세', '스시/회', '라멘', '중식',
        '이탈리안', '피자', '프렌치', '양식', '고기/구이', '스테이크',
        '해산물', '바/주점', '카페', '베이커리', '브런치', '태국',
        '베트남', '인도', '멕시칸', '미국식', '아시안', '디저트',
        '뷔페', '퓨전', '파인다이닝',
    ];
    
    const allCovered = new Set<string>();
    for (const cat of categories) {
        const expanded = expandFoodKindFilter([cat]);
        for (const v of expanded) allCovered.add(v);
    }

    // 3. 누락된 값 찾기
    let unmatchedCount = 0;
    let unmatchedShops = 0;
    console.log('=== 매핑되지 않은 food_kind 값 ===');
    for (const row of result.rows) {
        const fk = row.food_kind as string;
        if (!allCovered.has(fk)) {
            console.log(`  ${String(row.cnt).padStart(5)}  "${fk}"`);
            unmatchedCount++;
            unmatchedShops += row.cnt as number;
        }
    }

    const totalShops = result.rows.reduce((sum, r) => sum + (r.cnt as number), 0);
    console.log(`\n총 ${result.rows.length}개 고유값 중 ${unmatchedCount}개 미매핑`);
    console.log(`총 ${totalShops}개 맛집 중 ${unmatchedShops}개 미매핑 (${((unmatchedShops/totalShops)*100).toFixed(1)}%)`);
    
    process.exit(0);
}
main();
