import { Router } from "express";
import multer from "multer";
import { db } from "../db/index.js";
import { users, shops, content, users_ranking } from "../db/schema.js";
import { eq, sql, and, inArray, isNotNull } from "drizzle-orm";
import { redis } from "../redis.js";
import { scrapeGoogleMapsCategory, sleep } from "../services/FirecrawlService.js";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

import { calculateShopMatchScore, calculateTasteMatch } from "../utils/match.js";

const ADMIN_EMAIL = "soonmyung@catchtable.co.kr";

router.post("/update-db", upload.single("file"), async (req, res) => {
    try {
        const { userId, table, mode } = req.body; // mode: 'overwrite' | 'append'
        const file = req.file;

        if (!userId || !table || !file) {
            return res.status(400).json({ error: "Missing required fields (userId, table, file)" });
        }

        if (table !== 'shops' && table !== 'content') {
            return res.status(400).json({ error: "Invalid table. Only 'shops' or 'content' allowed." });
        }

        // 2. Parse TSV
        const tsvData = file.buffer.toString('utf-8');
        const lines = tsvData.split(/\r?\n/);
        if (lines.length < 2) {
            return res.status(400).json({ error: "Empty or invalid TSV file" });
        }

        // Helper to parse TSV line handling quotes
        const parseTSVLine = (line: string): string[] => {
            const result: string[] = [];
            let current = '';
            let inQuote = false;

            for (let i = 0; i < line.length; i++) {
                const char = line[i];

                if (inQuote) {
                    if (char === '"') {
                        if (i + 1 < line.length && line[i + 1] === '"') {
                            // Escaped quote
                            current += '"';
                            i++;
                        } else {
                            // End of quote
                            inQuote = false;
                        }
                    } else {
                        current += char;
                    }
                } else {
                    if (char === '"') {
                        inQuote = true;
                    } else if (char === '\t') {
                        result.push(current);
                        current = '';
                    } else {
                        current += char;
                    }
                }
            }
            result.push(current);
            return result;
        };

        const headers = parseTSVLine(lines[0]).map(h => h.trim());
        const dataLines = lines.slice(1).filter(line => line.trim().length > 0);

        // 3. Validate Schema
        const targetTable = table === 'shops' ? shops : content;
        // Simple header validation check
        // Ideally we check if all required columns are present
        // and if all TSV headers exist in the table schema.
        // For simplicity, let's just use the headers to map data.

        // 4. Truncate Table (Only if overwrite)
        if (mode === 'overwrite') {
            console.log(`Truncating table: ${table}`);
            await db.execute(sql.raw(`TRUNCATE TABLE ${table} CASCADE`));
        }

        // 5. Batch Insert
        const batchSize = 1000;
        let registeredCount = 0;

        for (let i = 0; i < dataLines.length; i += batchSize) {
            const batch = dataLines.slice(i, i + batchSize).map(line => {
                const values = parseTSVLine(line);
                const row: any = {};
                headers.forEach((header, index) => {
                    let val = values[index];
                    if (val === undefined || val === 'NULL' || val === '') {
                        row[header] = null;
                    } else {
                        // Handle potential JSON fields (img, video, review_prop, keyword etc)
                        if (header === 'img' || header === 'video' || header === 'review_prop' || header === 'keyword' || header === 'taste_result' || header === 'rules') {
                            try {
                                row[header] = JSON.parse(val);
                            } catch (e) {
                                // If parsing fails, try to see if it's single quoted or something, 
                                // but standard TSV should have escaped JSON or just raw string.
                                // In many mock exports, double quotes are used inside TSV cells.
                                row[header] = val;
                            }
                        } else if (header === 'id' || header === 'user_id' || header === 'catchtable_id' || header === 'status' || header === 'channel' || header === 'visible_rank' || header === 'rank' || header === 'satisfaction_tier') {
                            const num = parseInt(val);
                            // In append mode, omit ID to let DB auto-increment
                            if (mode === 'append' && header === 'id') {
                                // skip
                            } else {
                                row[header] = isNaN(num) ? null : num;
                            }
                        } else if (header === 'lat' || header === 'lon' || header === 'sort_key') {
                            const num = parseFloat(val);
                            row[header] = isNaN(num) ? null : num;
                        } else if (header === 'visibility' || header === 'is_deleted' || header === 'phone_verified' || header === 'is_verified' || header === 'is_active' || header === 'is_required' || header === 'is_agreed') {
                            row[header] = val.toLowerCase() === 'true' || val === '1' || val === 't';
                        } else if (header.endsWith('_at') || header.endsWith('_date') || header === 'birthdate') {
                            const date = new Date(val);
                            row[header] = isNaN(date.getTime()) ? null : date;
                        } else {
                            row[header] = val;
                        }
                    }
                });
                return row;
            });

            if (batch.length > 0) {
                await db.insert(targetTable).values(batch);
                registeredCount += batch.length;
            }
        }

        // 6. Recalculate Rankings (If content table was updated)
        if (table === 'content') {
            await recalculateRankings();
        }

        res.json({ success: true, registeredCount });
    } catch (error: any) {
        console.error("Admin update error:", error);
        res.status(500).json({ error: "Database update failed", details: error.message });
    }
});

