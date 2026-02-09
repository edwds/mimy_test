import express from 'express';
import { db } from '../db/index.js';
import { users_wantstogo, shops } from '../db/schema.js';
import { and, sql, eq } from 'drizzle-orm';

const router = express.Router();

const ALLOWED_GOOGLE_TYPES = [
    "restaurant", "cafe", "bakery", "bar", "meal_delivery", "meal_takeaway",
    "japanese_restaurant", "korean_restaurant", "chinese_restaurant", "italian_restaurant",
    "french_restaurant", "thai_restaurant", "vietnamese_restaurant", "indian_restaurant",
    "mexican_restaurant", "american_restaurant", "seafood_restaurant", "steak_house",
    "pizza_restaurant", "hamburger_restaurant", "sushi_restaurant", "ramen_restaurant",
    "fine_dining_restaurant", "fast_food_restaurant", "buffet_restaurant", "brunch_restaurant",
    "breakfast_restaurant", "dessert_restaurant", "ice_cream_shop", "coffee_shop"
];

const normalizeName = (s: string) =>
    (s || '')
        .normalize('NFC')
        .toLowerCase()
        .replace(/\s+/g, '')
        .replace(/[()\-_.·]/g, '');

function withTimeout(ms: number) {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), ms);
    return { signal: controller.signal, clear: () => clearTimeout(t) };
}

/**
 * Search Google Places and import shop to DB
 */
