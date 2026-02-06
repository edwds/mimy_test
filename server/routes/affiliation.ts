/**
 * Affiliation Routes - Group (Company/School) and Neighborhood registration
 */
import { Router } from "express";
import { db } from "../db/index.js";
import { users, groups, email_verifications, neighborhood_translations } from "../db/schema.js";
import { eq, and, like, ne, sql, isNull, or } from "drizzle-orm";
import { requireAuth } from "../middleware/auth.js";
import { EmailService } from "../services/EmailService.js";
import { GeocodingService } from "../services/GeocodingService.js";
import { LeaderboardService } from "../services/LeaderboardService.js";
import { invalidatePattern } from "../redis.js";

const router = Router();

// Constants
const VERIFICATION_EXPIRY_MINUTES = 5;
const MAX_VERIFICATION_ATTEMPTS = 5;
const COOLDOWN_DAYS = 30;
const MAX_EMAIL_SENDS_PER_HOUR = 3;

/**
 * Helper: Check if user is within cooldown period
 */
function isWithinCooldown(joinedAt: Date | null): boolean {
    if (!joinedAt) return false;
    const cooldownEnd = new Date(joinedAt);
    cooldownEnd.setDate(cooldownEnd.getDate() + COOLDOWN_DAYS);
    return new Date() < cooldownEnd;
}

/**
 * Helper: Get domain from email
 */
function extractDomain(email: string): string {
    const parts = email.split('@');
    return parts.length === 2 ? parts[1].toLowerCase() : '';
}

// ============================================================
// GROUP (Company/School) ENDPOINTS
// ============================================================

/**
 * GET /api/affiliation/groups
 * List all available groups
 */
router.get("/groups", async (req, res) => {
    try {
        const allGroups = await db.select({
            id: groups.id,
            name: groups.name,
            type: groups.type,
            logo_url: groups.logo_url,
        }).from(groups).where(eq(groups.is_active, true));

        res.json(allGroups);
    } catch (error) {
        console.error("[Affiliation] Error fetching groups:", error);
        res.status(500).json({ error: "Failed to fetch groups" });
    }
});

/**
 * POST /api/affiliation/email/send-code
 * Send verification code to company/school email
 */
router.post("/email/send-code", requireAuth, async (req, res) => {
    try {
        const userId = req.user!.id;
        const { email } = req.body;

        if (!email || typeof email !== 'string') {
            return res.status(400).json({ error: "EMAIL_REQUIRED", message: "이메일을 입력해주세요." });
        }

        const normalizedEmail = email.toLowerCase().trim();
        const domain = extractDomain(normalizedEmail);

        if (!domain) {
            return res.status(400).json({ error: "INVALID_EMAIL", message: "올바른 이메일 형식이 아닙니다." });
        }

        // 1. Check if domain belongs to any group
        const matchingGroups = await db.select().from(groups)
            .where(and(
                eq(groups.is_active, true),
                sql`${normalizedEmail} LIKE '%@' || ANY(${groups.allowed_domains})`
            ));

        // Alternative: Manual check since array contains is tricky
        const allActiveGroups = await db.select().from(groups).where(eq(groups.is_active, true));
        const matchedGroup = allActiveGroups.find(g =>
            g.allowed_domains?.some((d: string) => domain === d.toLowerCase())
        );

        if (!matchedGroup) {
            return res.status(400).json({
                error: "DOMAIN_NOT_FOUND",
                message: "지원하지 않는 이메일 도메인입니다."
            });
        }

        // 2. Get current user
        const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
        if (!user) {
            return res.status(404).json({ error: "USER_NOT_FOUND" });
        }

        // 3. Check cooldown (if already in a group)
        if (user.group_id && isWithinCooldown(user.group_joined_at)) {
            const daysLeft = Math.ceil(
                (new Date(user.group_joined_at!).getTime() + COOLDOWN_DAYS * 24 * 60 * 60 * 1000 - Date.now()) /
                (24 * 60 * 60 * 1000)
            );
            return res.status(400).json({
                error: "COOLDOWN_ACTIVE",
                message: `소속 변경은 ${daysLeft}일 후에 가능합니다.`
            });
        }

        // 4. Check if email is already used by another verified user
        const existingUserWithEmail = await db.select().from(users)
            .where(and(
                eq(users.group_email, normalizedEmail),
                ne(users.id, userId)
            ))
            .limit(1);

        if (existingUserWithEmail.length > 0) {
            return res.status(400).json({
                error: "EMAIL_ALREADY_USED",
                message: "이미 다른 사용자가 사용 중인 이메일입니다."
            });
        }

        // 5. Rate limit: max 3 emails per hour
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        const recentVerifications = await db.select().from(email_verifications)
            .where(and(
                eq(email_verifications.user_id, userId),
                sql`${email_verifications.created_at} > ${oneHourAgo}`
            ));

        if (recentVerifications.length >= MAX_EMAIL_SENDS_PER_HOUR) {
            return res.status(429).json({
                error: "RATE_LIMITED",
                message: "너무 많은 요청입니다. 잠시 후 다시 시도해주세요."
            });
        }

        // 6. Generate code and save verification record
        const code = EmailService.generateCode();
        const expiresAt = new Date(Date.now() + VERIFICATION_EXPIRY_MINUTES * 60 * 1000);

        // Delete any existing pending verifications for this user
        await db.delete(email_verifications)
            .where(and(
                eq(email_verifications.user_id, userId),
                eq(email_verifications.is_verified, false)
            ));

        // Insert new verification
        await db.insert(email_verifications).values({
            email: normalizedEmail,
            user_id: userId,
            code,
            expires_at: expiresAt,
            attempts: 0,
            is_verified: false,
        });

        // 7. Send email
        const sent = await EmailService.sendVerificationCode(normalizedEmail, code);

        if (!sent && process.env.RESEND_API_KEY) {
            return res.status(500).json({
                error: "EMAIL_SEND_FAILED",
                message: "이메일 발송에 실패했습니다. 잠시 후 다시 시도해주세요."
            });
        }

        res.json({
            success: true,
            message: "인증 코드가 발송되었습니다.",
            expires_in: VERIFICATION_EXPIRY_MINUTES * 60,
            group_name: matchedGroup.name,
        });

    } catch (error) {
        console.error("[Affiliation] Send code error:", error);
        res.status(500).json({ error: "SERVER_ERROR", message: "서버 오류가 발생했습니다." });
    }
});

