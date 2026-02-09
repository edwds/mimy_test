import puppeteer from 'puppeteer';
import { db } from '../db/index.js';
import { shops } from '../db/schema.js';
import { isNotNull, sql } from 'drizzle-orm';
import 'dotenv/config';

/**
 * Google Maps 웹에서 카테고리 정보를 스크래핑하는 스크립트
 *
 * 주의: Google ToS 위반 가능성 있음. 테스트/연구 목적으로만 사용.
 *
 * 실행: npx tsx server/scripts/scrape-google-maps-category.ts
 */

const DELAY_MS = 2000; // 요청 간 딜레이 (봇 감지 방지)

async function scrapeGoogleMapsCategory(placeId: string): Promise<string | null> {
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
        const page = await browser.newPage();

        // User-Agent 설정 (봇 감지 우회)
        await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

        // Google Maps place URL
        const url = `https://www.google.com/maps/place/?q=place_id:${placeId}`;

        await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });

        // 카테고리 정보 추출 시도
        // Google Maps의 카테고리는 보통 버튼 형태로 표시됨
        const category = await page.evaluate(() => {
            // 방법 1: aria-label에서 카테고리 찾기
            const categoryButton = document.querySelector('button[jsaction*="category"]');
            if (categoryButton) {
                return categoryButton.textContent?.trim() || null;
            }

            // 방법 2: 특정 클래스에서 찾기 (Google Maps 구조에 따라 변경 필요)
            const categoryElements = document.querySelectorAll('[data-tooltip="카테고리"]');
            if (categoryElements.length > 0) {
                return categoryElements[0].textContent?.trim() || null;
            }

            // 방법 3: 주소 근처의 카테고리 텍스트 찾기
            // Google Maps에서 카테고리는 보통 "음식점" 버튼 형태
            const allButtons = document.querySelectorAll('button');
            for (const btn of allButtons) {
                const text = btn.textContent?.trim();
                // 음식 관련 키워드 체크
                if (text && (
                    text.includes('전문점') ||
                    text.includes('레스토랑') ||
                    text.includes('식당') ||
                    text.includes('카페') ||
                    text.includes('베이커리')
                )) {
                    return text;
                }
            }

            return null;
        });

        return category;
    } catch (error) {
        console.error(`  [ERROR] ${placeId}:`, error);
        return null;
    } finally {
        await browser.close();
    }
}

function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
    console.log('🔍 google_place_id가 있는 shops 조회 중...\n');

    // 테스트: 처음 5개만
    const shopsWithGoogleId = await db.select({
        id: shops.id,
        name: shops.name,
        google_place_id: shops.google_place_id,
        food_kind: shops.food_kind
    })
        .from(shops)
        .where(isNotNull(shops.google_place_id))
        .limit(5); // 테스트용 제한

    console.log(`📊 ${shopsWithGoogleId.length}개 shops 테스트\n`);

    for (const shop of shopsWithGoogleId) {
        console.log(`🔄 [${shop.id}] ${shop.name} 스크래핑 중...`);

        const category = await scrapeGoogleMapsCategory(shop.google_place_id!);

        if (category) {
            console.log(`  ✅ 카테고리: ${category}`);
            console.log(`  현재 food_kind: ${shop.food_kind}`);
        } else {
            console.log(`  ❌ 카테고리를 찾지 못함`);
        }

        console.log('');

        // Rate limiting
        await sleep(DELAY_MS);
    }
}

// 실행
main()
    .then(() => {
        console.log('\n✨ 완료!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n💥 오류:', error);
        process.exit(1);
    });
