
import { db } from "./db/index.js";
import { shops, users } from "./db/schema.js";
import { eq, count } from "drizzle-orm";
import { getShopMatchScores } from "./utils/enricher.js";
// import { scoreToTasteRatingStep } from "../src/lib/utils.js"; // Removed to avoid frontend deps issues

// Minimal re-impl of score conversion to avoid frontend deps in backend script
function scoreToTasteRatingRaw(score: number): number {
    const clamped = Math.max(0, Math.min(100, score));

    // Distribution-based Mapping (Calibrated for Power=2.0)
    // P95 (87.4) -> 3.5
    // P99 (92.6) -> 4.0
    // P99.95 (96.6) -> 4.5
    // Max (100) -> 5.0

    if (clamped >= 96.6) return 4.5 + ((clamped - 96.6) / 3.4) * 0.5;
    if (clamped >= 92.6) return 4.0 + ((clamped - 92.6) / 4.0) * 0.5;
    if (clamped >= 87.4) return 3.5 + ((clamped - 87.4) / 5.2) * 0.5;
    return 3.0 + (clamped / 87.4) * 0.5;
}

function scoreToTasteRatingStep(score: number): number {
    const raw = scoreToTasteRatingRaw(score);
    const snapped = Math.round(raw / 0.05) * 0.05;
    return parseFloat(snapped.toFixed(2));
}

async function run() {
    const userIdArg = process.argv[2];
    const userId = userIdArg ? parseInt(userIdArg) : 1;

    console.log(`Generating Top 100 Recommendations for User ID: ${userId}`);

    // 1. Check User
    const userRes = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (userRes.length === 0) {
        console.error("User not found");
        process.exit(1);
    }
    const user = userRes[0];
    console.log(`User: ${user.nickname} (${user.taste_cluster || 'No Cluster'})`);

    // 2. Fetch All Shops
    console.log("Fetching all shops...");
    const allShops = await db.select({ id: shops.id, name: shops.name }).from(shops);
    console.log(`Total Shops: ${allShops.length}`);

    // 3. Batch Calculate Scores
    const shopIds = allShops.map(s => s.id);
    const BATCH_SIZE = 500;
    const scoresMap = new Map<number, number | null>();

    console.log("Calculating match scores...");
    for (let i = 0; i < shopIds.length; i += BATCH_SIZE) {
        const batch = shopIds.slice(i, i + BATCH_SIZE);
        const batchScores = await getShopMatchScores(batch, userId);
        batchScores.forEach((score, id) => scoresMap.set(id, score));
        process.stdout.write(`\rProcessed ${Math.min(i + BATCH_SIZE, shopIds.length)}/${shopIds.length}`);
    }
    console.log("\nCalculation complete.");

    // 4. Sort and Top 100
    const scoredShops = allShops.map(s => {
        const score = scoresMap.get(s.id);
        return {
            ...s,
            score: score ?? -1, // -1 for null/no data
            rating: score !== null ? scoreToTasteRatingStep(score) : 0
        };
    });

    // Filter out -1 if desired, or keep them at bottom
    const validShops = scoredShops.filter(s => s.score >= 0);

    validShops.sort((a, b) => b.score - a.score);

    const top100 = validShops.slice(0, 100);

    console.log("\n--- Top 100 Recommended Shops ---");
    console.log("Rank\tScore\tRating\tID\tName");
    top100.forEach((s, idx) => {
        console.log(`${idx + 1}\t${s.score.toFixed(1)}\t${s.rating}\t${s.id}\t${s.name}`);
    });

    if (top100.length === 0) {
        console.log("No matches found (score > 0).");
    }

    process.exit(0);
}

run().catch(e => {
    console.error(e);
    process.exit(1);
});