/**
 * POST /api/affiliation/email/verify
 * Verify email code and join group
 */
router.post("/email/verify", requireAuth, async (req, res) => {
    try {
        const userId = req.user!.id;
        const { code } = req.body;

        if (!code || typeof code !== 'string') {
            return res.status(400).json({ error: "CODE_REQUIRED", message: "인증 코드를 입력해주세요." });
        }

        // 1. Find pending verification
        const [verification] = await db.select().from(email_verifications)
            .where(and(
                eq(email_verifications.user_id, userId),
                eq(email_verifications.is_verified, false)
            ))
            .orderBy(sql`${email_verifications.created_at} DESC`)
            .limit(1);

        if (!verification) {
            return res.status(400).json({
                error: "NO_PENDING_VERIFICATION",
                message: "진행 중인 인증 요청이 없습니다. 다시 인증 코드를 요청해주세요."
            });
        }

        // 2. Check expiry
        if (new Date() > verification.expires_at) {
            return res.status(400).json({
                error: "EXPIRED",
                message: "인증 코드가 만료되었습니다. 다시 요청해주세요."
            });
        }

        // 3. Check attempts
        if ((verification.attempts || 0) >= MAX_VERIFICATION_ATTEMPTS) {
            return res.status(400).json({
                error: "MAX_ATTEMPTS",
                message: "인증 시도 횟수를 초과했습니다. 다시 코드를 요청해주세요."
            });
        }

        // 4. Increment attempts
        await db.update(email_verifications)
            .set({ attempts: (verification.attempts || 0) + 1 })
            .where(eq(email_verifications.id, verification.id));

        // 5. Verify code
        if (verification.code !== code.trim()) {
            return res.status(400).json({
                error: "INVALID_CODE",
                message: "잘못된 인증 코드입니다."
            });
        }

        // 6. Find matching group
        const domain = extractDomain(verification.email);
        const allActiveGroups = await db.select().from(groups).where(eq(groups.is_active, true));
        const matchedGroup = allActiveGroups.find(g =>
            g.allowed_domains?.some((d: string) => domain === d.toLowerCase())
        );

        if (!matchedGroup) {
            return res.status(400).json({
                error: "GROUP_NOT_FOUND",
                message: "해당 이메일 도메인의 그룹을 찾을 수 없습니다."
            });
        }

        // 7. Update user with group info
        await db.update(users)
            .set({
                group_id: matchedGroup.id,
                group_email: verification.email,
                group_joined_at: new Date(),
                updated_at: new Date(),
            })
            .where(eq(users.id, userId));

        // 8. Mark verification as complete
        await db.update(email_verifications)
            .set({
                is_verified: true,
                verified_at: new Date(),
            })
            .where(eq(email_verifications.id, verification.id));

        // 9. Invalidate leaderboard cache
        await invalidatePattern('leaderboard:*');

        // 10. Add user to company leaderboard
        await LeaderboardService.addUserToLeaderboard(userId, 'COMPANY', matchedGroup.name);

        res.json({
            success: true,
            group: {
                id: matchedGroup.id,
                name: matchedGroup.name,
                type: matchedGroup.type,
            }
        });

    } catch (error) {
        console.error("[Affiliation] Verify error:", error);
        res.status(500).json({ error: "SERVER_ERROR", message: "서버 오류가 발생했습니다." });
    }
});

