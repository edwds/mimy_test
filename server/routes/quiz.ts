
import { Router } from "express";
import { QuizManager } from "../utils/quiz.js";
import { db } from "../db/index.js";
import { users } from "../db/schema.js";
import { eq } from "drizzle-orm";

const router = Router();

// POST /api/quiz/submit
router.post("/submit", async (req, res) => {
    try {
        console.log('[Quiz] Submit request received');
        const { userId, answers } = req.body;
        console.log('[Quiz] userId:', userId, 'answersCount:', Object.keys(answers || {}).length);

        if (!answers) {
            console.log('[Quiz] ❌ No answers provided');
            res.status(400).json({ error: "Answers are required" });
            return;
        }

        const quizManager = QuizManager.getInstance();
        const result = await quizManager.calculate(answers);
        console.log('[Quiz] ✅ Quiz calculated, clusterId:', result.clusterId);

        // Update User if userId provided
        if (userId) {
            try {
                console.log('[Quiz] Updating user profile...');
                // Determine cluster name for string storage
                // Use ID or Name? Schema says "taste_cluster" varchar(50).
                // Let's store the ID first, or the Name if preferred.
                // Given the frontend might want to query by ID later or just show name...
                // Ideally we store the ID or a code.
                // Let's store the display name or ID.
                // The prompt implies "assigning a cluster".

                // Let's store the Cluster ID as string for now to be safe with the schema "varchar(50)"
                // Or "Cluster Name".
                // Checking schema... `taste_cluster: varchar("taste_cluster", { length: 50 })`
                // Let's store the ID for robust references: "cluster_123" or just "123".

                const clusterValue = result.clusterId.toString();

                const updateResult = await db.update(users)
                    .set({
                        taste_cluster: clusterValue,
                        taste_result: result // Save full result json
                    })
                    .where(eq(users.id, userId))
                    .returning();

                console.log('[Quiz] ✅ User profile updated successfully:', updateResult[0]?.id);
            } catch (dbError) {
                console.error("[Quiz] ❌ Failed to update user profile with quiz result:", dbError);
                // Continue to return result even if saving fails?
                // Probably better to warn but let user see result.
            }
        } else {
            console.log('[Quiz] ⚠️ No userId provided, skipping DB update');
        }

        res.json({
            success: true,
            result
        });

    } catch (error) {
        console.error("Quiz submission error:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

export default router;
