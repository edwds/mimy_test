import { db } from '../db/index.js';
import { users, content, users_ranking } from '../db/schema.js';
import { eq, inArray, desc } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';

// Helper to map satisfaction string to tier number
function mapSatisfactionToTier(satisfaction: string): number {
    switch (satisfaction) {
        case 'best': return 3;
        case 'good': return 2;
        case 'ok': return 1;
        case 'bad': return 0;
        default: return 2; // Default to 'good' if missing
    }
}

async function main() {
    console.log("Starting User Expansion and Content Redistribution...");

    // 1. Insert 1000 Dummy Users
    console.log("Step 1: Inserting 1000 Dummy Users...");
    const usersFilePath = path.join(process.cwd(), 'server/data/dummy_users_1000.json');
    const usersDataRaw = fs.readFileSync(usersFilePath, 'utf-8');
    const usersData = JSON.parse(usersDataRaw);

    const newUsers = usersData.map((u: any) => ({
        // We let the DB assign ID if it's serial, EXCEPT if we want to force these IDs.
        // The JSON has IDs 319 to ~1318.
        // If the DB `id` column is serial, we can still force insert if we want, 
        // OR we strip ID and let DB assign. 
        // BUT, the request implies "191~318 + new users". If we force IDs, we know the range.
        // Let's try to preserve IDs from JSON if possible, or usually Drizzle/PG allows inserting specific IDs.
        // However, safely, we might want to check max ID currently. 
        // Given the prompt "users.id 기준 191~318", it implies integer IDs are important.
        // Let's insert with explicit IDs from JSON.
        id: u.id,
        channel: u.channel,
        email: u.email,
        phone: u.phone,
        phone_country: u.phone_country,
        phone_verified: u.phone_verified,
        account_id: u.account_id,
        nickname: u.nickname,
        bio: u.bio,
        link: u.link,
        profile_image: u.profile_image,
        visible_rank: u.visible_rank || 100, // Default to 100
        birthdate: u.birthdate,
        gender: u.gender,
        taste_cluster: u.taste_cluster,
        taste_result: u.taste_result,
        created_at: u.created_at ? new Date(u.created_at) : new Date(),
        updated_at: u.updated_at ? new Date(u.updated_at) : new Date(),
    }));

    // Batch insert users to avoid potential payload limit issues (though 1000 is usually fine)
    try {
        await db.insert(users).values(newUsers).onConflictDoNothing();
        console.log(`Inserted ${newUsers.length} users (or skipped duplicates).`);
    } catch (e) {
        console.error("Error inserting users:", e);
        // Warning: if this fails, subsequent steps might behave oddly.
    }

    // 2. Redistribute Content
    console.log("Step 2: Redistributing Content...");

    // Get ALL target user IDs: 191-318 AND the new IDs from the JSON.
    const originalTargetStart = 191;
    const originalTargetEnd = 318;
    const newUsersStart = 319; // Based on JSON dump viewing
    // We can just query the DB for users in specific range if we want to be safe, 
    // or just use the IDs we know.
    // Let's collect all valid IDs for the pool.

    // Fetch all user IDs in range [191, infinity) or just combine ranges.
    // Actually, let's just use the IDs from newUsers + [191..318]
    const originalUserIds = Array.from({ length: 318 - 191 + 1 }, (_, i) => 191 + i);
    const newUserIds = newUsers.map((u: any) => u.id);
    const allTargetUserIds = [...originalUserIds, ...newUserIds];

    console.log(`Total target users for content pool: ${allTargetUserIds.length}`);

    // Get all content currently owned by users 191-318 (the "source")
    const sourceContent = await db.select({ id: content.id })
        .from(content)
        .where(
            inArray(content.user_id, originalUserIds)
        );

    console.log(`Found ${sourceContent.length} content items to redistribute.`);

    // Random distribution
    // We want to distribute `sourceContent` across `allTargetUserIds`.
    const updates = [];
    for (const item of sourceContent) {
        // Pick a random user from the FULL pool (including original owners)
        const randomUserId = allTargetUserIds[Math.floor(Math.random() * allTargetUserIds.length)];
        updates.push({
            contentId: item.id,
            newOwnerId: randomUserId
        });
    }

    // Perform updates in chunks
    // Since Drizzle update is usually one-by-one or via specific where clause, 
    // bulk updating with different values is tricky in standard SQL without CASE/WHEN or temp table.
    // For 1000s of items, one-by-one awaits might be slow but safe for a script.
    // Or we can group by newOwnerId, but that changes logic (multiple queries).
    // Let's do parallel batches.
    const BATCH_SIZE = 100;
    for (let i = 0; i < updates.length; i += BATCH_SIZE) {
        const batch = updates.slice(i, i + BATCH_SIZE);
        await Promise.all(batch.map(update =>
            db.update(content)
                .set({ user_id: update.newOwnerId })
                .where(eq(content.id, update.contentId))
        ));
        process.stdout.write(`\rRedistributed ${Math.min(i + BATCH_SIZE, updates.length)} / ${updates.length}`);
    }
    console.log("\nRedistribution complete.");

    // 3. Recalculate Rankings
    console.log("Step 3: Recalculating Rankings...");

    // We need to recalc for ALL users in `allTargetUserIds` because their content changed.
    for (const userId of allTargetUserIds) {
        // Fetch reviews for this user
        const reviews = await db.select({
            id: content.id,
            review_prop: content.review_prop,
            created_at: content.created_at,
        })
            .from(content)
            .where(
                eq(content.user_id, userId)
            );

        if (reviews.length === 0) {
            // If they have no reviews, ensure we clean up old ranking if exists
            await db.delete(users_ranking).where(eq(users_ranking.user_id, userId));
            continue;
        }

        // Process reviews to get ranking candidates
        // Deduplicate shop visits (keep latest by visit data) or just treat all reviews?
        // Usually ranking is per Shop. If user reviews same shop twice, we take latest.
        const shopMap = new Map<number, any>();

        for (const r of reviews) {
            const prop = r.review_prop as any;
            if (!prop || !prop.shop_id) continue;

            // Check if it's a review type? (We filtered by content but didn't check type='review' in query above?)
            // Wait, previous `recalc_ranking` added `.where(eq(content.type, 'review'))`. 
            // In step 2 we redistributed ALL content (reviews + posts?). 
            // `content.type` should be checked if we only want reviews for ranking.
            // Let's filter in memory or query.
            // Assuming redistribution was for ALL content, but ranking is only for 'review'?
            // Standard Mimy logic: Ranking uses Reviews.

            // Let's refine query above to clean up.
            // Better: Move query inside the loop to be correct or filter here.
        }

        // Re-query correctly
        const validReviewsResults = await db.select({
            shop_id: content.review_prop, // We need to extract shop_id from json
            review_prop: content.review_prop,
            created_at: content.created_at
        })
            .from(content)
            .where(eq(content.user_id, userId));

        // Filter for type='review' manually if needed or trust data
        // The `content` table has `type` column.
        const userReviews = await db.select({
            id: content.id,
            review_prop: content.review_prop,
            created_at: content.created_at,
            type: content.type
        }).from(content).where(eq(content.user_id, userId));

        const rankingCandidates = new Map<number, any>();

        for (const r of userReviews) {
            if (r.type !== 'review') continue;
            const prop = r.review_prop as any;
            if (!prop || !prop.shop_id) continue;
            const shopId = Number(prop.shop_id);

            let visitDate = r.created_at;
            if (prop.visit_date) {
                visitDate = new Date(prop.visit_date);
            }

            // Logic: Keep LATEST visit for the shop.
            if (!rankingCandidates.has(shopId)) {
                rankingCandidates.set(shopId, {
                    shopId,
                    satisfaction: prop.satisfaction || 'good',
                    visitDate: visitDate,
                    tier: mapSatisfactionToTier(prop.satisfaction || 'good')
                });
            } else {
                const existing = rankingCandidates.get(shopId);
                // If new one is newer
                if (visitDate > existing.visitDate) {
                    rankingCandidates.set(shopId, {
                        shopId,
                        satisfaction: prop.satisfaction || 'good',
                        visitDate: visitDate,
                        tier: mapSatisfactionToTier(prop.satisfaction || 'good')
                    });
                }
            }
        }

        const candidates = Array.from(rankingCandidates.values());
        if (candidates.length === 0) {
            await db.delete(users_ranking).where(eq(users_ranking.user_id, userId));
            continue;
        }

        // SORTING LOGIC:
        // 1. Satisfaction Tier DESC (3=Best -> 0=Bad)
        // 2. Visit Date DESC (Recent -> Old)
        candidates.sort((a, b) => {
            if (a.tier !== b.tier) {
                return b.tier - a.tier; // Higher tier first
            }
            // Same tier, sort by date
            return b.visitDate.getTime() - a.visitDate.getTime();
        });

        // Assign Rank
        // Continuous rank 1..N
        const newRankings = candidates.map((item, index) => ({
            user_id: userId,
            shop_id: item.shopId,
            satisfaction_tier: item.tier,
            rank: index + 1 // 1-based rank
        }));

        // Transactional Update
        await db.transaction(async (tx) => {
            await tx.delete(users_ranking).where(eq(users_ranking.user_id, userId));
            if (newRankings.length > 0) {
                await tx.insert(users_ranking).values(newRankings);
            }
        });
    }

    console.log("Ranking recalculation complete.");
    process.exit(0);
}

main().catch(console.error);
