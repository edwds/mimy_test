/**
 * 네이버 AI 브리핑 추출 스크립트
 *
 * Puppeteer 브라우저 안에서 네이버 GraphQL API를 호출하여
 * shops의 AI 브리핑 데이터를 수집합니다.
 *
 * Phase A: 네이버 검색으로 businessId 추출
 * Phase B: GraphQL API로 AI 브리핑 데이터 수집
 *
 * 실행:
 *   npx tsx server/scripts/scrape-naver-ai-briefing.ts
 *   npx tsx server/scripts/scrape-naver-ai-briefing.ts --shop-id 158 --headed
 *   npx tsx server/scripts/scrape-naver-ai-briefing.ts --limit 10
 *   npx tsx server/scripts/scrape-naver-ai-briefing.ts --retry-failed
 *   npx tsx server/scripts/scrape-naver-ai-briefing.ts --dry-run --limit 5
 */
import puppeteer, { Browser, Page } from 'puppeteer';
import { db } from '../db/index.js';
import { shops, shop_naver_briefing } from '../db/schema.js';
import { eq, sql, isNull, and, isNotNull } from 'drizzle-orm';
import 'dotenv/config';

// --- GraphQL Query ---
const BRIEFING_QUERY = `query getAiBriefing($input: AiBriefingInput) {
  aiBriefing(input: $input) {
    textSummaries {
      sentence
      relatedReviews {
        index
        blogUrl
        visitorReviewId
        blogGdid
        snippet
        userName
        userProfileImg
        createdDate
        originalIndex
      }
    }
    imageSummaries {
      code
      caption
      imageUrl
      logId
    }
    relatedQueries {
      category
      pattern
      query
    }
  }
}`;

// --- User Agent Pool ---
const USER_AGENTS = [
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.2 Safari/605.1.15',
];

// --- CLI Args ---
interface CliArgs {
    limit: number;
    shopId: number | null;
    retryFailed: boolean;
    dryRun: boolean;
    headed: boolean;
}

function parseArgs(): CliArgs {
    const args = process.argv.slice(2);
    const result: CliArgs = {
        limit: 0,
        shopId: null,
        retryFailed: false,
        dryRun: false,
        headed: false,
    };

    for (let i = 0; i < args.length; i++) {
        switch (args[i]) {
            case '--limit':
                result.limit = parseInt(args[++i], 10);
                break;
            case '--shop-id':
                result.shopId = parseInt(args[++i], 10);
                break;
            case '--retry-failed':
                result.retryFailed = true;
                break;
            case '--dry-run':
                result.dryRun = true;
                break;
            case '--headed':
                result.headed = true;
                break;
        }
    }

    return result;
}

// --- Helpers ---
function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function randomDelay(minMs: number, maxMs: number) {
    return sleep(minMs + Math.random() * (maxMs - minMs));
}

function randomUA(): string {
    return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

// --- Browser Management ---
async function launchBrowser(headed: boolean): Promise<Browser> {
    return puppeteer.launch({
        headless: !headed,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-blink-features=AutomationControlled',
            '--disable-infobars',
        ],
    });
}

async function initPage(browser: Browser): Promise<Page> {
    const page = await browser.newPage();
    await page.setUserAgent(randomUA());
    await page.setViewport({ width: 1366, height: 768 });

    // Hide webdriver flag
    await page.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => false });
    });

    return page;
}

// --- Phase A: Extract businessId from Naver Search ---

/**
 * Approach 1: Use Naver Place search API (intercepting network requests)
 * Naver map search makes XHR calls that contain place IDs
 */
