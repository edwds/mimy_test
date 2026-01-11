import { Router } from "express";
import { db } from "../db";
import { users } from "../db/schema";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/:id", async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const user = await db.select().from(users).where(eq(users.id, id)).limit(1);

        if (user.length === 0) {
            return res.status(404).json({ error: "User not found" });
        }
        res.json(user[0]);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch user" });
    }
});

router.put("/:id", async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { account_id, nickname, bio, link, profile_image, phone, birthdate, gender } = req.body;

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
                updated_at: new Date()
            })
            .where(eq(users.id, id))
            .returning();

        res.json(updatedUser[0]);
    } catch (error) {
        console.error("Update error:", error);
        res.status(500).json({ error: "Failed to update user" });
    }
});

export default router;
