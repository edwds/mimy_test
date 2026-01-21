
import { Router } from "express";
import { db } from "../db/index.js";
import { shops, users_wantstogo, content, users, users_ranking } from "../db/schema.js";
import { ilike, or, eq, sql, and, desc, asc, not } from "drizzle-orm";
import fs from 'fs';
import path from 'path';

const router = Router();

// GET /api/shops/discovery?page=1&limit=20&seed=123
// Returns random shops consistently for the same seed
router.get("/discovery", async (req, res) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const seed = req.query.seed || 'default_seed';

        // Bounding Box Params
        const minLat = req.query.minLat ? parseFloat(req.query.minLat as string) : null;
        const maxLat = req.query.maxLat ? parseFloat(req.query.maxLat as string) : null;
        const minLon = req.query.minLon ? parseFloat(req.query.minLon as string) : null;
        const maxLon = req.query.maxLon ? parseFloat(req.query.maxLon as string) : null;

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

        if (minLat && maxLat && minLon && maxLon) {
            query = query.where(and(
                sql`${shops.lat} >= ${minLat}`,
                sql`${shops.lat} <= ${maxLat}`,
                sql`${shops.lon} >= ${minLon}`,
                sql`${shops.lon} <= ${maxLon}`
            ));
        }

        // Use MD5 hash of (id || seed) for consistent random sort
        const results = await query
            .orderBy(sql`md5(${shops.id}::text || ${seed})`)
            .limit(limit)
            .offset((page - 1) * limit);

        // If user is logged in (client sends header/param?), we should enrich `is_saved`.
        // For MVP, assuming client might fetch status or we assume generic feed first.
        // Let's check query `userId` for simple auth context if needed, or just return shops.
        // User requested: "Refresh resets".

        // Enrich with "is_saved" if userId is present in query header (custom simple auth)
        // Or handle in frontend. Let's try to handle it here if passed.
        const userId = req.headers['x-user-id'];

        if (userId) {
            const uid = parseInt(userId as string);
            const enriched = await Promise.all(results.map(async (shop) => {
                const saved = await db.select().from(users_wantstogo)
                    .where(and(
                        eq(users_wantstogo.user_id, uid),
                        eq(users_wantstogo.shop_id, shop.id),
                        eq(users_wantstogo.is_deleted, false)
                    ))
                    .limit(1);
                return {
                    ...shop,
                    is_saved: saved.length > 0,
                    saved_at: saved.length > 0 ? saved[0].created_at : null
                };
            }));
            return res.json(enriched);
        }

        res.json(results);
    } catch (error) {
        console.error("Discovery feed error:", error);
        res.status(500).json({ error: "Failed to fetch discovery feed" });
    }
});

// POST /api/shops/:id/save
// Toggle save status
router.post("/:id/save", async (req, res) => {
    try {
        const shopId = parseInt(req.params.id);
        const { userId } = req.body; // Expect userId in body for MVP auth

        if (!userId || isNaN(shopId)) {
            return res.status(400).json({ error: "Invalid parameters" });
        }

        // Check if exists
        const existing = await db.select().from(users_wantstogo)
            .where(and(
                eq(users_wantstogo.user_id, userId),
                eq(users_wantstogo.shop_id, shopId)
            ))
            .limit(1);

        let isSaved = false;

        if (existing.length > 0) {
            // Toggle deletion status or remove
            // Spec says "users_wantstogo" table has is_deleted.
            const current = existing[0];
            if (current.is_deleted) {
                // Restore
                await db.update(users_wantstogo)
                    .set({ is_deleted: false, updated_at: new Date() })
                    .where(eq(users_wantstogo.id, current.id));
                isSaved = true;
            } else {
                // Delete (Soft)
                await db.update(users_wantstogo)
                    .set({ is_deleted: true, updated_at: new Date() })
                    .where(eq(users_wantstogo.id, current.id));
                isSaved = false;
            }
        } else {
            // Insert
            await db.insert(users_wantstogo).values({
                user_id: userId,
                shop_id: shopId,
                channel: 'discovery', // Default channel
                is_deleted: false
            });
            isSaved = true;
        }

        res.json({ success: true, is_saved: isSaved });
    } catch (error) {
        console.error("Save shop error:", error);
        res.status(500).json({ error: "Failed to save shop" });
    }
});

// GET /api/shops/search?q=query
router.get("/search", async (req, res) => {
    try {
        const { q } = req.query;
        if (!q || typeof q !== 'string') {
            return res.json([]);
        }

        const query = `%${q.replace(/\s+/g, '')}%`; // Remove spaces from query

        // Search matches where DB name (spaces removed) matches query OR original name matches query
        const results = await db.select()
            .from(shops)
            .where(
                or(
                    // Name match (fuzzy: ignore spaces)
                    sql`REPLACE(${shops.name}, ' ', '') LIKE ${query}`,
                    // Address match (fuzzy: ignore spaces)
                    sql`REPLACE(${shops.address_full}, ' ', '') LIKE ${query}`
                )
            )
            .limit(20);

        res.json(results);
    } catch (error) {
        console.error("Shop search error:", error);
        res.status(500).json({ error: "Failed to search shops" });
    }
});