async function extractBusinessIdViaPlaceSearch(
    page: Page,
    shopName: string,
    addressRegion: string | null
): Promise<string | null> {
    const query = addressRegion
        ? `${shopName} ${addressRegion}`
        : shopName;

    try {
        // Use Naver Map's search page which embeds place data
        const searchUrl = `https://m.map.naver.com/search2/search.naver?query=${encodeURIComponent(query)}&sm=hty&style=v5`;

        await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 20000 });
        await sleep(2000);

        // Extract from the page - Naver map search results contain data-id or place links
        const businessId = await page.evaluate(() => {
            // Strategy 1: Look for place list items with IDs in the page
            // Naver map search results typically have data attributes with place IDs
            const allAnchors = document.querySelectorAll('a');
            for (const a of allAnchors) {
                const href = a.getAttribute('href') || '';
                // Pattern: /restaurant/12345 or /place/12345
                const match = href.match(/\/(?:restaurant|place)\/(\d+)/);
                if (match) return match[1];
            }

            // Strategy 2: Look in the entire page HTML for place ID patterns
            const html = document.documentElement.innerHTML;

            // Pattern: "id":"12345" or "id":12345 in place-related context
            const idMatches = html.match(/"id"\s*:\s*"?(\d{7,})"?/g);
            if (idMatches) {
                for (const m of idMatches) {
                    const extracted = m.match(/(\d{7,})/);
                    if (extracted) return extracted[1];
                }
            }

            // Strategy 3: data-id attributes
            const dataIdElements = document.querySelectorAll('[data-id]');
            for (const el of dataIdElements) {
                const id = el.getAttribute('data-id');
                if (id && /^\d{5,}$/.test(id)) return id;
            }

            return null;
        });

        return businessId;
    } catch (error) {
        return null;
    }
}

/**
 * Approach 2: Use Naver regular search and look for place cards
 */
async function extractBusinessIdViaWebSearch(
    page: Page,
    shopName: string,
    addressRegion: string | null
): Promise<string | null> {
    const query = addressRegion
        ? `${shopName} ${addressRegion} 맛집`
        : `${shopName} 맛집`;
    const searchUrl = `https://search.naver.com/search.naver?where=nexearch&query=${encodeURIComponent(query)}`;

    try {
        await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 20000 });
        await sleep(2000);

        const businessId = await page.evaluate(() => {
            // Strategy 1: Place link patterns
            const allAnchors = document.querySelectorAll('a');
            for (const a of allAnchors) {
                const href = a.getAttribute('href') || '';
                const match = href.match(/place\.naver\.com\/(?:restaurant|place)\/(\d+)/);
                if (match) return match[1];
            }

            // Strategy 2: data-sid
            const sidElements = document.querySelectorAll('[data-sid]');
            for (const el of sidElements) {
                const sid = el.getAttribute('data-sid');
                if (sid && /^\d+$/.test(sid)) return sid;
            }

            // Strategy 3: Script tags with businessId
            const html = document.documentElement.innerHTML;
            const bizMatch = html.match(/"businessId"\s*:\s*"(\d+)"/);
            if (bizMatch) return bizMatch[1];

            // Strategy 4: Script tags with place ID in JSON
            const placeMatch = html.match(/place\.naver\.com\/restaurant\/(\d+)/);
            if (placeMatch) return placeMatch[1];

            // Strategy 5: data-cid
            const cidElements = document.querySelectorAll('[data-cid]');
            for (const el of cidElements) {
                const cid = el.getAttribute('data-cid');
                if (cid && /^\d+$/.test(cid)) return cid;
            }

            return null;
        });

        return businessId;
    } catch (error) {
        return null;
    }
}

/**
 * Combined extraction: tries multiple approaches
 */
async function extractBusinessId(
    page: Page,
    shopName: string,
    addressRegion: string | null
): Promise<string | null> {
    // Try map search first (more direct results)
    let id = await extractBusinessIdViaPlaceSearch(page, shopName, addressRegion);
    if (id) return id;

    // Fallback to web search
    id = await extractBusinessIdViaWebSearch(page, shopName, addressRegion);
    return id;
}

// --- Phase B: Fetch AI Briefing via GraphQL ---
interface AiBriefingResult {
    textSummaries: Array<{
        sentence: string;
        relatedReviews: Array<{
            index: number;
            blogUrl?: string;
            visitorReviewId?: string;
            blogGdid?: string;
            snippet?: string;
            userName?: string;
            userProfileImg?: string;
            createdDate?: string;
            originalIndex?: number;
        }>;
    }> | null;
    imageSummaries: Array<{
        code: string;
        caption: string;
        imageUrl: string;
        logId?: string;
    }> | null;
    relatedQueries: Array<{
        category: string;
        pattern: string;
        query: string;
    }> | null;
}

