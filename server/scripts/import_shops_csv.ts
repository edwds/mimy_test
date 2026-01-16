
import { db } from '../db/index.js';
import { shops } from '../db/schema.js';
import { sql } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function importShops() {
    const csvPath = path.join(__dirname, '../data/shop_mock_dump.csv');
    console.log(`Reading CSV from ${csvPath}...`);

    const fileContent = fs.readFileSync(csvPath, 'utf-8');
    const lines = fileContent.split('\n');

    // Skip header
    const dataLines = lines.slice(1).filter(line => line.trim().length > 0);

    console.log(`Found ${dataLines.length} lines to import.`);

    const parsedShops = [];

    for (const line of dataLines) {
        // CSV parsing logic for single quoted column
        // Remove surrounding quotes and unescape double quotes
        let jsonStr = line.trim();
        if (jsonStr.startsWith('"') && jsonStr.endsWith('"')) {
            jsonStr = jsonStr.substring(1, jsonStr.length - 1);
        }
        jsonStr = jsonStr.replace(/""/g, '"');

        try {
            const shopData = JSON.parse(jsonStr);
            parsedShops.push(shopData);
        } catch (e) {
            console.error(`Failed to parse line: ${line.substring(0, 50)}...`, e);
        }
    }

    console.log(`Parsed ${parsedShops.length} valid shop objects.`);

    // Truncate existing shops
    console.log("Truncating 'shops' table...");
    try {
        await db.execute(sql`TRUNCATE TABLE ${shops} CASCADE`);
    } catch (e) {
        console.error("Error truncating table (might need manual delete if cascade not supported here):", e);
        // Fallback to delete
        await db.delete(shops);
    }

    // Insert in batches
    const BATCH_SIZE = 100;
    for (let i = 0; i < parsedShops.length; i += BATCH_SIZE) {
        const batch = parsedShops.slice(i, i + BATCH_SIZE).map((s: any) => ({
            id: s.id,
            catchtable_id: s.catchtable_id,
            catchtable_ref: s.catchtable_ref,
            name: s.name,
            description: s.description,
            address_full: s.address_full,
            address_region: s.address_region,

            // i18n fields come as stringified JSON in CSV? Let's check.
            // CSV: ""address_i18n"":""{\""ko\"":\""경기도...\""}""
            // JSON.parse(line) -> objects have address_i18n as string "{"ko":...}" ?
            // Schema expects text. So we should keep it structure, or is schema JSONB?
            // Schema: `address_i18n: text('address_i18n')`
            // So we can just save the string value.
            name_i18n: s.name_i18n,
            description_i18n: s.description_i18n,
            address_i18n: s.address_i18n,

            kind: s.kind,
            food_kind: s.food_kind,
            lat: s.lat,
            lon: s.lon,
            thumbnail_img: s.thumbnail_img,
            sub_img: s.sub_img,
            menu: s.menu,
            status: s.status,
            country_code: s.country_code,
            visibility: s.visibility,
            created_at: s.created_at ? new Date(s.created_at) : new Date(),
            updated_at: s.updated_at ? new Date(s.updated_at) : new Date(),
        }));

        try {
            await db.insert(shops).values(batch);
            process.stdout.write(`\rInserted ${Math.min(i + BATCH_SIZE, parsedShops.length)} / ${parsedShops.length}`);
        } catch (e) {
            console.error(`\nError inserting batch ${i}:`, e);
        }
    }

    console.log("\nImport completed successfully.");
    process.exit(0);
}

importShops().catch(console.error);
