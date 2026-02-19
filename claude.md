# Mimy (미미) - Claude Code 작업 가이드

## 프로젝트 개요

**Mimy**는 "My Michelin for Me"의 약자로, 사용자의 미식 성향을 분석하여 개인화된 맛집 추천을 제공하는 소셜 미식 플랫폼입니다.

### 핵심 차별화 요소
- **32유형 MBTI 스타일 입맛 분류**: 7개 축 기반 → 4축 파생 + 안정성 지표 (예: HASP-A "선도자형 미식가")
  - 기존 128개 클러스터 + 7축 점수는 매칭 알고리즘용으로 유지
  - UI에서는 32유형 코드와 프로필 이름 표시
  - 상세: [TASTE_TYPE.md](TASTE_TYPE.md)
- **Shop User Match Score**: 0-100% 매칭 점수로 맛집 추천 (신뢰도 기반 알고리즘)
- **소셜 기능**: 리뷰, 팔로우, 좋아요, 댓글, 밸런스 게임
- **개인화된 랭킹**: Tier별 맛집 관리 (Good/OK/Bad)

---

## 기술 스택

### Frontend
- **프레임워크**: React 19.2.3 + TypeScript 5.9.3
- **빌드**: Vite 7.3.1
- **라우팅**: React Router DOM 7.12.0
- **스타일링**: Tailwind CSS 3.4.17
- **UI**: Radix UI, Lucide React, Framer Motion
- **지도**: MapTiler SDK 3.10.2
- **다국어**: i18next 25.7.4
- **모바일**: Capacitor 6.2.1 (iOS/Android)

### Backend
- **런타임**: Node.js + Express.js 5.2.1 + TypeScript
- **데이터베이스**: PostgreSQL (Neon Serverless) + Drizzle ORM 0.45.1
- **캐싱**: Upstash Redis 1.36.1
- **파일 저장**: Vercel Blob Storage
- **배포**: Vercel Serverless Functions

---

## Claude Code 작업 가이드라인

> 이 섹션은 Claude Code가 이 프로젝트에서 작업할 때 따라야 할 규칙입니다.

### UI/UX 변경 시 주의사항

1. **최소한의 변경 원칙**
   - UI 변경 요청 시 **최소한/미묘한 수정**부터 시작할 것
   - 명시적으로 요청하지 않는 한 '화려한' 또는 '눈에 띄는' 스타일링 금지
   - 원하는 시각적 강도가 불명확하면 먼저 확인 질문할 것

2. **시각적 동작 사전 확인**
   - 스크롤, 페이드, 클리핑, 애니메이션 등 **시각적 동작**을 구현하기 전에 계획된 접근 방식을 먼저 설명할 것
   - 예: "스크롤 시 오른쪽 끝에서 20px 지점부터 fade out 시작, 버튼 끝에서 완전 투명해지도록 maskImage를 적용할 예정입니다. 이 방식이 맞을까요?"
   - 이러한 요구사항은 종종 오해가 발생하므로 코드 작성 전 확인 필수

3. **'subtle' vs 'prominent' 명시**
   - 사용자가 'subtle tooltip', 'filled icon' 등 표현 사용 시 정확한 의미 확인
   - 기존 요소를 대체하는지 vs 새 요소를 추가하는지 명확히 파악

### 코드 작성 표준

1. **새 라이브러리 설치 금지**
   - 새로운 라이브러리나 의존성을 설치하기 전에 **반드시 사용자에게 먼저 확인**
   - 기존 프로젝트 의존성과 패턴 우선 사용
   - 예: 새 아이콘 라이브러리 대신 기존 Lucide React의 다른 variant 사용

2. **데이터 구조 접근 시 주의**
   - 중첩된 데이터 구조 접근 시 정확한 경로 확인
   - 예: `taste_result` vs `taste_result.scores` 구분 필수
   - API 응답 구조를 코드에서 직접 확인 후 접근

### Backend 패턴

1. **Express 라우트 순서**
   - 더 구체적인 라우트가 일반적인 라우트보다 **먼저** 정의되어야 함
   - 올바른 순서:
     ```typescript
     router.get('/users/me', ...)         // 구체적 라우트 먼저
     router.get('/users/recommendations', ...)
     router.get('/users/:id', ...)        // 파라미터 라우트는 나중에
     ```
   - 잘못된 순서 시 `/users/me`가 `/users/:id`에 매칭되어 버그 발생

