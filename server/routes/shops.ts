
import { Router } from "express";
import { db } from "../db/index.js";
import { shops, users_wantstogo, content, users, users_ranking, clusters } from "../db/schema.js";
import { ilike, or, eq, sql, and, desc, asc, not, inArray } from "drizzle-orm";
import { calculateShopMatchScore, TasteScores } from "../utils/match.js";
import { getShopMatchScores } from "../utils/enricher.js";
import fs from 'fs';
import path from 'path';

const router = Router();

// Cache cluster data for name mapping
let clusterMap: Map<string, string> | null = null;
try {
    const clusterPath = path.join(process.cwd(), 'server/data/cluster.json');
    if (fs.existsSync(clusterPath)) {
        const clusterData = JSON.parse(fs.readFileSync(clusterPath, 'utf-8')) as Array<{ cluster_id: string, cluster_name: string }>;
        clusterMap = new Map(clusterData.map(c => [c.cluster_id.toString(), c.cluster_name]));
        // Ensure keys are strings for safe lookup
    } else {
        console.warn("server/data/cluster.json not found, using empty map");
        clusterMap = new Map();
    }
} catch (e) {
    console.warn("Failed to load cluster data:", e);
    clusterMap = new Map();
}

const getClusterName = (id: string | number | null) => {
    if (!id) return undefined;
    return clusterMap?.get(id.toString()) || id.toString();
};

