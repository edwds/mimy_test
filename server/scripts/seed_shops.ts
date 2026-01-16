import { db } from "../db/index.js";
import { shops } from "../db/schema";
import fs from "fs";
import path from "path";

async function seedShops() {
    const filePath = path.join(process.cwd(), "server/data/shop_mock_dump.csv");
    const fileContent = fs.readFileSync(filePath, "utf-8");
    const lines = fileContent.trim().split("\n");

    // First line is header: SHOP_JSON
    const dataLines = lines.slice(1);

    console.log(`Found ${dataLines.length} shops to seed.`);

    const BATCH_SIZE = 500;
    for (let i = 0; i < dataLines.length; i += BATCH_SIZE) {
        const batch = dataLines.slice(i, i + BATCH_SIZE);
        const insertBatch: any[] = [];

        for (const line of batch) {
            try {
                let jsonStr = line.trim();
                if (jsonStr.startsWith('"') && jsonStr.endsWith('"')) {
                    jsonStr = jsonStr.substring(1, jsonStr.length - 1).replace(/""/g, '"');
                }

                const shopData = JSON.parse(jsonStr);
                insertBatch.push({
                    id: shopData.id,
                    catchtable_id: shopData.catchtable_id,
                    catchtable_ref: shopData.catchtable_ref,
                    name: shopData.name,
                    description: shopData.description,
                    address_full: shopData.address_full,
                    address_region: shopData.address_region,
                    name_i18n: shopData.name_i18n,
                    description_i18n: shopData.description_i18n,
                    address_i18n: shopData.address_i18n,
                    kind: shopData.kind,
                    food_kind: shopData.food_kind,
                    lat: shopData.lat,
                    lon: shopData.lon,
                    thumbnail_img: shopData.thumbnail_img,
                    sub_img: shopData.sub_img,
                    menu: shopData.menu,
                    status: shopData.status,
                    country_code: shopData.country_code,
                    visibility: shopData.visibility,
                    created_at: shopData.created_at ? new Date(shopData.created_at) : undefined,
                    updated_at: shopData.updated_at ? new Date(shopData.updated_at) : undefined,
                });
            } catch (e) {
                console.error("Error parsing shop line:", line.substring(0, 100), e);
            }
        }

        if (insertBatch.length > 0) {
            console.log(`Inserting batch ${i / BATCH_SIZE + 1} (${insertBatch.length} shops)...`);
            await db.insert(shops).values(insertBatch).onConflictDoUpdate({
                target: shops.id,
                set: { updated_at: new Date() } // Dummy update to handle conflict
            });
        }
    }

    console.log("Shop seeding completed.");
    process.exit(0);
}

seedShops();
