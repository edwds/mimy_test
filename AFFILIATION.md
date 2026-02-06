# 소속 등록 시스템 (Affiliation System)

그룹(회사/학교) 및 동네 등록을 통해 소속별 리더보드를 제공하는 기능입니다.

---

## 개요

### 기능
- **그룹 등록**: 회사/학교 이메일 인증을 통한 소속 등록
- **동네 등록**: GPS 위치 기반 동네 등록
- **소속별 리더보드**: 같은 그룹/동네 사용자들의 랭킹 확인

### 제한사항
- **쿨다운**: 그룹/동네 변경은 30일에 1회만 가능
- **이메일 중복**: 하나의 회사 이메일은 한 명만 사용 가능
- **Rate Limit**: 인증 이메일은 시간당 3회까지 발송 가능

---

## 아키텍처

### 데이터베이스 스키마

```
users 테이블 (확장 컬럼)
├── group_id          # 소속 그룹 ID (FK → groups.id)
├── group_email       # 인증된 회사/학교 이메일
├── group_joined_at   # 그룹 가입 시점
├── neighborhood      # 동네 (형식: "KR:서울특별시 강남구")
└── neighborhood_joined_at  # 동네 등록 시점

groups 테이블
├── id
├── name              # "캐치테이블", "서울대학교"
├── type              # 'COMPANY' | 'SCHOOL'
├── allowed_domains[] # ['catchtable.co.kr', 'catchtable.com']
├── logo_url
└── is_active

email_verifications 테이블
├── id
├── email
├── user_id
├── code              # 6자리 인증 코드
├── expires_at        # 5분 후 만료
├── attempts          # 최대 5회 시도
├── is_verified
└── verified_at

leaderboard 테이블
├── type              # 'OVERALL' | 'COMPANY' | 'NEIGHBORHOOD'
├── key               # 그룹명 또는 동네명 (OVERALL은 null)
├── user_id
├── rank
├── score
└── stats             # { content_count, received_likes }
```

### 서비스 구조

```
server/
├── routes/affiliation.ts      # API 엔드포인트
├── services/
│   ├── EmailService.ts        # Resend API 이메일 발송
│   ├── GeocodingService.ts    # MapTiler 역지오코딩
│   └── LeaderboardService.ts  # 리더보드 계산 및 실시간 추가
```

---

## API 엔드포인트

### 그룹 (회사/학교) 관련

| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/api/affiliation/groups` | 등록 가능한 그룹 목록 |
| POST | `/api/affiliation/email/send-code` | 인증 코드 이메일 발송 |
| POST | `/api/affiliation/email/verify` | 코드 검증 및 그룹 등록 |
| DELETE | `/api/affiliation/group` | 그룹 탈퇴 |

### 동네 관련

| Method | Endpoint | 설명 |
|--------|----------|------|
| POST | `/api/affiliation/neighborhood` | GPS 기반 동네 등록 |
| DELETE | `/api/affiliation/neighborhood` | 동네 해제 |

### 상태 조회

| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/api/affiliation/status` | 현재 그룹/동네 등록 상태 |

---

## 플로우

### 1. 그룹 등록 플로우

```
[사용자] 회사 이메일 입력 (name@company.com)
    ↓
[서버] 도메인 추출 → groups 테이블에서 매칭 확인
    ↓
[서버] 이메일 중복 체크, 쿨다운 체크, Rate Limit 체크
    ↓
[서버] 6자리 인증 코드 생성 → email_verifications 저장 (5분 TTL)
    ↓
[서버] Resend API로 이메일 발송
    ↓
[사용자] 인증 코드 입력
    ↓
[서버] 코드 검증 → users.group_id 업데이트
    ↓
[서버] LeaderboardService.addUserToLeaderboard() 호출
    ↓
[완료] 그룹 리더보드에 즉시 반영
```

### 2. 동네 등록 플로우

```
[사용자] "현재 위치로 등록" 버튼 클릭
    ↓
[프론트] navigator.geolocation.getCurrentPosition()
    ↓
[프론트] MapTiler Geocoding API 호출 (역지오코딩)
    ↓
[프론트] 한국 행정구역 파싱:
         - 특별시/광역시: 시 + 구 (서울특별시 강남구)
         - 도: 도 + 시/군 (경기도 성남시)
    ↓
[사용자] 감지된 위치 확인 후 등록
    ↓
[서버] 쿨다운 체크 → users.neighborhood 업데이트
    ↓
[서버] LeaderboardService.addUserToLeaderboard() 호출
    ↓
[완료] 동네 리더보드에 즉시 반영
```

---

## 한국 행정구역 파싱 로직

위치: `src/screens/profile/NeighborhoodRegistrationScreen.tsx:extractNeighborhood()`

### 규칙
1. **특별시/광역시** (서울, 부산, 대구, 인천, 광주, 대전, 울산, 세종)
   - 형식: `{시} {구}` (예: 서울특별시 강남구)