// GET /api/shops/discovery
router.get("/discovery", async (req, res) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const seed = req.query.seed || 'default_seed';

        // Bounding Box Params & Validation
        const rawMinLat = parseFloat(req.query.minLat as string);
        const rawMaxLat = parseFloat(req.query.maxLat as string);
        const rawMinLon = parseFloat(req.query.minLon as string);
        const rawMaxLon = parseFloat(req.query.maxLon as string);

        const hasBBox = Number.isFinite(rawMinLat) && Number.isFinite(rawMaxLat) &&
            Number.isFinite(rawMinLon) && Number.isFinite(rawMaxLon);

        let query = db.select({
            id: shops.id,
            name: shops.name,
            description: shops.description,
            address_full: shops.address_full,
            thumbnail_img: shops.thumbnail_img,
            kind: shops.kind,
            lat: shops.lat,
            lon: shops.lon,
            catchtable_ref: shops.catchtable_ref
        }).from(shops).$dynamic();

        if (hasBBox) {
            query = query.where(and(
                sql`${shops.lat} >= ${rawMinLat}`,
                sql`${shops.lat} <= ${rawMaxLat}`,
                sql`${shops.lon} >= ${rawMinLon}`,
                sql`${shops.lon} <= ${rawMaxLon}`
            ));
        }

        // Consistent Sort
        const results = await query
            .orderBy(sql`md5(${shops.id}::text || ${seed})`)
            .limit(limit)
            .offset((page - 1) * limit);

        if (results.length === 0) {
            return res.json([]);
        }

        // --- Enrichment (Batching) ---
        // TODO: Switch to secure session/token auth
        const userIdHeader = req.headers['x-user-id'];
        const uid = userIdHeader ? parseInt(userIdHeader as string) : 0;
        const shopIds = results.map(s => s.id);

        // 1. Batch Check Saved Status
        const savedSet = new Set<number>();
        const savedAtMap = new Map<number, Date>();

        if (uid > 0) {
            const savedList = await db.select({
                shop_id: users_wantstogo.shop_id,
                created_at: users_wantstogo.created_at
            }).from(users_wantstogo)
                .where(and(
                    eq(users_wantstogo.user_id, uid),
                    inArray(users_wantstogo.shop_id, shopIds),
                    eq(users_wantstogo.is_deleted, false) // Active only
                ));

            savedList.forEach(s => {
                savedSet.add(s.shop_id);
                if (s.created_at) savedAtMap.set(s.shop_id, s.created_at);
            });
        }

        // 2. Batch Fetch Best Review Snippet
        // Strategy: Row_Number() partitioned by shop_id
        // Priority: If viewer has taste scores, sort by compatibility (distance asc), else created_at desc
        const snippetsMap = new Map<number, any>();

        let viewerScores: any = null;
        if (uid > 0) {
            const u = await db.select({ taste_result: users.taste_result }).from(users).where(eq(users.id, uid)).limit(1);
            if (u.length > 0 && u[0].taste_result) {
                viewerScores = (u[0].taste_result as any).scores;
            }
        }

        const axes = ['boldness', 'acidity', 'richness', 'experimental', 'spiciness', 'sweetness', 'umami'];

        // Construct Sort Clause for Window Function
        let orderByClause = "c.created_at DESC";
        if (viewerScores) {
            const distExpr = axes.map(axis => {
                const v = Number(viewerScores[axis] || 0);
                // Postgres JSON operator ->> returns text, cast to float
                return `power(COALESCE((u.taste_result->'scores'->>'${axis}')::float, 0) - ${v}, 2)`;
            }).join(' + ');
            orderByClause = `(${distExpr}) ASC, c.created_at DESC`;
        }

        // Execute Raw SQL for efficient windowing
        // Note: shop_id is in review_prop (jsonb), need to cast
        const rawSnippets = await db.execute(sql.raw(`
            WITH ranked_reviews AS (
                SELECT 
                    c.id, c.text, c.img, c.created_at, c.review_prop,
                    u.id as user_id, u.nickname, u.profile_image, u.taste_cluster, u.taste_result,
                    (c.review_prop->>'shop_id')::int as shop_id,
                    ROW_NUMBER() OVER (
                        PARTITION BY (c.review_prop->>'shop_id')::int 
                        ORDER BY ${orderByClause}
                    ) as rn
                FROM content c
                JOIN users u ON c.user_id = u.id
                WHERE c.type = 'review' 
                  AND c.is_deleted = false 
                  AND c.visibility = true
                  AND (c.review_prop->>'shop_id')::int IN (${shopIds.join(',')})
            )
            SELECT * FROM ranked_reviews WHERE rn = 1
        `));

        rawSnippets.rows.forEach((row: any) => {
            snippetsMap.set(Number(row.shop_id), {
                id: row.id,
                text: row.text,
                images: row.img, // Drizzle/pg driver usually parses json, but check if string
                created_at: row.created_at,
                review_prop: row.review_prop,
                user: {
                    id: row.user_id,
                    nickname: row.nickname,
                    profile_image: row.profile_image,
                    cluster_name: getClusterName(row.taste_cluster),
                    taste_cluster: row.taste_cluster,
                    taste_result: row.taste_result
                }
            });
        });

        // 3. Batch Calculate Match Score
        const matchScoresMap = await getShopMatchScores(shopIds, uid);

        const enriched = results.map(shop => ({
            ...shop,
            is_saved: savedSet.has(shop.id),
            saved_at: savedAtMap.get(shop.id) || null,
            reviewSnippet: snippetsMap.get(shop.id) || null,
            shop_user_match_score: matchScoresMap.get(shop.id) || null
        }));

        res.json(enriched);

    } catch (error) {
        console.error("Discovery feed error:", error);
        res.status(500).json({ error: "Failed to fetch discovery feed" });
    }
});

// POST /api/shops/:id/save
router.post("/:id/save", async (req, res) => {
    try {
        const shopId = parseInt(req.params.id);
        const { userId } = req.body; // TODO: Replace with secure session auth

        if (!userId || isNaN(shopId)) {
            return res.status(400).json({ error: "Invalid parameters" });
        }

        let isSaved = false;

        // Transactional toggle
        await db.transaction(async (tx) => {
            // Check existing record
            const existing = await tx.select().from(users_wantstogo)
                .where(and(
                    eq(users_wantstogo.user_id, userId),
                    eq(users_wantstogo.shop_id, shopId)
                )).limit(1);

            if (existing.length > 0) {
                const current = existing[0];
                if (current.is_deleted) {
                    // Restore
                    await tx.update(users_wantstogo)
                        .set({ is_deleted: false, updated_at: new Date() })
                        .where(eq(users_wantstogo.id, current.id));
                    isSaved = true;
                } else {
                    // Soft Delete
                    await tx.update(users_wantstogo)
                        .set({ is_deleted: true, updated_at: new Date() })
                        .where(eq(users_wantstogo.id, current.id));
                    isSaved = false;
                }
            } else {
                // Insert New
                await tx.insert(users_wantstogo).values({
                    user_id: userId,
                    shop_id: shopId,
                    channel: 'discovery',
                    is_deleted: false
                });
                isSaved = true;
            }
        });

        res.json({ success: true, is_saved: isSaved });
    } catch (error) {
        console.error("Save shop error:", error);
        res.status(500).json({ error: "Failed to save shop" });
    }
});