async function searchAndImportFromGoogle(
    name: string,
    lat: number,
    lon: number,
    uid: number,
    apiKey: string
): Promise<{ success: boolean; shopId?: number; shopName?: string }> {
    try {
        const locationBias = {
            circle: {
                center: { latitude: lat, longitude: lon },
                radius: 500.0
            }
        };

        const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Goog-Api-Key': apiKey,
                'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.adrFormatAddress,places.location,places.photos,places.rating,places.userRatingCount,places.generativeSummary,places.editorialSummary,places.types'
            },
            body: JSON.stringify({
                textQuery: name,
                locationBias,
                languageCode: 'ko',
                maxResultCount: 5
            })
        });

        if (!response.ok) {
            console.error(`[GoogleImport] API error for "${name}": ${response.status}`);
            return { success: false };
        }

        const data = await response.json();
        const places = data.places || [];

        // Filter to restaurant types
        const validPlaces = places.filter((p: any) =>
            p.types?.some((t: string) => ALLOWED_GOOGLE_TYPES.includes(t))
        );

        if (validPlaces.length === 0) {
            console.log(`[GoogleImport] No valid places found for "${name}"`);
            return { success: false };
        }

        const place = validPlaces[0];
        const googlePlaceId = place.id;

        // Check if already exists in DB
        const existing = await db
            .select({ id: shops.id })
            .from(shops)
            .where(eq(shops.google_place_id, googlePlaceId))
            .limit(1);

        let shopId: number;

        if (existing.length > 0) {
            shopId = existing[0].id;
            console.log(`[GoogleImport] "${name}" already exists as shop ${shopId}`);
        } else {
            // Extract region from address
            let addressRegion = "";
            const regionMatch = place.adrFormatAddress?.match(/<span class="region">([^<]+)<\/span>/);
            const localityMatch = place.adrFormatAddress?.match(/<span class="locality">([^<]+)<\/span>/);
            const parts = [];
            if (regionMatch) parts.push(regionMatch[1]);
            if (localityMatch) parts.push(localityMatch[1]);
            if (parts.length > 0) addressRegion = parts.join(" ");
            if (!addressRegion && place.formattedAddress) {
                addressRegion = place.formattedAddress.split(" ").slice(0, 3).join(" ");
            }

            // Get thumbnail
            let thumbnail = null;
            if (place.photos && place.photos.length > 0) {
                thumbnail = `https://places.googleapis.com/v1/${place.photos[0].name}/media?maxHeightPx=400&maxWidthPx=400&key=${apiKey}`;
            }

            // Get food kind from types
            const matchedType = place.types?.find((t: string) => ALLOWED_GOOGLE_TYPES.includes(t)) || 'restaurant';

            // Insert new shop
            const newShop = await db.insert(shops).values({
                name: place.displayName?.text || name,
                google_place_id: googlePlaceId,
                address_full: place.formattedAddress,
                address_region: addressRegion,
                lat: place.location?.latitude,
                lon: place.location?.longitude,
                thumbnail_img: thumbnail,
                description: place.generativeSummary?.overview?.text || place.editorialSummary?.text || null,
                food_kind: matchedType,
                status: 2,
                country_code: 'KR',
                visibility: true
            }).returning({ id: shops.id });

            shopId = newShop[0].id;
            console.log(`[GoogleImport] Created new shop ${shopId} for "${name}"`);
        }

        // Add to user's wantstogo list
        await db
            .insert(users_wantstogo)
            .values({
                user_id: uid,
                shop_id: shopId,
                channel: 'GOOGLE_IMPORT',
                visibility: true,
            })
            .onConflictDoUpdate({
                target: [users_wantstogo.user_id, users_wantstogo.shop_id],
                set: {
                    is_deleted: false,
                    updated_at: new Date()
                }
            });

        return { success: true, shopId, shopName: place.displayName?.text || name };

    } catch (err) {
        console.error(`[GoogleImport] Error processing "${name}":`, err);
        return { success: false };
    }
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

        const apiKey = process.env.GOOGLE_MAPS_API_KEY;
        if (!apiKey) {
            console.warn('[Import] GOOGLE_MAPS_API_KEY not configured, Google fallback disabled');
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
        const apiRes = await fetch(apiUrl, {
            signal: t2.signal,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Referer': 'https://map.naver.com/',
                'Accept': 'application/json, text/plain, */*',
                'Origin': 'https://map.naver.com',
                'Host': 'pages.map.naver.com',
                'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7'
            }
        });
        t2.clear();

        if (!apiRes.ok) {
            console.error(`[Import] API Error: ${apiRes.status} ${apiRes.statusText}`);
            const errBody = await apiRes.text();
            console.error(`[Import] Error Body: ${errBody.slice(0, 500)}`);
            sendEvent('error', { message: `네이버 데이터 가져오기에 실패했습니다. (Status: ${apiRes.status})` });
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

        // 4) Process Items sequentially (to avoid Google rate limiting)
        const latRange = 0.005; // ~550m
        const lonRange = 0.005;

        let dbMatchedCount = 0;
        let googleImportedCount = 0;
        let failedCount = 0;
        let processedCount = 0;

        for (const item of validItems) {
            const name = item?.name || '';
            const px = item?.px;
            const py = item?.py;

            processedCount++;
            if (processedCount % 3 === 0 || processedCount === totalItems) {
                const percent = 15 + Math.floor((processedCount / totalItems) * 80);
                sendProgress('processing', percent, `장소 처리 중... (${processedCount}/${totalItems})`);
            }

            if (px == null || py == null) {
                failedCount++;
                continue;
            }

            const lon = Number(px);
            const lat = Number(py);
            if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
                failedCount++;
                continue;
            }

            // 4-1) Try DB match first
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
                .limit(100);

            // Name matching
            const n = normalizeName(name);
            const matched = candidates.find((s) => {
                const sn = normalizeName(s.name || '');
                if (!sn || !n) return false;
                return sn.includes(n) || n.includes(sn);
            });

            if (matched) {
                // DB match found - add to wantstogo
                console.log(`[Import] DB MATCHED: "${name}" -> "${matched.name}" (ID: ${matched.id})`);
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
                                updated_at: new Date()
                            }
                        });
                    dbMatchedCount++;
                } catch (e) {
                    console.error(`[Import] DB insert error for "${name}":`, e);
                    failedCount++;
                }
            } else if (apiKey) {
                // 4-2) No DB match - try Google
                console.log(`[Import] No DB match for "${name}", trying Google...`);
                const result = await searchAndImportFromGoogle(name, lat, lon, uid, apiKey);
                if (result.success) {
                    googleImportedCount++;
                } else {
                    failedCount++;
                }
                // Small delay to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 150));
            } else {
                // No Google API key configured
                failedCount++;
            }
        }

        const totalImported = dbMatchedCount + googleImportedCount;
        console.log('[Import] stats:', { totalItems, dbMatchedCount, googleImportedCount, failedCount, totalImported });

        sendProgress('complete', 100, '완료!');
        sendEvent('complete', {
            success: true,
            totalFound: totalItems,
            importedCount: totalImported,
            debug: { dbMatchedCount, googleImportedCount, failedCount },
            message: `${totalImported}개를 가져오는데 성공했습니다.`,
        });

        res.end();

    } catch (error) {
        console.error('Import Error:', error);
        sendEvent('error', { message: '알 수 없는 서버 에러가 발생했습니다.' });
        res.end();
    }
});

export default router;
