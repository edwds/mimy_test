import { Router } from "express";
import { db } from "../db";
import { users } from "../db/schema";
import { eq } from "drizzle-orm";

const router = Router();
// const client = new OAuth2Client(process.env.VITE_GOOGLE_CLIENT_ID);

// Real Google Login
router.post("/google", async (req, res) => {
    try {
        const { token } = req.body;

        // Verify Google Token (Access Token)
        // Note: verifyIdToken is for ID Tokens. If we are sending Access Token from useGoogleLogin (implicit flow),
        // we should use tokeninfo endpoint or google-auth-library's getTokenInfo.
        // However, useGoogleLogin by default (implicit) returns access_token.
        // A better way for backend verification is "auth-code" flow or just using the access token to fetch user info.

        // Let's assume we fetch user info using the access token.
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

        // Create new user
        const timestamp = Date.now();
        const nickname = name ? name.substring(0, 20) : `User${timestamp.toString().slice(-4)}`;

        const newUser = await db.insert(users).values({
            email,
            nickname,
            profile_image: picture,
            phone: `temp_${timestamp}`, // Temporary
            account_id: `user_${timestamp}`,
            phone_country: "82",
            channel: 0, // Google
        }).returning();

        res.json({ user: newUser[0], isNew: true });
    } catch (error: any) {
        console.error("Login error details:", error);
        res.status(500).json({ error: "Login failed", details: error.message });
    }
});

export default router;
