import { db } from "../db/index.js";
import { users, shops, users_ranking, content } from "../db/schema.js";
import { eq, desc, and, sql, isNotNull } from "drizzle-orm";

export const ListService = {
    async fetchUserLists(userId: number) {
        const user = await db.select({
            id: users.id,
            nickname: users.nickname,
            profile_image: users.profile_image
        }).from(users).where(eq(users.id, userId)).limit(1);

        if (user.length === 0) return null;
        const userInfo = user[0];

        const resultLists: any[] = [];

        // 1. Overall Ranking (Top 100)
        const overallCountRes = await db.select({ count: sql<number>`count(*)` })
            .from(users_ranking)
            .where(eq(users_ranking.user_id, userId));

        const overallCount = Number(overallCountRes[0]?.count || 0);

        const latestUpdateRes = await db.select({ updated_at: users_ranking.updated_at })
            .from(users_ranking)
            .where(eq(users_ranking.user_id, userId))
            .orderBy(desc(users_ranking.updated_at))
            .limit(1);
        const lastUpdated = latestUpdateRes[0]?.updated_at || new Date();

        const minRankings = parseInt(process.env.MIN_RANKINGS_FOR_MATCH || '30');
        if (overallCount >= minRankings) {
            resultLists.push({
                id: 'overall',
                type: 'OVERALL',
                title: '전체 랭킹',
                count: Math.min(overallCount, 100),
                updated_at: lastUpdated,
                author: userInfo
            });
        }

        // 2. Region Ranking
        const regionGroups = await db.select({
            region: shops.address_region,
            count: sql<number>`count(*)`
        })
            .from(users_ranking)
            .innerJoin(shops, eq(users_ranking.shop_id, shops.id))
            .where(and(eq(users_ranking.user_id, userId), isNotNull(shops.address_region)))
            .groupBy(shops.address_region)
            .having(sql`count(*) >= 10`);

        for (const group of regionGroups) {
            resultLists.push({
                id: `region_${group.region}`,
                type: 'REGION',
                title: `${group.region} 랭킹`,
                count: Number(group.count),
                updated_at: lastUpdated,
                author: userInfo,
                value: group.region
            });
        }

        // 3. Category Ranking
        const categoryGroups = await db.select({
            category: shops.food_kind,
            count: sql<number>`count(*)`
        })
            .from(users_ranking)
            .innerJoin(shops, eq(users_ranking.shop_id, shops.id))
            .where(and(eq(users_ranking.user_id, userId), isNotNull(shops.food_kind)))
            .groupBy(shops.food_kind)
            .having(sql`count(*) >= 10`);

        for (const group of categoryGroups) {
            resultLists.push({
                id: `category_${group.category}`,
                type: 'CATEGORY',
                title: `${group.category} 랭킹`,
                count: Number(group.count),
                updated_at: lastUpdated,
                author: userInfo,
                value: group.category
            });
        }
        return resultLists;
    },

    async fetchUserListDetail(userId: number, type: string, value?: string) {
        let query = db.select({
            rank: users_ranking.rank,
            shop: shops,
            satisfaction_tier: users_ranking.satisfaction_tier,
            // Subquery to get the latest review text
            review_text: sql<string>`(
                select text from ${content} 
                where ${content.user_id} = ${users_ranking.user_id} 
                and cast(${content.review_prop}->>'shop_id' as integer) = ${shops.id}
                and ${content.is_deleted} = false
                order by ${content.created_at} desc 
                limit 1
            )`,
            // Subquery to get the latest review images (jsonb)
            review_images: sql<string[]>`(
                select img from ${content} 
                where ${content.user_id} = ${users_ranking.user_id} 
                and cast(${content.review_prop}->>'shop_id' as integer) = ${shops.id}
                and ${content.is_deleted} = false
                order by ${content.created_at} desc 
                limit 1
            )`
        })
            .from(users_ranking)
            .innerJoin(shops, eq(users_ranking.shop_id, shops.id))
            .$dynamic();

        const conditions = [eq(users_ranking.user_id, userId)];

        if (type === 'REGION' && value) {
            conditions.push(eq(shops.address_region, value));
        } else if (type === 'CATEGORY' && value) {
            conditions.push(eq(shops.food_kind, value));
        }

        return await query.where(and(...conditions)).orderBy(users_ranking.rank).limit(100);
    }
};
