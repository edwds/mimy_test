
import { Router } from "express";
import { QuizManager } from "../utils/quiz";
import { db } from "../db/index";
import { users } from "../db/schema";
import { eq } from "drizzle-orm";

const router = Router();

// POST /api/quiz/submit
router.post("/submit", async (req, res) => {
    try {
        const { userId, answers } = req.body;

        if (!answers) {
            res.status(400).json({ error: "Answers are required" });
            return;
        }

        const quizManager = QuizManager.getInstance();
        const result = quizManager.calculate(answers);

        // Update User if userId provided
        if (userId) {
            try {
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

                await db.update(users)
                    .set({ taste_cluster: clusterValue })
                    .where(eq(users.id, userId));

            } catch (dbError) {
                console.error("Failed to update user profile with quiz result:", dbError);
                // Continue to return result even if saving fails? 
                // Probably better to warn but let user see result.
            }
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
