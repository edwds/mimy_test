import { Router } from "express";
import { db } from "../db/index.js";
import { users_ranking } from "../db/schema.js";
import { eq, sql } from "drizzle-orm";
import { requireAuth } from "../middleware/auth.js";
import { getShopMatchScores } from "../utils/enricher.js";

const router = Router();

/**
 * GET /api/relay/shops
 * 릴레이 기록용 맛집 목록 조회
 * 3가지 소스에서 혼합:
 * 1. 근처 맛집 (위치 기반)
 * 2. 저장한 맛집 (users_wantstogo)
 * 3. 전체 추천 상위 (랜덤)
 *
 * 페이지네이션: offset 기반
 * 이미 랭킹한 맛집만 서버에서 제외 (seen_ids는 클라이언트에서 처리)
 */
router.get("/shops", requireAuth, async (req, res) => {
    try {
        const userId = req.user!.id;
        const lat = parseFloat(req.query.lat as string);
        const lon = parseFloat(req.query.lon as string);
        const radius = parseFloat(req.query.radius as string) || 10; // km, default 10km
        const batchSize = parseInt(req.query.batch_size as string) || 20;
        const offset = parseInt(req.query.offset as string) || 0;

        if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
            return res.status(400).json({ error: "Location (lat, lon) required" });
        }

        // 1. 사용자가 이미 랭킹한 매장 ID 목록 조회 (서버에서 제외)
        const rankedShops = await db.select({ shop_id: users_ranking.shop_id })
            .from(users_ranking)
            .where(eq(users_ranking.user_id, userId));

        const rankedIds = rankedShops.map(r => r.shop_id);

        const R = 6371; // 지구 반경 (km)

        // 제외 조건 SQL (이미 랭킹한 것만)
        const excludeClause = rankedIds.length > 0
            ? sql`AND s.id NOT IN (${sql.join(rankedIds.map(id => sql`${id}`), sql`, `)})`
            : sql``;

        // 각 소스별로 가져올 개수
        const nearbyLimit = Math.ceil(batchSize * 0.5);  // 50% 근처
        const savedLimit = Math.ceil(batchSize * 0.25); // 25% 저장
        const globalLimit = Math.ceil(batchSize * 0.25); // 25% 전체

        // Offset 분배 (단순화: 전체 offset을 근처에만 적용)
        const nearbyOffset = offset;

        // ========== 소스 1: 근처 맛집 ==========
        const nearbyQuery = sql`
            SELECT
                s.id,
                s.name,
                s.description,
                s.thumbnail_img,
                s.food_kind,
                s.address_full,
                s.address_region,
                s.lat,
                s.lon,
                'nearby' as source,
                (${R} * acos(
                    LEAST(1.0, GREATEST(-1.0,
                        cos(radians(${lat})) * cos(radians(s.lat)) *
                        cos(radians(s.lon) - radians(${lon})) +
                        sin(radians(${lat})) * sin(radians(s.lat))
                    ))
                )) as distance_km
            FROM shops s
            WHERE s.visibility = true
                ${excludeClause}
                AND s.lat IS NOT NULL
                AND s.lon IS NOT NULL
                AND (${R} * acos(
                    LEAST(1.0, GREATEST(-1.0,
                        cos(radians(${lat})) * cos(radians(s.lat)) *
                        cos(radians(s.lon) - radians(${lon})) +
                        sin(radians(${lat})) * sin(radians(s.lat))
                    ))
                )) <= ${radius}
            ORDER BY distance_km ASC
            LIMIT ${nearbyLimit + 1}
            OFFSET ${nearbyOffset}
        `;

        // ========== 소스 2: 저장한 맛집 ==========
        const savedQuery = sql`
            SELECT
                s.id,
                s.name,
                s.description,
                s.thumbnail_img,
                s.food_kind,
                s.address_full,
                s.address_region,
                s.lat,
                s.lon,
                'saved' as source,
                CASE
                    WHEN s.lat IS NOT NULL AND s.lon IS NOT NULL THEN
                        (${R} * acos(
                            LEAST(1.0, GREATEST(-1.0,
                                cos(radians(${lat})) * cos(radians(s.lat)) *
                                cos(radians(s.lon) - radians(${lon})) +
                                sin(radians(${lat})) * sin(radians(s.lat))
                            ))
                        ))
                    ELSE 9999
                END as distance_km
            FROM shops s
            INNER JOIN users_wantstogo w ON w.shop_id = s.id AND w.user_id = ${userId}
            WHERE s.visibility = true
                ${excludeClause}
            ORDER BY w.created_at DESC
            LIMIT ${savedLimit}
            OFFSET ${Math.floor(offset / 2)}
        `;

        // ========== 소스 3: 전체 추천 (랜덤) ==========
        const globalQuery = sql`
            SELECT
                s.id,
                s.name,
                s.description,
                s.thumbnail_img,
                s.food_kind,
                s.address_full,
                s.address_region,
                s.lat,
                s.lon,
                'global' as source,
                CASE
                    WHEN s.lat IS NOT NULL AND s.lon IS NOT NULL THEN
                        (${R} * acos(
                            LEAST(1.0, GREATEST(-1.0,
                                cos(radians(${lat})) * cos(radians(s.lat)) *
                                cos(radians(s.lon) - radians(${lon})) +
                                sin(radians(${lat})) * sin(radians(s.lat))
                            ))
                        ))
                    ELSE 9999
                END as distance_km
            FROM shops s
            WHERE s.visibility = true
                ${excludeClause}
            ORDER BY RANDOM()
            LIMIT ${globalLimit * 2}
        `;

        // 병렬 쿼리 실행
        const [nearbyResult, savedResult, globalResult] = await Promise.all([
            db.execute(nearbyQuery),
            db.execute(savedQuery),
            db.execute(globalQuery)
        ]);

        const nearbyRows = nearbyResult.rows as any[];
        const savedRows = savedResult.rows as any[];
        const globalRows = globalResult.rows as any[];

        // has_more 판단 (nearby 기준)
        const hasMoreNearby = nearbyRows.length > nearbyLimit;
        const nearbyTrimmed = nearbyRows.slice(0, nearbyLimit);

        // 중복 제거 (nearby, saved에 있는 것은 global에서 제외)
        const usedIds = new Set([
            ...nearbyTrimmed.map(r => r.id),
            ...savedRows.map(r => r.id)
        ]);
        const uniqueGlobalRows = globalRows
            .filter(r => !usedIds.has(r.id))
            .slice(0, globalLimit);

        // 합치기
        const allRows = [...savedRows, ...nearbyTrimmed, ...uniqueGlobalRows];

        if (allRows.length === 0) {
            return res.json({
                shops: [],
                has_more: false
            });
        }

        // 매칭 점수 배치 계산
        const shopIds = allRows.map(r => r.id);
        const matchScoresMap = await getShopMatchScores(shopIds, userId);

        // 응답 데이터 구성
        const shopsData = allRows.map(row => ({
            id: row.id,
            name: row.name,
            description: row.description,
            thumbnail_img: row.thumbnail_img,
            food_kind: row.food_kind,
            address_full: row.address_full,
            address_region: row.address_region,
            shop_user_match_score: matchScoresMap.get(row.id) ?? null,
            distance_km: row.distance_km ? Math.round(parseFloat(row.distance_km) * 10) / 10 : 0,
            source: row.source as 'nearby' | 'saved' | 'global'
        }));

        // 정렬: 저장한 곳 먼저, 그 다음 매칭 점수 순
        shopsData.sort((a, b) => {
            if (a.source === 'saved' && b.source !== 'saved') return -1;
            if (b.source === 'saved' && a.source !== 'saved') return 1;
            const scoreA = a.shop_user_match_score ?? -1;
            const scoreB = b.shop_user_match_score ?? -1;
            return scoreB - scoreA;
        });

        res.json({
            shops: shopsData,
            has_more: hasMoreNearby || uniqueGlobalRows.length > 0
        });

    } catch (error) {
        console.error("[Relay] shops error:", error);
        res.status(500).json({ error: "Failed to fetch relay shops" });
    }
});

export default router;