2. **타입 안전성**
   - TypeScript 타입을 신뢰하되, 런타임에서 undefined/null 체크 필수
   - 특히 외부 API 응답이나 DB 쿼리 결과 처리 시

### 분석/가이드 작성 시

1. **코드베이스 특화 분석**
   - 마이그레이션, 리팩토링, 아키텍처 분석 요청 시 **반드시 실제 파일, 함수명, 라인 번호 참조**
   - 일반적인 고수준 가이드라인 금지
   - 예: "server/routes/users.ts:45-67의 getUserProfile 함수에서 N+1 쿼리가 발생합니다"

2. **변경 전 기존 코드 확인**
   - 수정 제안 전 반드시 해당 파일/함수를 먼저 읽고 이해
   - 기존 패턴과 일관성 유지

---

## 프로젝트 구조

```
mimy_test/
├── api/                      # Vercel Serverless API Entry
├── server/                   # Backend (3,704 lines)
│   ├── db/
│   │   ├── index.ts          # Neon DB Connection
│   │   └── schema.ts         # Drizzle Schema (342 lines)
│   ├── routes/               # API Routes (15 files)
│   │   ├── auth.ts           # 구글 로그인, 회원가입
│   │   ├── users.ts          # 프로필, 팔로우, 저장 맛집
│   │   ├── shops.ts          # 맛집 검색, 상세, Google Places
│   │   ├── content.ts        # 리뷰/포스트, 피드, 좋아요, 댓글
│   │   ├── ranking.ts        # 개인 랭킹 관리
│   │   ├── affiliation.ts    # 그룹/동네 등록
│   │   ├── quiz.ts           # 미식 성향 테스트
│   │   ├── vs.ts             # 밸런스 게임
│   │   ├── hate.ts           # 못 먹는 음식
│   │   └── ...
│   ├── services/
│   │   ├── LeaderboardService.ts  # 리더보드 계산 및 실시간 업데이트
│   │   ├── ListService.ts         # 리스트 조회
│   │   ├── EmailService.ts        # Resend 이메일 발송
│   │   └── GeocodingService.ts    # MapTiler 역지오코딩
│   ├── utils/
│   │   ├── match.ts          # Match Score 계산 (140 lines)
│   │   ├── enricher.ts       # 데이터 보강
│   │   └── quiz.ts           # 퀴즈 매니저
│   └── index.ts              # Express 서버 진입점
│
├── src/                      # Frontend (78 files)
│   ├── components/           # 재사용 컴포넌트 (22개)
│   │   ├── ui/               # Button, Input, Slider 등
│   │   ├── ContentCard.tsx   # 리뷰/포스트 카드 (52,897 chars)
│   │   ├── ShopCard.tsx      # 맛집 카드
│   │   ├── VsCard.tsx        # 밸런스 게임 카드
│   │   ├── MapContainer.tsx  # 지도 컨테이너
│   │   └── ImageViewer.tsx   # 이미지 뷰어 (Pinch Zoom)
│   ├── screens/              # 페이지 컴포넌트
│   │   ├── onboarding/       # Splash, Age Check, Agreement
│   │   ├── auth/             # 로그인
│   │   ├── register/         # 회원가입 (Phone, OTP, Profile)
│   │   ├── quiz/             # 미식 성향 테스트
│   │   ├── main/             # 메인 탭 (Home, Discovery, Ranking, Profile)
│   │   ├── write/            # 리뷰 작성 플로우
│   │   ├── shop/             # 맛집 상세
│   │   └── profile/          # 프로필 관련
│   ├── context/              # React Context
│   │   ├── UserContext.tsx   # 사용자 인증 및 전역 상태
│   │   └── RankingContext.tsx # 랭킹 오버레이 관리
│   ├── services/             # API 서비스 레이어
│   │   ├── UserService.ts
│   │   ├── ShopService.ts
│   │   ├── ContentService.ts
│   │   └── RankingService.ts
│   ├── hooks/                # Custom Hooks
│   ├── lib/                  # 유틸리티
│   └── App.tsx               # 라우팅 정의
│
├── drizzle/                  # DB 마이그레이션 파일
└── 설정 파일들 (vite.config.ts, capacitor.config.ts, etc.)
```

---

## 핵심 알고리즘: Shop User Match Score

위치: `server/utils/match.ts`

### 계산 로직