// GET /api/shops/search
router.get("/search", async (req, res) => {
    try {
        const { q } = req.query;
        if (!q || typeof q !== 'string') return res.json([]);

        // Normalize: remove spaces for fuzzy match
        const normalizedQuery = q.replace(/\s+/g, '');
        const likePattern = `%${normalizedQuery}%`;

        // Select minimal fields
        const results = await db.select({
            id: shops.id,
            name: shops.name,
            address_full: shops.address_full,
            thumbnail_img: shops.thumbnail_img,
            lat: shops.lat,
            lon: shops.lon,
            catchtable_ref: shops.catchtable_ref
        })
            .from(shops)
            .where(or(
                // Use ILIKE for case-insensitive, REPLACE for space-insensitive
                // Note: REPLACE + ILIKE might be slow on large datasets without functional index.
                // TODO: Add TRGM/GIN index for 'replace(name, " ", "")' if slow.
                sql`REPLACE(${shops.name}, ' ', '') ILIKE ${likePattern}`,
                sql`REPLACE(${shops.address_full}, ' ', '') ILIKE ${likePattern}`
            ))
            .limit(20);


        const userIdHeader = req.headers['x-user-id'];
        const uid = userIdHeader ? parseInt(userIdHeader as string) : 0;

        // Enrich with Match Score
        const shopIds = results.map(s => s.id);
        const matchScoresMap = await getShopMatchScores(shopIds, uid);

        const enriched = results.map(shop => ({
            ...shop,
            shop_user_match_score: matchScoresMap.get(shop.id) || null
        }));

        res.json(enriched);
    } catch (error) {
        console.error("Shop search error:", error);
        res.status(500).json({ error: "Failed to search shops" });
    }
});

// GET /api/shops/:id
router.get("/:id", async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });

        const results = await db.select().from(shops).where(eq(shops.id, id)).limit(1);
        if (results.length === 0) return res.status(404).json({ error: "Shop not found" });

        const userIdHeader = req.headers['x-user-id'];
        const uid = userIdHeader ? parseInt(userIdHeader as string) : 0;

        const shopData = results[0];

        // Enrich with Match Score
        const matchScoresMap = await getShopMatchScores([id], uid);

        res.json({
            ...shopData,
            shop_user_match_score: matchScoresMap.get(id) || null
        });
    } catch (error) {
        console.error("Shop details error:", error);
        res.status(500).json({ error: "Failed to fetch shop details" });
    }
});