// GET /api/shops/:id
router.get("/:id", async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            return res.status(400).json({ error: "Invalid ID" });
        }
        const results = await db.select().from(shops).where(eq(shops.id, id)).limit(1);

        if (results.length === 0) {
            return res.status(404).json({ error: "Shop not found" });
        }
        res.json(results[0]);
    } catch (error) {
        console.error("Shop details error:", error);
        res.status(500).json({ error: "Failed to fetch shop details" });
    }
});


// Cache cluster data
let clusterMap: Map<string, string> | null = null;
try {
    const clusterPath = path.join(process.cwd(), 'server/data/cluster.json');
    if (fs.existsSync(clusterPath)) {
        const clusterData = JSON.parse(fs.readFileSync(clusterPath, 'utf-8')) as Array<{ cluster_id: string, cluster_name: string }>;
        clusterMap = new Map(clusterData.map(c => [c.cluster_id, c.cluster_name]));
    } else {
        console.warn("server/data/cluster.json not found, using empty map");
        clusterMap = new Map();
    }
} catch (e) {
    console.warn("Failed to load cluster data:", e);
    clusterMap = new Map();
}

// GET /api/shops/:id/reviews
router.get("/:id/reviews", async (req, res) => {
    try {
        const shopId = parseInt(req.params.id);
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const sort = (req.query.sort as string) || 'popular'; // 'popular' | 'similar'
        const userId = req.query.user_id ? parseInt(req.query.user_id as string) : null;
        const offset = (page - 1) * limit;

        if (isNaN(shopId)) {
            return res.status(400).json({ error: "Invalid Shop ID" });
        }

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
                cluster_name: users.taste_cluster, // Placeholder
                taste_result: users.taste_result
            },
            rank: users_ranking.rank
        })
            .from(content)
            .innerJoin(users, eq(content.user_id, users.id))
            .leftJoin(users_ranking, and(eq(users_ranking.user_id, content.user_id), eq(users_ranking.shop_id, shopId)))
            .where(and(
                eq(content.type, 'review'),
                eq(content.is_deleted, false),
                eq(content.visibility, true),
                sql`(${content.review_prop}::jsonb)->>'shop_id' = ${shopId.toString()}::text`
            )).$dynamic();

        // 2. Sorting Logic
        if (sort === 'similar' && userId) {
            // Fetch Requesting User's Scores
            const requestingUser = await db.select({ taste_result: users.taste_result })
                .from(users)
                .where(eq(users.id, userId))
                .limit(1);

            const viewerResult = requestingUser[0]?.taste_result as any;
            const vS = viewerResult?.scores;

            if (vS) {
                const axes = ['boldness', 'acidity', 'richness', 'experimental', 'spiciness', 'sweetness', 'umami'];

                const distanceSql = sql.join(
                    axes.map(axis => {
                        const viewerVal = vS[axis] || 0;
                        return sql`power(
                            coalesce((${users.taste_result}->'scores'->>${sql.raw(`'${axis}'`)})::int, 0) - ${viewerVal}, 
                            2
                        )`;
                    }),
                    sql` + `
                );

                query = query.orderBy(
                    asc(sql`(${distanceSql})`),
                    desc(content.created_at)
                );
            } else {
                query = query.orderBy(desc(content.created_at));
            }
        } else {
            query = query.orderBy(desc(content.created_at));
        }

        // 3. Execute & Pagination
        const reviews = await query.limit(limit).offset(offset);

        // Fetch Shop Info for POI enrichment
        const shopInfo = await db.select().from(shops).where(eq(shops.id, shopId)).limit(1);
        const currentShop = shopInfo[0] || { name: 'Unknown', address_full: '', thumbnail_img: '' };

        const result = reviews.map(r => ({
            id: r.id,
            user: {
                ...r.user,
                cluster_name: r.user.taste_cluster ? (clusterMap?.get(r.user.taste_cluster) || r.user.taste_cluster) : undefined
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
        console.error(`[ShopReviewsError] shopId: ${req.params.id}, userId: ${req.query.user_id}, Error:`, error);
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

// GET /api/shops/search/google?q=query&region=optional
router.get("/search/google", async (req, res) => {
    try {
        const { q, region } = req.query;
        if (!q || typeof q !== 'string') {
            return res.json([]);
        }

        const apiKey = process.env.GOOGLE_MAPS_API_KEY;
        if (!apiKey) {
            console.error("GOOGLE_MAPS_API_KEY is missing");
            return res.status(500).json({ error: "Service configuration error" });
        }

        // Construct Query: "Query [Region]"
        const textQuery = region ? `${q} ${region}` : q;
        console.log(`[GoogleSearch] Query: "${textQuery}"`);

        const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Goog-Api-Key': apiKey,
                'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.photos,places.rating,places.userRatingCount,places.generativeSummary,places.types'
            },
            body: JSON.stringify({
                textQuery: textQuery,
                languageCode: 'ko'
            })
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Google API error: ${response.status} ${errText}`);
        }

        const data = await response.json();

        // Filter by types
        const rawResults = data.places || [];
        const filteredResults = rawResults.filter((place: any) => {
            if (!place.types) return false;
            return place.types.some((t: string) => ALLOWED_GOOGLE_TYPES.includes(t));
        });

        const results = filteredResults.map((place: any) => {
            // Find specific type for food_kind
            const matchedType = place.types.find((t: string) => ALLOWED_GOOGLE_TYPES.includes(t)) || 'restaurant';

            // Construct thumbnail URL
            let thumb = null;
            if (place.photos && place.photos.length > 0) {
                // New API uses photo names like "places/PLACE_ID/photos/PHOTO_ID"
                // Need to fetch using "https://places.googleapis.com/v1/{name}/media?key=KEY&maxHeightPx=400&maxWidthPx=400"
                // But wait, the previous implementation used the old Places API photo reference.
                // New API returns `name` resource string for photos.
                thumb = `https://places.googleapis.com/v1/${place.photos[0].name}/media?maxHeightPx=400&maxWidthPx=400&key=${apiKey}`;
            }

            return {
                google_place_id: place.id, // New API uses 'id', not 'place_id' (but they allow both references usually? Actually 'id' is standard now)
                name: place.displayName?.text || place.formattedAddress,
                formatted_address: place.formattedAddress,
                location: { lat: place.location?.latitude, lng: place.location?.longitude },
                rating: place.rating,
                user_ratings_total: place.userRatingCount,
                thumbnail_img: thumb,
                food_kind: matchedType,
                description: place.generativeSummary?.overview?.text?.text, // New API structure
                photos: place.photos // Pass through for import logic
            };
        });

        res.json(results);
    } catch (error) {
        console.error("Google search error:", error);
        res.status(500).json({ error: "Failed to search Google Places" });
    }
});