1. **신뢰할 수 있는 리뷰어 필터링**
   - 100개 이상 랭킹을 등록한 사용자만 사용
   - 최소 3명 이상 필요

2. **Rank Percentile 계산**
   ```typescript
   percentile = 1.0 - ((rank - 1) / (N - 1))
   ```

3. **Satisfaction Score (-1 ~ +1)**
   - Tier 2 (Good): 0.3 ~ 1.0
   - Tier 1 (OK): -0.2 ~ 0.2
   - Tier 0 (Bad): -1.0 ~ -0.3

4. **Weight 계산**
   ```typescript
   weight = (taste_match / 100) ^ 2.0
   ```

5. **Bayesian Average**
   ```typescript
   score_raw = (alpha * mu0 + sum(w*s)) / (alpha + sum(w))
   // alpha = 0.2 (prior weight)
   // mu0 = 0.0 (neutral prior)
   ```

6. **0-100 스케일 변환**
   ```typescript
   finalScore = 50 * (score_raw + 1)
   ```

---

## 주요 데이터베이스 테이블

### 핵심 테이블 (schema.ts:342)

- **users**: 사용자 정보, 미식 성향 (taste_result JSONB), 클러스터
- **shops**: 맛집 정보 (Google Places 연동)
- **users_ranking**: 사용자별 맛집 랭킹 (satisfaction_tier, rank)
  - **중요**: `rank`는 satisfaction_tier와 무관하게 **전체 순위**를 나타냄
  - **올바른 구조**: Good 1,2,3위 → OK 4,5,6위 → Bad 7,8,9위 (연속된 순위)
  - **잘못된 구조**: Good 1,2,3위, OK 1,2,3위, Bad 1,2,3위 (tier별 독립 순위)
  - `satisfaction_tier`: 2=Good, 1=OK, 0=Bad
  - 랭킹 재계산: `npx tsx server/scripts/fix-all-user-rankings-optimized.ts`
- **content**: 리뷰/포스트 (type: 'review' | 'post')
- **likes**: 좋아요 (content, comment)
- **comments**: 댓글 (parent_id로 대댓글 지원)
- **users_follow**: 팔로우 관계
- **quiz_matches**: 퀴즈 문항별 클러스터 매칭
- **vs**: 밸런스 게임 질문
- **vs_votes**: 사용자 투표
- **hate**: 못 먹는 음식
- **leaderboard**: 리더보드 캐시 (type: OVERALL/COMPANY/NEIGHBORHOOD)
- **groups**: 회사/학교 그룹 정보 (allowed_domains 배열)
- **email_verifications**: 이메일 인증 코드 (5분 TTL, 최대 5회 시도)

---

## API 엔드포인트

### 주요 API Routes

```
POST   /api/auth/google-login    # 구글 로그인
POST   /api/auth/register         # 회원가입

GET    /api/users/me              # 내 프로필
GET    /api/users/:id             # 사용자 프로필
PATCH  /api/users/me              # 프로필 수정
POST   /api/users/:id/follow      # 팔로우
GET    /api/users/me/saved-shops  # 저장한 맛집

GET    /api/shops                 # 맛집 검색
GET    /api/shops/:id             # 맛집 상세
GET    /api/shops/:id/reviews     # 맛집 리뷰
POST   /api/shops/google-search   # Google Places 검색
POST   /api/shops/import          # Google 맛집 임포트

GET    /api/content/feed          # 피드 (필터: popular, follow, near, like)
POST   /api/content               # 리뷰/포스트 작성
POST   /api/content/:id/like      # 좋아요
POST   /api/content/:id/comments  # 댓글 작성

GET    /api/ranking/user/:userId  # 사용자 랭킹 조회
POST   /api/ranking               # 랭킹 등록/수정
DELETE /api/ranking/:id           # 랭킹 삭제

GET    /api/quiz                  # 퀴즈 질문
POST   /api/quiz/submit           # 퀴즈 제출

GET    /api/vs                    # VS 게임 질문
POST   /api/vs/:id/vote           # 투표

POST   /api/upload/image          # 이미지 업로드

# 소속 등록 (Affiliation)
GET    /api/affiliation/status           # 현재 그룹/동네 상태
GET    /api/affiliation/groups           # 등록 가능한 그룹 목록
POST   /api/affiliation/email/send-code  # 인증 코드 이메일 발송
POST   /api/affiliation/email/verify     # 코드 검증 및 그룹 등록
DELETE /api/affiliation/group            # 그룹 탈퇴
POST   /api/affiliation/neighborhood     # GPS 기반 동네 등록
DELETE /api/affiliation/neighborhood     # 동네 해제
```