async function fetchAiBriefing(
    page: Page,
    businessId: string
): Promise<{ data: AiBriefingResult | null; error: string | null }> {
    try {
        // First navigate to a naver place page to establish proper cookies/session
        await page.goto(`https://m.place.naver.com/restaurant/${businessId}/home`, {
            waitUntil: 'networkidle2',
            timeout: 20000,
        });
        await sleep(1500);

        // Now execute GraphQL from within the browser context
        const result = await page.evaluate(async (bizId: string, query: string) => {
            try {
                const response = await fetch('https://p-api.place.naver.com/graphql', {
                    method: 'POST',
                    headers: {
                        'content-type': 'application/json',
                        'accept': '*/*',
                        'origin': 'https://m.place.naver.com',
                        'referer': `https://m.place.naver.com/restaurant/${bizId}/home`,
                    },
                    body: JSON.stringify([{
                        operationName: 'getAiBriefing',
                        variables: {
                            input: {
                                businessId: bizId,
                                businessType: 'restaurant',
                            },
                        },
                        query: query,
                    }]),
                });

                if (!response.ok) {
                    return { error: `HTTP ${response.status}`, data: null };
                }

                const json = await response.json();

                // Response is an array, get first element
                const briefing = Array.isArray(json) ? json[0] : json;
                const aiBriefing = briefing?.data?.aiBriefing;

                if (!aiBriefing) {
                    return { error: null, data: null };
                }

                return {
                    error: null,
                    data: {
                        textSummaries: aiBriefing.textSummaries || null,
                        imageSummaries: aiBriefing.imageSummaries || null,
                        relatedQueries: aiBriefing.relatedQueries || null,
                    },
                };
            } catch (e: any) {
                return { error: e.message || 'Unknown fetch error', data: null };
            }
        }, businessId, BRIEFING_QUERY);

        return result;
    } catch (error) {
        return { data: null, error: (error as Error).message };
    }
}

// --- DB Operations ---

interface ShopRow {
    id: number;
    name: string;
    address_full: string | null;
    address_region: string | null;
    naver_business_id: string | null;
}

async function getShopsToProcess(args: CliArgs): Promise<ShopRow[]> {
    if (args.shopId) {
        const result = await db.select({
            id: shops.id,
            name: shops.name,
            address_full: shops.address_full,
            address_region: shops.address_region,
            naver_business_id: shops.naver_business_id,
        })
            .from(shops)
            .where(eq(shops.id, args.shopId));
        return result;
    }

    // Query shops that haven't been processed yet (or failed ones if --retry-failed)
    let query;

    if (args.retryFailed) {
        // Retry shops where we had errors
        query = db.select({
            id: shops.id,
            name: shops.name,
            address_full: shops.address_full,
            address_region: shops.address_region,
            naver_business_id: shops.naver_business_id,
        })
            .from(shops)
            .innerJoin(shop_naver_briefing, eq(shops.id, shop_naver_briefing.shop_id))
            .where(
                and(
                    eq(shops.country_code, 'KR'),
                    eq(shop_naver_briefing.has_briefing, false),
                    isNotNull(shop_naver_briefing.error_message),
                )
            )
            .orderBy(shops.id);
    } else {
        // Get unprocessed shops (no entry in shop_naver_briefing yet)
        const result = await db.execute(sql`
            SELECT s.id, s.name, s.address_full, s.address_region, s.naver_business_id
            FROM shops s
            LEFT JOIN shop_naver_briefing snb ON s.id = snb.shop_id
            WHERE s.country_code = 'KR'
              AND snb.id IS NULL
            ORDER BY s.id ASC
            ${args.limit > 0 ? sql`LIMIT ${args.limit}` : sql``}
        `);
        return result.rows as unknown as ShopRow[];
    }

    if (args.limit > 0) {
        query = query.limit(args.limit);
    }

    return query;
}

