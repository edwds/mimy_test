import express from 'express';
import { db } from '../db/index.js';
import { users_wantstogo, shops } from '../db/schema.js';
import { and, sql } from 'drizzle-orm';

const router = express.Router();

const chunk = <T,>(arr: T[], size: number) => {
    const out: T[][] = [];
    for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
    return out;
};

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
    try {
        const { url, userId } = req.body;

        if (!url || !userId) {
            return res.status(400).json({ error: 'URL and userId are required' });
        }

        const uid = Number(userId);
        if (!Number.isInteger(uid) || uid <= 0) {
            return res.status(400).json({ error: 'Invalid userId' });
        }

        console.log(`[Import] Processing URL: ${url} for User: ${uid}`);

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

        // 2) Extract share/folder ID
        const match = targetUrl.match(/folder\/([a-zA-Z0-9_-]+)/);
        if (!match) {
            return res.status(400).json({ error: 'Invalid Naver Map URL format. Could not find folder ID.' });
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
            return res.status(502).json({ error: 'Failed to fetch data from Naver' });
        }

        const data = await apiRes.json();

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

        // ---- DB 좌표 범위(디버그): DB에 좌표가 “정상 위경도 범위”인지 바로 확인
        try {
            const bounds = await db
                .select({
                    minLat: sql<number>`MIN(${shops.lat})`,
                    maxLat: sql<number>`MAX(${shops.lat})`,
                    minLon: sql<number>`MIN(${shops.lon})`,
                    maxLon: sql<number>`MAX(${shops.lon})`,
                })
                .from(shops);
            console.log('[Import] shops bounds:', bounds?.[0]);
        } catch (e) {
            console.log('[Import] bounds query skipped:', e);
        }

        // 4) Batch process (50개씩)
        const BATCH_SIZE = 50;
        const latRange = 0.002;
        const lonRange = 0.002;

        let importedCount = 0;
        let matchedCount = 0;
        let candidateHitCount = 0;

        const batches = chunk(validItems, BATCH_SIZE);

        for (let b = 0; b < batches.length; b++) {
            const batch = batches[b];

            console.log(`[Import] Batch ${b + 1}/${batches.length} (items: ${batch.length})`);

            // batch는 순차, batch 내부는 직렬(안전) — 필요하면 아래를 Promise.all로 병렬 제한 가능
            for (let i = 0; i < batch.length; i++) {
                const item = batch[i];
                const name = item?.name || '';
                const px = item?.px;
                const py = item?.py;

                if (px == null || py == null) continue;

                // px=lon, py=lat 가정
                const lon = Number(px);
                const lat = Number(py);
                if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;

                // 1) 정상 케이스 후보 탐색
                let candidates = await db
                    .select()
                    .from(shops)
                    .where(
                        and(
                            sql`${shops.lat} BETWEEN ${lat - latRange} AND ${lat + latRange}`,
                            sql`${shops.lon} BETWEEN ${lon - lonRange} AND ${lon + lonRange}`
                        )
                    );

                // 2) 후보가 0이면 “DB에 lat/lon이 뒤집혀 저장된 케이스” fallback (매우 흔함)
                if (candidates.length === 0) {
                    const swapped = await db
                        .select()
                        .from(shops)
                        .where(
                            and(
                                sql`${shops.lat} BETWEEN ${lon - latRange} AND ${lon + latRange}`, // swap
                                sql`${shops.lon} BETWEEN ${lat - lonRange} AND ${lat + lonRange}`
                            )
                        );
                    candidates = swapped;
                }

                if (candidates.length > 0) candidateHitCount++;

                // 이름 매칭
                let matchedShop: any = null;
                if (candidates.length > 0) {
                    const n = normalizeName(name);

                    matchedShop = candidates.find((s: any) => {
                        const sn = normalizeName(s?.name || '');
                        if (!sn || !n) return false;
                        return sn.includes(n) || n.includes(sn);
                    });

                    // (옵션) 이름 매칭 실패가 너무 많으면 “가장 가까운 1개”로 내려가는 fallback도 가능
                    // 지금은 안전하게 이름 매칭만 유지.
                }

                // 디버그: 처음 몇 개만 상세 로그
                if (b === 0 && i < 3) {
                    console.log('[Import][Sample]', {
                        name,
                        lat,
                        lon,
                        candidates: candidates.length,
                        matched: matchedShop ? { id: matchedShop.id, name: matchedShop.name } : null,
                    });
                }

                if (!matchedShop) continue;
                matchedCount++;

                // Insert (중복 방지 전제: users_wantstogo에 (user_id, shop_id) UNIQUE 있어야 의미가 있음)
                try {
                    await db
                        .insert(users_wantstogo)
                        .values({
                            user_id: uid,
                            shop_id: matchedShop.id,
                            channel: 'NAVER_IMPORT',
                            visibility: true,
                        })
                        .onConflictDoNothing();

                    importedCount++;
                } catch (e) {
                    // 중복/제약 등은 무시
                }
            }
        }

        console.log('[Import] stats:', { totalItems, candidateHitCount, matchedCount, importedCount });

        return res.json({
            success: true,
            totalFound: totalItems,
            importedCount,
            debug: {
                candidateHitCount,
                matchedCount,
            },
            message: `${totalItems}개 중 ${importedCount}개를 가져왔습니다.`,
        });
    } catch (error) {
        console.error('Import Error:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
});

export default router;