---

## 개발 환경 설정

### 1. 환경 변수 설정 (.env)

```bash
# 데이터베이스
DATABASE_URL=postgres://...          # Neon PostgreSQL

# Google
VITE_GOOGLE_CLIENT_ID=...           # Google OAuth
GOOGLE_MAPS_API_KEY=...             # Google Places API

# Redis
UPSTASH_REDIS_REST_URL=...
UPSTASH_REDIS_REST_TOKEN=...

# Vercel Blob Storage
BLOB_READ_WRITE_TOKEN=...

# Email (Resend)
RESEND_API_KEY=re_...

# Server
PORT=3001
```

### 2. 개발 서버 실행

```bash
# 의존성 설치
npm install

# 데이터베이스 마이그레이션
npm run db:generate
npm run db:migrate

# 개발 서버 시작 (2개 터미널 필요)
npm run dev      # Frontend (localhost:5173)
npm run server   # Backend (localhost:3001)
```

### 3. 모바일 앱 빌드

```bash
# 빌드
npm run build

# Capacitor 동기화
npx cap sync

# iOS/Android Studio에서 실행
npx cap open ios
npx cap open android
```

---

## 주요 라우트 및 기능

### Frontend Routes

**Public**:
- `/start` - 시작 페이지
- `/login` - 로그인
- `/register/*` - 회원가입 플로우
- `/s/:code` - 공유 리스트 (로그인 불필요)

**Protected** (로그인 필요):
- `/main` - 홈 피드
- `/main/discover` - 지도 기반 탐색
- `/main/ranking` - 리더보드 (그룹/동네/전체)
- `/main/profile` - 내 프로필
- `/write` - 리뷰 작성
- `/quiz/*` - 미식 성향 테스트
- `/profile/*` - 프로필 관리
- `/profile/group` - 회사/학교 등록
- `/profile/neighborhood` - 동네 등록

**Query Parameters**:
- `?viewUser={userId}` - 사용자 프로필 오버레이
- `?viewShop={shopId}` - 맛집 상세 오버레이
- `?viewListUser={userId}` - 리스트 오버레이

### 상태 관리

**UserContext** (`src/context/UserContext.tsx`):
- 사용자 인증 상태
- 좋아요 낙관적 업데이트
- 위치 정보 (Geolocation)
- 그룹/동네 정보 캐싱 (`group_name`, `neighborhood`)

**RankingContext** (`src/context/RankingContext.tsx`):
- 랭킹 오버레이 제어
- 맛집 랭킹 등록/수정

---

## 최근 작업 및 진행 상황

### 최근 커밋 (dd4eb95)
- Backend recommendation testing 도구 추가
- Score 계산 로직 문서화
- 분석 유틸리티 구현

### 진행 중인 작업
1. **추천 알고리즘 고도화**
   - Satisfaction Tier 기반 점수 재조정
   - Bayesian Average 적용
   - 신뢰도 기준 강화 (100+ 평가)

2. **UX 개선**
   - 리뷰 작성 플로우 간소화
   - Caption 편집 기능 추가
   - 모달 정렬 개선

3. **데이터 품질 향상**
   - Google Places 데이터 보강
   - 주소 파싱 개선
   - 이미지 EXIF 처리

---

## 개선이 필요한 영역

### 보안
- [x] ~~JWT/Session 기반 인증으로 전환~~ ✅ 완료 (v2.0, 2026-02-05)
- [ ] API Rate Limiting 추가
- [ ] Input Validation 강화

### 성능
- [ ] N+1 쿼리 최적화 (DataLoader 패턴)
- [ ] React Query/SWR 도입 검토
- [ ] 이미지 최적화 (WebP, 리사이징)
- [ ] Code Splitting 강화

### 안정성
- [ ] 테스트 코드 추가 (Jest + React Testing Library)
- [ ] 중앙집중식 에러 핸들링
- [ ] TypeScript strict mode 활성화
- [ ] Logging 및 Monitoring (Sentry)

### 기능
- [ ] 실시간 알림 (WebSocket)
- [ ] 다크 모드
- [ ] 접근성 개선 (ARIA)
- [ ] SEO 최적화

---

