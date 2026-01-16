
import fs from 'fs';
import path from 'path';
import { db } from '../db';
import { users, content } from '../db/schema';
import { sql } from 'drizzle-orm';

const FILE_PATH = path.join(process.cwd(), 'server/data/content_mock_dump.tsv');

function parseJSONField(val: string) {
    if (!val || val === '[]') return [];
    try {
        return JSON.parse(val);
    } catch (e) {
        return null;
    }
}

async function ensureUsersExist(userIds: Set<number>) {
    if (userIds.size === 0) return;

    // Check existing
    const userIdsArray = Array.from(userIds);
    const existingUsers = await db.select({ id: users.id }).from(users);
    const existingUserIds = new Set(existingUsers.map(u => u.id));

    const missingUserIds = userIdsArray.filter(id => !existingUserIds.has(id));

    if (missingUserIds.length > 0) {
        console.log(`Creating ${missingUserIds.length} missing users...`);
        const chunkSize = 1000;

        for (let i = 0; i < missingUserIds.length; i += chunkSize) {
            const chunk = missingUserIds.slice(i, i + chunkSize).map(id => ({
                id: id,
                phone: `010-0000-${String(id).padStart(4, '0')}`,
                phone_country: '82',
                account_id: `dummy_user_${id}`,
                nickname: `User ${id}`,
                channel: 0,
                created_at: new Date(),
                updated_at: new Date()
            }));
            await db.insert(users).values(chunk).onConflictDoNothing();
        }
        console.log('Missing users created.');
    }
}

async function insertContentBatch(batch: any[]) {
    if (batch.length === 0) return;
    await db.insert(content).values(batch).onConflictDoNothing();
}

async function main() {
    console.log('Starting streaming import...');
    if (!fs.existsSync(FILE_PATH)) {
        console.error('File not found:', FILE_PATH);
        process.exit(1);
    }

    const stream = fs.createReadStream(FILE_PATH, { encoding: 'utf-8', highWaterMark: 64 * 1024 });

    let buffer = '';
    let inQuote = false;
    let currentRow: string[] = [];
    let currentField = '';

    let processedCount = 0;
    let batch: any[] = [];
    const BATCH_SIZE = 1000;

    // We also need to collect user IDs. 
    // Optimization: Collect IDs in a Set, but we can't keep all in memory if there are millions.
    // However, unique user count is likely much smaller than row count.
    // If not, we might need to batch user creation too.
    // Let's accumulate IDs and check periodically or at end?
    // "content_mock_dump.tsv" implies content.
    // If we process streaming, we should check users.
    // To be safe, we can collect userIDs for the current batch, ensure they exist, then insert content.

    let isHeader = true;

    for await (const chunk of stream) {
        for (let i = 0; i < chunk.length; i++) {
            const char = chunk[i];
            const nextChar = chunk[i + 1] || ''; // Might need lookahead across chunks?
            // Simple parsing: if we hit quote, toggle.
            // But we need to handle "" escape.
            // Lookahead inside chunk is safe. Lookahead across chunk border is hard.
            // Simpler: buffer the chunk.

            // Actually, char processing is slow in JS.
            // Just use the logic from previous script but fed by stream?
            // No, state machine is fine.

            if (inQuote) {
                if (char === '"') {
                    // Check if escaped
                    // We need next char. If i is last char, we check state next iteration? No, that's complex.
                    // Let's assume valid TSV where "" is escape.
                    // But we can't see next char if at end of chunk.
                    // Standard parser usually keeps `previousChar` or similar.
                    // Or keep `lastCharWasQuote`.
                    // Let's simplify:
                }
            }
        }
    }

    // The char-by-char in JS is very slow. 
    // Alternative: Use `readline` but handle multiline.
    // Readline yields lines. If a line has odd number of quotes, it refers to multiline?
    // That's a heuristic.

    // Let's use a simpler buffer splitting approach.
    // We append chunk to buffer.
    // We search for `\n` that is NOT inside quotes.
    // This requires scanning.
    // Given the difficulty of implementing a fast streaming parser in pure JS without bugs,
    // I will try to use a slightly more memory efficient approach:
    // Read the file line by line using `readline` interface.
    // If a line seems incomplete (odd quotes), append next line.

    const rl = fs.createReadStream(FILE_PATH);
    // actually use 'readline' module
}

