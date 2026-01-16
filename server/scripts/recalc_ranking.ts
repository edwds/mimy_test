
import { db } from '../db';
import { users, content, users_ranking } from '../db/schema';
import { eq, and, inArray, desc } from 'drizzle-orm';

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
    console.log("Recalculating rankings for users 191-318...");

    // 1. Get Target Users
    const targetUsers = await db.select({ id: users.id })
        .from(users);

    const filteredUsers = targetUsers
        .filter(u => u.id >= 191 && u.id <= 318)
        .map(u => u.id);

    console.log(`Found ${filteredUsers.length} users to process.`);

    for (const userId of filteredUsers) {
        // Fetch all non-deleted reviews
        const reviews = await db.select({
            id: content.id,
            review_prop: content.review_prop,
            created_at: content.created_at,
            visit_date: content.review_prop // JSONB usually returned as object
        })
            .from(content)
            .where(
                and(
                    eq(content.user_id, userId),
                    eq(content.type, 'review'),
                    eq(content.is_deleted, false)
                )
            )
            .orderBy(desc(content.created_at));

        if (reviews.length === 0) continue;

        // Group by shop (deduplicate, keeping latest)
        const shopMap = new Map<number, any>();

        for (const r of reviews) {
            const prop = r.review_prop as any;
            if (!prop || !prop.shop_id) continue;

            const shopId = Number(prop.shop_id);

            // If already processed (latest because we sorted DESC), skip
            // Actually, we want to keep the one that determines the CURRENT ranking status.
            // Usually valid logic is: latest review represents current feeling.
            if (!shopMap.has(shopId)) {

                let visitDate = r.created_at;
                if (prop.visit_date) {
                    visitDate = new Date(prop.visit_date);
                }

                shopMap.set(shopId, {
                    shopId,
                    satisfaction: prop.satisfaction || 'good',
                    date: visitDate
                });
            }
            // If we want to check visit_date instead of created_at:
            // Sorting by created_at DESC usually implies latest entry.
            // But if user posted old review recently?
            // "Latest visited" logic requires sorting by visit_date DESC first.
            // But let's stick to created_at DESC as the "processing order" or simple "latest record wins".
            // The prompt said "based on visit_date".
        }

        // Re-sorting deduplicated list by visit_date to assign ranks
        const candidates = Array.from(shopMap.values());

        // Group by Tier
        const tieredMap = {
            3: [] as any[],
            2: [] as any[],
            1: [] as any[],
            0: [] as any[],
        };

        candidates.forEach(c => {
            const tier = mapSatisfactionToTier(c.satisfaction);
            // @ts-ignore
            if (tieredMap[tier]) tieredMap[tier].push(c);
        });

        const newRankings = [];

        // For each tier, sort by date DESC and assign rank
        // Rank 1 is top.
        // We can just accumulate global rank logic if needed, 
        // OR standard is: Users usually see ranks PER LIST/TIER? 
        // No, `users_ranking` has a `rank` column which is usually global or per-tier?
        // Schema: unique_rank_in_group (user_id, satisfaction_tier, rank).
        // So rank is PER TIER.


        let currentRank = 1;

        for (let t = 3; t >= 0; t--) {
            // @ts-ignore
            const list = tieredMap[t];
            // Sort by date DESC (Newest first -> Rank 1)
            list.sort((a: any, b: any) => b.date.getTime() - a.date.getTime());

            list.forEach((item: any) => {
                newRankings.push({
                    user_id: userId,
                    shop_id: item.shopId,
                    satisfaction_tier: t,
                    rank: currentRank++ // Global incremental rank
                });
            });
        }


        if (newRankings.length > 0) {
            // Transaction: Delete all for user -> Insert new
            try {
                await db.transaction(async (tx) => {
                    await tx.delete(users_ranking).where(eq(users_ranking.user_id, userId));
                    await tx.insert(users_ranking).values(newRankings);
                });
                // console.log(`User ${userId}: Updated ${newRankings.length} rankings.`);
            } catch (e) {
                console.error(`Failed to update user ${userId}:`, e);
            }
        }
    }
    console.log("Done.");
}

main().catch(console.error);