async function upsertBriefing(
    shopId: number,
    businessId: string,
    briefingData: AiBriefingResult | null,
    errorMessage: string | null,
) {
    const hasBriefing = !!briefingData?.textSummaries && briefingData.textSummaries.length > 0;
    const briefingText = briefingData?.textSummaries
        ?.map(s => s.sentence)
        .join('\n') || null;

    await db.execute(sql`
        INSERT INTO shop_naver_briefing (shop_id, briefing_text, text_summaries, image_summaries, related_queries, source_business_id, has_briefing, error_message, fetched_at, updated_at)
        VALUES (
            ${shopId},
            ${briefingText},
            ${briefingData?.textSummaries ? sql`${JSON.stringify(briefingData.textSummaries)}::jsonb` : sql`NULL`},
            ${briefingData?.imageSummaries ? sql`${JSON.stringify(briefingData.imageSummaries)}::jsonb` : sql`NULL`},
            ${briefingData?.relatedQueries ? sql`${JSON.stringify(briefingData.relatedQueries)}::jsonb` : sql`NULL`},
            ${businessId},
            ${hasBriefing},
            ${errorMessage},
            NOW(),
            NOW()
        )
        ON CONFLICT (shop_id) DO UPDATE SET
            briefing_text = EXCLUDED.briefing_text,
            text_summaries = EXCLUDED.text_summaries,
            image_summaries = EXCLUDED.image_summaries,
            related_queries = EXCLUDED.related_queries,
            source_business_id = EXCLUDED.source_business_id,
            has_briefing = EXCLUDED.has_briefing,
            error_message = EXCLUDED.error_message,
            fetched_at = NOW(),
            updated_at = NOW()
    `);
}

async function updateNaverBusinessId(shopId: number, businessId: string) {
    await db.execute(sql`
        UPDATE shops SET naver_business_id = ${businessId}, updated_at = NOW()
        WHERE id = ${shopId}
    `);
}

