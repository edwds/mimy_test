
import { db } from "./db/index.js";
import { shops, users } from "./db/schema.js";
import { eq } from "drizzle-orm";
import { getShopMatchScores } from "./utils/enricher.js";

async function run() {
    const userIdArg = process.argv[2];
    const userId = userIdArg ? parseInt(userIdArg) : 320; // Default to test user 320

    console.log(`Analyzing Score Distribution for User ID: ${userId}`);

    // Fetch All Shops
    const allShops = await db.select({ id: shops.id }).from(shops);
    const shopIds = allShops.map(s => s.id);
    const BATCH_SIZE = 500;
    const scores: number[] = [];

    process.stdout.write("Calculating scores");
    for (let i = 0; i < shopIds.length; i += BATCH_SIZE) {
        const batch = shopIds.slice(i, i + BATCH_SIZE);
        const batchScores = await getShopMatchScores(batch, userId);
        batchScores.forEach((score) => {
            if (score !== null) scores.push(score);
        });
        process.stdout.write(".");
    }
    console.log(`\nTotal Valid Scores: ${scores.length}`);

    scores.sort((a, b) => a - b);

    const getPercentile = (p: number) => {
        const idx = Math.floor(scores.length * (p / 100));
        return scores[idx];
    };

    const p50 = getPercentile(50);
    const p90 = getPercentile(90);
    const p95 = getPercentile(95);
    const p99 = getPercentile(99);
    const p99_95 = getPercentile(99.95);
    const max = scores[scores.length - 1];

    console.log("\n--- Score Percentiles ---");
    console.log(`P50 (Median): ${p50}`);
    console.log(`P90: ${p90}`);
    console.log(`P95 (Target 3.5 Start): ${p95}`);
    console.log(`P99 (Target 4.0 Start): ${p99}`);
    console.log(`P99.95 (Target 4.5 Start): ${p99_95}`);
    console.log(`Max: ${max}`);

    process.exit(0);
}

run().catch(e => {
    console.error(e);
    process.exit(1);
});