// GET /api/shops/:id/reviews
router.get("/:id/reviews", async (req, res) => {
    try {
        const shopId = parseInt(req.params.id);
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const sort = (req.query.sort as string) || 'popular';
        const userId = req.query.user_id ? parseInt(req.query.user_id as string) : null;
        const offset = (page - 1) * limit;

        if (isNaN(shopId)) return res.status(400).json({ error: "Invalid Shop ID" });

        // 1. Base Query
        let query = db.select({
            id: content.id,
            user_id: content.user_id,
            text: content.text,
            img: content.img,
            created_at: content.created_at,
            review_prop: content.review_prop,
            keyword: content.keyword,
            user: {
                id: users.id,
                nickname: users.nickname,
                profile_image: users.profile_image,
                taste_cluster: users.taste_cluster,
                taste_result: users.taste_result
            },
            rank: users_ranking.rank
        })
            .from(content)
            .innerJoin(users, eq(content.user_id, users.id))
            .leftJoin(users_ranking, and(
                eq(users_ranking.user_id, content.user_id),
                eq(users_ranking.shop_id, shopId)
            ))
            .where(and(
                eq(content.type, 'review'),
                eq(content.is_deleted, false),
                eq(content.visibility, true),
                sql`${content.review_prop}->>'shop_id' = ${shopId.toString()}`
            ));

        // 2. Sorting
        if (sort === 'similar' && userId) {
            const me = await db.select({ taste_result: users.taste_result }).from(users).where(eq(users.id, userId)).limit(1);
            const myScores = (me[0]?.taste_result as any)?.scores;

            if (myScores) {
                const axes = ['boldness', 'acidity', 'richness', 'experimental', 'spiciness', 'sweetness', 'umami'];

                // Construct distance SQL safely using Drizzle's sql template tag
                const distChunks = axes.map(axis => {
                    const myVal = Number(myScores[axis] || 0);
                    // users.taste_result is a JSONB column. ->> gets text, cast to float.
                    // We use sql tag to ensure column reference is handled correctly.
                    return sql`power(COALESCE((${users.taste_result}->'scores'->>${axis})::float, 0) - ${myVal}, 2)`;
                });

                const distSum = sql.join(distChunks, sql` + `);

                query = query.orderBy(asc(distSum), desc(content.created_at));
            } else {
                query = query.orderBy(desc(content.created_at));
            }
        } else {
            // TODO: 'popular' currently defaults to newest; implement like/count based sort if needed
            query = query.orderBy(desc(content.created_at));
        }

        const reviews = await query.limit(limit).offset(offset);

        // Fetch Shop (minimal) for POI
        const shopInfo = await db.select({
            id: shops.id, name: shops.name, address_full: shops.address_full, thumbnail_img: shops.thumbnail_img, catchtable_ref: shops.catchtable_ref
        }).from(shops).where(eq(shops.id, shopId)).limit(1);
        const currentShop = shopInfo[0] || { id: shopId, name: 'Unknown', address_full: '', thumbnail_img: '' };

        const result = reviews.map(r => ({
            id: r.id,
            user: {
                ...r.user,
                cluster_name: getClusterName(r.user.taste_cluster)
            },
            text: r.text,
            images: r.img,
            created_at: r.created_at,
            review_prop: r.review_prop,
            poi: {
                shop_id: currentShop.id,
                shop_name: currentShop.name,
                shop_address: currentShop.address_full,
                thumbnail_img: currentShop.thumbnail_img,
                rank: r.rank,
                satisfaction: (r.review_prop as any)?.satisfaction
            },
            keyword: r.keyword,
        }));

        res.json(result);
    } catch (error) {
        console.error(`[ShopReviewsError] shopId: ${req.params.id}, userId: ${req.query.user_id}`, error);
        res.status(500).json({ error: "Failed to fetch shop reviews" });
    }
});

const ALLOWED_GOOGLE_TYPES = [
    "acai_shop", "afghani_restaurant", "african_restaurant", "american_restaurant", "asian_restaurant",
    "bagel_shop", "bakery", "bar", "bar_and_grill", "barbecue_restaurant", "brazilian_restaurant",
    "breakfast_restaurant", "brunch_restaurant", "buffet_restaurant", "cafe", "cafeteria", "candy_store",
    "cat_cafe", "chinese_restaurant", "chocolate_factory", "chocolate_shop", "coffee_shop", "confectionery",
    "deli", "dessert_restaurant", "dessert_shop", "diner", "dog_cafe", "donut_shop", "fast_food_restaurant",
    "fine_dining_restaurant", "food_court", "french_restaurant", "greek_restaurant", "hamburger_restaurant",
    "ice_cream_shop", "indian_restaurant", "indonesian_restaurant", "italian_restaurant", "japanese_restaurant",
    "juice_shop", "korean_restaurant", "lebanese_restaurant", "meal_delivery", "meal_takeaway",
    "mediterranean_restaurant", "mexican_restaurant", "middle_eastern_restaurant", "pizza_restaurant",
    "pub", "ramen_restaurant", "restaurant", "sandwich_shop", "seafood_restaurant", "spanish_restaurant",
    "steak_house", "sushi_restaurant", "tea_house", "thai_restaurant", "turkish_restaurant",
    "vegan_restaurant", "vegetarian_restaurant", "vietnamese_restaurant", "wine_bar"
];

