import { db } from '../db/index.js';
import { shops } from '../db/schema.js';
import { isNotNull, sql } from 'drizzle-orm';
import 'dotenv/config';

/**
 * Google Places API에서 primaryTypeDisplayName을 가져와서
 * shops 테이블의 food_kind를 업데이트하는 스크립트
 *
 * 실행: npx tsx server/scripts/update-shops-food-kind.ts
 */

const API_KEY = process.env.GOOGLE_MAPS_API_KEY;
const BATCH_SIZE = 10; // 동시 요청 수
const DELAY_MS = 200;  // 배치 간 딜레이

interface PlaceDetailsResponse {
    primaryType?: string;
    primaryTypeDisplayName?: {
        text: string;
        languageCode: string;
    };
    types?: string[];
}

async function fetchPlaceDetails(placeId: string): Promise<PlaceDetailsResponse | null> {
    try {
        const response = await fetch(
            `https://places.googleapis.com/v1/places/${placeId}?languageCode=ko`,
            {
                method: 'GET',
                headers: {
                    'X-Goog-Api-Key': API_KEY!,
                    'X-Goog-FieldMask': 'primaryType,primaryTypeDisplayName,types'
                }
            }
        );

        if (!response.ok) {
            console.error(`  [ERROR] ${placeId}: ${response.status}`);
            return null;
        }

        return await response.json();
    } catch (error) {
        console.error(`  [ERROR] ${placeId}:`, error);
        return null;
    }
}

function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function updateShopsFoodKind() {
    if (!API_KEY) {
        console.error('GOOGLE_MAPS_API_KEY is not set');
        process.exit(1);
    }

    console.log('🔍 google_place_id가 있는 shops 조회 중...\n');

    // google_place_id가 있는 모든 shops 조회
    const shopsWithGoogleId = await db.select({
        id: shops.id,
        name: shops.name,
        google_place_id: shops.google_place_id,
        food_kind: shops.food_kind
    })
        .from(shops)
        .where(isNotNull(shops.google_place_id));

    console.log(`📊 총 ${shopsWithGoogleId.length}개의 shops 발견\n`);

    if (shopsWithGoogleId.length === 0) {
        console.log('업데이트할 shops가 없습니다.');
        return;
    }

    let updated = 0;
    let skipped = 0;
    let failed = 0;

    // 배치 처리
    for (let i = 0; i < shopsWithGoogleId.length; i += BATCH_SIZE) {
        const batch = shopsWithGoogleId.slice(i, i + BATCH_SIZE);

        console.log(`📦 배치 ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(shopsWithGoogleId.length / BATCH_SIZE)} 처리 중...`);

        const results = await Promise.all(
            batch.map(async (shop) => {
                const details = await fetchPlaceDetails(shop.google_place_id!);

                if (!details) {
                    return { shop, newFoodKind: null, types: null, status: 'failed' };
                }

                // primaryTypeDisplayName 우선, 없으면 primaryType
                const newFoodKind = details.primaryTypeDisplayName?.text || details.primaryType || null;

                return { shop, newFoodKind, types: details.types, primaryType: details.primaryType, status: 'success' };
            })
        );

        // 결과 처리 및 DB 업데이트
        for (const result of results) {
            const { shop, newFoodKind, types, primaryType, status } = result as any;

            if (status === 'failed') {
                console.log(`  ❌ [${shop.id}] ${shop.name} - API 호출 실패`);
                failed++;
                continue;
            }

            if (!newFoodKind) {
                console.log(`  ⏭️  [${shop.id}] ${shop.name} - primaryType 없음`);
                skipped++;
                continue;
            }

            // food_kind가 이미 한국어인 경우 스킵 (이미 업데이트됨)
            if (shop.food_kind === newFoodKind) {
                console.log(`  ⏭️  [${shop.id}] ${shop.name} - 이미 최신 (${newFoodKind})`);
                skipped++;
                continue;
            }

            // DB 업데이트
            await db.execute(sql`
                UPDATE shops
                SET food_kind = ${newFoodKind}, updated_at = NOW()
                WHERE id = ${shop.id}
            `);

            // primaryType이 일반적인 경우 types 배열도 출력
            const genericTypes = ['restaurant', 'food', 'establishment', 'point_of_interest'];
            if (primaryType && genericTypes.includes(primaryType)) {
                console.log(`  ✅ [${shop.id}] ${shop.name}: ${shop.food_kind} → ${newFoodKind} (types: ${types?.join(', ') || 'none'})`);
            } else {
                console.log(`  ✅ [${shop.id}] ${shop.name}: ${shop.food_kind} → ${newFoodKind}`);
            }
            updated++;
        }

        // Rate limiting
        if (i + BATCH_SIZE < shopsWithGoogleId.length) {
            await sleep(DELAY_MS);
        }
    }

    console.log('\n' + '='.repeat(50));
    console.log('📊 결과 요약');
    console.log('='.repeat(50));
    console.log(`✅ 업데이트: ${updated}개`);
    console.log(`⏭️  스킵: ${skipped}개`);
    console.log(`❌ 실패: ${failed}개`);
    console.log(`📦 총: ${shopsWithGoogleId.length}개`);
}

// 실행
updateShopsFoodKind()
    .then(() => {
        console.log('\n✨ 완료!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n💥 스크립트 실행 중 오류:', error);
        process.exit(1);
    });
