
import { Router } from "express";
import { db } from "../db/index";
import { content, users_ranking, shops } from "../db/schema";
import { eq, desc, inArray } from "drizzle-orm";

const router = Router();

// POST /api/content (Create Review/Post)
router.post("/", async (req, res) => {
    try {
        const { user_id, type, text, img, video, review_prop, keyword } = req.body;

        // Validation
        if (!user_id || !type) {
            return res.status(400).json({ error: "user_id and type are required" });
        }

        // Insert content
        const result = await db.insert(content).values({
            user_id,
            type, // 'review' or 'post'
            text,
            img,
            video,
            review_prop, // { shop_id, visit_date, companions, satisfaction }
            keyword,
        }).returning();

        res.json(result[0]);
    } catch (error) {
        console.error("Create content error:", error);
        res.status(500).json({ error: "Failed to create content" });
    }
});

// POST /api/content/ranking (Submit Ranking)
router.post("/ranking", async (req, res) => {
    try {
        const { user_id, shop_id, sort_key } = req.body;

        if (!user_id || !shop_id || sort_key === undefined) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        const result = await db.insert(users_ranking).values({
            user_id,
            shop_id,
            rank: parseInt(sort_key) // sort_key from frontend maps to rank
        }).onConflictDoUpdate({
            target: [users_ranking.user_id, users_ranking.shop_id],
            set: { rank: parseInt(sort_key), updated_at: new Date() }
        }).returning();

        res.json({ success: true, data: result[0] });
    } catch (error) {
        console.error("Ranking update error:", error);
        res.status(500).json({ error: "Failed to update ranking" });
    }
});

// GET /api/content/user/:userId
router.get("/user/:userId", async (req, res) => {
    try {
        const userId = parseInt(req.params.userId);
        if (isNaN(userId)) {
            return res.status(400).json({ error: "Invalid user ID" });
        }

        // 1. Fetch content
        const userContent = await db.select().from(content)
            .where(eq(content.user_id, userId))
            .orderBy(desc(content.created_at)) // Latest first
            .limit(20);

        if (userContent.length === 0) {
            return res.json([]);
        }

        // 2. Collect Shop IDs
        const shopIds = new Set<number>();
        userContent.forEach(item => {
            if (item.type === 'review' && item.review_prop) {
                const prop = item.review_prop as any;
                if (prop.shop_id) shopIds.add(prop.shop_id);
            }
        });

        // 3. Fetch Shops
        const shopMap = new Map();
        if (shopIds.size > 0) {
            const shopList = await db.select().from(shops)
                .where(inArray(shops.id, Array.from(shopIds)));
            shopList.forEach(shop => shopMap.set(shop.id, shop));
        }

        // 4. Transform Data
        const result = userContent.map(item => {
            let enrichedProp = item.review_prop as any;
            if (item.type === 'review' && enrichedProp?.shop_id && shopMap.has(enrichedProp.shop_id)) {
                const shop = shopMap.get(enrichedProp.shop_id);
                enrichedProp = {
                    ...enrichedProp,
                    shop_name: shop.name,
                    shop_address: shop.address_region || shop.address_full,
                    thumbnail_img: shop.thumbnail_img
                };
            }

            return {
                id: item.id,
                text: item.text,
                images: item.img || [], // Assuming jsonb stores string[]
                created_at: item.created_at,
                type: item.type,
                review_prop: enrichedProp,
                stats: {
                    likes: 0, // Mock stats for now
                    comments: 0,
                    is_liked: false,
                    is_saved: false
                }
            };
        });

        res.json(result);
    } catch (error) {
        console.error("Fetch user content error:", error);
        res.status(500).json({ error: "Failed to fetch content" });
    }
});

export default router;