## 주요 컴포넌트 위치

### 재사용성 높은 컴포넌트
- `src/components/ContentCard.tsx` (52,897 chars) - 리뷰/포스트 카드
- `src/components/ShopCard.tsx` - 맛집 카드
- `src/components/MapContainer.tsx` - 지도 컨테이너
- `src/components/ImageViewer.tsx` - 이미지 뷰어
- `src/components/VsCard.tsx` - 밸런스 게임 카드
- `src/components/TasteProfileSheet.tsx` - 미식 성향 시트

### 핵심 화면
- `src/screens/main/MainTab.tsx` - 메인 탭 컨테이너
- `src/screens/main/HomeTab.tsx` - 홈 피드
- `src/screens/main/DiscoveryTab.tsx` - 맛집 탐색
- `src/screens/write/*` - 리뷰 작성 플로우
- `src/screens/profile/ProfileScreen.tsx` - 프로필

### 백엔드 핵심 로직
- `server/utils/match.ts` - Match Score 계산
- `server/utils/enricher.ts` - 데이터 보강
- `server/routes/content.ts` - 콘텐츠 API
- `server/routes/shops.ts` - 맛집 API

### 관리자 도구
- **웹 인터페이스**: `/admin/shop-content` - 레스토랑 랭킹 일괄 변경
- **API**: `POST /api/admin/shop-content` - 랭킹 조작 API
  - Parameters: `shopId`, `percentage` (0-100%), `rank`, `satisfaction`
  - 기능: 특정 % 유저의 랭킹을 특정 순위로 변경
  - 자동 캐시 삭제 포함
- **유틸리티 스크립트**:
  - `server/scripts/fix-all-user-rankings-optimized.ts` - 전체 유저 랭킹 재계산
  - `server/scripts/clear-shop-*-cache.ts` - 샵 캐시 삭제
  - 상세 가이드: `/ADMIN_API_GUIDE.md`

---

## 디버깅 팁

### 일반적인 문제 해결

1. **API 연결 실패**
   - `.env` 파일 확인
   - Backend 서버 실행 확인 (`npm run server`)
   - CORS 설정 확인

2. **데이터베이스 에러**
   - Drizzle 마이그레이션 실행: `npm run db:migrate`
   - Neon 콘솔에서 DB 상태 확인

3. **이미지 업로드 실패**
   - Vercel Blob Token 확인
   - 파일 크기 제한 확인 (10MB)

4. **Google Places API 에러**
   - API 키 활성화 확인
   - Billing 설정 확인
   - 일일 할당량 확인

5. **유저 랭킹이 이상해요 (1위가 여러 개)**
   - 문제: satisfaction tier별로 순위가 독립적으로 매겨짐
   - 해결: `npx tsx server/scripts/fix-all-user-rankings-optimized.ts` 실행
   - 이 스크립트는 Good→OK→Bad 순으로 연속된 순위로 재계산

6. **캐시 문제**
   - 샵 상세/리뷰: `shop:{shopId}`, `shop:{shopId}:reviews:*` 캐시 삭제
   - Redis 캐시 TTL: 샵 상세 1시간, 리뷰 30분
   - 수동 삭제: `server/scripts/clear-shop-*-cache.ts` 스크립트 사용

### 유용한 명령어

```bash
# 로그 확인
npm run server  # 백엔드 로그
npm run dev     # 프론트엔드 로그

# 데이터베이스
npm run db:generate  # 스키마 변경 감지
npm run db:migrate   # 마이그레이션 실행

# 랭킹 관리
npx tsx server/scripts/fix-all-user-rankings-optimized.ts  # 전체 유저 랭킹 재계산
npx tsx server/scripts/clear-shop-158-cache.ts             # 특정 샵 캐시 삭제

# 관리자 API (curl 예시)
curl -X POST "http://localhost:3001/api/admin/shop-content" \
  -H "Content-Type: application/json" \
  -d '{"shopId": 158, "percentage": 50, "rank": 1, "satisfaction": "good"}'

# 빌드 테스트
npm run build        # 프로덕션 빌드
npm run preview      # 빌드 결과 미리보기
```

---

## 다음 작업 제안

### 우선순위 높음
1. **인증 시스템 강화** - JWT 기반 인증으로 전환
2. **테스트 코드 작성** - 핵심 로직 테스트 커버리지 확보
3. **성능 최적화** - N+1 쿼리 제거, 캐싱 전략 개선