// Re-implementation using readline and manual buffering
import readline from 'readline';

async function mainFromReadline() {
    const fileStream = fs.createReadStream(FILE_PATH);

    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    let linesBuffer = ''; // For multiline fields
    let headers: string[] = [];
    let isFirstLine = true;

    let pendingContent: any[] = [];
    let pendingUserIds = new Set<number>();

    let totalInserted = 0;

    for await (const line of rl) {
        // If we have a buffered start of a multiline field, append this line
        // But we need to know if the previous line ended inside a quote.

        let currentLine = linesBuffer ? linesBuffer + '\n' + line : line;

        // Count quotes to see if we are balanced.
        // Quote count excluding escaped quotes ("")
        // This is tricky. 
        // Heuristic: Split by `\t`. If the TEXT field starts with " and doesn't end with ", we are incomplete.
        // But "foo""bar" is valid.

        // Let's use a robust quote counter
        let quoteCount = 0;
        for (let i = 0; i < currentLine.length; i++) {
            if (currentLine[i] === '"') {
                // If next is quote, it's escaped, skip both?
                // Logic: consecutive quotes cancel out in terms of "open/close"?
                // "a""b" -> balanced.
                // "a" -> unbalanced.
                // "a""b" -> 4 quotes -> balanced (even).
                // "a -> 1 quote -> unbalanced (odd).
                // So assume odd quotes means unmatched.
                quoteCount++;
            }
        }

        if (quoteCount % 2 !== 0) {
            // Odd quotes -> line continues
            linesBuffer = currentLine;
            continue;
        } else {
            // Balanced -> process row
            linesBuffer = ''; // Clear buffer

            // Now parse the line properly
            // We can reuse the parseTSV logic but for a single string
            const parsedRows = parseTSVRow(currentLine);
            if (!parsedRows) continue;

            if (isFirstLine) {
                headers = parsedRows;
                isFirstLine = false;
                continue;
            }

            // Map to object
            const record = mapRow(parsedRows);
            if (record) {
                pendingContent.push(record);
                if (record.user_id) pendingUserIds.add(record.user_id);
            }

            if (pendingContent.length >= 1000) {
                await ensureUsersExist(pendingUserIds);
                await insertContentBatch(pendingContent);
                totalInserted += pendingContent.length;
                console.log(`Inserted ${totalInserted} records...`);
                pendingContent = [];
                pendingUserIds.clear();
            }
        }
    }

    // Process remaining
    if (pendingContent.length > 0) {
        await ensureUsersExist(pendingUserIds);
        await insertContentBatch(pendingContent);
        totalInserted += pendingContent.length;
    }

    console.log(`Done. Total ${totalInserted} inserted.`);
}

function parseTSVRow(data: string): string[] | null {
    // Single row parser
    // Must handle tabs and quotes
    const fields: string[] = [];
    let currentField = '';
    let inQuote = false;

    for (let i = 0; i < data.length; i++) {
        const char = data[i];
        if (inQuote) {
            if (char === '"') {
                if (data[i + 1] === '"') {
                    currentField += '"';
                    i++;
                } else {
                    inQuote = false;
                }
            } else {
                currentField += char;
            }
        } else {
            if (char === '"') {
                inQuote = true;
            } else if (char === '\t') {
                fields.push(currentField);
                currentField = '';
            } else {
                currentField += char;
            }
        }
    }
    fields.push(currentField);
    return fields;
}

function mapRow(row: string[]) {
    // ID(0) USER_ID(1) TYPE(2) IMG(3) VIDEO(4) TEXT(5) REVIEW_PROP(6) KEYWORD(7) VISIBILITY(8) IS_DELETED(9) CREATED_AT(10) UPDATED_AT(11)
    if (row.length < 12) return null;

    return {
        id: parseInt(row[0]),
        user_id: parseInt(row[1]),
        type: row[2],
        img: parseJSONField(row[3]),
        video: parseJSONField(row[4]),
        text: row[5],
        review_prop: parseJSONField(row[6]),
        keyword: parseJSONField(row[7]),
        visibility: row[8] === 'true',
        is_deleted: row[9] === 'true',
        created_at: new Date(row[10]),
        updated_at: new Date(row[11])
    };
}

mainFromReadline().catch(console.error);

