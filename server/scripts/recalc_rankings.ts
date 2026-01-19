
import { db } from "../db/index.js";
import { users, content, users_ranking } from "../db/schema.js";
import { eq, desc, and, isNotNull } from "drizzle-orm";

const SATISFACTION_MAP: Record<string, number> = {
    'best': 1,
    'good': 2,
    'ok': 3,
    'bad': 4
};

async function recalcRankings() {
    console.log("Starting ranking recalculation...");

    try {
        const allUsers = await db.select().from(users);
        console.log(`Found ${allUsers.length} users.`);

        for (const user of allUsers) {
            // Fetch reviews for user
            const reviews = await db.select({
                id: content.id,
                review_prop: content.review_prop
            })
                .from(content)
                .where(and(
                    eq(content.user_id, user.id),
                    eq(content.is_deleted, false)
                ));

            const validReviews = reviews
                .map(r => {
                    const prop = r.review_prop as any;
                    if (!prop || !prop.shop_id) return null;
                    return {
                        shop_id: prop.shop_id,
                        satisfaction: prop.satisfaction,
                        visit_date: prop.visit_date || '1970-01-01',
                        created_at: r.id // fallback for tie-break?
                    };
                })
                .filter(r => r !== null) as any[];

            if (validReviews.length === 0) continue;

            // Sort logic:
            // 1. Satisfaction Tier ASC (Lower is better)
            // 2. Visit Date DESC (Newer is better -> Higher Rank)
            validReviews.sort((a, b) => {
                const tierA = SATISFACTION_MAP[a.satisfaction] || 5;
                const tierB = SATISFACTION_MAP[b.satisfaction] || 5;

                if (tierA !== tierB) return tierA - tierB;

                // If same tier, newer date comes first
                const dateA = new Date(a.visit_date).getTime();
                const dateB = new Date(b.visit_date).getTime();
                return dateB - dateA;
            });

            // Prepare insertion data
            // Filter duplicates if user reviewed same shop multiple times?
            // "Shop's total ranking for that user"
            // If multiple reviews, taking the best one? Or just the most recent?
            // User said "Apply to users with empty ranking... sort by satisfaction... This calculates shop's overall ranking".
            // If I visited a shop twice, once 'best', once 'good'.
            // Unclear. I'll deduplicate by shop_id, taking the *first* one encountered in the sorted list (Best satisfaction, then newest).

            const uniqueReviews: any[] = [];
            const seenShops = new Set();
            for (const r of validReviews) {
                if (!seenShops.has(r.shop_id)) {
                    seenShops.add(r.shop_id);
                    uniqueReviews.push(r);
                }
            }

            if (uniqueReviews.length === 0) continue;

            // Transaction or sequential delete/insert
            // We use simple sequential here
            await db.delete(users_ranking).where(eq(users_ranking.user_id, user.id));

            const toInsert = uniqueReviews.map((r, index) => ({
                user_id: user.id,
                shop_id: r.shop_id,
                rank: index + 1,
                satisfaction_tier: SATISFACTION_MAP[r.satisfaction] || 2 // Default 2 usually? Or 5? Schema default is 2.
            }));

            if (toInsert.length > 0) {
                await db.insert(users_ranking).values(toInsert);
            }
            console.log(`Updated ${toInsert.length} rankings for User ${user.id} (${user.nickname || 'NoName'})`);
        }

        console.log("Recalculation complete.");
    } catch (error) {
        console.error("Error recalculating rankings:", error);
    } finally {
        process.exit();
    }
}

recalcRankings();
