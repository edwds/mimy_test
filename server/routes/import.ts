
import express from 'express';
import { db } from '../db/index.js';
import { users_wantstogo, shops } from '../db/schema.js';
import { eq, and, sql } from 'drizzle-orm';

const router = express.Router();

router.post('/naver', async (req, res) => {
    try {
        const { url, userId } = req.body;

        if (!url || !userId) {
            return res.status(400).json({ error: "URL and userId are required" });
        }

        console.log(`[Import] Processing URL: ${url} for User: ${userId}`);

        // 1. Resolve Short URL (if needed)
        let targetUrl = url;

        // Simple logic to detect short URL and fetch headers to get real location
        if (url.includes('naver.me')) {
            try {
                // Use GET and let it follow redirects automatically (default fetch behavior)
                const response = await fetch(url);
                targetUrl = response.url;
                console.log(`[Import] Resolved Short URL: ${targetUrl}`);
            } catch (e) {
                console.error("Failed to resolve short URL", e);
                // Proceed with original URL if fail, might fail later
            }
        }

        // 2. Extract Share ID / Folder ID
        // Expected pattern: https://map.naver.com/p/favorite/myPlace/folder/{ID}?
        const match = targetUrl.match(/folder\/([a-zA-Z0-9]+)/);
        if (!match) {
            return res.status(400).json({ error: "Invalid Naver Map URL format. Could not find folder ID." });
        }
        const shareId = match[1];

        // 3. Fetch Naver API
        // https://pages.map.naver.com/save-pages/api/maps-bookmark/v3/shares/{shareId}/bookmarks
        const apiUrl = `https://pages.map.naver.com/save-pages/api/maps-bookmark/v3/shares/${shareId}/bookmarks?start=0&limit=1000&sort=lastUseTime&mcids=ALL&createIdNo=true`;

        console.log(`[Import] Fetching API: ${apiUrl}`);
        const apiRes = await fetch(apiUrl);

        if (!apiRes.ok) {
            return res.status(502).json({ error: "Failed to fetch data from Naver" });
        }

        const data = await apiRes.json();

        // Check structure (it might be array directly or inside 'items')
        // Based on user snippet, it looks like a list. User said "it comes like this...". 
        // Usually these APIs return { items: [...] } or just [...]
        // Let's assume 'items' if object, or array directly.
        // User snippet: {"bookmarkId":...} -> looks like individual item.
        // Let's treat 'data' as potentially { items: [] } or just [].

        // User provided structure has 'bookmarkList' at root
        let items: any[] = [];

        if (data.bookmarkList && Array.isArray(data.bookmarkList)) {
            items = data.bookmarkList;
        } else if (Array.isArray(data)) {
            items = data;
        } else if (data.items && Array.isArray(data.items)) {
            items = data.items;
        } else if (data.bookmarks && Array.isArray(data.bookmarks)) {
            items = data.bookmarks;
        } else if (data.result && data.result.items) {
            items = data.result.items;
        } else {
            if (data.bookmarkId) items = [data];
        }

        // If empty, maybe structure is different. Let's try to assume it's `items` in root.
        if (items.length === 0 && data.result && data.result.items) {
            items = data.result.items;
        }

        if (items.length === 0) {
            // Wait, if 0 items, maybe we parsed wrong? Or folder is empty.
            // Let's assume success but 0.
        }

        const validItems = items.filter((item: any) => item.available === true);
        const totalItems = validItems.length;
        let importedCount = 0;

        console.log(`[Import] Found ${totalItems} valid items (from ${items.length} total)`);

        // 4. Match & Save
        for (const item of validItems) {
            const { name, px, py, address } = item;

            // px/py in Naver are often Long/Lat or specific coords. 
            // User snippet: "px":126.9843696,"py":37.4804547
            // This looks like standard lon/lat (px=lon, py=lat).

            if (!px || !py) continue;

            const lon = parseFloat(px);
            const lat = parseFloat(py);

            // Match Logic:
            // Find shops within ~100m (0.001 deg approx)
            // Postgres/SQLite distance check.
            // Since we use SQLite (or generic SQL via Drizzle), we can range query.

            const latRange = 0.002;
            const lonRange = 0.002;

            const candidates = await db.select().from(shops).where(and(
                sql`${shops.lat} BETWEEN ${lat - latRange} AND ${lat + latRange}`,
                sql`${shops.lon} BETWEEN ${lon - lonRange} AND ${lon + lonRange}`
            ));

            let matchedShop = null;

            if (candidates.length > 0) {
                // refine by name
                // normalize names (remove spaces)
                const normName = name.replace(/\s/g, '');

                matchedShop = candidates.find(s => {
                    const sName = s.name.replace(/\s/g, '');
                    return sName.includes(normName) || normName.includes(sName);
                });

                // If no name match but very close distance?
                // Let's stick to name match for safety.
            }

            if (matchedShop) {
                // Save to users_wantstogo
                try {
                    await db.insert(users_wantstogo).values({
                        user_id: parseInt(userId),
                        shop_id: matchedShop.id,
                        channel: 'NAVER_IMPORT', // custom channel
                        visibility: true,
                    }).onConflictDoNothing(); // Prevent duplicates

                    importedCount++;
                } catch (e) {
                    // Ignore duplicate error if onConflict doesn't catch it
                    // console.error(e);
                }
            }
        }

        res.json({
            success: true,
            totalFound: totalItems,
            importedCount: importedCount,
            message: `${totalItems}개 중 ${importedCount}개를 가져왔습니다.`
        });

    } catch (error) {
        console.error("Import Error:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

export default router;