// GET /api/shops/search/google
// Wraps Google Places Text Search (New API)
router.get("/search/google", async (req, res) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout

    try {
        const { q, region } = req.query;
        if (!q || typeof q !== 'string') return res.json([]);

        const apiKey = process.env.GOOGLE_MAPS_API_KEY;
        if (!apiKey) {
            console.error("GOOGLE_MAPS_API_KEY missing");
            return res.status(500).json({ error: "Service config error" });
        }

        const textQuery = region ? `${q} ${region}` : q;

        const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Goog-Api-Key': apiKey,
                'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.photos,places.rating,places.userRatingCount,places.generativeSummary,places.types'
            },
            body: JSON.stringify({ textQuery, languageCode: 'ko' }),
            signal: controller.signal
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Google API ${response.status}: ${errText}`);
        }

        const data = await response.json();
        const rawResults = data.places || [];

        const filtered = rawResults
            .filter((p: any) => p.types && p.types.some((t: string) => ALLOWED_GOOGLE_TYPES.includes(t)))
            .map((p: any) => {
                const matchedType = p.types.find((t: string) => ALLOWED_GOOGLE_TYPES.includes(t)) || 'restaurant';
                let thumb = null;
                // New Places API photo reference
                if (p.photos && p.photos.length > 0) {
                    thumb = `https://places.googleapis.com/v1/${p.photos[0].name}/media?maxHeightPx=400&maxWidthPx=400&key=${apiKey}`;
                }
                return {
                    google_place_id: p.id,
                    name: p.displayName?.text || p.formattedAddress,
                    formatted_address: p.formattedAddress,
                    location: { lat: p.location?.latitude, lng: p.location?.longitude },
                    rating: p.rating,
                    user_ratings_total: p.userRatingCount,
                    thumbnail_img: thumb,
                    food_kind: matchedType,
                    // null-safe generativeSummary
                    description: p.generativeSummary?.overview?.text?.text || null,
                    photos: p.photos
                };
            });

        res.json(filtered);

    } catch (error: any) {
        if (error.name === 'AbortError') {
            console.error("Google Search Timeout");
            return res.status(504).json({ error: "Search timed out" });
        }
        console.error("Google search error:", error);
        res.status(500).json({ error: "Failed to search Google Places" });
    } finally {
        clearTimeout(timeout);
    }
});

router.post("/import-google", async (req, res) => {
    try {
        const place = req.body;
        if (!place?.google_place_id || !place?.name) {
            return res.status(400).json({ error: "Invalid data" });
        }

        // Check exists
        const existing = await db.select().from(shops).where(eq(shops.google_place_id, place.google_place_id)).limit(1);
        if (existing.length > 0) return res.json(existing[0]);

        // Region Parse (TODO: improve robust parsing)
        let address_region = null;
        if (place.formatted_address) {
            address_region = place.formatted_address.split(" ").slice(0, 3).join(" ");
        }

        const newShopId = await db.insert(shops).values({
            name: place.name,
            google_place_id: place.google_place_id,
            address_full: place.formatted_address,
            address_region: address_region,
            lat: place.location?.lat,
            lon: place.location?.lng,
            thumbnail_img: place.thumbnail_img,
            description: place.description,
            food_kind: place.food_kind,
            status: 2,
            country_code: 'KR',
            visibility: true
        }).returning({ id: shops.id });

        if (!newShopId[0]) throw new Error("Insert failed");

        const created = await db.select().from(shops).where(eq(shops.id, newShopId[0].id)).limit(1);
        res.json(created[0]);
    } catch (error: any) {
        console.error("Import Google error:", error);
        const errorDetails = JSON.stringify(error, Object.getOwnPropertyNames(error));
        res.status(500).json({ error: "Failed to import shop", details: errorDetails });
    }
});

export default router;
