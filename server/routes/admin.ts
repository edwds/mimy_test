import { Router } from "express";
import multer from "multer";
import { db } from "../db/index.js";
import { users, shops, content, users_ranking } from "../db/schema.js";
import { eq, sql, and } from "drizzle-orm";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

const ADMIN_EMAIL = "soonmyung@catchtable.co.kr";

router.post("/update-db", upload.single("file"), async (req, res) => {
    try {
        const { userId, table, mode } = req.body; // mode: 'overwrite' | 'append'
        const file = req.file;

        if (!userId || !table || !file) {
            return res.status(400).json({ error: "Missing required fields (userId, table, file)" });
        }

        if (table !== 'shops' && table !== 'content') {
            return res.status(400).json({ error: "Invalid table. Only 'shops' or 'content' allowed." });
        }

        // 2. Parse TSV
        const tsvData = file.buffer.toString('utf-8');
        const lines = tsvData.split(/\r?\n/);
        if (lines.length < 2) {
            return res.status(400).json({ error: "Empty or invalid TSV file" });
        }

        // Helper to parse TSV line handling quotes
        const parseTSVLine = (line: string): string[] => {
            const result: string[] = [];
            let current = '';
            let inQuote = false;

            for (let i = 0; i < line.length; i++) {
                const char = line[i];

                if (inQuote) {
                    if (char === '"') {
                        if (i + 1 < line.length && line[i + 1] === '"') {
                            // Escaped quote
                            current += '"';
                            i++;
                        } else {
                            // End of quote
                            inQuote = false;
                        }
                    } else {
                        current += char;
                    }
                } else {
                    if (char === '"') {
                        inQuote = true;
                    } else if (char === '\t') {
                        result.push(current);
                        current = '';
                    } else {
                        current += char;
                    }
                }
            }
            result.push(current);
            return result;
        };

        const headers = parseTSVLine(lines[0]).map(h => h.trim());
        const dataLines = lines.slice(1).filter(line => line.trim().length > 0);

        // 3. Validate Schema
        const targetTable = table === 'shops' ? shops : content;
        // Simple header validation check
        // Ideally we check if all required columns are present
        // and if all TSV headers exist in the table schema.
        // For simplicity, let's just use the headers to map data.

        // 4. Truncate Table (Only if overwrite)
        if (mode === 'overwrite') {
            console.log(`Truncating table: ${table}`);
            await db.execute(sql.raw(`TRUNCATE TABLE ${table} CASCADE`));
        }

        // 5. Batch Insert
        const batchSize = 1000;
        let registeredCount = 0;

        for (let i = 0; i < dataLines.length; i += batchSize) {
            const batch = dataLines.slice(i, i + batchSize).map(line => {
                const values = parseTSVLine(line);
                const row: any = {};
                headers.forEach((header, index) => {
                    let val = values[index];
                    if (val === undefined || val === 'NULL' || val === '') {
                        row[header] = null;
                    } else {
                        // Handle potential JSON fields (img, video, review_prop, keyword etc)
                        if (header === 'img' || header === 'video' || header === 'review_prop' || header === 'keyword' || header === 'taste_result' || header === 'rules') {
                            try {
                                row[header] = JSON.parse(val);
                            } catch (e) {
                                // If parsing fails, try to see if it's single quoted or something, 
                                // but standard TSV should have escaped JSON or just raw string.
                                // In many mock exports, double quotes are used inside TSV cells.
                                row[header] = val;
                            }
                        } else if (header === 'id' || header === 'user_id' || header === 'catchtable_id' || header === 'status' || header === 'channel' || header === 'visible_rank' || header === 'rank' || header === 'satisfaction_tier') {
                            const num = parseInt(val);
                            // In append mode, omit ID to let DB auto-increment
                            if (mode === 'append' && header === 'id') {
                                // skip
                            } else {
                                row[header] = isNaN(num) ? null : num;
                            }
                        } else if (header === 'lat' || header === 'lon' || header === 'sort_key') {
                            const num = parseFloat(val);
                            row[header] = isNaN(num) ? null : num;
                        } else if (header === 'visibility' || header === 'is_deleted' || header === 'phone_verified' || header === 'is_verified' || header === 'is_active' || header === 'is_required' || header === 'is_agreed') {
                            row[header] = val.toLowerCase() === 'true' || val === '1' || val === 't';
                        } else if (header.endsWith('_at') || header.endsWith('_date') || header === 'birthdate') {
                            const date = new Date(val);
                            row[header] = isNaN(date.getTime()) ? null : date;
                        } else {
                            row[header] = val;
                        }
                    }
                });
                return row;
            });

            if (batch.length > 0) {
                await db.insert(targetTable).values(batch);
                registeredCount += batch.length;
            }
        }

        // 6. Recalculate Rankings (If content table was updated)
        if (table === 'content') {
            await recalculateRankings();
        }

        res.json({ success: true, registeredCount });
    } catch (error: any) {
        console.error("Admin update error:", error);
        res.status(500).json({ error: "Database update failed", details: error.message });
    }
});

