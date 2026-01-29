import { Router } from "express";
import { db } from "../db/index.js";
import { hate_prop, hate_result } from "../db/schema.js";
import { eq, and, notExists, desc, sql } from "drizzle-orm";
import { requireAuth, optionalAuth } from "../middleware/auth.js";

const router = Router();

// GET /api/hate/candidates
// Fetch props that the user has NOT voted on yet
router.get("/candidates", optionalAuth, async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            // If no user, return empty
            return res.json([]);
        }

        const candidates = await db.select()
            .from(hate_prop)
            .where(
                notExists(
                    db.select()
                        .from(hate_result)
                        .where(and(
                            eq(hate_result.prop_id, hate_prop.id),
                            eq(hate_result.user_id, userId)
                        ))
                )
            )
            .orderBy(sql`RANDOM()`)
            .limit(3);

        res.json(candidates);

    } catch (error) {
        console.error("Fetch Hate candidates error:", error);
        res.status(500).json({ error: "Failed to fetch candidates" });
    }
});

// POST /api/hate/:id/vote
router.post("/:id/vote", requireAuth, async (req, res) => {
    try {
        const propId = parseInt(req.params.id);
        const { selection } = req.body; // selection: 'EAT' or 'NOT_EAT'
        const user_id = req.user!.id;

        if (!selection || isNaN(propId)) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        if (selection !== 'EAT' && selection !== 'NOT_EAT') {
            return res.status(400).json({ error: "Invalid selection" });
        }

        await db.insert(hate_result).values({
            user_id,
            prop_id: propId,
            selection: selection
        }).onConflictDoUpdate({
            target: [hate_result.user_id, hate_result.prop_id],
            set: { selection: selection }
        });

        res.json({ success: true });

    } catch (error) {
        console.error("Vote error:", error);
        res.status(500).json({ error: "Failed to record vote" });
    }
});

// GET /api/hate/history
// Fetch props that the user HAS voted on
router.get("/history", optionalAuth, async (req, res) => {
    try {
        const queryUserId = req.query.user_id ? parseInt(req.query.user_id as string) : null;
        const userId = queryUserId || req.user?.id;

        if (!userId) {
            return res.json([]);
        }

        const history = await db.select({
            id: hate_prop.id,
            item: hate_prop.item,
            selection: hate_result.selection,
            voted_at: hate_result.created_at
        })
            .from(hate_result)
            .innerJoin(hate_prop, eq(hate_result.prop_id, hate_prop.id))
            .where(eq(hate_result.user_id, userId))
            .orderBy(desc(hate_result.created_at));

        res.json(history);

    } catch (error) {
        console.error("Fetch Hate history error:", error);
        res.status(500).json({ error: "Failed to fetch history" });
    }
});

// DELETE /api/hate/:id/vote
// Delete user's vote for a specific prop
router.delete("/:id/vote", requireAuth, async (req, res) => {
    try {
        const propId = parseInt(req.params.id);
        const user_id = req.user!.id;

        if (isNaN(propId)) {
            return res.status(400).json({ error: "Invalid prop ID" });
        }

        await db.delete(hate_result)
            .where(and(
                eq(hate_result.user_id, user_id),
                eq(hate_result.prop_id, propId)
            ));

        res.json({ success: true });

    } catch (error) {
        console.error("Delete vote error:", error);
        res.status(500).json({ error: "Failed to delete vote" });
    }
});

export default router;
