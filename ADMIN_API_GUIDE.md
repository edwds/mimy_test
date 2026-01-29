# Admin Shop Content API 사용 가이드

## 개요
특정 레스토랑의 유저 랭킹과 리뷰 만족도를 일괄 변경하는 관리자 API입니다.

## 사용 방법

### 방법 1: 웹 페이지 사용 (권장) 🎯
앱에서 `/admin/shop-content` 경로로 접속하면 간편한 웹 인터페이스를 사용할 수 있습니다.

**접속 방법:**
1. 앱 실행 후 로그인
2. `/admin` 페이지로 이동
3. "Shop Content" 카드 클릭
4. 또는 직접 `/admin/shop-content` URL로 접속

**사용 방법:**
- Shop ID 입력
- 슬라이더로 변경할 유저 비율 선택 (0-100%)
- 목표 순위 입력
- 만족도 선택 (best/good/ok/bad)
- "실행하기" 버튼 클릭

### 방법 2: API 직접 호출
```
POST /api/admin/shop-content
```

## 요청 파라미터

| 필드 | 타입 | 필수 | 설명 | 예시 |
|------|------|------|------|------|
| `shopId` | number | ✅ | 변경할 레스토랑 ID | `158` |
| `percentage` | number | ✅ | 변경할 유저 비율 (0-100%) | `50` |
| `rank` | number | ✅ | 목표 순위 (1 이상) | `1` |
| `satisfaction` | string | ❌ | 만족도 (기본값: "good") | `"good"` |

## 요청 예시

### 1. 158번 샵, 50% 유저를 1위로 변경
```bash
curl -X POST "http://localhost:3001/api/admin/shop-content" \
  -H "Content-Type: application/json" \
  -d '{
    "shopId": 158,
    "percentage": 50,
    "rank": 1,
    "satisfaction": "good"
  }'
```

### 2. 5043번 샵, 100% 유저를 1위로 변경
```bash
curl -X POST "http://localhost:3001/api/admin/shop-content" \
  -H "Content-Type: application/json" \
  -d '{
    "shopId": 5043,
    "percentage": 100,
    "rank": 1
  }'
```

### 3. 209번 샵, 30% 유저를 5위로 변경
```bash
curl -X POST "http://localhost:3001/api/admin/shop-content" \
  -H "Content-Type: application/json" \
  -d '{
    "shopId": 209,
    "percentage": 30,
    "rank": 5,
    "satisfaction": "good"
  }'
```

## 응답 예시

### 성공 응답 (200 OK)
```json
{
  "success": true,
  "shopId": 158,
  "totalUsers": 49,
  "selectedUsers": 5,
  "percentage": 10,
  "targetRank": 1,
  "satisfaction": "good",
  "updatedRankings": 5,
  "updatedReviews": 5,
  "clearedCacheKeys": 3,
  "selectedUserAccounts": [
    "ksiwoo4279",
    "cyeji5107",
    "meun5576",
    "ksu2931",
    "ujihu5525"
  ]
}
```

### 에러 응답

#### 400 Bad Request - 잘못된 파라미터
```json
{
  "error": "shopId (number) is required"
}
```

```json
{
  "error": "percentage must be between 0-100"
}
```

```json
{
  "error": "rank must be >= 1"
}
```

#### 404 Not Found - 유저가 없음
```json
{
  "error": "No users found for this shop"
}
```

#### 500 Internal Server Error
```json
{
  "error": "Failed to update shop content"
}
```

## 동작 방식

### 1. 유저 선택
- 해당 샵을 방문한 전체 유저 중 `percentage`%만큼 **랜덤으로** 선택
- 예: 총 100명 중 50% = 50명 선택

### 2. 랭킹 변경
- 선택된 각 유저에 대해:
  - 기존 랭킹에서 목표 순위로 이동
  - 다른 샵들의 순위를 자동으로 조정
  - `satisfaction_tier`를 2 (Good)로 설정

