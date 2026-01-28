import { Router } from "express";
import { db } from "../db/index.js";
import { vs_prop, vs_result } from "../db/schema.js";
import { eq, and, notExists, desc, sql } from "drizzle-orm";
import { requireAuth, optionalAuth } from "../middleware/auth.js";

const router = Router();

// GET /api/vs/candidates
// Fetch props that the user has NOT voted on yet
router.get("/candidates", optionalAuth, async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            // If no user, just return random 3 (or handle as guest)
            // For now, require login or return empty
            return res.json([]);
        }

        // Select props where NO result exists for this user
        // Using "notExists" or "left join ... where null"

        // Strategy: standard "not exists" subquery or simple left join check
        // Drizzle "notExists" pattern:
        /*
           select * from vs_prop p
           where not exists (
             select 1 from vs_result r 
             where r.prop_id = p.id and r.user_id = :userId
           )
           limit 3
        */

        const candidates = await db.select()
            .from(vs_prop)
            .where(
                notExists(
                    db.select()
                        .from(vs_result)
                        .where(and(
                            eq(vs_result.prop_id, vs_prop.id),
                            eq(vs_result.user_id, userId)
                        ))
                )
            )
            // Randomize or just order by ID? Random is better for variety
            .orderBy(sql`RANDOM()`)
            .limit(3);

        res.json(candidates);

    } catch (error) {
        console.error("Fetch VS candidates error:", error);
        res.status(500).json({ error: "Failed to fetch candidates" });
    }
});

// POST /api/vs/:id/vote
router.post("/:id/vote", requireAuth, async (req, res) => {
    try {
        const propId = parseInt(req.params.id);
        const { selection } = req.body; // selection: 'A' or 'B'
        const user_id = req.user!.id;

        if (!selection || isNaN(propId)) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        if (selection !== 'A' && selection !== 'B') {
            return res.status(400).json({ error: "Invalid selection" });
        }

        await db.insert(vs_result).values({
            user_id,
            prop_id: propId,
            selected_value: selection
        }).onConflictDoUpdate({
            target: [vs_result.user_id, vs_result.prop_id],
            set: { selected_value: selection }
        });

        res.json({ success: true });

    } catch (error) {
        console.error("Vote error:", error);
        res.status(500).json({ error: "Failed to record vote" });
    }
});

// GET /api/vs/history
// Fetch props that the user HAS voted on
router.get("/history", optionalAuth, async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.json([]);
        }

        const history = await db.select({
            id: vs_prop.id,
            item_a: vs_prop.item_a,
            item_b: vs_prop.item_b,
            selected_value: vs_result.selected_value,
            voted_at: vs_result.created_at
        })
            .from(vs_result)
            .innerJoin(vs_prop, eq(vs_result.prop_id, vs_prop.id))
            .where(eq(vs_result.user_id, userId))
            .orderBy(desc(vs_result.created_at));

        res.json(history);

    } catch (error) {
        console.error("Fetch VS history error:", error);
        res.status(500).json({ error: "Failed to fetch history" });
    }
});

export default router;
