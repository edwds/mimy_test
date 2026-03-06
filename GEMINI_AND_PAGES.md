# Gemini AI 분석 & 결과 페이지 구성 문서

## 목차
1. [Gemini 프롬프트 설계](#1-gemini-프롬프트-설계)
2. [API 데이터 구조](#2-api-데이터-구조)
3. [결과 페이지 구성](#3-결과-페이지-구성)
4. [공유 페이지 구성](#4-공유-페이지-구성)
5. [파일 위치 매핑](#5-파일-위치-매핑)

---

## 1. Gemini 프롬프트 설계

### 1-1. 스크린샷 분석 프롬프트 (`extractRestaurantNames`)

**용도**: 예약 앱 스크린샷에서 음식점 이름 추출
**모델**: `gemini-3.1-pro-preview` (Vision)
**위치**: `server/utils/gemini.ts:12-60`

**입력**:
- `imageUrls: string[]` — 최대 5장씩 배치 처리 (전체 최대 30장)
- 이미지를 fetch → base64 변환 → `inlineData` 형태로 Gemini에 전달

**프롬프트 전문**:
```
이 이미지는 캐치테이블, 네이버 예약, 또는 다른 예약/방문 기록 앱의 스크린샷입니다.
이미지에서 음식점(레스토랑) 이름만 추출해주세요.

규칙:
- 음식점 이름만 추출 (날짜, 주소, 메뉴 등은 제외)
- 중복 제거
- 이름이 잘려있으면 보이는 부분만 추출
- 음식점이 아닌 항목(호텔, 카페 등)도 포함

JSON 배열로만 응답해주세요. 다른 텍스트 없이:
["음식점이름1", "음식점이름2", ...]

음식점을 찾을 수 없으면 빈 배열 []을 반환해주세요.
```

**출력 파싱**:
```typescript
// markdown 코드블록 제거 후 JSON.parse
const jsonStr = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
const names = JSON.parse(jsonStr); // string[]
```

**배치 처리 로직** (`server/routes/onboarding.ts:30-43`):
```
이미지 30장 → 5장씩 6개 배치 → 각 배치별 Gemini 호출 → Set으로 중복 제거
```

---

### 1-2. 입맛 분석 프롬프트 (`generateTasteAnalysis`)

**용도**: 사용자의 입맛 유형 + 랭킹 데이터 → 개인화된 미식 분석 생성
**모델**: `gemini-3.1-pro-preview` (Text)
**위치**: `server/utils/gemini.ts:104-178`

**입력 데이터 구조** (`TasteAnalysisInput`):
```typescript
{
    tasteType: {
        fullType: "HASP-A",       // 32유형 코드
        baseCode: "HASP",         // 16유형 기본 코드
        subtype: "A"              // A(확신형) / T(탐구형)
    },
    tasteProfile: {
        name: "선도자형 미식가",    // 한국어 프로필 이름
        tagline: "강렬하고 생동감 있는 맛을..."  // 한국어 설명
    },
    scores: {
        boldness: 2,     // -2 ~ +2
        acidity: 1,
        richness: -1,
        experimental: 2,
        spiciness: 1,
        sweetness: 0,
        umami: -1
    },
    rankedShops: [        // 상위 30개 (rank ASC)
        {
            name: "스시 오마카세",
            food_kind: "일식",
            description: "오마카세 전문점...",
            address_region: "강남구",
            satisfaction_tier: 2,   // 2=Good, 1=OK, 0=Bad
            rank: 1
        },
        // ...
    ]
}
```

**프롬프트 전문**:
```
당신은 미식 심리학 전문가입니다. 사용자의 입맛 분석 데이터를 기반으로 재미있고 통찰력 있는 분석을 작성해주세요.

## 사용자 데이터

**입맛 유형**: {fullType} ({profileName})
**유형 설명**: {tagline}

**7축 점수** (-2~+2 스케일):
- 과감함(boldness): {scores.boldness}
- 산미(acidity): {scores.acidity}
- 깊은맛(richness): {scores.richness}
- 도전정신(experimental): {scores.experimental}
- 매운맛(spiciness): {scores.spiciness}
- 단맛(sweetness): {scores.sweetness}
- 감칠맛(umami): {scores.umami}

**평가한 맛집** (순위순):
최고 (Good):
  1위. 스시 오마카세 (일식) - 강남구
      설명: 오마카세 전문점...
  2위. 라멘 하우스 (일식) - 마포구
괜찮음 (OK):
  5위. 비빔밥집 (한식) - 종로구
별로 (Bad):
  8위. 패스트푸드점 (양식) - 서초구

## 응답 형식

반드시 아래 JSON 형식으로만 응답하세요. 다른 텍스트 없이:

{
    "summary": "2-3문장으로 이 사람의 입맛을 요약. 재미있고 공감가는 톤으로.",
    "highlights": ["입맛 특성 키워드 1", "입맛 특성 키워드 2", "입맛 특성 키워드 3", "입맛 특성 키워드 4"],
    "personalityTraits": ["음식 성격 특성 1", "음식 성격 특성 2", "음식 성격 특성 3"],
    "foodRecommendations": ["추천 음식/장르 1", "추천 음식/장르 2", "추천 음식/장르 3", "추천 음식/장르 4"],
    "detailedAnalysis": "3-4문장의 상세 분석. 평가한 맛집 패턴을 참조하여 구체적으로."
}

규칙:
- 한국어로 작성
- highlights는 4개, personalityTraits는 3개, foodRecommendations는 4개
- 톤: 친근하고 재미있게, SNS에 공유하고 싶은 느낌
- 평가한 맛집이 있다면 패턴을 분석에 반영 (지역, 설명 등 디테일 활용)
- 맛집의 설명 정보가 있으면 어떤 종류의 음식을 선호하는지 더 구체적으로 분석
```

**출력 구조** (`TasteAnalysisResult`):
```typescript
{
    summary: string;            // "당신은 매운맛과 새로운 음식에..."  (2-3문장)
    highlights: string[];       // ["매운맛 중독", "오마카세 러버", "숨은 맛집 탐험가", "트렌드 리더"]  (4개)
    personalityTraits: string[];// ["강렬한 맛에 끌리는 모험가", ...]  (3개)
    foodRecommendations: string[];// ["마라탕", "이자카야", ...]  (4개)
    detailedAnalysis: string;   // "강남과 마포를 중심으로..."  (3-4문장)
}
```

**실패 시 폴백**:
```typescript
{
    summary: "{프로필이름} 유형으로, {태그라인}",
    highlights: ["분석 생성 중 오류"],
    personalityTraits: ["다시 시도해주세요"],
    foodRecommendations: [],
    detailedAnalysis: ""
}
```

---

## 2. API 데이터 구조

### 2-1. 분석 생성 API

```
POST /api/onboarding/taste-analysis
Auth: JWT (body 없음)
```

**서버 처리 순서**:
1. `users.taste_result` JSONB에서 scores 조회
2. `tasteType` 파생 (이미 저장되어 있으면 재사용, 없으면 `calculateTasteType(scores)` 호출)
3. `getTasteTypeProfile(tasteType, 'ko')` → 한국어 프로필 이름/태그라인
4. `users_ranking` + `shops` JOIN → 상위 30개 랭킹 맛집 (rank ASC)
5. Gemini `generateTasteAnalysis()` 호출
6. `crypto.randomBytes(6).toString('base64url').slice(0, 8)` → 8자리 공유 코드
7. `taste_analyses` 테이블에 upsert

**응답**:
```typescript
{
    analysis: {
        summary: string,
        highlights: string[],
        personalityTraits: string[],
        foodRecommendations: string[],
        detailedAnalysis: string
    },
    shareCode: "a1B2c3D4",
    tasteType: {
        fullType: "HASP-A",
        baseCode: "HASP",
        subtype: "A"
    },
    tasteProfile: {
        name: "선도자형 미식가",
        tagline: "강렬하고 생동감 있는 맛을..."
    }
}
```

### 2-2. 공유 데이터 조회 API

```
GET /api/onboarding/taste/:code
Auth: 없음 (공개)
```

**응답**:
```typescript
{
    tasteType: "HASP-A",
    tasteScores: { boldness: 2, acidity: 1, ... },
    rankedShopsSummary: [{ name, food_kind, satisfaction_tier, rank }] | null,  // 최대 20개
    analysis: { summary, highlights, personalityTraits, foodRecommendations, detailedAnalysis },
    tasteProfile: { name: "선도자형 미식가", tagline: "..." },      // 한국어
    tasteProfileEn: { name: "The Trendsetter", tagline: "..." },    // 영어
    user: { nickname: "미식가", profile_image: "https://..." },
    createdAt: "2026-03-03T..."
}
```

### 2-3. OnboardingContext 데이터 흐름

```
ScreenshotUpload  → setExtractedNames(names: string[])
ShopMatchConfirm  → setConfirmedShops(shops: OnboardingShop[])
OnboardingRelay   → addRating(rating)  // 각 스와이프마다
TasteAnalysis     → setAnalysisResult(analysis, shareCode, tasteType, tasteProfile)
ShareResult       → reset()  // 메인으로 이동 시 전체 초기화
```

---

## 3. 결과 페이지 구성

### 3-0. TasteAnalysis — AI 분석 로딩 화면

**파일**: `src/screens/onboarding/TasteAnalysis.tsx`
**경로**: `/onboarding/analysis`

```
┌──────────────────────────────┐
│                              │
│                              │
│       ┌──────────────┐       │
│       │  🍽️          │       │  ← 흔들리는 접시 애니메이션
│       │  (gradient    │       │     rotate: [0,10,-10,5,-5,0]
│       │   circle)     │       │     scale: [1,1.05,0.95,1.02,0.98,1]
│       └──────────────┘       │     duration: 4s, repeat
│                              │
│           ⟳                  │  ← Loader2 스피너
│                              │
│   "AI가 입맛 프로필을         │  ← 3초마다 순환하는 메시지
│     작성 중..."               │     (fade-in-out 애니메이션)
│                              │
│         ● ● ○ ○              │  ← 진행 도트 (4개)
│                              │
└──────────────────────────────┘
```

**로딩 메시지 4종** (3초 간격 순환):
1. `입맛 데이터를 분석하고 있어요...`
2. `평가한 맛집 패턴을 살펴보는 중...`
3. `AI가 입맛 프로필을 작성 중...`
4. `거의 다 됐어요!`

**동작**:
- 마운트 시 `OnboardingService.generateTasteAnalysis()` 호출 (1회만)
- 성공 → `OnboardingContext.setAnalysisResult()` → `/onboarding/share` (replace)
- 실패 → 에러 UI (😢 + "분석에 실패했어요" + 재시도 버튼)

---

### 3-1. ShareResult — 3단계 캐로셀

**파일**: `src/screens/onboarding/ShareResult.tsx`
**경로**: `/onboarding/share`

**공통 요소**:
- 상단: 페이지네이션 도트 (3개, 클릭으로 이동 가능)
- 하단: "다음" 버튼 (Step 0, 1만)
- 슬라이드 전환: `AnimatePresence` (x: 50 → 0 → -50)

#### Step 0 — 유형 아이덴티티 카드

```
┌──────────────────────────────┐
│        ● ━━ ○  ○             │  ← 페이지네이션 도트
│                              │
│  ┌────────────────────────┐  │
│  │  gradient card          │  │  ← bg: linear-gradient(135deg,
│  │  #FDFBF7 → #F5F3FF     │  │     #FDFBF7 0%, #F5F3FF 100%)
│  │                         │  │
│  │     ┌─────────┐         │  │
│  │     │  🍽️    │         │  │  ← 70x70 rounded-full
│  │     │ (circle) │         │  │     bg-primary/10
│  │     └─────────┘         │  │
│  │   "나의 입맛 분석"       │  │  ← text-sm text-gray-500
│  │                         │  │
│  │     HASP-A              │  │  ← text-4xl font-black
│  │                         │  │     tracking-[0.2em] text-primary
│  │   선도자형 미식가         │  │  ← text-lg font-bold
│  │                         │  │
│  │  "강렬하고 생동감         │  │  ← text-xs text-gray-500
│  │   있는 맛을..."          │  │
│  │                         │  │
│  │  ─────────────────      │  │  ← h-px bg-gray-200 구분선
│  │                         │  │
│  │  "당신은 매운맛과         │  │  ← analysis.summary
│  │   새로운 음식에..."       │  │     text-sm text-gray-700
│  │                         │  │
│  │  [매운맛 중독]            │  │  ← analysis.highlights
│  │  [오마카세 러버]          │  │     rounded-full chips
│  │  [숨은맛집탐험가]         │  │     bg-white/70 shadow-sm
│  │  [트렌드리더]             │  │
│  └────────────────────────┘  │
│                              │
│  ┌────────────────────────┐  │
│  │        다음    →        │  │  ← rounded-full 버튼
│  └────────────────────────┘  │
└──────────────────────────────┘
```

#### Step 1 — 상세 분석

```
┌──────────────────────────────┐
│        ○  ● ━━ ○             │
│                              │
│  ┌────────────────────────┐  │
│  │  gradient card          │  │
│  │                         │  │
│  │        🔍               │  │  ← text-5xl
│  │                         │  │
│  │     "미식 성격"          │  │  ← text-xs text-gray-400
│  │                         │  │
│  │  "강렬한 맛에 끌리는      │  │  ← personalityTraits[]
│  │   모험가"                │  │     text-sm text-gray-700
│  │  "새로운 메뉴에 대한      │  │     (3개 항목)
│  │   호기심이 넘치는 탐험가"  │  │
│  │  "취향이 확고한 미식      │  │
│  │   컬렉터"                │  │
│  │                         │  │
│  │  ─────────────────      │  │  ← 구분선
│  │                         │  │
│  │     "추천 음식"          │  │  ← text-xs text-gray-400
│  │                         │  │
│  │  [마라탕] [이자카야]      │  │  ← foodRecommendations[]
│  │  [오마카세] [타코]        │  │     bg-primary/10 text-primary
│  │                         │  │     (4개 칩)
│  │  ─────────────────      │  │
│  │                         │  │
│  │  "강남과 마포를 중심으로   │  │  ← detailedAnalysis
│  │   일식과 아시안 퓨전을     │  │     text-xs text-gray-600
│  │   즐기는 패턴이..."       │  │     text-left
│  └────────────────────────┘  │
│                              │
│  ┌────────────────────────┐  │
│  │        다음    →        │  │
│  └────────────────────────┘  │
└──────────────────────────────┘
```

#### Step 2 — 완료 + 공유 액션

```
┌──────────────────────────────┐
│        ○  ○  ● ━━            │
│                              │
│                              │
│           ✨                 │  ← text-5xl
│                              │
│    "분석이 완료됐어요!"       │  ← text-xl font-bold
│                              │
│  ┌────────────────────────┐  │
│  │  gradient summary card  │  │  ← rounded-2xl shadow-lg
│  │                         │  │
│  │      HASP-A             │  │  ← text-3xl font-black
│  │   선도자형 미식가         │  │  ← text-base font-bold
│  └────────────────────────┘  │
│                              │
│  ┌────────────────────────┐  │
│  │   🔗 결과 공유하기       │  │  ← variant="outline"
│  └────────────────────────┘  │     rounded-full
│                              │     모바일: Capacitor Share
│  ┌────────────────────────┐  │     웹: 클립보드 복사
│  │  다른 사람들의 프로필     │  │
│  │  보기 →                  │  │  ← primary, rounded-full
│  └────────────────────────┘  │     → /main + reset()
│                              │
└──────────────────────────────┘
```

**공유 URL**: `${WEB_BASE_URL}/taste/${shareCode}`
**공유 텍스트**: `{summary}\n\n나의 입맛 유형: {fullType} {profileName}`

---

## 4. 공유 페이지 구성

### TasteSharePage — 공개 공유 페이지

**파일**: `src/screens/onboarding/TasteSharePage.tsx`
**경로**: `/taste/:code` (로그인 불필요)

**ShareResult와의 차이점**:

| 요소 | ShareResult (본인) | TasteSharePage (공유) |
|------|-------------------|---------------------|
| 헤더 | 없음 | "MIMY" 브랜딩 + 소유자 아바타/닉네임 |
| Step 0 아이콘 | 🍽️ (고정) | 프로필 이미지 (있으면) 또는 🍽️ |
| Step 0 제목 | "나의 입맛 분석" | "{닉네임}님의 입맛 분석" |
| Step 1 | 동일 | 동일 |
| Step 2 제목 | "분석이 완료됐어요!" | "나도 입맛 분석 받아보기" |
| Step 2 CTA | 공유 + 프로필 보기 | "나도 입맛 분석하기" → `/start` |

#### 상단 브랜딩 바
```
┌──────────────────────────────┐
│  MIMY              🍽️ 미식가 │  ← 좌: 브랜딩, 우: 아바타+닉네임
│                              │     text-xs text-muted-foreground
└──────────────────────────────┘
```

#### Step 0 (공유 버전)
```
  ┌────────────────────────┐
  │                         │
  │     ┌─────────┐         │
  │     │ 프로필   │         │  ← profile_image 있으면 img
  │     │ 이미지   │         │     없으면 🍽️ circle
  │     └─────────┘         │
  │  "{닉네임}님의 입맛 분석" │
  │                         │
  │      HASP-A             │
  │    선도자형 미식가        │
  │    (tagline...)          │
  │                         │
  │  ─────────────────      │
  │    (summary)             │
  │    [highlight chips]     │
  └────────────────────────┘
```

#### Step 2 (공유 버전)
```
  ✨
  "나도 입맛 분석 받아보기"

  ┌────────────────────────┐
  │      HASP-A             │
  │   선도자형 미식가        │
  │  "{닉네임}님의 입맛 유형" │
  └────────────────────────┘

  ┌────────────────────────┐
  │  나도 입맛 분석하기 →    │  ← → /start
  └────────────────────────┘
```

---

## 5. 파일 위치 매핑

### Gemini 프롬프트
| 파일 | 함수 | 용도 |
|------|------|------|
| `server/utils/gemini.ts:12-60` | `extractRestaurantNames()` | 스크린샷 → 음식점명 추출 |
| `server/utils/gemini.ts:104-178` | `generateTasteAnalysis()` | 입맛 분석 텍스트 생성 |

### 백엔드 API
| 파일 | 엔드포인트 | 용도 |
|------|-----------|------|
| `server/routes/onboarding.ts:16-51` | `POST /analyze-screenshots` | 스크린샷 배치 분석 |
| `server/routes/onboarding.ts:138-248` | `POST /taste-analysis` | 분석 생성 + DB 저장 |
| `server/routes/onboarding.ts:254-297` | `GET /taste/:code` | 공유 데이터 조회 |

### 프론트엔드 페이지
| 파일 | 경로 | 용도 |
|------|------|------|
| `src/screens/onboarding/TasteAnalysis.tsx` | `/onboarding/analysis` | AI 분석 로딩 |
| `src/screens/onboarding/ShareResult.tsx` | `/onboarding/share` | 결과 3단계 캐로셀 |
| `src/screens/onboarding/TasteSharePage.tsx` | `/taste/:code` | 공유 링크 공개 페이지 |

### 데이터 레이어
| 파일 | 역할 |
|------|------|
| `src/services/OnboardingService.ts` | API 호출 (분석 생성, 공유 조회) |
| `src/context/OnboardingContext.tsx` | 온보딩 전체 상태 관리 |
| `server/utils/tasteType.ts` | 32유형 계산 + 프로필 데이터 (16유형 × 2) |
| `server/db/schema.ts:417-430` | `taste_analyses` 테이블 |

### DB 테이블: `taste_analyses`
| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | serial PK | |
| `user_id` | integer FK | users.id, CASCADE |
| `share_code` | varchar(20) UNIQUE | 8자리 base64url |
| `taste_type` | varchar(10) | "HASP-A" |
| `taste_scores` | jsonb | 7축 점수 객체 |
| `ranked_shops_summary` | jsonb | 상위 20개 맛집 요약 |
| `analysis` | jsonb | Gemini 분석 결과 (TasteAnalysisResult) |
| `created_at` | timestamp | |
| `updated_at` | timestamp | |

---

**마지막 업데이트**: 2026-03-03
**관련 문서**: [TASTE_TYPE.md](TASTE_TYPE.md) — 32유형 분류 시스템 상세