export default router;

async function recalculateRankings() {
    console.log("Recalculating user rankings...");
    try {
        // Clear existing rankings logic?
        // If mode is append, we might just want to re-run for all users to be safe,
        // or just affected ones. Since we don't track affected users easily here, redo all.
        // Or if overwrite, table was empty anyway (for content), but users_ranking wasn't truncated above?
        // Note: The logic above only truncates 'shops' or 'content'. 
        // If we overwrite content, we should essentially rebuild rankings.
        // If we append content, we should rebuild rankings to include new ones.
        // Safest is to truncate users_ranking and rebuild from current content.

        await db.execute(sql`TRUNCATE TABLE users_ranking CASCADE`);

        // Fetch all legitimate content with review data
        // We need: user_id, review_prop (satisfaction, visit_date, shop_id)
        const allContent = await db.select({
            userId: content.user_id,
            reviewProp: content.review_prop,
        }).from(content).where(eq(content.type, 'review'));

        // Fetch all legitimate shop IDs
        const allShops = await db.select({ id: shops.id }).from(shops);
        const validShopIds = new Set(allShops.map(s => s.id));

        // Group by user
        const userMap = new Map<number, any[]>();

        for (const item of allContent) {
            if (!item.reviewProp) continue;
            // drizzle-orm jsonb is typed as unknown or any often, cast safely
            const prop = item.reviewProp as any;
            const shopId = prop.shop_id;
            const satisfaction = prop.satisfaction; // 'best', 'good', 'ok', 'bad'
            const visitDate = prop.visit_date ? new Date(prop.visit_date) : new Date(0); // fallback old date

            if (!shopId || !satisfaction) continue;

            // Validate shop exists
            if (!validShopIds.has(shopId)) {
                console.warn(`Skipping ranking for content ${item.reviewProp} - invalid shop_id ${shopId}`);
                continue;
            }

            if (!userMap.has(item.userId)) {
                userMap.set(item.userId, []);
            }
            userMap.get(item.userId)?.push({
                shopId,
                satisfaction,
                visitDate
            });
        }

        const satisfactionOrder: Record<string, number> = {
            'best': 1,
            'good': 2,
            'ok': 3,
            'bad': 4
        };

        const batchInsert: any[] = [];

        for (const [userId, reviews] of userMap.entries()) {
            // Deduplicate shops: keep the one with highest priority (Best > Good...) or Latest?
            // Usually if I visit a place twice, once Best once Good, what is it?
            // Logic: "Most recent visit_date... high rank".
            // But we group by satisfaction.
            // Let's treat each unique shop as one entry.
            // If strictly ranking SHOPS, we need to pick ONE representative satisfaction/date for that shop for that user.
            // Assumption: Use the LATEST visit for that shop to determine its stats.

            const shopMap = new Map<number, any>();
            for (const r of reviews) {
                if (!shopMap.has(r.shopId)) {
                    shopMap.set(r.shopId, r);
                } else {
                    const existing = shopMap.get(r.shopId);
                    if (r.visitDate > existing.visitDate) {
                        shopMap.set(r.shopId, r);
                    }
                }
            }

            const uniqueShops = Array.from(shopMap.values());

            // Sort: Satisfaction Tier ASC, then Visit Date DESC
            uniqueShops.sort((a, b) => {
                const tierA = satisfactionOrder[a.satisfaction?.toLowerCase()] || 5;
                const tierB = satisfactionOrder[b.satisfaction?.toLowerCase()] || 5;

                if (tierA !== tierB) {
                    return tierA - tierB;
                }
                return b.visitDate.getTime() - a.visitDate.getTime();
            });

            // Prepare records
            uniqueShops.forEach((shop, index) => {
                batchInsert.push({
                    user_id: userId,
                    shop_id: shop.shopId,
                    rank: index + 1, // 1-based rank
                    satisfaction_tier: satisfactionOrder[shop.satisfaction?.toLowerCase()] || 2,
                });
            });
        }

        // Batch insert
        if (batchInsert.length > 0) {
            // splitting into chunks if huge? for now blindly insert
            const chunkSize = 1000;
            for (let i = 0; i < batchInsert.length; i += chunkSize) {
                await db.insert(users_ranking).values(batchInsert.slice(i, i + chunkSize));
            }
        }
        console.log(`Recalculated rankings for ${batchInsert.length} entries.`);

    } catch (e) {
        console.error("Failed to recalculate rankings:", e);
        // Don't fail the whole request, but log error
    }
}
