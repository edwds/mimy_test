import { db } from '../db/index.js';
import { users, content, users_ranking } from '../db/schema.js';
import { eq, sql } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';

function mapSatisfactionToTier(satisfaction: string): number {
    switch (satisfaction) {
        case 'best': return 3;
        case 'good': return 2;
        case 'ok': return 1;
        case 'bad': return 0;
        default: return 2;
    }
}

async function main() {
    console.log("Starting FAST User Expansion and Content Redistribution...");

    // 1. Insert 1000 Dummy Users
    console.log("Step 1: Inserting 1000 Dummy Users...");
    const usersFilePath = path.join(process.cwd(), 'server/data/dummy_users_1000.json');
    const usersDataRaw = fs.readFileSync(usersFilePath, 'utf-8');
    const usersData = JSON.parse(usersDataRaw);

    const newUsers = usersData.map((u: any) => ({
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
        visible_rank: u.visible_rank || 100,
        birthdate: u.birthdate,
        gender: u.gender,
        taste_cluster: u.taste_cluster,
        taste_result: u.taste_result,
        created_at: u.created_at ? new Date(u.created_at) : new Date(),
        updated_at: u.updated_at ? new Date(u.updated_at) : new Date(),
    }));

    try {
        // Insert in chunks of 500 to be safe
        const CHUNK_size = 500;
        for (let i = 0; i < newUsers.length; i += CHUNK_size) {
            await db.insert(users).values(newUsers.slice(i, i + CHUNK_size)).onConflictDoNothing();
        }
        console.log(`Inserted users.`);
    } catch (e) {
        console.error("Error inserting users:", e);
    }

    // 2. Redistribute Content (FAST SQL)
    console.log("Step 2: Redistributing Content via SQL...");

    // We target existing source users 191-318.
    // We want to distribute to range [191, 1318].

    const startId = 191;
    const endId = 1318;

    const query = `UPDATE content 
        SET user_id = floor(random() * (${endId} - ${startId} + 1) + ${startId})::integer
        WHERE user_id >= 191 AND user_id <= 318`;

    await db.execute(sql.raw(query));

    // Drizzle execute result might vary by driver, but we assume it works.
    console.log("Redistribution complete.");

    // 3. Recalculate Rankings
    console.log("Step 3: Recalculating Rankings...");

    // Target Range: 191 to 1318
    const targetIds = Array.from({ length: endId - startId + 1 }, (_, i) => startId + i);

    let processedUsers = 0;

    for (const userId of targetIds) {
        // Fetch reviews
        const userReviews = await db.select({
            id: content.id,
            review_prop: content.review_prop,
            created_at: content.created_at,
            type: content.type
        }).from(content).where(eq(content.user_id, userId));

        if (userReviews.length === 0) {
            await db.delete(users_ranking).where(eq(users_ranking.user_id, userId));
            continue;
        }

        const rankingCandidates = new Map<number, any>();

        for (const r of userReviews) {
            if (r.type !== 'review') continue;
            const prop = r.review_prop as any;
            if (!prop || !prop.shop_id) continue;
            const shopId = Number(prop.shop_id);

            let visitDate = r.created_at; // Fallback
            if (prop.visit_date) {
                visitDate = new Date(prop.visit_date);
            } else if (r.created_at) {
                visitDate = new Date(r.created_at);
            }
            if (!visitDate) visitDate = new Date(0); // Safety

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

        // SORTING: 
        // 1. Satisfaction Tier DESC (3=Best -> 0=Bad)
        // 2. Visit Date DESC (Recent -> Old)
        candidates.sort((a, b) => {
            if (a.tier !== b.tier) {
                return b.tier - a.tier;
            }
            return b.visitDate.getTime() - a.visitDate.getTime();
        });

        const newRankings = candidates.map((item, index) => ({
            user_id: userId,
            shop_id: item.shopId,
            satisfaction_tier: item.tier,
            rank: index + 1 // Continuous rank
        }));

        await db.transaction(async (tx) => {
            await tx.delete(users_ranking).where(eq(users_ranking.user_id, userId));
            // Batch insert in plain SQL or Drizzle values? 
            // Drizzle insert values takes array. 
            // If array is too big, PG throws error? 
            // Max params 65535. Each row has 4 cols. 16k rows safe.
            // A user likely has < 1000 reviews. Safe.
            if (newRankings.length > 0) {
                await tx.insert(users_ranking).values(newRankings);
            }
        });

        processedUsers++;
        if (processedUsers % 100 === 0) process.stdout.write(`\rUser Rankings Processed: ${processedUsers} / ${targetIds.length}`);
    }

    console.log("\nProcess Completed Successfully.");
    process.exit(0);
}

main().catch(console.error);
