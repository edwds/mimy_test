import { Router } from "express";
import { db } from "../db/index.js";
import { users, clusters } from "../db/schema.js";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/check-handle", async (req, res) => {
    try {
        const { handle } = req.query;
        if (!handle || typeof handle !== 'string') {
            return res.status(400).json({ error: "Handle is required" });
        }

        const existingUser = await db.select().from(users).where(eq(users.account_id, handle)).limit(1);

        if (existingUser.length > 0) {
            return res.json({ available: false });
        }
        res.json({ available: true });
    } catch (error) {
        console.error("Check handle error:", error);
        res.status(500).json({ error: "Failed to check handle" });
    }
});

router.get("/:id", async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const user = await db.select().from(users).where(eq(users.id, id)).limit(1);

        if (user.length === 0) {
            return res.status(404).json({ error: "User not found" });
        }
        const userData = user[0];
        let clusterInfo = null;

        if (userData.taste_cluster) {
            // taste_cluster is stored as string ID (e.g. "1")
            const clusterId = parseInt(userData.taste_cluster);
            if (!isNaN(clusterId)) {
                const cluster = await db.select().from(clusters).where(eq(clusters.cluster_id, clusterId)).limit(1);
                if (cluster.length > 0) {
                    clusterInfo = {
                        cluster_name: cluster[0].name,
                        cluster_tagline: cluster[0].tagline
                    };
                }
            }
        }

        res.json({
            ...userData,
            ...clusterInfo
        });
    } catch (error) {
        console.error("Fetch user error:", error);
        res.status(500).json({ error: "Failed to fetch user" });
    }
});

router.put("/:id", async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { account_id, nickname, bio, link, profile_image, phone, birthdate, gender, taste_cluster } = req.body;

        const updatedUser = await db.update(users)
            .set({
                account_id,
                nickname,
                bio,
                link,
                profile_image,
                phone,
                birthdate,
                gender,
                taste_cluster,
                updated_at: new Date()
            })
            .where(eq(users.id, id))
            .returning();

        res.json(updatedUser[0]);
    } catch (error: any) {
        console.error("Update error:", error);
        if (error.code === '23505') {
            return res.status(409).json({ error: "Phone number or Account ID already in use" });
        }
        res.status(500).json({ error: "Failed to update user" });
    }
});

export default router;