/**
 * DELETE /api/affiliation/group
 * Leave current group
 */
router.delete("/group", requireAuth, async (req, res) => {
    try {
        const userId = req.user!.id;

        const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
        if (!user) {
            return res.status(404).json({ error: "USER_NOT_FOUND" });
        }

        if (!user.group_id) {
            return res.status(400).json({ error: "NO_GROUP", message: "현재 소속된 그룹이 없습니다." });
        }

        // Note: We don't check cooldown for leaving, only for joining/changing
        await db.update(users)
            .set({
                group_id: null,
                group_email: null,
                group_joined_at: null,
                updated_at: new Date(),
            })
            .where(eq(users.id, userId));

        // Invalidate leaderboard cache
        await invalidatePattern('leaderboard:*');

        res.json({ success: true, message: "소속이 해제되었습니다." });

    } catch (error) {
        console.error("[Affiliation] Leave group error:", error);
        res.status(500).json({ error: "SERVER_ERROR", message: "서버 오류가 발생했습니다." });
    }
});

// ============================================================
// NEIGHBORHOOD ENDPOINTS
// ============================================================

/**
 * POST /api/affiliation/neighborhood
 * Register neighborhood based on GPS coordinates
 *
 * Request body:
 * - neighborhood: "KR:경기도 성남시" (local name with country code)
 * - englishName: "Seongnam-si, Gyeonggi-do" (optional, from MapTiler language=en)
 * OR
 * - lat, lon: coordinates for server-side geocoding
 */
router.post("/neighborhood", requireAuth, async (req, res) => {
    try {
        const userId = req.user!.id;
        const { lat, lon, neighborhood: clientNeighborhood, englishName: clientEnglishName } = req.body;

        // Parse neighborhood info
        let countryCode = '';
        let localName = '';
        let englishName = clientEnglishName || null;

        if (clientNeighborhood && typeof clientNeighborhood === 'string') {
            // Client already did the geocoding - parse "KR:경기도 성남시"
            const parsed = GeocodingService.parseNeighborhood(clientNeighborhood);
            countryCode = parsed.countryCode || '';
            localName = parsed.displayName || '';
        } else if (typeof lat === 'number' && typeof lon === 'number') {
            // Server-side geocoding
            const geoResult = await GeocodingService.reverseGeocode(lat, lon);
            if (geoResult) {
                const parsed = GeocodingService.parseNeighborhood(geoResult.neighborhood);
                countryCode = parsed.countryCode || '';
                localName = parsed.displayName || '';
            }
        }

        if (!localName) {
            return res.status(400).json({
                error: "GEOCODING_FAILED",
                message: "위치를 확인할 수 없습니다. 다시 시도해주세요."
            });
        }

        // Get current user
        const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
        if (!user) {
            return res.status(404).json({ error: "USER_NOT_FOUND" });
        }

        // Check cooldown
        if (user.neighborhood_id && isWithinCooldown(user.neighborhood_joined_at)) {
            const daysLeft = Math.ceil(
                (new Date(user.neighborhood_joined_at!).getTime() + COOLDOWN_DAYS * 24 * 60 * 60 * 1000 - Date.now()) /
                (24 * 60 * 60 * 1000)
            );
            return res.status(400).json({
                error: "COOLDOWN_ACTIVE",
                message: `동네 변경은 ${daysLeft}일 후에 가능합니다.`
            });
        }

        // Find or create neighborhood translation entry
        let [existingTranslation] = await db.select()
            .from(neighborhood_translations)
            .where(and(
                eq(neighborhood_translations.country_code, countryCode),
                eq(neighborhood_translations.local_name, localName)
            ))
            .limit(1);

        let neighborhoodId: number;

        if (existingTranslation) {
            // Use existing translation
            neighborhoodId = existingTranslation.id;
            // Update english_name if provided and was missing
            if (englishName && !existingTranslation.english_name) {
                await db.update(neighborhood_translations)
                    .set({ english_name: englishName })
                    .where(eq(neighborhood_translations.id, existingTranslation.id));
            }
        } else {
            // Create new translation entry
            const [newTranslation] = await db.insert(neighborhood_translations)
                .values({
                    country_code: countryCode,
                    local_name: localName,
                    english_name: englishName,
                })
                .returning({ id: neighborhood_translations.id });
            neighborhoodId = newTranslation.id;
        }

        // Update user neighborhood_id
        await db.update(users)
            .set({
                neighborhood_id: neighborhoodId,
                neighborhood_joined_at: new Date(),
                updated_at: new Date(),
            })
            .where(eq(users.id, userId));

        // Invalidate leaderboard cache
        await invalidatePattern('leaderboard:*');

        // Add user to neighborhood leaderboard (use full key for grouping)
        const neighborhoodKey = `${countryCode}:${localName}`;
        await LeaderboardService.addUserToLeaderboard(userId, 'NEIGHBORHOOD', neighborhoodKey);

        res.json({
            success: true,
            neighborhoodId,
            localName,
            englishName: englishName || existingTranslation?.english_name || null,
            countryCode,
        });

    } catch (error) {
        console.error("[Affiliation] Set neighborhood error:", error);
        res.status(500).json({ error: "SERVER_ERROR", message: "서버 오류가 발생했습니다." });
    }
});