2. **도** (경기도, 강원도, 충청도 등)
   - 형식: `{도} {시/군}` (예: 경기도 성남시, 강원도 홍천군)

### POI 필터링
다음 패턴이 포함된 텍스트는 제외:
- 테크노밸리, 산업단지, 공단, 타워, 빌딩, 몰, 센터
- Tower, Building, Mall, Center, Station, 역

### 저장 형식
```
{국가코드}:{행정구역}
예: KR:서울특별시 강남구
예: KR:경기도 성남시
예: JP:東京都 渋谷区
```

---

## 리더보드 연동

### 점수 계산
```typescript
score = (content_count * 5) + (received_likes * 3)
```

### 실시간 업데이트
사용자가 그룹/동네 등록 시 `LeaderboardService.addUserToLeaderboard()` 호출:
1. 사용자의 현재 점수 계산
2. 해당 리더보드에 이미 존재하면 점수 업데이트
3. 없으면 마지막 순위로 추가
4. Redis 캐시 무효화

### 캐싱
- 키 패턴: `leaderboard:{type}:{key}:*`
- 신규 등록 시 해당 패턴 캐시 무효화

---

## 프론트엔드 화면

### 그룹 등록 화면
- 경로: `/profile/group`
- 컴포넌트: `src/screens/profile/GroupRegistrationScreen.tsx`
- 기능:
  - 현재 소속 그룹 표시
  - 회사/학교 이메일 입력
  - OTP 스타일 인증 코드 입력
  - 성공/에러 처리

### 동네 등록 화면
- 경로: `/profile/neighborhood`
- 컴포넌트: `src/screens/profile/NeighborhoodRegistrationScreen.tsx`
- 기능:
  - 현재 동네 표시
  - GPS 위치 감지 버튼
  - 감지된 위치 확인/등록
  - 쿨다운 안내

### 리더보드 탭
- 경로: `/main/ranking`
- 컴포넌트: `src/screens/main/LeaderboardTab.tsx`
- 기능:
  - FilterChip으로 그룹/동네/전체 전환
  - 등록되지 않은 경우 등록 유도 메시지
  - 유사 취향 필터링 옵션

---

## 환경 변수

```bash
# 이메일 발송 (Resend)
RESEND_API_KEY=re_xxxxx

# 지도/역지오코딩 (MapTiler)
VITE_MAPTILER_API_KEY=xxxxx
```

---

## 번역 키

### 한국어 (`public/locales/ko/translation.json`)
```json
{
  "leaderboard": {
    "filter_overall": "전체",
    "my_group": "내 그룹",
    "my_neighborhood": "내 동네",
    "no_company_registered": "등록된 학교 또는 회사가 없습니다",
    "no_neighborhood_registered": "등록된 동네가 없습니다",
    "register_company": "학교/회사 등록하기",
    "register_neighborhood": "동네 등록하기"
  },
  "profile": {
    "group": { ... },
    "neighborhood": { ... }
  }
}
```

---

## 관련 파일

### Backend
| 파일 | 설명 |
|------|------|
| `server/routes/affiliation.ts` | API 엔드포인트 |
| `server/services/EmailService.ts` | Resend 이메일 발송 |
| `server/services/GeocodingService.ts` | MapTiler 역지오코딩 |
| `server/services/LeaderboardService.ts` | 리더보드 관리 |
| `server/db/schema.ts` | groups, email_verifications 테이블 |

### Frontend
| 파일 | 설명 |
|------|------|
| `src/screens/profile/GroupRegistrationScreen.tsx` | 그룹 등록 화면 |
| `src/screens/profile/NeighborhoodRegistrationScreen.tsx` | 동네 등록 화면 |
| `src/screens/main/LeaderboardTab.tsx` | 리더보드 탭 |
| `src/context/UserContext.tsx` | 사용자 그룹/동네 정보 캐싱 |

---

## 디버깅

### 문제: 리더보드에 "등록하라"고 뜨는데 이미 등록함
1. `/api/auth/me` 응답에 `group_name` 포함되는지 확인
2. UserContext에서 `group_name`, `neighborhood` 캐싱 확인
3. Redis 캐시 무효화 확인: `leaderboard:*`

### 문제: 동네가 "판교테크노밸리"로 표시됨
- POI 필터링 로직 확인 (`extractNeighborhood` 함수)
- MapTiler 응답의 `features` 배열 구조 확인
- 행정구역 추출 우선순위: 시/도 → 구 → 시/군

### 문제: 인증 이메일이 오지 않음
1. Resend API 키 확인 (`RESEND_API_KEY`)
2. 도메인이 `groups.allowed_domains`에 등록되어 있는지 확인
3. Rate Limit (시간당 3회) 확인

---

## 변경 이력

### v1.0 (2026-02-06)
- 그룹/동네 등록 기능 구현
- 이메일 인증 (Resend API)
- GPS 기반 동네 등록 (MapTiler Geocoding)
- 리더보드 실시간 업데이트
- 한국 행정구역 파싱 로직
