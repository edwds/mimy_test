# Mimy (미미) - My Michelin for Me 🍽️

Mimy는 사용자 개인의 취향을 분석하여 딱 맞는 미식 경험을 추천해주는 **성향 기반 맛집 추천 서비스**입니다.

## 🚀 **기술 스택 (Tech Stack)**

### **Frontend**
- **Framework**: [React 19](https://react.dev/)
- **Build Tool**: [Vite](https://vitejs.dev/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: Vanilla CSS + Custom Design System (CSS Variables & Utility Classes)
- **UI Components**: 
  - [Lucide React](https://lucide.dev/) (Icons)
  - [Framer Motion](https://www.framer.com/motion/) (Animations)
  - [Radix UI](https://www.radix-ui.com/) (Primitives)
- **Map**: [Leaflet](https://leafletjs.com/) + `react-leaflet`
- **I18n**: [i18next](https://www.i18next.com/) + `react-i18next`
- **State/Routing**: `react-router-dom`, Context API (`UserContext`)

### **Backend**
- **Runtime**: [Node.js](https://nodejs.org/) (executed via `tsx`)
- **Framework**: [Express.js](https://expressjs.com/)
- **Database**: [PostgreSQL](https://www.postgresql.org/) (via [Neon Serverless](https://neon.tech/))
- **ORM**: [Drizzle ORM](https://orm.drizzle.team/)
- **API Communication**: RESTful API
- **Utilities**: `dotenv`, `cors`, `multer` (File Upload)

---

## 📂 **프로젝트 구조 (Project Structure)**

프로젝트는 프론트엔드와 백엔드가 하나의 레포지토리(Monorepo-like)에 공존하는 구조입니다.

```
mimy_test/
├── api/                  # Vercel api entry
├── server/               # Backend Source
│   ├── db/               # Database Config & Schema
│   │   ├── index.ts      # DB Connection (Neon + Drizzle)
│   │   ├── schema.ts     # DB Tables Definition
│   │   └── ...           # Scripts (seed, reset)
│   ├── routes/           # API Endpoints
│   │   ├── auth.ts       # Authentication
│   │   ├── shops.ts      # Shop Data & Discovery
│   │   ├── users.ts      # User Profile & Actions
│   │   └── ...
│   └── index.ts          # Server Entry Point
├── src/                  # Frontend Source
│   ├── components/       # Reusable UI Components
│   │   ├── ui/           # Base UI Elements (Button, Input, etc.)
│   │   └── ...           # Domain Components (ShopCard, ContentCard)
│   ├── context/          # React Context (UserContext, etc.)
│   ├── screens/          # Page Components
│   │   ├── auth/         # Login
│   │   ├── main/         # Main Tab (Home, Discovery, Ranking, Profile)
│   │   ├── onboarding/   # Splash, AgeCheck, Agreement
│   │   ├── quiz/         # Taste Analysis Quiz
│   │   └── register/     # User Registration Flow
│   ├── lib/              # Utilities (API client, helpers)
│   └── App.tsx           # Route Definitions
├── public/               # Static Assets & Locales
└── ...config files       # vite.config.ts, tailwind.config.js, drizzle.config.ts
```

---

## 🛠️ **설치 및 실행 (Getting Started)**

### **1. 환경 변수 설정 (.env)**
프로젝트 루트에 `.env` 파일을 생성하고 다음 변수들을 설정해야 합니다.

```env
# Database (Neon PostgreSQL)
DATABASE_URL="postgres://..."

# Auth (Google)
VITE_GOOGLE_CLIENT_ID="your-google-client-id"

# Backend Port
PORT=3001
```

### **2. 의존성 설치**
```bash
npm install
```

### **3. 데이터베이스 설정 (Migration)**
Drizzle ORM을 사용하여 스키마를 동기화합니다.
```bash
# 스키마 파일 생성
npm run db:generate

# 데이터베이스에 반영
npm run db:migrate
```

### **4. 개발 서버 실행**
프론트엔드(Vite)와 백엔드(Express)를 동시에 실행합니다.
```bash
# Frontend (localhost:5173)
npm run dev

# Backend (localhost:3001)
npm run server
```

---

## 🔑 **주요 기능 (Key Features)**

### **1. 회원가입 및 온보딩**
- **Deferred Registration**: 구글 로그인 시 즉시 가입되지 않고, 온보딩 완료 후 계정 생성 (`/api/auth/register`)
- **Phone Auth**: 국가별 자동 포맷팅 지원 (placeholder) 및 OTP 검증
- **Profile Setup**: 닉네임, 프로필 이미지, ID 설정 (ID 중복 확인)
- **Localization**: 온보딩 전 과정 다국어(ko, en) 지원

### **2. 미식 성향 분석 (Quiz)**
- 12개의 문항을 통해 사용자의 식성향을 분석
- **128 Taste Clusters**: 128가지의 정교한 미식 캐릭터(Cluster) 분류
- **Euclidean Matching**: 유저 간 미식 성향 일치도 분석 및 매칭
- **Text-only Badges**: 리더보드 및 피드에서 성향 일치도에 따른 색상 텍스트 뱃지 표시

### **3. 메인 피드 (HomeTab)**
- 사용자 맞춤형 콘텐츠 추천
- **VS Game**: 두 가지 선택지 중 하나를 고르는 밸런스 게임 (`VsCard`)
- 무한 스크롤(Infinite Scroll) 및 스태거 로딩(Staggered Loading) 최적화

### **4. 탐색 (DiscoveryTab)**
- **Map-based Search**: Leaflet 지도를 활용한 위치 기반 맛집 탐색
- **Shop BottomSheet**: 지도 핀 클릭 시 상세 정보 시트 노출 (드래그 제스처 지원)
- **Filters**: "저장한 곳만 보기", "이 지역에서 다시 찾기" 등

### **5. 랭킹 (LeaderboardTab)**
- 사용자 및 맛집 랭킹 제공 시스템
- `users_ranking` 테이블 기반 데이터 시각화

### **6. 프로필 & 마이페이지**
- **My Log**: 작성한 리뷰 및 포스트 관리
- **Wants to Go**: 저장(북마크)한 맛집 리스트 확인 (`users_wantstogo`)
- 프로필 수정 및 설정 관리

---

## 💾 **데이터 모델 (Database Schema)**

주요 데이터베이스 테이블 구조는 `server/db/schema.ts`에 정의되어 있습니다.

- **Users**: 사용자 기본 정보, 채널, 프로필
- **Shops**: 맛집 정보 (이름, 위치, 썸네일, Catchtable 연동 Ref)
- **Content**: 리뷰 및 포스트 데이터 (이미지, 텍스트)
- **Comments/Likes**: 소셜 상호작용 데이터
- **Terms**: 약관 관리
- **VS_Result**: 밸런스 게임 결과 저장

---

## 📝 **Contribution Guidelines**

- **Dates**: 날짜 처리는 가능한 서버 데이터를 기준으로 하며, 포맷팅은 `lib/utils`를 활용합니다.
5. **Internationalization (i18n)**:
   - `react-i18next`를 사용하여 다국어(ko, en)를 지원합니다.
   - 모든 텍스트는 `public/locales/{{lng}}/translation.json`에 정의된 키를 사용해야 합니다 (`t('key')`).
   - 하드코딩된 문자열 사용을 지양하세요.

---

## 🌍 **다국어 지원 (Internationalization)**

본 프로젝트는 `react-i18next`를 기반으로 한국어(ko)와 영어(en)를 지원합니다.

### **설정 및 구조**
- **라이브러리**: `react-i18next`, `i18next-http-backend`, `i18next-browser-languagedetector`
- **번역 파일**: `public/locales/ko/translation.json`, `public/locales/en/translation.json`
- **초기 로드**: 브라우저 언어 설정을 감지하며, 기본값은 영어(`en`)입니다.
- **디버깅**: 데스크탑 화면 우측 하단의 `DebugLocaleSwitcher`를 통해 언어 변경 및 키 확인(`CODE` 모드)이 가능합니다. (모바일에서는 숨김 처리)

### **개발 가이드**
```tsx
import { useTranslation } from 'react-i18next';

const MyComponent = () => {
  const { t } = useTranslation();
  return <div>{t('common.confirm')}</div>;
};
```

---

## ✨ **최신 업데이트 (Recent Updates)**

### **1. VS 밸런스 게임 UI/UX 개선**
- `VsCard` 디자인 리뉴얼: 직관적인 투표 UI 및 애니메이션 적용
- **재도전 기능**: 투표 후 5초 카운트다운 및 "다른 질문 받기" 기능 추가
- 마이페이지 연동: 프로필의 `Taste Card` 클릭 시 유저의 VS 게임 기록(Taste Profile)을 Sheet로 확인 가능

### **2. 프로필 기능 강화**
- **Taste Profile Sheet**: 본인 및 타 유저의 입맛 성향(Cluster) 및 VS 선택 기록을 한눈에 볼 수 있는 시트 구현
- **Edit Profile**: 프로필 이미지 수정 및 닉네임 변경 기능 고도화
- **ID 변경**: 마이페이지 메뉴를 통해 계정 ID 변경 기능 제공 (`ProfileScreen`)

### **3. 지도 및 탐색 경험 개선**
- **Shop BottomSheet**: 지도 핀 클릭시 나타나는 바텀 시트의 제스처 경험(Peek/Half/Full State) 개선
- **Map Interaction**: 상점 선택 시 지도 카메라 이동 및 줌 레벨 최적화
- **Saved Places**: 저장한 장소에 대한 지도 핀 시각적 차별화 (빨간색 하트 핀)

### **4. 데이터 및 로직 고도화**
- **Deferred User Creation**: 소셜 로그인 이탈 시 불완전한 데이터 생성을 방지하기 위한 가입 지연 로직 적용
- **Reseeded Clusters**: 128개의 고유 식별자를 가진 클러스터 데이터 재구축 및 샘플 유저 생성
- **Match Scoring**: 리더보드 등에서 유기적인 취향 매칭 점수 계산 로직 적용