### 3. 리뷰 만족도 변경
- 선택된 유저가 작성한 해당 샵의 리뷰를 찾아서
- `review_prop.satisfaction` 값을 `"good"`으로 변경

### 4. 캐시 삭제
- `shop:{shopId}` - 샵 상세 정보 캐시
- `shop:{shopId}:reviews:*` - 모든 리뷰 캐시
- 자동으로 갱신되어 앱에서 즉시 반영

## 주의사항

⚠️ **이 API는 데이터베이스를 직접 변경합니다!**

- 실행 전 반드시 파라미터를 확인하세요
- `percentage`가 높을수록 더 많은 유저가 영향을 받습니다
- 랜덤 선택이므로 같은 요청을 여러 번 실행하면 다른 유저가 선택될 수 있습니다
- 트랜잭션으로 처리되므로 중간에 실패하면 롤백됩니다

## 사용 시나리오

### 시나리오 1: 특정 레스토랑을 모든 유저의 1위로 만들기
```bash
# 158번 샵을 100% 유저의 1위로
curl -X POST "http://localhost:3001/api/admin/shop-content" \
  -H "Content-Type: application/json" \
  -d '{"shopId": 158, "percentage": 100, "rank": 1}'
```

### 시나리오 2: 일부 유저만 테스트
```bash
# 10% 유저만 먼저 테스트
curl -X POST "http://localhost:3001/api/admin/shop-content" \
  -H "Content-Type: application/json" \
  -d '{"shopId": 158, "percentage": 10, "rank": 1}'
```

### 시나리오 3: 중간 순위로 배치
```bash
# 50% 유저를 5위로 배치
curl -X POST "http://localhost:3001/api/admin/shop-content" \
  -H "Content-Type: application/json" \
  -d '{"shopId": 209, "percentage": 50, "rank": 5}'
```

## 확인 방법

API 실행 후 다음과 같이 확인할 수 있습니다:

1. **응답 확인**: `selectedUserAccounts` 배열에서 영향받은 유저 목록 확인
2. **앱에서 확인**: 해당 샵 상세 페이지에서 리뷰와 랭킹 확인 (캐시가 자동으로 삭제되므로 즉시 반영됨)
3. **데이터베이스 확인**:
   ```sql
   -- 특정 샵의 랭킹 확인
   SELECT u.account_id, ur.rank, ur.satisfaction_tier
   FROM users_ranking ur
   JOIN users u ON ur.user_id = u.id
   WHERE ur.shop_id = 158
   ORDER BY ur.rank;
   ```

## 백엔드 로그

API 실행 시 백엔드 콘솔에 다음과 같은 로그가 출력됩니다:

```
🔧 Admin: Updating shop 158 rankings
   Percentage: 10%
   Target Rank: 1
   Satisfaction: good
   Total users: 49
   Selected users: 5
✅ Updated 5 rankings
✅ Updated 5 reviews
✅ Cleared 3 cache keys
```

## 문제 해결

### Q: 캐시가 갱신되지 않는 것 같아요
A: API가 자동으로 캐시를 삭제하지만, 브라우저 캐시는 새로고침이 필요합니다.

### Q: 특정 유저만 선택하고 싶어요
A: 현재는 랜덤 선택만 지원합니다. 특정 유저를 지정하려면 직접 SQL을 실행하세요.

### Q: 만족도를 "best"나 "ok"로 변경하고 싶어요
A: `satisfaction` 파라미터에 `"best"`, `"good"`, `"ok"`, `"bad"` 중 하나를 전달하세요.

## 개발 참고

- 소스 코드: `server/routes/admin.ts` (line 245~410)
- 테스트 스크립트: `test-admin-api.sh`
- 관련 함수: `adjust-shop-*-ranking.ts` 스크립트들 참고

---

**마지막 업데이트**: 2026-01-30
**버전**: v1.0
