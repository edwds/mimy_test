import { db } from "../db/index.js";
import { content } from "../db/schema";
import fs from "fs";
import path from "path";

async function seedContent() {
    const filePath = path.join(process.cwd(), "server/data/content_mock_dump.tsv");

    const parseCsvJson = (str: string) => {
        if (!str || str === '[]' || str === '{}' || str === 'NULL') return str === '[]' ? [] : {};
        let s = str.trim();
        if (s.startsWith('"') && s.endsWith('"')) {
            s = s.substring(1, s.length - 1).replace(/""/g, '"');
        }
        try {
            return JSON.parse(s);
        } catch (e) {
            return null;
        }
    };

    const stream = fs.createReadStream(filePath, { encoding: 'utf8' });
    let buffer = '';
    let inQuotes = false;
    let recordCount = 0;
    let skippedHeader = false;
    let insertBatch: any[] = [];
    const BATCH_SIZE = 500;
    const LIMIT = 100000;

    console.log("Starting streaming content seeding...");

    for await (const chunk of stream) {
        for (let i = 0; i < chunk.length; i++) {
            const char = chunk[i];
            if (char === '"') {
                // Handle "" as escaped quote
                if (i + 1 < chunk.length && chunk[i + 1] === '"') {
                    i++; // skip
                } else {
                    inQuotes = !inQuotes;
                }
            }

            if (char === '\n' && !inQuotes) {
                if (!skippedHeader) {
                    skippedHeader = true;
                    buffer = '';
                    continue;
                }

                const line = buffer;
                buffer = '';

                try {
                    const parts = line.split("\t");
                    if (parts.length >= 12) {
                        const [
                            id,
                            user_id,
                            type,
                            img,
                            video,
                            text,
                            review_prop,
                            keyword,
                            visibility,
                            is_deleted,
                            created_at,
                            updated_at
                        ] = parts;

                        const parseDate = (str: string) => {
                            if (!str || str === 'NULL' || str === '') return undefined;
                            const d = new Date(str);
                            return isNaN(d.getTime()) ? undefined : d;
                        };

                        insertBatch.push({
                            id: parseInt(id),
                            user_id: parseInt(user_id),
                            type,
                            img: img ? parseCsvJson(img) : null,
                            video: video ? parseCsvJson(video) : null,
                            text: text && text.startsWith('"') ? parseCsvJson(text) : text,
                            review_prop: review_prop ? parseCsvJson(review_prop) : null,
                            keyword: keyword ? parseCsvJson(keyword) : null,
                            visibility: visibility === 'true',
                            is_deleted: is_deleted === 'true',
                            created_at: parseDate(created_at),
                            updated_at: parseDate(updated_at),
                        });

                        recordCount++;
                    }
                } catch (e) {
                    // ignore
                }

                if (insertBatch.length >= BATCH_SIZE) {
                    console.log(`Inserting batch (records: ${recordCount})...`);
                    await db.insert(content).values(insertBatch).onConflictDoNothing();
                    insertBatch = [];
                }

                if (recordCount >= LIMIT) {
                    console.log(`Reached limit of ${LIMIT} records.`);
                    break;
                }
            } else {
                buffer += char;
            }
        }
        if (recordCount >= LIMIT) break;
    }

    if (insertBatch.length > 0) {
        await db.insert(content).values(insertBatch).onConflictDoNothing();
    }

    console.log(`Content seeding completed. Total records: ${recordCount}`);
    process.exit(0);
}

seedContent();