### 우선순위 중간
4. **에러 핸들링 개선** - 사용자 친화적 에러 메시지
5. **실시간 알림** - WebSocket 기반 알림 시스템
6. **SEO 최적화** - 메타 태그, Open Graph, Sitemap

### 우선순위 낮음
7. **다크 모드** - 테마 시스템 확장
8. **접근성 개선** - ARIA 레이블, 키보드 네비게이션
9. **관리자 대시보드** - 통계, 모니터링 UI

---

## 참고 문서

### 프로젝트 문서
- **[AUTH.md](AUTH.md)** - 인증 시스템 완전 가이드
  - JWT 기반 인증 아키텍처
  - Web/Native 플랫폼별 인증 흐름
  - 보안 설정 (쿠키, CORS, JWT)
  - 문제 해결 가이드
  - v2.0 변경사항 (x-user-id 제거)
- **[ADMIN_API_GUIDE.md](ADMIN_API_GUIDE.md)** - 관리자 API 가이드
  - 레스토랑 랭킹 조작
  - 캐시 관리
  - 유틸리티 스크립트
- **[AFFILIATION.md](AFFILIATION.md)** - 소속 등록 시스템 가이드
  - 그룹(회사/학교) 이메일 인증
  - GPS 기반 동네 등록
  - 소속별 리더보드
  - 한국 행정구역 파싱 로직
- **[TASTE_TYPE.md](TASTE_TYPE.md)** - 32유형 입맛 분류 시스템 가이드
  - MBTI 스타일 4축 + 서브타입 분류
  - 16 기본 유형 프로필 (한/영)
  - 7축 점수 → 32유형 변환 공식
  - UI 적용 위치 및 마이그레이션 가이드

