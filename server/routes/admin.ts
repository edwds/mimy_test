import { Router } from "express";
import multer from "multer";
import { db } from "../db/index.js";
import { users, shops, content } from "../db/schema.js";
import { eq, sql } from "drizzle-orm";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

const ADMIN_EMAIL = "soonmyung@catchtable.co.kr";

router.post("/update-db", upload.single("file"), async (req, res) => {
    try {
        const { userId, table } = req.body;
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

        // 4. Truncate Table
        console.log(`Truncating table: ${table}`);
        await db.execute(sql.raw(`TRUNCATE TABLE ${table} CASCADE`));

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
                            row[header] = isNaN(num) ? null : num;
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

        res.json({ success: true, registeredCount });
    } catch (error: any) {
        console.error("Admin update error:", error);
        res.status(500).json({ error: "Database update failed", details: error.message });
    }
});

export default router;
