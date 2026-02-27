import { Router } from "express";
import { db } from "../db/index.js";
import { users, clusters, content, users_follow, users_ranking, groups, neighborhood_translations } from "../db/schema.js";
import { eq, sql, and } from "drizzle-orm";
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from "../utils/jwt.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
// const client = new OAuth2Client(process.env.VITE_GOOGLE_CLIENT_ID);

// Email whitelist for allowed non-@catchtable.co.kr emails
const EMAIL_WHITELIST = [
    'iamkayyyy@gmail.com',
    'ivoryboxedlee@gmail.com'
];

// Normalize Gmail addresses by removing dots from local part (Gmail ignores dots)
function normalizeEmail(email: string): string {
    const lower = email.toLowerCase();
    const [local, domain] = lower.split('@');
    if (domain === 'gmail.com') {
        return local.replace(/\./g, '') + '@gmail.com';
    }
    return lower;
}

// Helper function to check if email is allowed
function isEmailAllowed(email: string): boolean {
    const normalized = normalizeEmail(email);
    return normalized.endsWith('@catchtable.co.kr') || EMAIL_WHITELIST.some(w => normalizeEmail(w) === normalized);
}

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

        // Check if email is allowed (whitelist or @catchtable.co.kr domain)
        if (!isEmailAllowed(email)) {
            return res.status(403).json({
                error: "Email not allowed",
                message: "Your email is not authorized to access this service"
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
                sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
                path: '/',
                maxAge: 24 * 60 * 60 * 1000 // 24 hours (increased from 15 minutes)
            });

            res.cookie('refresh_token', refreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
                path: '/',
                maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
            });

            console.log('[Auth] Cookies set for user:', user.id);
            console.log('[Auth] Cookie settings - secure:', process.env.NODE_ENV === 'production', 'sameSite:', process.env.NODE_ENV === 'production' ? 'none' : 'lax');

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
        console.log('[Register] Request received');
        console.log('[Register] Body:', JSON.stringify(req.body, null, 2));
        const { email, account_id, nickname, bio, link, profile_image, phone, birthdate, gender, taste_cluster } = req.body;

        // Check if email is allowed (whitelist or @catchtable.co.kr domain)
        if (!isEmailAllowed(email)) {
            console.log('[Register] ❌ Email not allowed:', email);
            return res.status(403).json({
                error: "Email not allowed",
                message: "Your email is not authorized to access this service"
            });
        }
        console.log('[Register] ✅ Email check passed');

        // Ensure email/account_id uniqueness again (DB constraints will also catch this)
        const check = await db.select().from(users).where(eq(users.email, email)).limit(1);
        if (check.length > 0) {
            console.log('[Register] ❌ User already exists:', email);
            return res.status(409).json({ error: "User already exists" });
        }
        console.log('[Register] ✅ User uniqueness check passed');

        console.log('[Register] Creating new user...');
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
        console.log('[Register] ✅ User created successfully, ID:', user.id);

        // Generate JWT tokens
        const accessToken = generateAccessToken(user.id, user.email);
        const refreshToken = generateRefreshToken(user.id);
        console.log('[Register] ✅ JWT tokens generated');

        // Set HttpOnly cookies
        console.log('[Register] Setting cookies...');
        res.cookie('access_token', accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
            path: '/',
            maxAge: 24 * 60 * 60 * 1000 // 24 hours (matching login)
        });

        res.cookie('refresh_token', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
            path: '/',
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });

        console.log('[Register] ✅ Cookies set for new user:', user.id);
        console.log('[Register] Cookie settings - secure:', process.env.NODE_ENV === 'production', 'sameSite:', process.env.NODE_ENV === 'production' ? 'none' : 'lax');

        // Also return tokens in response body for mobile apps
        const responseData = {
            ...user,
            tokens: {
                accessToken,
                refreshToken
            }
        };
        console.log('[Register] ✅ Sending response with user data and tokens');
        res.json(responseData);
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

        // Add cluster info if available
        let clusterInfo = null;
        if (user.taste_cluster) {
            const clusterId = parseInt(user.taste_cluster);
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

        // Add group name if user has a group
        let groupName = null;
        if (user.group_id) {
            const [group] = await db.select().from(groups).where(eq(groups.id, user.group_id)).limit(1);
            if (group) {
                groupName = group.name;
            }
        }

        // Add neighborhood info if user has one
        let neighborhoodInfo = null;
        if (user.neighborhood_id) {
            const [translation] = await db.select()
                .from(neighborhood_translations)
                .where(eq(neighborhood_translations.id, user.neighborhood_id))
                .limit(1);
            if (translation) {
                neighborhoodInfo = {
                    id: translation.id,
                    localName: translation.local_name,
                    englishName: translation.english_name,
                    countryCode: translation.country_code,
                    // For backward compatibility with leaderboard key format
                    value: `${translation.country_code}:${translation.local_name}`,
                };
            }
        }

        // Get stats (including ranking count)
        const stats = await db.transaction(async (tx) => {
            await tx.execute(sql`SET LOCAL max_parallel_workers_per_gather = 0`);

            const contentCountRes = await tx.select({ count: sql<number>`count(*)` })
                .from(content)
                .where(and(eq(content.user_id, userId), eq(content.is_deleted, false)));

            const followerCountRes = await tx.select({ count: sql<number>`count(*)` })
                .from(users_follow)
                .where(eq(users_follow.following_id, userId));

            const rankingCountRes = await tx.select({ count: sql<number>`count(*)` })
                .from(users_ranking)
                .where(eq(users_ranking.user_id, userId));

            return {
                content_count: Number(contentCountRes[0]?.count || 0),
                follower_count: Number(followerCountRes[0]?.count || 0),
                ranking_count: Number(rankingCountRes[0]?.count || 0)
            };
        });

        res.json({
            ...user,
            ...clusterInfo,
            group_name: groupName,
            neighborhood: neighborhoodInfo,
            stats
        });
    } catch (error: any) {
        console.error("Get current user error:", error);
        res.status(500).json({ error: "Failed to get user" });
    }
});