### 외부 서비스
- [Neon PostgreSQL](https://neon.tech/docs)
- [Upstash Redis](https://upstash.com/docs/redis)
- [Vercel Blob Storage](https://vercel.com/docs/storage/vercel-blob)
- [Google Places API](https://developers.google.com/maps/documentation/places)
- [MapTiler SDK](https://docs.maptiler.com/sdk-js/)

### 라이브러리
- [Drizzle ORM](https://orm.drizzle.team/docs/overview)
- [React Router](https://reactrouter.com/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Capacitor](https://capacitorjs.com/docs)
- [i18next](https://www.i18next.com/)

---

## Git 브랜치 전략

현재 브랜치: `main`

### 작업 플로우
1. Feature 브랜치 생성: `git checkout -b feature/기능명`
2. 작업 및 커밋
3. Main에 머지
4. Vercel 자동 배포

### 커밋 메시지 컨벤션
- `feat:` 새로운 기능
- `fix:` 버그 수정
- `refactor:` 코드 리팩토링
- `docs:` 문서 수정
- `test:` 테스트 추가/수정
- `chore:` 빌드, 설정 파일 수정

---

## 연락처 및 리소스

- **프로젝트 디렉토리**: `/Users/catchtable/mimy_test`
- **개발 서버**: http://localhost:5173
- **API 서버**: http://localhost:3001
- **데이터베이스**: Neon PostgreSQL (Serverless)

---

**마지막 업데이트**: 2026-02-19
**버전**: v2.5
**작성자**: Claude Code (Opus 4.5)

## 변경 이력

### v2.5 (2026-02-19)
- ✅ 32유형 MBTI 스타일 입맛 분류 시스템 구현
  - 7축 점수 → 4축 파생 (Intensity, Flavor, Pleasure, Exploration)
  - 안정성 지표로 서브타입 결정 (-A 확신형 / -T 탐구형)
  - 16 기본 유형 × 2 서브타입 = 32유형
- ✅ UI 적용
  - 퀴즈 결과: 타입 코드 대형 표시 + 프로필 이름/설명
  - 프로필: 타입 배지 및 프로필 정보
  - 콘텐츠 카드: 닉네임 옆 프로필 이름 표시
  - 리더보드: 타입 배지
- ✅ 기존 사용자 마이그레이션
  - 1,177명 사용자 taste_result.tasteType 필드 추가
  - 하위 호환: tasteType 없는 경우 scores에서 실시간 계산
- 📝 파일 구조:
  - `server/utils/tasteType.ts` - 서버 타입 변환 유틸리티 (신규)
  - `src/lib/tasteType.ts` - 프론트엔드 타입 유틸리티 (신규)
  - `server/scripts/migrate-taste-types.ts` - 마이그레이션 스크립트 (신규)
  - `TASTE_TYPE.md` - 시스템 문서 (신규)

### v2.4 (2026-02-11)
- ✅ 타임라인 뷰 주간/월간 전환 기능 구현
  - 주간 뷰: 주별 7일 카드 표시 (기존)
  - 월간 뷰: 월별 콘텐츠 있는 날만 카드 표시 (최대 7개 + "+N")
  - 뷰 모드 토글 버튼 (좌측 상단)
  - 캘린더 모달로 특정 날짜 점프 기능
- ✅ 날짜 기반 콘텐츠 목록 페이지 (`/content/list`)
  - 특정 날짜의 콘텐츠 피드 형태로 표시
  - 무한 스크롤: 이전 날짜 콘텐츠 자동 로드
  - 여러 콘텐츠가 있는 날짜 카드 클릭 시 이동
  - 월간 뷰 "+N" 카드 클릭 시 이동
- ✅ API 개선
  - `GET /api/content/user/:userId` - `beforeDate` 파라미터 추가
  - 날짜 기반 필터링 및 visit_date 정렬 지원
- 📝 파일 구조:
  - `src/components/TimelineView.tsx` - 주간/월간 뷰 통합
  - `src/screens/content/ContentListScreen.tsx` - 콘텐츠 목록 페이지 (신규)
  - `server/routes/content.ts` - beforeDate 필터 추가

### v2.3 (2026-02-11)
- ✅ 릴레이 기록 기능 구현 (빠른 맛집 기록)
  - Tinder 스타일 스와이프 카드 UI (`RelayScreen`)
  - 스와이프 방향별 만족도 매핑 (오른쪽=Good, 왼쪽=Bad, 위=OK)
  - 첫 방문 가이드 애니메이션 (자동 스와이프 데모)
  - 30개 마일스톤 도달 시 랭킹 정리 모달
- ✅ 릴레이 → 랭킹 연동
  - 릴레이에서 기록한 만족도를 ManageRankingScreen으로 전달
  - 기존 랭킹 + 새 기록 병합 및 드래그앤드롭 정렬
  - 일괄 저장 (batchCreate → reorder)
  - 저장 중 로딩 오버레이 표시
- ✅ Backend API
  - `GET /api/relay/shops` - 근처/저장/전체 맛집 혼합 조회
  - `POST /api/ranking/batch` - 여러 랭킹 일괄 생성
  - `PUT /api/ranking/reorder` - 랭킹 순서 및 tier 일괄 수정
- 📝 파일 구조:
  - `src/screens/relay/RelayScreen.tsx` - 메인 화면
  - `src/screens/relay/components/RelayCard.tsx` - 스와이프 카드
  - `src/screens/relay/components/RelayCardStack.tsx` - 카드 스택
  - `src/services/RelayService.ts` - API 서비스
  - `server/routes/relay.ts` - Backend 라우트

### v2.2 (2026-02-09)
- 📝 Claude Code 작업 가이드라인 섹션 추가 (인사이트 보고서 기반)
  - UI/UX 변경 시 주의사항 (최소한의 변경 원칙, 시각적 동작 사전 확인)
  - 코드 작성 표준 (새 라이브러리 설치 금지, 데이터 구조 접근 주의)
  - Backend 패턴 (Express 라우트 순서)
  - 분석/가이드 작성 시 코드베이스 특화 분석 원칙

### v2.1 (2026-02-06)
- ✅ 소속 등록 시스템 구현 (그룹/동네)
  - 회사/학교 이메일 인증 (Resend API)
  - GPS 기반 동네 등록 (MapTiler Geocoding)
  - 한국 행정구역 파싱 (특별시+구, 도+시/군)
- ✅ 리더보드 개선
  - 그룹/동네/전체 필터
  - 실시간 리더보드 업데이트
  - UserContext에 그룹/동네 정보 캐싱
- 📝 AFFILIATION.md 문서 추가

### v2.0 (2026-02-05)
- ✅ JWT 기반 인증 시스템 완성 (x-user-id 헤더 제거)
- ✅ 로그아웃 버그 수정 (localStorage 정리)
- ✅ 환경 설정 명확화 (NODE_ENV)
- 📝 AUTH.md 문서 추가

### v1.0 (2026-01-28)
- 📝 초기 프로젝트 문서 작성