/**
 * DELETE /api/affiliation/neighborhood
 * Clear neighborhood
 */
router.delete("/neighborhood", requireAuth, async (req, res) => {
    try {
        const userId = req.user!.id;

        const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
        if (!user) {
            return res.status(404).json({ error: "USER_NOT_FOUND" });
        }

        if (!user.neighborhood_id) {
            return res.status(400).json({ error: "NO_NEIGHBORHOOD", message: "등록된 동네가 없습니다." });
        }

        await db.update(users)
            .set({
                neighborhood_id: null,
                neighborhood_joined_at: null,
                updated_at: new Date(),
            })
            .where(eq(users.id, userId));

        // Invalidate leaderboard cache
        await invalidatePattern('leaderboard:*');

        res.json({ success: true, message: "동네 등록이 해제되었습니다." });

    } catch (error) {
        console.error("[Affiliation] Clear neighborhood error:", error);
        res.status(500).json({ error: "SERVER_ERROR", message: "서버 오류가 발생했습니다." });
    }
});

/**
 * GET /api/affiliation/status
 * Get current user's affiliation status
 */
router.get("/status", requireAuth, async (req, res) => {
    try {
        const userId = req.user!.id;

        const [user] = await db.select({
            group_id: users.group_id,
            group_email: users.group_email,
            group_joined_at: users.group_joined_at,
            neighborhood_id: users.neighborhood_id,
            neighborhood_joined_at: users.neighborhood_joined_at,
        }).from(users).where(eq(users.id, userId)).limit(1);

        if (!user) {
            return res.status(404).json({ error: "USER_NOT_FOUND" });
        }

        // Get group details if user has one
        let groupInfo = null;
        if (user.group_id) {
            const [group] = await db.select({
                id: groups.id,
                name: groups.name,
                type: groups.type,
                logo_url: groups.logo_url,
            }).from(groups).where(eq(groups.id, user.group_id)).limit(1);
            groupInfo = group || null;
        }

        // Get neighborhood translation if user has one
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
                    joined_at: user.neighborhood_joined_at,
                    can_change: !isWithinCooldown(user.neighborhood_joined_at),
                };
            }
        }

        res.json({
            group: groupInfo ? {
                ...groupInfo,
                email: user.group_email,
                joined_at: user.group_joined_at,
                can_change: !isWithinCooldown(user.group_joined_at),
            } : null,
            neighborhood: neighborhoodInfo,
        });

    } catch (error) {
        console.error("[Affiliation] Status error:", error);
        res.status(500).json({ error: "SERVER_ERROR", message: "서버 오류가 발생했습니다." });
    }
});

export default router;
