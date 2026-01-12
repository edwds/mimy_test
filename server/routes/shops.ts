
import { Router } from "express";
import { db } from "../db/index";
import { shops } from "../db/schema";
import { ilike, or, eq } from "drizzle-orm";

const router = Router();

// GET /api/shops/search?q=query
router.get("/search", async (req, res) => {
    try {
        const { q } = req.query;
        if (!q || typeof q !== 'string') {
            return res.json([]);
        }

        const query = `%${q}%`;
        const results = await db.select()
            .from(shops)
            .where(
                or(
                    ilike(shops.name, query),
                    ilike(shops.address, query)
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

export default router;