// --- Main ---
async function main() {
    const args = parseArgs();

    console.log('='.repeat(60));
    console.log('  네이버 AI 브리핑 추출 스크립트');
    console.log('='.repeat(60));
    console.log(`  옵션: limit=${args.limit || '전체'}, shopId=${args.shopId || '전체'}, retryFailed=${args.retryFailed}, dryRun=${args.dryRun}, headed=${args.headed}`);
    console.log('');

    // 1. Get shops to process
    const shopsToProcess = await getShopsToProcess(args);
    console.log(`📋 처리 대상: ${shopsToProcess.length}개 shops\n`);

    if (shopsToProcess.length === 0) {
        console.log('처리할 shop이 없습니다.');
        process.exit(0);
    }

    // 2. Launch browser
    let browser = await launchBrowser(args.headed);
    let page = await initPage(browser);

    // Visit naver.com once to initialize session/cookies
    console.log('🌐 네이버 세션 초기화 중...');
    await page.goto('https://www.naver.com', { waitUntil: 'networkidle2', timeout: 20000 });
    await sleep(2000);
    console.log('✅ 세션 초기화 완료\n');

    // 3. Process shops
    let stats = { success: 0, noBriefing: 0, noBusinessId: 0, error: 0 };
    let consecutiveErrors = 0;

    for (let i = 0; i < shopsToProcess.length; i++) {
        const shop = shopsToProcess[i];
        const progress = `[${i + 1}/${shopsToProcess.length}]`;

        process.stdout.write(`\r${progress} 🔄 [${shop.id}] ${shop.name}...                    `);
        console.log(''); // New line for detailed output

        try {
            // Phase A: Get businessId
            let businessId = shop.naver_business_id;

            if (!businessId) {
                console.log(`  🔍 네이버 검색으로 businessId 추출 중...`);
                businessId = await extractBusinessId(page, shop.name, shop.address_region);

                if (businessId) {
                    console.log(`  ✅ businessId 발견: ${businessId}`);
                    if (!args.dryRun) {
                        await updateNaverBusinessId(shop.id, businessId);
                    }
                } else {
                    console.log(`  ❌ businessId를 찾지 못함`);
                    if (!args.dryRun) {
                        await upsertBriefing(shop.id, '', null, 'businessId not found');
                    }
                    stats.noBusinessId++;
                    consecutiveErrors = 0;
                    await randomDelay(2000, 4000);
                    continue;
                }
            } else {
                console.log(`  📌 기존 businessId 사용: ${businessId}`);
            }

            // Phase B: Fetch AI Briefing
            console.log(`  🤖 AI 브리핑 조회 중...`);
            const { data, error } = await fetchAiBriefing(page, businessId);

            if (error) {
                console.log(`  ❌ 에러: ${error}`);
                if (!args.dryRun) {
                    await upsertBriefing(shop.id, businessId, null, error);
                }
                stats.error++;
                consecutiveErrors++;
            } else if (!data || !data.textSummaries || data.textSummaries.length === 0) {
                console.log(`  ⏭️  AI 브리핑 없음 (정상 - 모든 매장에 브리핑이 있지는 않음)`);
                if (!args.dryRun) {
                    await upsertBriefing(shop.id, businessId, data, null);
                }
                stats.noBriefing++;
                consecutiveErrors = 0;
            } else {
                const textCount = data.textSummaries.length;
                const imgCount = data.imageSummaries?.length || 0;
                const queryCount = data.relatedQueries?.length || 0;
                const briefingPreview = data.textSummaries[0]?.sentence?.substring(0, 60) || '';
                console.log(`  ✅ 브리핑 수집 완료: 텍스트 ${textCount}개, 이미지 ${imgCount}개, 관련검색 ${queryCount}개`);
                console.log(`     "${briefingPreview}..."`);
                if (!args.dryRun) {
                    await upsertBriefing(shop.id, businessId, data, null);
                }
                stats.success++;
                consecutiveErrors = 0;
            }

        } catch (error) {
            const msg = (error as Error).message;
            console.log(`  💥 예외: ${msg}`);
            if (!args.dryRun) {
                await upsertBriefing(shop.id, shop.naver_business_id || '', null, msg).catch(() => { });
            }
            stats.error++;
            consecutiveErrors++;
        }

        // Rate limiting
        await randomDelay(2000, 4000);

        // 5 consecutive errors → long pause
        if (consecutiveErrors >= 5) {
            console.log('\n⚠️  5연속 에러 발생. 60초 대기...');
            await sleep(60000);
            consecutiveErrors = 0;
        }

        // Restart browser every 100 shops (memory management)
        if ((i + 1) % 100 === 0 && i + 1 < shopsToProcess.length) {
            console.log('\n🔄 브라우저 재시작 (메모리 관리)...');
            await page.close();
            await browser.close();
            await sleep(3000);
            browser = await launchBrowser(args.headed);
            page = await initPage(browser);
            // Re-initialize session
            await page.goto('https://www.naver.com', { waitUntil: 'networkidle2', timeout: 20000 });
            await sleep(2000);
            console.log('✅ 브라우저 재시작 완료\n');
        }
    }

    // 4. Cleanup
    await page.close();
    await browser.close();

    // 5. Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 결과 요약');
    console.log('='.repeat(60));
    console.log(`  ✅ 브리핑 수집 성공: ${stats.success}개`);
    console.log(`  ⏭️  브리핑 없음: ${stats.noBriefing}개`);
    console.log(`  🔍 businessId 못 찾음: ${stats.noBusinessId}개`);
    console.log(`  ❌ 에러: ${stats.error}개`);
    console.log(`  📦 총 처리: ${shopsToProcess.length}개`);
    if (args.dryRun) {
        console.log('\n  ⚠️  DRY RUN 모드 - DB 저장 안 함');
    }
    console.log('='.repeat(60));
}

// Run
main()
    .then(() => {
        console.log('\n✨ 완료!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n💥 스크립트 실행 중 오류:', error);
        process.exit(1);
    });
