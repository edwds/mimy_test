import express from 'express';
import { db } from '../db/index.js';
import { users_wantstogo, shops } from '../db/schema.js';
import { and, sql } from 'drizzle-orm';

const router = express.Router();

/**
 * Concurrency utility to process items in parallel with a limit
 */
async function mapLimit<T, R>(
    items: T[],
    limit: number,
    iterator: (item: T) => Promise<R>
): Promise<R[]> {
    const results: Promise<R>[] = [];
    const executing: Promise<void>[] = [];

    for (const item of items) {
        const p = Promise.resolve().then(() => iterator(item));
        results.push(p);

        const e = p.then(() => {
            executing.splice(executing.indexOf(e), 1);
        });
        executing.push(e);

        if (executing.length >= limit) {
            await Promise.race(executing);
        }
    }

    return Promise.all(results);
}

const normalizeName = (s: string) =>
    (s || '')
        .toLowerCase()
        .replace(/\s+/g, '')
        .replace(/[()\-_.·]/g, '');

function withTimeout(ms: number) {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), ms);
    return { signal: controller.signal, clear: () => clearTimeout(t) };
}

router.post('/naver', async (req, res) => {
    // Setup SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const sendEvent = (type: string, data: any) => {
        res.write(`event: ${type}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    const sendProgress = (step: string, percent: number, message: string) => {
        sendEvent('progress', { step, percent, message });
    };

    try {
        const { url, userId } = req.body;

        if (!url || !userId) {
            sendEvent('error', { message: 'URL and userId are required' });
            return res.end();
        }

        const uid = Number(userId);
        if (!Number.isInteger(uid) || uid <= 0) {
            sendEvent('error', { message: 'Invalid userId' });
            return res.end();
        }

        console.log(`[Import] Processing URL: ${url} for User: ${uid}`);
        sendProgress('resolve', 5, '단축 URL 분석 중...');

        // 1) Resolve short URL (naver.me)
        let targetUrl = url;
        if (url.includes('naver.me')) {
            try {
                const t = withTimeout(8000);
                const r = await fetch(url, { signal: t.signal });
                t.clear();
                targetUrl = r.url || url;
                console.log(`[Import] Resolved Short URL: ${targetUrl}`);
            } catch (e) {
                console.error('[Import] Failed to resolve short URL (continue)', e);
            }
        }

        sendProgress('fetch', 10, '네이버 지도 데이터 요청 중...');

        // 2) Extract share/folder ID
        const match = targetUrl.match(/folder\/([a-zA-Z0-9_-]+)/);
        if (!match) {
            sendEvent('error', { message: '유효하지 않은 네이버 지도 URL입니다. (폴더 ID 미확인)' });
            return res.end();
        }
        const shareId = match[1];

        // 3) Fetch Naver API
        const apiUrl =
            `https://pages.map.naver.com/save-pages/api/maps-bookmark/v3/shares/${shareId}/bookmarks` +
            `?start=0&limit=1000&sort=lastUseTime&mcids=ALL&createIdNo=true`;

        console.log(`[Import] Fetching API: ${apiUrl}`);

        const t2 = withTimeout(15000);
        const apiRes = await fetch(apiUrl, { signal: t2.signal });
        t2.clear();

        if (!apiRes.ok) {
            sendEvent('error', { message: '네이버 데이터 가져오기에 실패했습니다. (API Error)' });
            return res.end();
        }

        const data: any = await apiRes.json();

        let items: any[] = [];
        if (data.bookmarkList && Array.isArray(data.bookmarkList)) items = data.bookmarkList;
        else if (Array.isArray(data)) items = data;
        else if (data.items && Array.isArray(data.items)) items = data.items;
        else if (data.bookmarks && Array.isArray(data.bookmarks)) items = data.bookmarks;
        else if (data.result && Array.isArray(data.result.items)) items = data.result.items;
        else if (data.bookmarkId) items = [data];

        const validItems = items.filter((it: any) => it && it.available === true);
        const totalItems = validItems.length;

        console.log(`[Import] Found ${totalItems} valid items (from ${items.length} total)`);
        sendProgress('count', 15, `${totalItems}개의 장소를 찾았습니다. 분석을 시작합니다...`);

        // 4) Process Items in Parallel
        const CONCURRENCY = 8;
        const latRange = 0.0015;
        const lonRange = 0.0015;

        // Stats to track
        let candidateHitCount = 0;
        let matchedCount = 0;
        let importedCount = 0;
        let processedCount = 0;

        await mapLimit(validItems, CONCURRENCY, async (item: any) => {
            const name = item?.name || '';
            const px = item?.px;
            const py = item?.py;

            processedCount++;
            // Update progress every 5 items or so to avoid flooding
            if (processedCount % 5 === 0 || processedCount === totalItems) {
                const percent = 15 + Math.floor((processedCount / totalItems) * 80); // 15% -> 95%
                sendProgress('processing', percent, `장소 분석 및 저장 중... (${processedCount}/${totalItems})`);
            }

            if (px == null || py == null) return;

            const lon = Number(px);
            const lat = Number(py);
            if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;

            // 4-1) Candidate Search
            const candidates = await db
                .select({
                    id: shops.id,
                    name: shops.name,
                    lat: shops.lat,
                    lon: shops.lon,
                })
                .from(shops)
                .where(
                    and(
                        sql`${shops.lat} BETWEEN ${lat - latRange} AND ${lat + latRange}`,
                        sql`${shops.lon} BETWEEN ${lon - lonRange} AND ${lon + lonRange}`
                    )
                )
                .limit(40);

            if (candidates.length > 0) {
                candidateHitCount++;

                // 4-2) Name Matching
                const n = normalizeName(name);
                const matched = candidates.find((s) => {
                    const sn = normalizeName(s.name || '');
                    if (!sn || !n) return false;
                    return sn.includes(n) || n.includes(sn);
                });

                if (matched) {
                    matchedCount++;
                    // 4-3) Insert
                    try {
                        await db
                            .insert(users_wantstogo)
                            .values({
                                user_id: uid,
                                shop_id: matched.id,
                                channel: 'NAVER_IMPORT',
                                visibility: true,
                            })
                            .onConflictDoUpdate({
                                target: [users_wantstogo.user_id, users_wantstogo.shop_id],
                                set: {
                                    is_deleted: false,
                                    batch_created: new Date() // force update
                                }
                            });
                        importedCount++;
                    } catch (e) {
                        // ignore
                    }
                }
            }
        });

        console.log('[Import] stats:', { totalItems, candidateHitCount, matchedCount, importedCount });

        sendProgress('complete', 100, '완료!');
        sendEvent('complete', {
            success: true,
            totalFound: totalItems,
            importedCount,
            debug: { candidateHitCount, matchedCount },
            message: `${totalItems}개 중 ${importedCount}개를 가져왔습니다.`,
        });

        res.end();

    } catch (error) {
        console.error('Import Error:', error);
        sendEvent('error', { message: '알 수 없는 서버 에러가 발생했습니다.' });
        res.end();
    }
});

export default router;