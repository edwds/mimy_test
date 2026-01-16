import { Router } from "express";
import { db } from "../db/index.js";
import { users } from "../db/schema.js";
import { eq } from "drizzle-orm";

const router = Router();
// const client = new OAuth2Client(process.env.VITE_GOOGLE_CLIENT_ID);

// Real Google Login
router.post("/google", async (req, res) => {
    try {
        const { token } = req.body;

        // Verify Google Token via UserInfo
        const userInfoResponse = await fetch(`https://www.googleapis.com/oauth2/v3/userinfo`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        if (!userInfoResponse.ok) {
            return res.status(401).json({ error: "Invalid token" });
        }

        const googleUser = await userInfoResponse.json();
        const { email, name, picture } = googleUser;

        // Check if user exists
        const existingUser = await db.select().from(users).where(eq(users.email, email)).limit(1);

        if (existingUser.length > 0) {
            return res.json({ user: existingUser[0], isNew: false });
        }

        // Return profile info for registration (Do NOT create yet)
        res.json({
            user: { email, nickname: name, profile_image: picture },
            isNew: true
        });

    } catch (error: any) {
        console.error("Login error details:", error);
        res.status(500).json({ error: "Login failed", details: error.message });
    }
});

// Finalize Registration
router.post("/register", async (req, res) => {
    try {
        const { email, account_id, nickname, bio, link, profile_image, phone, birthdate, gender, taste_cluster } = req.body;

        // Ensure email/account_id uniqueness again (DB constraints will also catch this)
        const check = await db.select().from(users).where(eq(users.email, email)).limit(1);
        if (check.length > 0) {
            return res.status(409).json({ error: "User already exists" });
        }

        const newUser = await db.insert(users).values({
            email,
            account_id,
            nickname,
            bio,
            link,
            profile_image,
            phone,
            birthdate,
            gender,
            taste_cluster,
            channel: 0, // Google
            phone_country: "82", // Default for now
            created_at: new Date(),
            updated_at: new Date()
        }).returning();

        res.json(newUser[0]);
    } catch (error: any) {
        console.error("Registration error:", error);
        if (error.code === '23505') {
            return res.status(409).json({ error: "User or ID already exists" });
        }
        res.status(500).json({ error: "Registration failed" });
    }
});

export default router;