export default router;

router.post("/match/simulate", async (req, res) => {
    try {
        const { shopId, viewerId, options } = req.body;
        // options: { power, alpha, minReviewers }

        if (!shopId || !viewerId) {
            return res.status(400).json({ error: "Missing shopId or viewerId" });
        }

        // 1. Fetch Viewer Taste
        const viewerRes = await db.select({ taste_result: users.taste_result })
            .from(users)
            .where(eq(users.id, viewerId))
            .limit(1);

        if (viewerRes.length === 0 || !viewerRes[0].taste_result) {
            return res.json({ error: "Viewer has no taste profile" });
        }
        const viewerScores = (viewerRes[0].taste_result as any).scores;

        // 2. Fetch Reviewers
        // Replicating logic from enricher.ts roughly but with more debug info
        const rows = await db.execute(sql.raw(`
            SELECT 
                u.id as user_id, 
                u.nickname,
                u.taste_cluster,
                u.taste_result,
                ur.rank,
                (SELECT count(*) FROM users_ranking WHERE user_id = u.id) as total_cnt
            FROM content c
            JOIN users u ON c.user_id = u.id
            JOIN users_ranking ur ON ur.user_id = u.id AND ur.shop_id = (c.review_prop->>'shop_id')::int
            WHERE c.type = 'review'
              AND c.is_deleted = false
              AND (c.review_prop->>'shop_id')::int = ${shopId}
        `));

        const reviewers = rows.rows.map((row: any) => {
            const tResult = typeof row.taste_result === 'string' ? JSON.parse(row.taste_result) : row.taste_result;
            return {
                userId: row.user_id,
                nickname: row.nickname,
                rankPosition: row.rank,
                totalRankedCount: Number(row.total_cnt),
                tasteScores: tResult?.scores || null
            };
        });

        const debugInfo = reviewers.map((r: any) => {
            if (!r.tasteScores) return { ...r, eligible: false, reason: "No taste scores" };
            if (r.totalRankedCount < 100) return { ...r, eligible: false, reason: "Rank count < 100" };

            // Calculate components
            const match = calculateTasteMatch(viewerScores, r.tasteScores);
            const power = options?.power ?? 2;
            const weight = Math.pow(match / 100, power);

            let percentile = 1.0;
            if (r.totalRankedCount > 1) {
                percentile = 1.0 - ((r.rankPosition - 1) / (r.totalRankedCount - 1));
            }
            const satisfaction = (2 * percentile) - 1;

            return {
                ...r,
                eligible: true,
                match_score: match,
                weight: weight,
                satisfaction: satisfaction,
                percentile: percentile
            };
        });

        const score = calculateShopMatchScore(viewerScores, reviewers, options);

        res.json({
            score,
            reviewers: debugInfo,
            viewerScores,
            params: options
        });

    } catch (error: any) {
        console.error("Simulation error:", error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/admin/shop-content
 * 특정 샵의 유저 랭킹과 리뷰 만족도를 일괄 변경
 * Body: { shopId: number, percentage: 0-100, rank: number, satisfaction?: string }
 */
router.post("/shop-content", async (req, res) => {
  try {
    const { shopId, percentage, rank, satisfaction = "good" } = req.body;

    // 입력 검증
    if (!shopId || typeof shopId !== "number") {
      return res.status(400).json({ error: "shopId (number) is required" });
    }
    if (percentage === undefined || percentage < 0 || percentage > 100) {
      return res.status(400).json({ error: "percentage must be between 0-100" });
    }
    if (!rank || rank < 1) {
      return res.status(400).json({ error: "rank must be >= 1" });
    }

    console.log(`\n🔧 Admin: Updating shop ${shopId} rankings`);
    console.log(`   Percentage: ${percentage}%`);
    console.log(`   Target Rank: ${rank}`);
    console.log(`   Satisfaction: ${satisfaction}`);

    // 1. 해당 샵을 방문한 유저 찾기
    const allRankings = await db
      .select({
        id: users_ranking.id,
        user_id: users_ranking.user_id,
        rank: users_ranking.rank,
        satisfaction_tier: users_ranking.satisfaction_tier,
        account_id: users.account_id,
        nickname: users.nickname,
      })
      .from(users_ranking)
      .innerJoin(users, eq(users_ranking.user_id, users.id))
      .where(eq(users_ranking.shop_id, shopId));

    if (allRankings.length === 0) {
      return res.status(404).json({ error: "No users found for this shop" });
    }

    // 2. percentage에 따라 유저 선택
    const targetCount = Math.ceil((allRankings.length * percentage) / 100);
    const shuffled = [...allRankings].sort(() => Math.random() - 0.5);
    const selectedUsers = shuffled.slice(0, targetCount);

    console.log(`   Total users: ${allRankings.length}`);
    console.log(`   Selected users: ${selectedUsers.length}`);

    let updatedRankings = 0;
    let updatedReviews = 0;

    // 3. 선택된 유저들의 랭킹 변경
    for (const ranking of selectedUsers) {
      const userId = ranking.user_id;
      const currentRank = ranking.rank;

      await db.transaction(async (tx) => {
        // 기존 랭킹 조정
        if (currentRank > rank) {
          // 목표 순위보다 낮은 경우: rank ~ currentRank-1 사이를 +1
          await tx
            .update(users_ranking)
            .set({
              rank: sql`${users_ranking.rank} + 1`,
              updated_at: new Date(),
            })
            .where(
              and(
                eq(users_ranking.user_id, userId),
                sql`${users_ranking.rank} >= ${rank} AND ${users_ranking.rank} < ${currentRank}`
              )
            );
        } else if (currentRank < rank) {
          // 목표 순위보다 높은 경우: currentRank+1 ~ rank 사이를 -1
          await tx
            .update(users_ranking)
            .set({
              rank: sql`${users_ranking.rank} - 1`,
              updated_at: new Date(),
            })
            .where(
              and(
                eq(users_ranking.user_id, userId),
                sql`${users_ranking.rank} > ${currentRank} AND ${users_ranking.rank} <= ${rank}`
              )
            );
        }

        // 해당 샵을 목표 순위로 변경
        await tx
          .update(users_ranking)
          .set({
            rank: rank,
            satisfaction_tier: 2,
            updated_at: new Date(),
          })
          .where(
            and(
              eq(users_ranking.user_id, userId),
              eq(users_ranking.shop_id, shopId)
            )
          );
      });

      updatedRankings++;
    }

    // 4. 선택된 유저들의 리뷰 만족도 변경
    const selectedUserIds = selectedUsers.map((u) => u.user_id);

    if (selectedUserIds.length > 0) {
      const reviews = await db
        .select({
          id: content.id,
          review_prop: content.review_prop,
        })
        .from(content)
        .where(
          and(
            eq(content.type, "review"),
            sql`${content.review_prop}->>'shop_id' = ${shopId.toString()}`,
            inArray(content.user_id, selectedUserIds)
          )
        );

      for (const review of reviews) {
        const reviewProp = review.review_prop as any;
        const updatedReviewProp = {
          ...reviewProp,
          satisfaction: satisfaction,
        };

        await db
          .update(content)
          .set({
            review_prop: updatedReviewProp,
            updated_at: new Date(),
          })
          .where(eq(content.id, review.id));

        updatedReviews++;
      }
    }

    // 5. 캐시 삭제
    let clearedCacheKeys = 0;
    if (redis) {
      // 샵 상세 캐시
      await redis.del(`shop:${shopId}`);
      clearedCacheKeys++;

      // 리뷰 캐시
      const reviewKeys = await redis.keys(`shop:${shopId}:reviews:*`);
      if (reviewKeys.length > 0) {
        await redis.del(...reviewKeys);
        clearedCacheKeys += reviewKeys.length;
      }
    }

    console.log(`✅ Updated ${updatedRankings} rankings`);
    console.log(`✅ Updated ${updatedReviews} reviews`);
    console.log(`✅ Cleared ${clearedCacheKeys} cache keys\n`);

    res.json({
      success: true,
      shopId,
      totalUsers: allRankings.length,
      selectedUsers: selectedUsers.length,
      percentage,
      targetRank: rank,
      satisfaction,
      updatedRankings,
      updatedReviews,
      clearedCacheKeys,
      selectedUserAccounts: selectedUsers.map(u => u.account_id),
    });
  } catch (error) {
    console.error("Admin shop-content error:", error);
    res.status(500).json({ error: "Failed to update shop content" });
  }
});

async function recalculateRankings() {
    console.log("Recalculating user rankings...");
    try {
        // Clear existing rankings logic?
        // If mode is append, we might just want to re-run for all users to be safe,
        // or just affected ones. Since we don't track affected users easily here, redo all.
        // Or if overwrite, table was empty anyway (for content), but users_ranking wasn't truncated above?
        // Note: The logic above only truncates 'shops' or 'content'. 
        // If we overwrite content, we should essentially rebuild rankings.
        // If we append content, we should rebuild rankings to include new ones.
        // Safest is to truncate users_ranking and rebuild from current content.

        await db.execute(sql`TRUNCATE TABLE users_ranking CASCADE`);

        // Fetch all legitimate content with review data
        // We need: user_id, review_prop (satisfaction, visit_date, shop_id)
        const allContent = await db.select({
            userId: content.user_id,
            reviewProp: content.review_prop,
        }).from(content).where(eq(content.type, 'review'));

        // Fetch all legitimate shop IDs
        const allShops = await db.select({ id: shops.id }).from(shops);
        const validShopIds = new Set(allShops.map(s => s.id));

        // Group by user
        const userMap = new Map<number, any[]>();

        for (const item of allContent) {
            if (!item.reviewProp) continue;
            // drizzle-orm jsonb is typed as unknown or any often, cast safely
            const prop = item.reviewProp as any;
            const shopId = prop.shop_id;
            const satisfaction = prop.satisfaction; // 'best', 'good', 'ok', 'bad'
            const visitDate = prop.visit_date ? new Date(prop.visit_date) : new Date(0); // fallback old date

            if (!shopId || !satisfaction) continue;

            // Validate shop exists
            if (!validShopIds.has(shopId)) {
                console.warn(`Skipping ranking for content ${item.reviewProp} - invalid shop_id ${shopId}`);
                continue;
            }

            if (!userMap.has(item.userId)) {
                userMap.set(item.userId, []);
            }
            userMap.get(item.userId)?.push({
                shopId,
                satisfaction,
                visitDate
            });
        }

        const satisfactionOrder: Record<string, number> = {
            'best': 1,
            'good': 2,
            'ok': 3,
            'bad': 4
        };

        const batchInsert: any[] = [];

        for (const [userId, reviews] of userMap.entries()) {
            // Deduplicate shops: keep the one with highest priority (Best > Good...) or Latest?
            // Usually if I visit a place twice, once Best once Good, what is it?
            // Logic: "Most recent visit_date... high rank".
            // But we group by satisfaction.
            // Let's treat each unique shop as one entry.
            // If strictly ranking SHOPS, we need to pick ONE representative satisfaction/date for that shop for that user.
            // Assumption: Use the LATEST visit for that shop to determine its stats.

            const shopMap = new Map<number, any>();
            for (const r of reviews) {
                if (!shopMap.has(r.shopId)) {
                    shopMap.set(r.shopId, r);
                } else {
                    const existing = shopMap.get(r.shopId);
                    if (r.visitDate > existing.visitDate) {
                        shopMap.set(r.shopId, r);
                    }
                }
            }

            const uniqueShops = Array.from(shopMap.values());

            // Sort: Satisfaction Tier ASC, then Visit Date DESC
            uniqueShops.sort((a, b) => {
                const tierA = satisfactionOrder[a.satisfaction?.toLowerCase()] || 5;
                const tierB = satisfactionOrder[b.satisfaction?.toLowerCase()] || 5;

                if (tierA !== tierB) {
                    return tierA - tierB;
                }
                return b.visitDate.getTime() - a.visitDate.getTime();
            });

            // Prepare records
            uniqueShops.forEach((shop, index) => {
                batchInsert.push({
                    user_id: userId,
                    shop_id: shop.shopId,
                    rank: index + 1, // 1-based rank
                    satisfaction_tier: satisfactionOrder[shop.satisfaction?.toLowerCase()] || 2,
                });
            });
        }

        // Batch insert
        if (batchInsert.length > 0) {
            // splitting into chunks if huge? for now blindly insert
            const chunkSize = 1000;
            for (let i = 0; i < batchInsert.length; i += chunkSize) {
                await db.insert(users_ranking).values(batchInsert.slice(i, i + chunkSize));
            }
        }
        console.log(`Recalculated rankings for ${batchInsert.length} entries.`);

    } catch (e) {
        console.error("Failed to recalculate rankings:", e);
        // Don't fail the whole request, but log error
    }
}

// ============================================
// Shop Category Scraping (Firecrawl)
// ============================================

// 개별 shop 카테고리 스크래핑
router.post("/shop/:id/scrape-category", async (req, res) => {
    try {
        const shopId = parseInt(req.params.id);

        if (isNaN(shopId)) {
            return res.status(400).json({ error: "Invalid shop ID" });
        }

        // Shop 조회
        const shop = await db.select({
            id: shops.id,
            name: shops.name,
            google_place_id: shops.google_place_id,
            food_kind: shops.food_kind
        })
            .from(shops)
            .where(eq(shops.id, shopId))
            .limit(1);

        if (shop.length === 0) {
            return res.status(404).json({ error: "Shop not found" });
        }

        const shopData = shop[0];

        if (!shopData.google_place_id) {
            return res.status(400).json({
                error: "Shop has no google_place_id",
                shop: shopData
            });
        }

        // Firecrawl로 스크래핑
        console.log(`[Admin] Scraping category for shop ${shopId}: ${shopData.name}`);
        const result = await scrapeGoogleMapsCategory(shopData.google_place_id);

        res.json({
            shopId: shopData.id,
            shopName: shopData.name,
            currentFoodKind: shopData.food_kind,
            scrapedCategory: result.category,
            allCategories: result.allCategories,
            scrapedShopName: result.shopName,
            scrapedAddress: result.address,
            error: result.error
        });

    } catch (error: any) {
        console.error("[Admin] Scrape category error:", error);
        res.status(500).json({ error: "Failed to scrape category", details: error.message });
    }
});

// 개별 shop food_kind 업데이트
router.patch("/shop/:id/food-kind", async (req, res) => {
    try {
        const shopId = parseInt(req.params.id);
        const { food_kind } = req.body;

        if (isNaN(shopId)) {
            return res.status(400).json({ error: "Invalid shop ID" });
        }

        if (!food_kind || typeof food_kind !== 'string') {
            return res.status(400).json({ error: "food_kind is required" });
        }

        // 업데이트
        await db.update(shops)
            .set({ food_kind, updated_at: new Date() })
            .where(eq(shops.id, shopId));

        // 캐시 삭제
        if (redis) {
            await redis.del(`shop:${shopId}`);
        }

        res.json({ success: true, shopId, food_kind });

    } catch (error: any) {
        console.error("[Admin] Update food_kind error:", error);
        res.status(500).json({ error: "Failed to update food_kind", details: error.message });
    }
});

// 배치 카테고리 스크래핑
router.post("/shops/scrape-categories", async (req, res) => {
    try {
        const { shopIds, onlyGeneric = true, limit = 50 } = req.body;

        // 일반적인 food_kind 목록 (이것들만 업데이트 대상)
        const genericFoodKinds = [
            'restaurant', 'food', '음식점', 'Restaurant', 'Food',
            null, '', undefined
        ];

        // Shop 목록 조회
        const whereCondition = shopIds && Array.isArray(shopIds) && shopIds.length > 0
            ? and(isNotNull(shops.google_place_id), inArray(shops.id, shopIds))
            : isNotNull(shops.google_place_id);

        let shopList = await db.select({
            id: shops.id,
            name: shops.name,
            google_place_id: shops.google_place_id,
            food_kind: shops.food_kind
        })
            .from(shops)
            .where(whereCondition)
            .limit(limit);

        // onlyGeneric 필터
        if (onlyGeneric) {
            shopList = shopList.filter(s =>
                !s.food_kind || genericFoodKinds.includes(s.food_kind)
            );
        }

        console.log(`[Admin] Batch scraping ${shopList.length} shops...`);

        const results: Array<{
            shopId: number;
            shopName: string;
            oldFoodKind: string | null;
            newCategory: string | null;
            status: 'success' | 'failed' | 'skipped';
            error?: string;
        }> = [];

        for (const shop of shopList) {
            if (!shop.google_place_id) {
                results.push({
                    shopId: shop.id,
                    shopName: shop.name,
                    oldFoodKind: shop.food_kind,
                    newCategory: null,
                    status: 'skipped',
                    error: 'No google_place_id'
                });
                continue;
            }

            try {
                const scrapeResult = await scrapeGoogleMapsCategory(shop.google_place_id);

                if (scrapeResult.error) {
                    results.push({
                        shopId: shop.id,
                        shopName: shop.name,
                        oldFoodKind: shop.food_kind,
                        newCategory: null,
                        status: 'failed',
                        error: scrapeResult.error
                    });
                } else if (scrapeResult.category) {
                    results.push({
                        shopId: shop.id,
                        shopName: shop.name,
                        oldFoodKind: shop.food_kind,
                        newCategory: scrapeResult.category,
                        status: 'success'
                    });
                } else {
                    results.push({
                        shopId: shop.id,
                        shopName: shop.name,
                        oldFoodKind: shop.food_kind,
                        newCategory: null,
                        status: 'skipped',
                        error: 'No category found'
                    });
                }

                // Rate limiting (Firecrawl API 보호)
                await sleep(1500);

            } catch (error: any) {
                results.push({
                    shopId: shop.id,
                    shopName: shop.name,
                    oldFoodKind: shop.food_kind,
                    newCategory: null,
                    status: 'failed',
                    error: error.message
                });
            }
        }

        const summary = {
            total: results.length,
            success: results.filter(r => r.status === 'success').length,
            failed: results.filter(r => r.status === 'failed').length,
            skipped: results.filter(r => r.status === 'skipped').length
        };

        res.json({ summary, results });

    } catch (error: any) {
        console.error("[Admin] Batch scrape error:", error);
        res.status(500).json({ error: "Batch scraping failed", details: error.message });
    }
});

// 배치 결과 적용 (food_kind 일괄 업데이트)
router.post("/shops/apply-categories", async (req, res) => {
    try {
        const { updates } = req.body;
        // updates: Array<{ shopId: number, food_kind: string }>

        if (!updates || !Array.isArray(updates) || updates.length === 0) {
            return res.status(400).json({ error: "updates array is required" });
        }

        let updated = 0;
        const clearedCacheKeys: string[] = [];

        for (const { shopId, food_kind } of updates) {
            if (!shopId || !food_kind) continue;

            await db.update(shops)
                .set({ food_kind, updated_at: new Date() })
                .where(eq(shops.id, shopId));

            if (redis) {
                await redis.del(`shop:${shopId}`);
                clearedCacheKeys.push(`shop:${shopId}`);
            }

            updated++;
        }

        res.json({
            success: true,
            updated,
            clearedCacheKeys
        });

    } catch (error: any) {
        console.error("[Admin] Apply categories error:", error);
        res.status(500).json({ error: "Failed to apply categories", details: error.message });
    }
});
