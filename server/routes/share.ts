import { Router } from "express";
import { db } from "../db/index.js";
import { shared_links, users } from "../db/schema.js";
import { eq, sql, and } from "drizzle-orm";
import crypto from 'crypto';
import { ListService } from "../services/ListService.js";
import { getOrSetCache } from "../redis.js";

const router = Router();

// POST /api/share/list
router.post("/list", async (req, res) => {
    try {
        const { userId, type, value, title } = req.body;

        if (!userId || !type) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        // 1. Check if same link exists
        // We use raw SQL for JSONB comparison because Drizzle query builder for JSON can be verbose
        // Assuming config has structure { userId, type, value }
        const existing = await db.select().from(shared_links)
            .where(
                and(
                    eq(shared_links.user_id, userId),
                    sql`config ->> 'type' = ${type}`,
                    value ? sql`config ->> 'value' = ${value}` : sql`config ->> 'value' IS NULL OR config ->> 'value' = ''`
                )
            )
            .limit(1);

        if (existing.length > 0) {
            // Return existing code
            return res.json({
                code: existing[0].code,
                url: `/s/${existing[0].code}`
            });
        }

        // 2. Create new if not exists
        const code = crypto.randomBytes(6).toString('hex'); // 12 chars

        const newLink = await db.insert(shared_links).values({
            code,
            type: 'LIST',
            user_id: userId,
            config: { userId, type, value, title }
        }).returning();

        res.json({
            code: newLink[0].code,
            url: `/s/${newLink[0].code}`
        });

    } catch (error) {
        console.error("Create share link error:", error);
        res.status(500).json({ error: "Failed to create share link" });
    }
});

// GET /api/share/:code
router.get("/:code", async (req, res) => {
    try {
        const { code } = req.params;

        // Use cache: Key "share:list:{code}"
        const data = await getOrSetCache(`share:list:${code}`, async () => {
            // 1. Find the link
            const link = await db.select().from(shared_links).where(eq(shared_links.code, code)).limit(1);

            if (link.length === 0) {
                return null;
            }

            const config = link[0].config as any;
            const { userId, type, value, title } = config;

            // 2. Fetch List Details (Public access allowed)
            const items = await ListService.fetchUserListDetail(userId, type, value);

            // 3. Fetch Author Info
            const user = await db.select({
                id: users.id,
                nickname: users.nickname,
                profile_image: users.profile_image
            }).from(users).where(eq(users.id, userId)).limit(1);

            // 4. Get most recent updated_at from items
            const mostRecentUpdate = items.length > 0 && items[0].updated_at
                ? items[0].updated_at
                : null;

            return {
                items,
                author: user[0],
                title,
                type,
                value,
                updated_at: mostRecentUpdate
            };
        }, 600); // Cache for 10 minutes

        if (!data) {
            return res.status(404).json({ error: "Link not found" });
        }

        res.json(data);

    } catch (error) {
        console.error("Get shared list error:", error);
        res.status(500).json({ error: "Failed to fetch shared list" });
    }
});

export default router;