// POST /api/shops/import-google
router.post("/import-google", async (req, res) => {
    try {
        console.log("[ImportGoogle] Received request body:", JSON.stringify(req.body, null, 2));

        const place = req.body;
        if (!place || !place.google_place_id || !place.name) {
            console.error("[ImportGoogle] Invalid payload");
            return res.status(400).json({ error: "Invalid place data" });
        }

        // Check if exists
        console.log("[ImportGoogle] Checking existing shop for id:", place.google_place_id);
        const existing = await db.select().from(shops).where(eq(shops.google_place_id, place.google_place_id)).limit(1);
        if (existing.length > 0) {
            console.log("[ImportGoogle] Found existing shop:", existing[0].id);
            return res.json(existing[0]);
        }

        // Data Preparation
        let thumbnail_img = place.thumbnail_img; // Already constructed in search

        // Parse address region
        let address_region = null;
        if (place.formatted_address) {
            const parts = place.formatted_address.split(" ");
            address_region = parts.slice(0, 3).join(" ");
        }

        // Values from search result
        const description = place.description || null;
        const food_kind = place.food_kind || null;

        console.log("[ImportGoogle] Inserting new shop...");
        const newShopId = await db.insert(shops).values({
            name: place.name,
            google_place_id: place.google_place_id,
            address_full: place.formatted_address,
            address_region: address_region,
            // New Places API returns location as { latitude, longitude } mapped to { lat, lng } in search
            lat: place.location?.lat,
            lon: place.location?.lng,
            thumbnail_img: thumbnail_img,
            description: description, // Insert description from generativeSummary
            food_kind: food_kind, // Insert mapped food_kind
            status: 2, // Open
            country_code: 'KR',
            visibility: true
        }).returning({ id: shops.id });

        console.log("[ImportGoogle] Insert response:", JSON.stringify(newShopId));

        if (!newShopId || newShopId.length === 0) {
            throw new Error("Failed to insert shop (no ID returned)");
        }

        const created = await db.select().from(shops).where(eq(shops.id, newShopId[0].id)).limit(1);
        console.log("[ImportGoogle] Fetched created shop:", created[0]);
        res.json(created[0]);

    } catch (error) {
        console.error("Import Google Shop error details:", error);
        res.status(500).json({ error: "Failed to import shop" });
    }
});

export default router;