// Refresh access token using refresh token
router.post("/refresh", async (req, res) => {
    try {
        console.log('[Auth] Token refresh requested');

        // Try to get refresh token from cookie (web) or Authorization header (native)
        let refreshToken = req.cookies?.refresh_token;
        let isNativeRequest = false;

        // If no cookie, check Authorization header (for native apps)
        if (!refreshToken) {
            const authHeader = req.headers.authorization;
            if (authHeader && authHeader.startsWith('Bearer ')) {
                refreshToken = authHeader.substring(7);
                isNativeRequest = true;
                console.log('[Auth] Using refresh token from Authorization header (native)');
            }
        } else {
            console.log('[Auth] Using refresh token from cookie (web)');
        }

        if (!refreshToken) {
            console.log('[Auth] ❌ No refresh token found');
            return res.status(401).json({ error: "Refresh token required" });
        }

        const payload = verifyRefreshToken(refreshToken);
        if (!payload) {
            console.log('[Auth] ❌ Invalid refresh token');
            return res.status(401).json({ error: "Invalid refresh token" });
        }

        console.log('[Auth] ✅ Refresh token verified, userId:', payload.userId);

        // Get user email for new access token
        const [user] = await db.select().from(users).where(eq(users.id, payload.userId)).limit(1);

        if (!user) {
            console.log('[Auth] ❌ User not found:', payload.userId);
            return res.status(404).json({ error: "User not found" });
        }

        // Generate new access token AND refresh token
        const accessToken = generateAccessToken(user.id, user.email);
        const newRefreshToken = generateRefreshToken(user.id);

        console.log('[Auth] ✅ New tokens generated');

        // Set cookies (for web and as backup for native)
        res.cookie('access_token', accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
            path: '/',
            maxAge: 24 * 60 * 60 * 1000 // 24 hours
        });

        res.cookie('refresh_token', newRefreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
            path: '/',
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });

        console.log('[Auth] ✅ Cookies set');

        // For native apps, also return tokens in response body
        res.json({
            success: true,
            message: "Token refreshed",
            tokens: {
                accessToken,
                refreshToken: newRefreshToken
            }
        });

        console.log('[Auth] ✅ Token refresh completed');
    } catch (error: any) {
        console.error("[Auth] ❌ Token refresh error:", error);
        res.status(500).json({ error: "Failed to refresh token" });
    }
});

// Logout (clear cookies)
router.post("/logout", async (req, res) => {
    try {
        res.clearCookie('access_token', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
            path: '/'
        });
        res.clearCookie('refresh_token', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
            path: '/'
        });

        res.json({ success: true, message: "Logged out successfully" });
    } catch (error: any) {
        console.error("Logout error:", error);
        res.status(500).json({ error: "Failed to logout" });
    }
});

export default router;
