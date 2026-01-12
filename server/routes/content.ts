
import { Router } from "express";
import { db } from "../db/index";
import { content, users_ranking } from "../db/schema";

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
            sort_key: parseFloat(sort_key)
        }).onConflictDoUpdate({
            target: [users_ranking.user_id, users_ranking.shop_id],
            set: { sort_key: parseFloat(sort_key), updated_at: new Date() }
        }).returning();

        res.json({ success: true, data: result[0] });
    } catch (error) {
        console.error("Ranking update error:", error);
        res.status(500).json({ error: "Failed to update ranking" });
    }
});

export default router;
