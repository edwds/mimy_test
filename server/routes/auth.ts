import { Router } from "express";
import { db } from "../db/index.js";
import { users } from "../db/schema.js";
import { eq } from "drizzle-orm";
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from "../utils/jwt.js";
import { requireAuth } from "../middleware/auth.js";

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

        // Restrict to @catchtable.co.kr email domain
        if (!email.endsWith('@catchtable.co.kr')) {
            return res.status(403).json({
                error: "Email domain not allowed",
                message: "Only @catchtable.co.kr email addresses are allowed"
            });
        }

        // Check if user exists
        const existingUser = await db.select().from(users).where(eq(users.email, email)).limit(1);

        if (existingUser.length > 0) {
            const user = existingUser[0];

            // Generate JWT tokens
            const accessToken = generateAccessToken(user.id, user.email);
            const refreshToken = generateRefreshToken(user.id);

            // Set HttpOnly cookies
            res.cookie('access_token', accessToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: 15 * 60 * 1000 // 15 minutes
            });

            res.cookie('refresh_token', refreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
            });

            // Also return tokens in response body for mobile apps
            return res.json({
                user,
                isNew: false,
                tokens: {
                    accessToken,
                    refreshToken
                }
            });
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

        // Restrict to @catchtable.co.kr email domain
        if (!email.endsWith('@catchtable.co.kr')) {
            return res.status(403).json({
                error: "Email domain not allowed",
                message: "Only @catchtable.co.kr email addresses are allowed"
            });
        }

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

        const user = newUser[0];

        // Generate JWT tokens
        const accessToken = generateAccessToken(user.id, user.email);
        const refreshToken = generateRefreshToken(user.id);

        // Set HttpOnly cookies
        res.cookie('access_token', accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 15 * 60 * 1000 // 15 minutes
        });

        res.cookie('refresh_token', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });

        // Also return tokens in response body for mobile apps
        res.json({
            ...user,
            tokens: {
                accessToken,
                refreshToken
            }
        });
    } catch (error: any) {
        console.error("Registration error:", error);
        if (error.code === '23505') {
            return res.status(409).json({ error: "User or ID already exists" });
        }
        res.status(500).json({ error: "Registration failed" });
    }
});

// Get current user from JWT
router.get("/me", requireAuth, async (req, res) => {
    try {
        const userId = req.user!.id;

        const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);

        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        res.json(user);
    } catch (error: any) {
        console.error("Get current user error:", error);
        res.status(500).json({ error: "Failed to get user" });
    }
});

// Refresh access token using refresh token
router.post("/refresh", async (req, res) => {
    try {
        const refreshToken = req.cookies?.refresh_token;

        if (!refreshToken) {
            return res.status(401).json({ error: "Refresh token required" });
        }

        const payload = verifyRefreshToken(refreshToken);
        if (!payload) {
            return res.status(401).json({ error: "Invalid refresh token" });
        }

        // Get user email for new access token
        const [user] = await db.select().from(users).where(eq(users.id, payload.userId)).limit(1);

        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        // Generate new access token
        const accessToken = generateAccessToken(user.id, user.email);

        // Set new access token cookie
        res.cookie('access_token', accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 15 * 60 * 1000 // 15 minutes
        });

        res.json({ success: true, message: "Token refreshed" });
    } catch (error: any) {
        console.error("Token refresh error:", error);
        res.status(500).json({ error: "Failed to refresh token" });
    }
});

// Logout (clear cookies)
router.post("/logout", async (req, res) => {
    try {
        res.clearCookie('access_token');
        res.clearCookie('refresh_token');

        res.json({ success: true, message: "Logged out successfully" });
    } catch (error: any) {
        console.error("Logout error:", error);
        res.status(500).json({ error: "Failed to logout" });
    }
});

export default router;
