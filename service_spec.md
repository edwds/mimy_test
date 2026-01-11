# 미식 취향 기반 소셜 플랫폼 PRD

> **"From 'Good Place' to 'My Place'"**

---

## 목차

### Part 1. 서비스 정의
1. [비전](#1-비전)
2. [문제 정의](#2-문제-정의)
3. [솔루션](#3-솔루션)
4. [유저 시나리오](#4-유저-시나리오)
5. [목표 지표](#5-목표-지표)

### Part 2. 기술 명세
6. [용어 정의](#6-용어-정의)
7. [화면 구조](#7-화면-구조)
8. [Flow/Page/Step 상세](#8-flowpagestep-상세)
9. [공통 컴포넌트](#9-공통-컴포넌트)
10. [DB 스키마](#10-db-스키마)
11. [다국어(i18n) 설계](#11-다국어i18n-설계)
12. [추천/매칭 시스템](#12-추천매칭-시스템)
13. [API 엔드포인트](#13-api-엔드포인트)
14. [추가 고려사항](#14-추가-고려사항)

---

# Part 1. 서비스 정의

---

## 1. 비전

### Vision Statement
> 우리는 미식의 즐거움을 찾는 전 세계 사람들이 **정보 과잉과 별점 어뷰징으로 인한 탐색 실패**를 해결하고자,
> **별점이 아닌 개인적이고 상대적인 랭킹과 취향 매칭**을 제공하는 개인 미식 취향 기반의 소셜 플랫폼을 만들고자 합니다.

### 핵심 가치
| 기존 | 우리 서비스 |
|------|-------------|
| "이 식당은 4.5점이야" | "이 식당은 나한테 15등이고, 파스타집 중 3등이야" |
| 1,000명의 익명 리뷰 | 나와 입맛 맞는 1명의 크리에이터 |
| 좋은 맛집 찾기 | 나와 맞는 사람 찾기 → 그 사람의 맛집 따라가기 |

---

## 2. 문제 정의

### 2.1 별점 시스템의 한계

**문제 1: 주관적 기준의 절대 평가**
- 사용자마다 느끼는 별점의 기준이 다름
- 직관적인 절대 평가 → 높을수록 좋다는 인식
- 대부분의 업체가 만점에 가깝게 유지하려 함

**문제 2: 어뷰징**
- 퀄리티 관리 대신 리워드 이벤트로 별점 관리
- 저격성 리뷰 블라인드
- 리뷰 수 자체가 "붐비는 집"의 척도가 됨

### 2.2 소셜 미디어의 한계

**문제 3: 일반 사용자 후기의 실종**
- 다양한 자극이 함께 있는 플랫폼에서 일반 후기는 관심받지 못함
- 인플루언서/전문 계정의 큐레이션으로 대체
- 소수의 큐레이션 → 특정 업장을 띄우는 데 사용될 여지

**문제 4: 교차 검증의 피로**
- 광고를 걸러내기 위해 블로그, 인스타, 지도 교차 검증
- 시간 낭비
- 신뢰할 수 있는 플랫폼 부재

### 2.3 현재 사용자 행동

> 국내 여행 때 '현지인 맛집'을 찾기 위해 쓰는 방법:
> - 광고를 받지 않을 것이 확실한 업장 찾기
> - 검증된 크리에이터가 추천하는 매장 찾기
> - 예: 더들리, 성시경 채널에 소개된 업체들
> - 캐치테이블에서도 유명 유튜버 태그 별도 표시

---

## 3. 솔루션

### 3.1 핵심 컨셉: 크리에이터를 연결하는 플랫폼

> "나와 입맛이 비슷하지만, 나보다 좀 더 부지런하고 더 많은 매장을 방문한 사람.
> 그런 사람을 찾아서 연결해준다."

**연결 우선순위:**
- 1차 목표: 사용자 ↔ 크리에이터 연결
- 2차 목표: 사용자 ↔ 레스토랑 연결

### 3.2 별점 대신 랭킹

**기존 방식:**
> "이 식당은 4점이야"

**우리 방식:**
> "이 식당은 나한테 15등이고, 파스타집 중 3등이야"

**랭킹 기록 방식: A/B 토너먼트**

1. 새 매장 방문 후 기록
2. 기존 방문 매장들과 1:1 비교 → "모수 vs 정식당, 어디가 더 좋았어?"
3. 비교 반복 → 최종 순위 결정
4. 개인 랭킹에 반영 → "전체 15등 / 파인다이닝 3등"

**장점:**
- 방문한 식당을 전체 랭킹으로 만들 때 개인의 선호도가 명확해짐
- 데이터가 쌓일수록, 기록하는 사용자가 많아질수록 매칭률이 정확해짐

### 3.3 빠른 취향 발견을 위한 온보딩

**문제:** 경쟁 서비스는 taste-graph를 만들기 위해 최소 20개의 기록 필요

**해결:** 가입 단계에서 입맛 퀴즈로 빠르게 프로파일링

**온보딩 퀴즈 플로우:**

1. 온보딩 퀴즈 (21문항)
2. 7가지 미각축 파악: 간의 정도(boldness), 산미(acidity), 리치함(richness), 매운맛(spiciness), 단맛(sweetness), 감칠맛(umami), 실험성(experimental)
3. 128개 클러스터 중 하나로 분류
4. 즉시 유사 입맛 크리에이터 추천

**효과:**
- 초기 탐색 유저도 유사 입맛 크리에이터 즉시 발견
- 내 입맛에 맞는 크리에이터 찾는 시간 획기적 단축

### 3.4 크리에이터 동기부여: 리더보드 & 게이미피케이션

**그룹핑:**
- 작은 집단: 학교, 회사 (이메일 인증 기반)
- 로컬 지역: 동 단위 (위치 정보 기반)

**리더보드:**
- 나와 비슷한 곳에서 활동하는 사람 우선 노출
- 입맛 일치도 기준 정렬

**크리에이터 혜택:**
- 내 글을 읽어줄 오디언스를 쉽게 찾음
- 내 기록이 다른 사람에게 가치 있다는 보람

### 3.5 장기 비전: 미식 담론 플랫폼

**Phase 1: 리뷰 플랫폼**
- 방문 기록: POI + 콘텐츠
- 크리에이터/POI로 묶이는 정보

**Phase 2: 담론 플랫폼 (피봇 가능성)**
- 포스팅 (숏 에세이): POI와 연결되지 않은 콘텐츠
- 주제별 연결 (subreddit 개념)
- 여러 POI, 메뉴 멘션 가능
- "미식계의 레딧/트위터"

---

## 4. 유저 시나리오

### 4.1 신규 유저: 맛집 탐색자 민지 (28세, 직장인)

**배경:**
- 주말마다 맛집 탐방을 즐기지만, 매번 블로그/인스타/네이버지도 교차 검증에 지침
- "광고 아닌 진짜 후기"를 찾고 싶음

**시나리오:**

| 단계 | 행동 | 서비스 반응 |
|------|------|-------------|
| 가입 | 인스타 광고 보고 앱 설치, 카카오 로그인 | 전화번호 인증 요청 |
| 온보딩 | 입맛 퀴즈 21문항 완료 (3분) | "당신은 '모험적인 미식가' 타입이에요!" |
| 첫 피드 | 홈 피드 진입 | 입맛 85% 이상 일치하는 크리에이터 콘텐츠 상단 노출 |
| 발견 | "나랑 입맛 92% 일치" 크리에이터 발견 | 프로필에서 크리에이터의 파인다이닝 TOP 10 확인 |
| 팔로우 | 크리에이터 3명 팔로우 | 팔로우한 크리에이터의 새 글 알림 설정 |
| 의사결정 | 이번 주말 갈 곳 결정 | 크리에이터가 1등 준 매장 상세 → 캐치테이블 예약 |

**핵심 가치 경험:**
> "블로그 10개 뒤지는 것보다, 나랑 입맛 맞는 사람 1명 찾는 게 낫다"

---

### 4.2 활동 유저: 기록자 준혁 (32세, 미식 블로거)

**배경:**
- 인스타에 맛집 기록 중이지만, 팔로워 대부분이 지인이라 영향력 한계 느낌
- 내 기록을 진짜 필요로 하는 사람에게 닿고 싶음

**시나리오:**

| 단계 | 행동 | 서비스 반응 |
|------|------|-------------|
| 가입 | 서비스 가입, 입맛 퀴즈 완료 | "꼼꼼한 미식 탐험가" 클러스터 배정 |
| 첫 기록 | 최근 다녀온 레스토랑 리뷰 작성 | "기존에 방문한 곳과 비교해볼까요?" |
| 랭킹 | A/B 토너먼트 5회 진행 | 내 파인다이닝 랭킹 1~5위 확정 |
| 반복 | 2주간 리뷰 8개 작성, 랭킹 누적 | 리더보드 "강남구 파인다이닝" 12위 진입 |
| 발견됨 | - | 입맛 유사 유저들이 내 프로필 방문, 팔로우 증가 |
| 보람 | 팔로워가 내 1등 매장 방문 후 후기 작성 | "00님 덕분에 인생 레스토랑 찾았어요" 댓글 |

**핵심 가치 경험:**
> "내 기록이 진짜 필요한 사람에게 닿는다"

---

### 4.3 파워 유저: 크리에이터 소영 (35세, 푸드 인플루언서)

**배경:**
- 유튜브/인스타에서 맛집 콘텐츠 운영 중
- 플랫폼별로 콘텐츠 만들기 지침, 한 곳에서 팬덤 관리하고 싶음

**시나리오:**

| 단계 | 행동 | 서비스 반응 |
|------|------|-------------|
| 가입 | 기존 SNS 연동하여 가입 | 크리에이터 프로필 설정 유도 |
| 대량 기록 | 기존 방문 매장 50개 일괄 등록 | 토너먼트로 전체 랭킹 생성 (10분) |
| 프로필 완성 | 카테고리별 TOP 5 리스트 공개 | 프로필에 "소영의 한식 TOP 5" 등 노출 |
| 노출 | - | 입맛 유사 유저 피드에 콘텐츠 추천 |
| 팬덤 형성 | 팔로워 500명 돌파 | "강남구 한식" 리더보드 1위, 뱃지 획득 |
| 수익화 (향후) | - | 협찬 제안, 프리미엄 리스트 판매 등 |

**핵심 가치 경험:**
> "내 입맛을 신뢰하는 찐팬을 모을 수 있다"

---

### 4.4 엣지 케이스: 기록 없이 탐색만 하는 유저

**배경:**
- 앱은 설치했지만, 리뷰 쓰기는 귀찮음
- 그냥 맛집 정보만 보고 싶음

**시나리오:**

| 단계 | 행동 | 서비스 반응 |
|------|------|-------------|
| 가입 | 입맛 퀴즈만 완료 | 퀴즈 기반 크리에이터 추천 |
| 탐색 | 피드에서 콘텐츠 소비, 매장 저장 | "가고싶은 곳" 리스트에 저장 |
| 방문 | 저장한 매장 방문 | (기록 안 함) |
| 리마인드 | - | "최근 저장한 '모수' 다녀오셨나요? 후기를 남겨보세요" 푸시 |
| 전환 | 간단 후기 작성 (별점 대신 good/okay/bad) | "랭킹도 정해볼까요?" 유도 |

**설계 포인트:**
- 기록 없이도 탐색 가치는 제공
- 단, 기록할수록 더 정확한 추천 받는다는 점 강조
- 간단한 기록부터 유도 (good/okay/bad → 랭킹 → 상세 리뷰)

---

## 5. 목표 지표

### 가설
> Taste-graph 기반으로 믿을 수 있는 미식 탐색 소셜 서비스를 만든다면,
> 사용자들은 원하는 결과를 얻기 위해 서비스에 **주간 단위로 자주 방문**할 것이다.

### KR 1: 주간 활성 사용자

**핵심 지표:** 주간 1회 이상 접속한 사용자 수 (WAU)

| 지표 | 설명 |
|------|------|
| Stickiness | DAU / WAU |
| Weekly Retention Rate | 주간 리텐션 |
| 인당 콘텐츠 조회 수 | Impression 기준 |
| 인당 매장 상세 조회 수 | PV / Shop ID Unique |

**세그먼트:**
- 이번 주 첫 접속 사용자
- 지난주 연속 접속 사용자
- 최근 4주 매주 접속 사용자

**보조 지표:**
- 인당 팔로잉 수

### KR 2: 주간 콘텐츠 생산

**핵심 지표:** 주간 1개 이상 포스팅 업로드한 사용자 수

| 지표 | 설명 |
|------|------|
| 신규 콘텐츠 수 | 리뷰 + 일반 포스트 |
| 콘텐츠 당 평균 좋아요 | 콘텐츠 품질 proxy |
| 랭킹 완료율 | 리뷰 작성 후 랭킹 정하기 완료 비율 |

---

# Part 2. 기술 명세

---

## 6. 용어 정의

| 용어 | 설명 | 예시 |
|------|------|------|
| **Flow** | 특정 목적을 달성하기 위한 여러 Step의 논리적 묶음. 시작과 끝이 명확함. | OnboardingFlow, RegisterFlow, ContentUploadFlow |
| **Page** | 독립적인 화면 단위. 고유 URL/라우트를 가짐. 다른 Page로 이동 가능. | HomePage, ShopDetailPage, MyPage |
| **Step** | Flow 내에서 순차적으로 진행되는 단계. 같은 Page 내 상태 변경 또는 별도 화면. | AgeCheckStep, PhoneStep, WriteStep |
| **Modal** | Page 위에 오버레이로 뜨는 팝업. 닫으면 원래 Page로 복귀. | 로그인 실패 알림, 약관 상세 보기 |
| **Sheet** | 화면 하단에서 올라오는 반모달. | 공유하기, 필터 선택 |

**명명 규칙:**
- Flow → {기능명}Flow (예: OnboardingFlow, ContentUploadFlow)
- Page → {화면명}Page (예: HomePage, ShopDetailPage)
- Step → {단계명}Step (예: AgeCheckStep, WriteStep)
- Modal → {기능명}Modal (예: LoginFailModal, TermsDetailModal)
- Sheet → {기능명}Sheet (예: ShareSheet, FilterSheet)

---

## 7. 화면 구조

### 7.1 전체 구조도
```
App
├── OnboardingFlow (미로그인 시)
│   ├── SplashScreen
│   ├── StartPage
│   ├── TermsFlow
│   │   ├── AgeCheckStep
│   │   └── AgreementStep
│   └── LoginPage
│       └── LoginFailModal
│
├── RegisterFlow (소셜로그인 후 미가입 유저)
│   ├── PhoneStep (전화번호 + 국가코드)
│   ├── OtpStep (SMS 인증)
│   ├── ProfileStep (account_id 필수, 닉네임 선택)
│   └── TasteQuizFlow (optional)
│       ├── QuizStep (x21)
│       └── ResultStep
│
├── MainTab (로그인 완료 시)
│   ├── HomePage
│   ├── DiscoveryPage
│   ├── LeaderboardPage
│   └── MyPage
│
├── ContentUploadFlow (글쓰기)
│   ├── TypeSelectStep
│   ├── ShopSearchStep (review)
│   ├── BasicInfoStep (review)
│   ├── WriteStep
│   └── RankingStep (review + 기존콘텐츠)
│
└── Detail Pages (독립 페이지)
    ├── ShopDetailPage
    ├── ContentDetailPage
    ├── ListDetailPage
    └── UserProfilePage
```

### 7.2 네비게이션 흐름도

#### 온보딩 → 메인
```
┌─────────────┐
│SplashScreen │ (1초)
└──────┬──────┘
       │
   isLoggedIn?
   ├─ Yes ────────────────────────────────────────► MainTab
   │
   └─ No
      ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  StartPage  │────►│ TermsFlow   │────►│  LoginPage  │
└─────────────┘     │ ┌─────────┐ │     └──────┬──────┘
                    │ │AgeCheck │ │            │
                    │ │  Step   │ │      OAuth 인증
                    │ └────┬────┘ │      (Google/Apple/Email)
                    │      ▼      │            │
                    │ ┌─────────┐ │      isRegistered?
                    │ │Agreement│ │      ├─ Yes ──► MainTab
                    │ │  Step   │ │      │
                    │ └─────────┘ │      └─ No
                    └─────────────┘         ▼
                                    ┌──────────────┐
                                    │ RegisterFlow │
                                    │ ┌──────────┐ │
                                    │ │PhoneStep │ │ ← 전화번호
                                    │ └────┬─────┘ │
                                    │      ▼       │
                                    │ ┌──────────┐ │
                                    │ │ OtpStep  │ │ ← SMS 인증
                                    │ └────┬─────┘ │
                                    │      ▼       │
                                    │ ┌──────────┐ │
                                    │ │ProfileStep│ │ ← account_id (필수)
                                    │ └────┬─────┘ │
                                    │      ▼       │
                                    │ TasteQuiz?  │ ← 선택
                                    └───────┬──────┘
                                            ▼
                                        MainTab
```

#### 메인 탭
```
┌────────────────────────────────────────────────────────────┐
│                         MainTab                            │
├──────────────┬──────────────┬──────────────┬──────────────┤
│   HomePage   │DiscoveryPage│LeaderboardPage│   MyPage     │
│    (홈피드)   │  (매장탐색)  │    (랭킹)     │ (마이페이지)  │
└──────────────┴──────────────┴──────────────┴──────────────┘
       │              │                              │
       ▼              ▼                              ▼
 ContentDetail   ShopDetail                    UserProfile
     Page           Page                          Page
```

#### 콘텐츠 업로드 플로우
```
ContentUploadFlow
       │
       ▼
┌─────────────────┐
│ TypeSelectStep  │
└────────┬────────┘
         │
    ┌────┴────┐
    ▼         ▼
 "리뷰"    "일반글"
    │         │
    ▼         │
┌─────────┐   │
│ShopSearch│   │
│  Step   │   │
└────┬────┘   │
     ▼        │
┌─────────┐   │
│BasicInfo│   │
│  Step   │   │
└────┬────┘   │
     │        │
     ▼        ▼
┌─────────────────┐
│   WriteStep     │
└────────┬────────┘
         │
    hasExisting
     Content?
    ┌────┴────┐
    ▼         ▼
  Yes        No
    │         │
    ▼         ▼
┌─────────┐   │
│ Ranking │   │
│  Step   │   │
└────┬────┘   │
     │        │
     ▼        ▼
   완료 ◄─────┘
```

---

## 8. Flow/Page/Step 상세

### 8.1 OnboardingFlow

#### SplashScreen
| 항목 | 내용 |
|------|------|
| 타입 | Screen (Page 아님, 라우트 없음) |
| UI | 화면 중앙 로고 |
| 동작 | 1초 후 자동 분기 |
| 분기 | `isLoggedIn ? MainTab : StartPage` |

#### StartPage
| 영역 | 컴포넌트 | 동작 |
|------|----------|------|
| 상단 | 이미지+텍스트 캐러셀 (3장) | 스와이프, 2초 자동페이징, 인디케이터 닷 |
| | 슬라이드1 | "내 입맛을 알아내고" |
| | 슬라이드2 | "내 입맛과 같은 사람을 찾아서" |
| | 슬라이드3 | "나만의 맛집을 발견하세요" |
| 하단 | 시작하기 버튼 | → TermsFlow 시작 |
| | "이미 가입했어요" 링크 | → LoginPage |

#### TermsFlow
| Step | 화면 | 설명 |
|------|------|------|
| **AgeCheckStep** | 생년월일 입력 | DatePicker, 국가별 최소 연령 검증, 언어별 년/월/일 순서 |
| **AgreementStep** | 약관 목록 + 체크박스 | `terms` 테이블 조회, 필수약관 전체 동의 시 완료 |

#### LoginPage
| 항목 | 내용 |
|------|------|
| Google 로그인 | OAuth 인증 → 가입여부 체크 → MainTab 또는 RegisterFlow |
| Apple 로그인 | OAuth 인증 → 가입여부 체크 → MainTab 또는 RegisterFlow |
| Email 로그인 | 이메일 입력 → OTP 발송 → 검증 → MainTab 또는 RegisterFlow |
| 실패 시 | `LoginFailModal` 노출 ("로그인에 실패했습니다"), 현재 Page 유지 |

### 8.2 RegisterFlow

소셜 로그인 인증 완료 후, 미가입 유저에 대해 진행되는 플로우.

```
RegisterFlow
    │
    ▼
┌─────────────┐
│  PhoneStep  │ ← 전화번호 입력 (국가코드 포함)
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   OtpStep   │ ← SMS 인증번호 확인
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ ProfileStep │ ← account_id 설정 (필수)
└──────┬──────┘
       │
       ▼
┌─────────────────┐
│ TasteQuizFlow?  │ ← 입맛 퀴즈 (선택)
└────────┬────────┘
         │
         ▼
      MainTab
```

| Step | 필수 | 필드 | 검증 | 비고 |
|------|:----:|------|------|------|
| **PhoneStep** | ✅ | phone, country_code | 전화번호 형식 | 중복 체크 |
| **OtpStep** | ✅ | otp_code | 6자리 숫자, 3분 만료 | Mock: 아무 값이나 통과 (개발용) |
| **ProfileStep** | ✅ | account_id (필수), nickname (선택) | account_id 중복체크 | 이메일 기반 추천 |
| **TasteQuizFlow** | ❌ | - | - | 스킵 가능 |

#### PhoneStep
| 항목 | 내용 |
|------|------|
| UI | 국가코드 선택 + 전화번호 입력 |
| 검증 | 전화번호 형식, 이미 가입된 번호인지 체크 |
| 동작 | "인증번호 받기" 클릭 시 SMS 발송 → OtpStep 이동 |
| 에러 | 이미 가입된 번호: "이미 가입된 전화번호입니다" |

#### OtpStep
| 항목 | 내용 |
|------|------|
| UI | 6자리 인증번호 입력, 타이머(3분), 재발송 버튼 |
| 검증 | 발송된 코드와 일치 여부, 만료 체크 |
| 재발송 | 60초 후 재발송 가능 |
| 동작 | 인증 성공 시 ProfileStep 이동 |
| Mock | 개발 환경에서는 아무 값이나 통과 |

#### ProfileStep
| 항목 | 내용 |
|------|------|
| UI | account_id 입력 (필수), 닉네임 입력 (선택), 프로필 이미지 (선택) |
| account_id | 필수, 3~30자, 영문소문자+숫자+특수문자(-._), 중복체크 |
| account_id 추천 | 이메일 앞부분 기반 추천 (예: john@gmail.com → @john 추천) |
| nickname | 선택, 1~20자, 자유 형식 (한글/이모지 가능) |
| 동작 | 완료 시 TasteQuizFlow 진입 또는 스킵하여 MainTab |

**표시 규칙:**
- 닉네임 있음: "맛있는여행자 @tasty_traveler"
- 닉네임 없음: "@tasty_traveler"

#### TasteQuizFlow (선택)
| Step | 설명 |
|------|------|
| **QuizStep** | 21개 질문 순차 진행, 각 질문별 7개 지표에 점수 반영 |
| **ResultStep** | 최종 점수 기반 클러스터 매칭 → 캐릭터 이름/설명 노출 |

퀴즈 질문 참고
    "questions": {
        "1": "나는 음식의 향과 풍미가 아주 강한 것을 선호한다.",
        "2": "소금이나 후추, 허브를 넉넉히 쓰는 편이다.",
        "3": "은은한 맛보다는 확실하고 진한 맛을 좋아한다.",
        "4": "새콤한 맛이나 식초의 시큼함을 즐긴다.",
        "5": "레몬즙이나 드레싱이 들어간 음식을 자주 찾는다.",
        "6": "과일의 산미가 느껴지는 디저트를 좋아한다.",
        "7": "버터나 크림이 많이 들어간 묵직한 맛을 좋아한다.",
        "8": "고기 지방의 고소함을 즐기는 편이다.",
        "9": "치즈나 기름진 음식을 먹어도 질리지 않는다.",
        "10": "먹어보지 못한 새로운 식재료나 요리에 거부감이 없다.",
        "11": "퓨전 요리나 독특한 조합의 음식을 시도하는 것을 즐긴다.",
        "12": "항상 먹던 것보다 새로운 맛집을 찾아다닌다.",
        "13": "매운 음식을 잘 먹고 스트레스가 풀린다고 느낀다.",
        "14": "웬만한 음식에 고추나 핫소스를 추가하고 싶을 때가 많다.",
        "15": "혀가 얼얼할 정도의 화끈한 맛을 선호한다.",
        "16": "식후에 달콤한 디저트를 반드시 챙겨 먹는 편이다.",
        "17": "단짠단짠(달고 짠) 맛의 조화를 매우 좋아한다.",
        "18": "음식에 설탕이나 시럽이 들어간 달달한 풍미를 즐긴다.",
        "19": "국물 요리의 깊고 진한 감칠맛을 중요하게 생각한다.",
        "20": "버섯, 다시마, 숙성 치즈 같은 깊은 풍미를 좋아한다.",
        "21": "입에 착 붙는 조미료나 발효 음식의 맛을 선호한다."}

data/match.tsv 7개 점수별로 매칭되는 클러스터 참고
data/cluster.json 클러스터 이름, 태그라인 참고



**결과 데이터 구조:**
```json
{
  "taste_profile": {
    "boldness": 0,      // 진한맛 (-2 ~ +2)
    "acidity": 0,       // 산미
    "richness": 0,      // 풍미
    "experimental": 0,  // 모험성
    "spiciness": 0,     // 매운맛
    "sweetness": 0,     // 단맛
    "umami": 0          // 감칠맛
  },
  "cluster_profile": {
    "id": 1,
    "cluster_id": "1",
    "cluster_name": "침착한 중용자",
    "cluster_tagline": "어느 한 가지 맛에 치우치지 않고..."
  }
}
```

### 8.3 MainTab Pages

#### HomePage
| 항목 | 내용 |
|------|------|
| 데이터 | `content` 테이블 |
| 정렬 | 추천 알고리즘 (현재: 랜덤) |
| 페이지네이션 | 25개씩 무한스크롤 |
| 컴포넌트 | `ContentCard` 리스트 |

#### DiscoveryPage
| 항목 | 내용 |
|------|------|
| 데이터 | `shops` 테이블 |
| 정렬 | 추천 알고리즘 (현재: 랜덤) |
| 페이지네이션 | 25개씩 무한스크롤 |
| 컴포넌트 | `ShopCard` 리스트 |

#### LeaderboardPage
| 항목 | 내용 |
|------|------|
| 데이터 | `users_exp_totals` JOIN `users` |
| 정렬 | `lifetime_xp DESC` |
| 제한 | 상위 100명 |

#### MyPage
| 영역 | 내용 |
|------|------|
| 프로필 | profile_image, nickname, bio, link |
| 팔로워 수 | `users_follow` WHERE `following_id = me` COUNT |
| 입맛 카드 | 크리에이터 레벨, 입맛 캐릭터, 다음 레벨 프로그레스바 |
| **탭: 콘텐츠** | 내가 작성한 콘텐츠 (시간순) |
| **탭: 리스트** | 콘텐츠 20개 이상일 때만 노출 |
| **탭: 가고싶은곳** | `users_wantstogo` 데이터 |

### 8.4 ContentUploadFlow

| Step | 조건 | 설명 |
|------|------|------|
| **TypeSelectStep** | 항상 | "방문 후기 쓰기" / "일반 글쓰기" 선택 |
| **ShopSearchStep** | type=review | 매장 검색/선택. 초기: 저장 매장 + 최근 검색어 |
| **BasicInfoStep** | type=review | satisfaction(필수), visit_date, companions |
| **WriteStep** | 항상 | 텍스트(1만자), 이미지(30장), 해시태그 |
| **RankingStep** | type=review && 기존콘텐츠≥1 | A/B 비교로 순위 결정 |

#### BasicInfoStep 필드
| 필드 | 필수 | 타입 | 값 |
|------|:----:|------|-----|
| satisfaction | ✅ | enum | `good` / `okay` / `bad` |
| visit_date | ❌ | date | nullable |
| companions | ❌ | user_id[] | 팔로우한 유저 멘션 |

#### WriteStep 필드
| 필드 | 제한 |
|------|------|
| text | 최대 10,000자, plain text, 줄바꿈만 |
| hashtag | `#키워드` 형식 (노출 시 # 제거) |
| images | 최대 30장, 정방형 크롭, 드래그앤드롭 순서 변경 |
| video | TBD |

#### RankingStep 로직
| 항목 | 내용 |
|------|------|
| 조건 | 기존 리뷰 콘텐츠 1개 이상 |
| 방식 | A or B 선택 (토너먼트) |
| 그룹핑 | 같은 satisfaction 내에서만 비교 |
| 우선순위 | 1) 같은 food_kind 먼저 2) 다른 매장 |
| 종료 | 더 이상 비교할 쌍 없을 때 |

### 8.5 Detail Pages

#### ShopDetailPage
| 영역 | 데이터 |
|------|--------|
| 매장 이미지 | `shops.thumbnail_img`, `shops.sub_img` |
| 매장 정보 | `shops.name`, `shops.description` |
| 주소 + 지도 | `shops.address_full`, `shops.lat`, `shops.lon` |
| 저장하기 | → `users_wantstogo` INSERT |
| 캐치테이블 예약 | `https://app.catchtable.co.kr/ct/shop/{catchtable_ref}` |
| 1등 준 유저들 | `users_ranking` WHERE sort_key 최상위 |
| 매칭률 | 유저 taste_profile vs 매장 특성 |
| 관련 콘텐츠 | `content` WHERE `review_prop->>'shop_id'` |
| 비슷한 매장 | `shops` WHERE `food_kind` 동일 |

#### ContentDetailPage
| 영역 | 데이터 |
|------|--------|
| 작성자 | profile_image, nickname, @account_id |
| 방문정보 | "어제 {shop}을 @{user}와 함께 {n}번째 방문" |
| 본문 | `content.text` |
| 미디어 | `content.img`, `content.video` (정방형, 스크롤) |
| POI 정보 | ShopCard(축약) + 예약버튼 + 저장버튼 |
| 작성일시 | 상대시간 |
| 소셜액션 | 좋아요, 댓글, 공유 |
| 댓글 | 전체 펼치기 |

#### ListDetailPage
| 영역 | 데이터 |
|------|--------|
| 리스트 이미지 | `users_lists.img` |
| 리스트 정보 | title, description |
| 작성자 | `users` |
| 아이템 | `users_list_items` JOIN `shops` JOIN `content` |

---

## 9. 공통 컴포넌트

### 9.1 ContentCard
```
┌─────────────────────────────────────────┐
│ [프로필img] 닉네임 @account_id          │
│ 어제 모수를 @edwards와 함께 첫 번째 방문  │
├─────────────────────────────────────────┤
│ 콘텐츠 텍스트 (최대 10줄)                │
├─────────────────────────────────────────┤
│ ┌─────┐ ┌─────┐ ┌─────┐                │
│ │ img │ │ img │ │ img │  ← 정방형, 스크롤│
│ └─────┘ └─────┘ └─────┘                │
├─────────────────────────────────────────┤
│ [매장img] 매장명 · 강남구 청담동          │
│ [캐치테이블 예약] [저장]                  │
├─────────────────────────────────────────┤
│ 3시간 전                                 │
│ 댓글 2개 미리보기                        │
│ [♥ 좋아요] [💬 댓글] [↗ 공유]            │
└─────────────────────────────────────────┘
```

### 9.2 ShopCard
```
┌─────────────────────────────────────────┐
│ ┌───────────────────────────────────┐   │
│ │          매장 이미지               │   │
│ └───────────────────────────────────┘   │
│ 매장명                                   │
│ 매장 설명                                │
│ 📍 서울 강남구 청담동                    │
│ [캐치테이블 예약] [저장]                  │
├─────────────────────────────────────────┤
│ (저장된 매장인 경우)                      │
│ 저장: 2일 전 · [기록 남기기]              │
└─────────────────────────────────────────┘
```

---

## 10. DB 스키마

### 10.1 ERD
```
┌──────────────────────────────────────────────────────────────────────────────┐
│                                 TERMS DOMAIN                                 │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────┐ 1:N  ┌────────────────────────┐ N:1  ┌─────────┐               │
│  │  terms  │─────│ user_term_agreements   │─────│  users  │               │
│  └─────────┘      └────────────────────────┘      └─────────┘               │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                                   USERS DOMAIN                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────┐ 1:1  ┌──────────────┐                                          │
│  │  users  │─────│ users_taste  │                                          │
│  └────┬────┘      └──────────────┘                                          │
│       │                                                                      │
│       │ 1:1  ┌───────────────────┐                                          │
│       ├─────│ users_exp_totals  │                                          │
│       │      └───────────────────┘                                          │
│       │                                                                      │
│       │ 1:N  ┌───────────────────┐                                          │
│       ├─────│ users_exp_event   │                                          │
│       │      └───────────────────┘                                          │
│       │                                                                      │
│       │ 1:N  ┌───────────────────┐                                          │
│       ├─────│  users_follow     │ (self-reference: follower ↔ following)   │
│       │      └───────────────────┘                                          │
│       │                                                                      │
└───────┼──────────────────────────────────────────────────────────────────────┘
        │
        │
┌───────┼──────────────────────────────────────────────────────────────────────┐
│       │                         CONTENT DOMAIN                               │
├───────┼──────────────────────────────────────────────────────────────────────┤
│       │                                                                      │
│       │ 1:N  ┌─────────┐ 1:N  ┌──────────┐                                  │
│       ├─────│ content │─────│ comments │ (self-ref: parent_id)             │
│       │      └────┬────┘      └────┬─────┘                                  │
│       │           │                │                                        │
│       │           │ 1:N            │ 1:N                                    │
│       │           ▼                ▼                                        │
│       │      ┌─────────────────────────┐                                    │
│       └─────│         likes           │ (polymorphic: target_type)         │
│              └─────────────────────────┘                                    │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘


┌──────────────────────────────────────────────────────────────────────────────┐
│                                  SHOP DOMAIN                                 │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│       users                        ┌─────────┐                              │
│         │                          │  shops  │                              │
│         │                          └────┬────┘                              │
│         │ 1:N  ┌──────────────────┐     │                                   │
│         ├─────│ users_wantstogo  │────┘ N:1                                │
│         │      └──────────────────┘                                         │
│         │                                                                    │
│         │ 1:N  ┌──────────────────┐     │                                   │
│         ├─────│  users_ranking   │────┘ N:1                                │
│         │      └──────────────────┘                                         │
│         │                                                                    │
│         │      content.review_prop.shop_id ──────┘ N:1                      │
│         │                                                                    │
└─────────┼────────────────────────────────────────────────────────────────────┘
          │
          │
┌─────────┼────────────────────────────────────────────────────────────────────┐
│         │                         LIST DOMAIN                                │
├─────────┼────────────────────────────────────────────────────────────────────┤
│         │                                                                    │
│         │ 1:N  ┌──────────────┐ 1:N  ┌────────────────────┐                 │
│         └─────│ users_lists  │─────│ users_list_items   │                 │
│                └──────────────┘      └─────────┬──────────┘                 │
│                                                │                            │
│                                                │ N:1                        │
│                                                ▼                            │
│                                           shops, content                    │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 10.2 테이블 상세

#### terms (약관)
```sql
CREATE TABLE terms (
    id              BIGSERIAL PRIMARY KEY,
    code            VARCHAR(50) NOT NULL UNIQUE,  -- 'service', 'privacy', 'marketing', 'location'
    title           VARCHAR(200) NOT NULL,        -- 약관 제목
    content         TEXT NOT NULL,                -- 약관 본문 (HTML 또는 Markdown)
    summary         TEXT,                         -- 약관 요약 (선택)
    is_required     BOOLEAN NOT NULL DEFAULT TRUE,-- 필수 동의 여부
    version         VARCHAR(20) NOT NULL,         -- '1.0.0', '1.0.1'
    country_code    VARCHAR(5) DEFAULT 'ALL',     -- 국가별 약관 (KR, JP, ALL)
    effective_date  DATE NOT NULL,                -- 시행일
    is_active       BOOLEAN DEFAULT TRUE,         -- 현재 활성 버전 여부
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_terms_code ON terms(code);
CREATE INDEX idx_terms_active ON terms(is_active, country_code);
```

**terms 예시 데이터:**
| code | title | is_required | version |
|------|-------|-------------|---------|
| `service` | 서비스 이용약관 | ✅ | 1.0.0 |
| `privacy` | 개인정보 처리방침 | ✅ | 1.0.0 |
| `location` | 위치정보 이용약관 | ✅ | 1.0.0 |
| `marketing` | 마케팅 정보 수신 동의 | ❌ | 1.0.0 |
| `age_14` | 만 14세 이상 확인 | ✅ | 1.0.0 |

#### user_term_agreements (유저별 약관 동의 이력)
```sql
CREATE TABLE user_term_agreements (
    id              BIGSERIAL PRIMARY KEY,
    user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    term_id         BIGINT NOT NULL REFERENCES terms(id),
    term_version    VARCHAR(20) NOT NULL,         -- 동의 당시 버전
    is_agreed       BOOLEAN NOT NULL DEFAULT TRUE,
    agreed_at       TIMESTAMPTZ DEFAULT NOW(),
    ip_address      INET,                         -- 동의 시점 IP (법적 증빙)
    user_agent      TEXT,                         -- 동의 시점 기기 정보
    
    UNIQUE(user_id, term_id, term_version)
);

CREATE INDEX idx_user_term_user ON user_term_agreements(user_id);
CREATE INDEX idx_user_term_term ON user_term_agreements(term_id);
```

#### users (사용자)
```sql
CREATE TABLE users (
    id              SERIAL PRIMARY KEY,
    channel         INTEGER NOT NULL DEFAULT 0,  -- 0:GOOGLE, 1:APPLE, 2:EMAIL
    email           VARCHAR(128) UNIQUE,
    phone           VARCHAR(20) UNIQUE NOT NULL, -- 인증된 전화번호 (필수)
    phone_country   VARCHAR(5) NOT NULL,         -- 전화번호 국가코드 (KR, JP, US...)
    phone_verified  BOOLEAN DEFAULT FALSE,       -- 전화번호 인증 완료 여부
    account_id      VARCHAR(30) UNIQUE NOT NULL, -- @handle (필수, 영문+숫자+일부특수문자)
    nickname        VARCHAR(20),                 -- 표시 이름 (선택, 없으면 account_id 노출)
    bio             TEXT,
    link            TEXT,
    profile_image   TEXT,
    visible_rank    INTEGER DEFAULT 100,         -- 0:미공개, 1-99:부분, 100:전체
    birthdate       DATE,
    gender          CHAR(1),                     -- M:남, F:여, N:미공개
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_account_id ON users(account_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_country ON users(phone_country);
```

**account_id 규칙:**
- 필수, 유니크
- 3~30자
- 영문 소문자, 숫자, 일부 특수문자(`-`, `.`, `_`) 허용
- 정규식: `/^[a-z0-9][a-z0-9\-._]{2,29}$/`
- 변경 제한: 30일에 1회

**닉네임/account_id 표시 규칙:**
- 닉네임 있음: "맛있는여행자 @tasty_traveler"
- 닉네임 없음: "@tasty_traveler"

#### phone_verifications (전화번호 인증)
```sql
CREATE TABLE phone_verifications (
    id              SERIAL PRIMARY KEY,
    phone           VARCHAR(20) NOT NULL,        -- 인증 요청 전화번호
    country_code    VARCHAR(5) NOT NULL,         -- KR, JP, US
    code            VARCHAR(6) NOT NULL,         -- 6자리 인증코드
    expires_at      TIMESTAMPTZ NOT NULL,        -- 만료시간 (발송 후 3분)
    attempts        INTEGER DEFAULT 0,           -- 시도 횟수
    is_verified     BOOLEAN DEFAULT FALSE,       -- 인증 완료 여부
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    verified_at     TIMESTAMPTZ                  -- 인증 완료 시간
);

CREATE INDEX idx_phone_verify_phone ON phone_verifications(phone, is_verified);
CREATE INDEX idx_phone_verify_expires ON phone_verifications(expires_at);

-- 오래된 인증 기록 정리용 (배치)
-- DELETE FROM phone_verifications WHERE expires_at < NOW() - INTERVAL '1 day';
```

**인증 플로우:**
1. 사용자가 전화번호 입력 → `phone_verifications` 레코드 생성, SMS 발송
2. 3분 내 인증코드 입력 → `is_verified = true`, `verified_at` 설정
3. 가입 완료 시 → `users.phone`에 저장, `users.phone_verified = true`
4. 재발송은 60초 후 가능, 최대 시도 횟수 5회

#### users_taste (입맛 프로필)
```sql
CREATE TABLE users_taste (
    id              SERIAL PRIMARY KEY,
    user_id         INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    taste_profile   JSONB,      -- {"boldness":0,"acidity":0,"richness":0,...}
    cluster_profile JSONB,      -- {"id":1,"cluster_id":"1","cluster_name":"..."}
    avoid_food      JSONB,      -- ["갑각류","견과류"]
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_taste_user_id ON users_taste(user_id);
```

**taste_profile 스키마:**
```json
{
    "boldness": 0,      // 진한맛 (-3 ~ +3)
    "acidity": 0,       // 산미
    "richness": 0,      // 풍미
    "experimental": 0,  // 모험성
    "spiciness": 0,     // 매운맛
    "sweetness": 0,     // 단맛
    "umami": 0          // 감칠맛
}
```

**cluster_profile 스키마:**
```json
{
    "id": 1,
    "cluster_id": "1",
    "cluster_medoid_value": "0,0,0,0,0,0,0",
    "cluster_name": "침착한 중용자",
    "cluster_tagline": "어느 한 가지 맛에 치우치지 않고..."
}
```

#### shops (매장/POI)
```sql
CREATE TABLE shops (
    id              SERIAL PRIMARY KEY,
    catchtable_id   INTEGER,                     -- 캐치테이블 내부 ID
    catchtable_ref  TEXT,                        -- 캐치테이블 URL용 ref 코드
    
    -- 원본 (한국어, 검색/정렬 기준)
    name            TEXT NOT NULL,
    description     TEXT,
    address_full    TEXT,
    address_region  TEXT,                        -- "서울 강남구 청담동"
    
    -- 다국어 번역
    name_i18n       JSONB,                       -- {"en": "Mosu", "ja": "モス"}
    description_i18n JSONB,
    address_i18n    JSONB,                       -- {"en": "Gangnam, Seoul", "ja": "ソウル江南区"}
    
    kind            TEXT,                        -- 매장 종류
    food_kind       TEXT,                        -- 한식,중식,일식,파인다이닝,베이커리...
    lat             DOUBLE PRECISION,
    lon             DOUBLE PRECISION,
    thumbnail_img   TEXT,
    sub_img         JSONB,                       -- ["url1","url2"]
    menu            JSONB,                       -- ["메뉴1","메뉴2"]
    status          INTEGER DEFAULT 2,           -- 0:폐업, 1:휴업, 2:영업중
    country_code    VARCHAR(5),                  -- KR, JP
    visibility      BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_shops_food_kind ON shops(food_kind);
CREATE INDEX idx_shops_country ON shops(country_code);
CREATE INDEX idx_shops_location ON shops USING gist (ll_to_earth(lat, lon));
CREATE INDEX idx_shops_name_search ON shops USING gin (to_tsvector('simple', name));

-- 다국어 검색용 인덱스 (필요시)
-- CREATE INDEX idx_shops_name_en ON shops USING gin ((name_i18n->>'en') gin_trgm_ops);
```

#### content (콘텐츠)
```sql
CREATE TABLE content (
    id              SERIAL PRIMARY KEY,
    user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type            VARCHAR(20) NOT NULL,        -- 'review', 'post'
    img             JSONB,                       -- ["url1","url2"] 최대 30개
    video           JSONB,                       -- ["url1"]
    text            TEXT,                        -- 최대 10,000자
    review_prop     JSONB,                       -- 리뷰 전용 메타데이터
    keyword         JSONB,                       -- ["맛집","데이트"] 해시태그
    visibility      BOOLEAN DEFAULT TRUE,
    is_deleted      BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 기본 인덱스
CREATE INDEX idx_content_user ON content(user_id);
CREATE INDEX idx_content_type ON content(type);
CREATE INDEX idx_content_created ON content(created_at DESC);

-- 피드 조회 최적화 (Partial Index)
CREATE INDEX idx_content_feed ON content(created_at DESC) 
    WHERE visibility = TRUE AND is_deleted = FALSE;

-- 리뷰 매장별 조회 (JSONB 표현식 인덱스)
CREATE INDEX idx_content_shop ON content((review_prop->>'shop_id')) 
    WHERE type = 'review';

-- 해시태그 검색 (GIN 인덱스)
CREATE INDEX idx_content_keyword ON content USING gin(keyword);
```

**review_prop 스키마 (type='review'일 때):**
```json
{
    "shop_id": 123,
    "visit_date": "2025-01-08",         // nullable
    "companions": [1, 2, 3],            // user_id 배열, nullable
    "satisfaction": "good"               // "good" | "okay" | "bad"
}
```

#### likes (좋아요)
```sql
CREATE TABLE likes (
    id              SERIAL PRIMARY KEY,
    target_type     VARCHAR(20) NOT NULL,        -- 'content', 'comment'
    target_id       INTEGER NOT NULL,
    user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(target_type, target_id, user_id)
);

CREATE INDEX idx_likes_target ON likes(target_type, target_id);
CREATE INDEX idx_likes_user ON likes(user_id);
CREATE INDEX idx_likes_content ON likes(target_id) WHERE target_type = 'content';
```

#### comments (댓글)
```sql
CREATE TABLE comments (
    id              SERIAL PRIMARY KEY,
    content_id      INTEGER NOT NULL REFERENCES content(id) ON DELETE CASCADE,
    user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    parent_id       INTEGER REFERENCES comments(id) ON DELETE CASCADE,  -- 대댓글
    mention_user_id INTEGER REFERENCES users(id),                       -- @멘션
    text            TEXT,
    img             JSONB,                       -- ["url"]
    video           JSONB,
    is_deleted      BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_comments_content ON comments(content_id, created_at);
CREATE INDEX idx_comments_parent ON comments(parent_id);
CREATE INDEX idx_comments_user ON comments(user_id);
```

#### users_wantstogo (저장한 매장)
```sql
CREATE TABLE users_wantstogo (
    id              SERIAL PRIMARY KEY,
    user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    shop_id         INTEGER NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    channel         TEXT,                        -- APP, INSTAGRAM, NAVER, GOOGLE, TIKTOK
    folder          TEXT,                        -- 사용자 지정 폴더/그룹
    memo            TEXT,                        -- 사용자 메모
    visibility      BOOLEAN DEFAULT TRUE,
    is_deleted      BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id, shop_id)
);

CREATE INDEX idx_wantstogo_user ON users_wantstogo(user_id);
CREATE INDEX idx_wantstogo_user_folder ON users_wantstogo(user_id, folder);
```

#### users_ranking (유저별 매장 랭킹)
```sql
CREATE TABLE users_ranking (
    id              SERIAL PRIMARY KEY,
    user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    shop_id         INTEGER NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    sort_key        DOUBLE PRECISION NOT NULL,   -- 낮을수록 높은 순위
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id, shop_id)
);

CREATE INDEX idx_ranking_user_sort ON users_ranking(user_id, sort_key);
```

#### users_lists (사용자 리스트)
```sql
CREATE TABLE users_lists (
    id              SERIAL PRIMARY KEY,
    user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type            TEXT NOT NULL,               -- 'manual', 'auto'
    title           TEXT NOT NULL,
    description     TEXT,
    img             TEXT,
    rules           JSONB,                       -- auto 타입용 필터/정렬 규칙
    visibility      BOOLEAN DEFAULT TRUE,
    is_deleted      BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_lists_user ON users_lists(user_id);
```

#### users_list_items (리스트 아이템)
```sql
CREATE TABLE users_list_items (
    id              SERIAL PRIMARY KEY,
    user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    lists_id        INTEGER NOT NULL REFERENCES users_lists(id) ON DELETE CASCADE,
    shops_id        INTEGER NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    content_id      INTEGER REFERENCES content(id),  -- 가장 최신 콘텐츠
    sort_key        DOUBLE PRECISION,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_list_items_list ON users_list_items(lists_id, sort_key);
```

#### users_follow (팔로우)
```sql
CREATE TABLE users_follow (
    id              SERIAL PRIMARY KEY,
    follower_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    following_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(follower_id, following_id),
    CHECK(follower_id != following_id)
);

CREATE INDEX idx_follow_follower ON users_follow(follower_id);
CREATE INDEX idx_follow_following ON users_follow(following_id);
```

#### users_exp_event (경험치 이벤트 로그)
```sql
CREATE TABLE users_exp_event (
    id              SERIAL PRIMARY KEY,
    user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event_type      TEXT NOT NULL,               -- REVIEW, LIKE, COMMENT, SCRAP, CLICK
    object_type     TEXT NOT NULL,               -- CONTENT, COMMENT
    object_id       INTEGER NOT NULL,
    delta_exp       INTEGER NOT NULL,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_exp_event_user ON users_exp_event(user_id);
CREATE INDEX idx_exp_event_created ON users_exp_event(created_at DESC);
```

#### users_exp_totals (누적 경험치)
```sql
CREATE TABLE users_exp_totals (
    user_id         INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    lifetime_xp     BIGINT DEFAULT 0,
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_exp_totals_xp ON users_exp_totals(lifetime_xp DESC);
```

---

## 11. 다국어(i18n) 설계

### 11.1 다국어 대상 분류

| 구분 | 대상 | 저장 위치 | 처리 방식 |
|------|------|-----------|-----------|
| **UI 텍스트** | 버튼, 라벨, 안내문구, 에러메시지 | 프론트엔드 | i18n 라이브러리 (react-i18next 등) |
| **약관** | 제목, 본문 | `terms` 테이블 | country_code별 row 분리 |
| **매장 정보** | 이름, 설명, 주소 | `shops` 테이블 | 원본 + i18n JSONB 필드 |
| **입맛 클러스터** | 캐릭터명, 설명 | `taste_clusters` 테이블 | i18n JSONB 필드 |
| **퀴즈** | 질문, 선택지 | `taste_quiz` 테이블 | i18n JSONB 필드 |

### 11.2 DB 다국어 설계

#### 방식: 원본 + i18n JSONB 하이브리드
- **원본 필드**: 기본 언어(ko) 저장, 검색/정렬 기준
- **i18n 필드**: 번역본 JSONB로 저장

```sql
-- shops 테이블 예시
CREATE TABLE shops (
    id              SERIAL PRIMARY KEY,
    
    -- 원본 (한국어, 검색/정렬 기준)
    name            TEXT NOT NULL,
    description     TEXT,
    address_full    TEXT,
    address_region  TEXT,
    
    -- 다국어 번역
    name_i18n       JSONB,      -- {"en": "Mosu", "ja": "モス"}
    description_i18n JSONB,     -- {"en": "Fine dining...", "ja": "ファインダイニング..."}
    address_i18n    JSONB,      -- {"en": "Gangnam-gu, Seoul", "ja": "ソウル江南区"}
    
    ...
);
```

#### 조회 쿼리 예시
```sql
-- 사용자 언어가 'ja'인 경우
SELECT 
    id,
    COALESCE(name_i18n->>'ja', name) AS name,
    COALESCE(description_i18n->>'ja', description) AS description,
    COALESCE(address_i18n->>'ja', address_region) AS address
FROM shops
WHERE id = 123;
```

### 11.3 테이블별 다국어 필드

#### shops (매장)
```sql
ALTER TABLE shops ADD COLUMN name_i18n JSONB;
ALTER TABLE shops ADD COLUMN description_i18n JSONB;
ALTER TABLE shops ADD COLUMN address_i18n JSONB;

-- 검색용 인덱스 (다국어)
CREATE INDEX idx_shops_name_i18n_en ON shops USING gin ((name_i18n->>'en') gin_trgm_ops);
CREATE INDEX idx_shops_name_i18n_ja ON shops USING gin ((name_i18n->>'ja') gin_trgm_ops);
```

#### taste_clusters (입맛 클러스터) - 신규 테이블
```sql
CREATE TABLE taste_clusters (
    id              SERIAL PRIMARY KEY,
    cluster_id      VARCHAR(10) UNIQUE NOT NULL,
    medoid_value    VARCHAR(50),                  -- "0,0,0,0,0,0,0"
    
    -- 원본 (한국어)
    name            TEXT NOT NULL,                -- "침착한 중용자"
    tagline         TEXT,                         -- "어느 한 가지 맛에 치우치지 않고..."
    
    -- 다국어
    name_i18n       JSONB,                        -- {"en": "Calm Moderate", "ja": "落ち着いた中庸者"}
    tagline_i18n    JSONB,
    
    created_at      TIMESTAMPTZ DEFAULT NOW()
);
```

#### taste_quiz (입맛 퀴즈) - 신규 테이블
```sql
CREATE TABLE taste_quiz (
    id              SERIAL PRIMARY KEY,
    question_order  INTEGER NOT NULL,
    
    -- 원본
    question        TEXT NOT NULL,
    options         JSONB NOT NULL,               -- [{"text": "선택지1", "scores": {...}}, ...]
    
    -- 다국어
    question_i18n   JSONB,                        -- {"en": "...", "ja": "..."}
    options_i18n    JSONB,                        -- {"en": [...], "ja": [...]}
    
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);
```

#### terms (약관) - 기존 방식 유지
약관은 법적 문서이므로 **country_code별 row 분리** 방식 유지:
```sql
-- 같은 약관이지만 국가별로 별도 row
INSERT INTO terms (code, title, content, country_code, ...) VALUES
('service', '서비스 이용약관', '...', 'KR', ...),
('service', 'Terms of Service', '...', 'US', ...),
('service', '利用規約', '...', 'JP', ...);
```

### 11.4 API 응답 형식

#### 요청
```
GET /shops/123
Accept-Language: ja
```

#### 응답
```json
{
    "id": 123,
    "name": "モス",
    "description": "ファインダイニング...",
    "address": "ソウル江南区清潭洞",
    "original_name": "모수"
}
```

### 11.5 프론트엔드 i18n

#### 지원 언어
| 코드 | 언어 | 기본값 |
|------|------|--------|
| `ko` | 한국어 | ✅ (fallback) |
| `en` | English | |
| `ja` | 日本語 | |

#### 파일 구조 예시
```
/locales
  /ko
    common.json
    auth.json
    content.json
  /en
    common.json
    auth.json
    content.json
  /ja
    ...
```

#### common.json 예시
```json
{
  "button": {
    "start": "시작하기",
    "next": "다음",
    "skip": "건너뛰기",
    "save": "저장",
    "cancel": "취소"
  },
  "error": {
    "login_failed": "로그인에 실패했습니다",
    "network_error": "네트워크 오류가 발생했습니다"
  }
}
```

### 11.6 날짜/시간 포맷

| 언어 | 날짜 순서 | 예시 |
|------|-----------|------|
| ko | YYYY년 MM월 DD일 | 2025년 1월 8일 |
| en | MMM DD, YYYY | Jan 8, 2025 |
| ja | YYYY年MM月DD日 | 2025年1月8日 |

**상대 시간 예시:**
| 언어 | 1시간 전 | 어제 | 3일 전 |
|------|----------|------|--------|
| ko | 1시간 전 | 어제 | 3일 전 |
| en | 1 hour ago | Yesterday | 3 days ago |
| ja | 1時間前 | 昨日 | 3日前 |

---

## 12. 추천/매칭 시스템

### 12.1 개요

| 기능 | 설명 | 데이터 의존도 |
|------|------|:-------------:|
| 유저-유저 매칭률 | "이 사람과 입맛이 92% 비슷해요" | 퀴즈만 있으면 됨 |
| 유저-매장 매칭률 | "이 매장이 나랑 87% 맞아요" | 리뷰 쌓여야 함 |
| 피드 추천 | 홈 피드 콘텐츠 정렬 | 퀴즈 + 콘텐츠 |

### 12.2 유저-유저 매칭률

**기본 공식**:
```
매칭점수 = (퀴즈 유사도 × W1) + (리뷰 유사도 × W2)
```

**가중치 동적 조정** (공통 리뷰 수에 따라):

| 공통 리뷰 수 | W1 (퀴즈) | W2 (리뷰) | 이유 |
|:------------:|:---------:|:---------:|------|
| 0개 | 1.0 | 0.0 | 퀴즈만 사용 가능 |
| 1~2개 | 0.7 | 0.3 | 리뷰 신뢰도 낮음 |
| 3~9개 | 0.4 | 0.6 | 기본 비중 |
| 10개+ | 0.2 | 0.8 | 행동 데이터 우선 |

#### 퀴즈 유사도

taste_profile 7개 지표 코사인 유사도:

```
유저A: [3, -1, 2, 0, 1, -2, 2]
유저B: [2, -2, 1, 1, 0, -1, 3]

코사인 유사도 = (A·B) / (|A| × |B|)
→ 0.87
```

#### 리뷰 유사도

**방식: 스피어만 순위 상관계수**

단순 good/okay/bad 일치보다 **랭킹 순서**가 더 강한 신호:

```
공통 리뷰 매장: 매장1, 매장2, 매장3, 매장4

유저A 랭킹: 매장1(1위) > 매장3(2위) > 매장2(3위) > 매장4(4위)
유저B 랭킹: 매장1(1위) > 매장2(2위) > 매장3(3위) > 매장4(4위)

스피어만 계산:
d = 각 매장의 순위 차이
d² = [0, 1, 1, 0] = 2

ρ = 1 - (6 × Σd²) / (n × (n² - 1))
  = 1 - (6 × 2) / (4 × 15)
  = 1 - 0.2
  = 0.8

→ 리뷰 유사도 80%
```

**스피어만 vs 단순 일치**:

| 상황 | 단순 일치 | 스피어만 |
|------|:--------:|:--------:|
| 둘 다 good, 랭킹 순서 동일 | 100% | 100% |
| 둘 다 good, 랭킹 순서 다름 | 100% | 80% |
| A=good, B=okay | 50% | 순서에 따라 다름 |

**구현 (PostgreSQL)**:
```sql
-- 두 유저의 공통 리뷰 매장 랭킹 비교
WITH user_a_ranks AS (
    SELECT 
        (review_prop->>'shop_id')::int AS shop_id,
        ROW_NUMBER() OVER (ORDER BY sort_key) AS rank
    FROM content c
    JOIN users_ranking ur ON ur.shop_id = (c.review_prop->>'shop_id')::int 
                          AND ur.user_id = c.user_id
    WHERE c.user_id = :user_a AND c.type = 'review'
),
user_b_ranks AS (
    SELECT 
        (review_prop->>'shop_id')::int AS shop_id,
        ROW_NUMBER() OVER (ORDER BY sort_key) AS rank
    FROM content c
    JOIN users_ranking ur ON ur.shop_id = (c.review_prop->>'shop_id')::int 
                          AND ur.user_id = c.user_id
    WHERE c.user_id = :user_b AND c.type = 'review'
),
common_ranks AS (
    SELECT 
        a.shop_id,
        a.rank AS rank_a,
        b.rank AS rank_b,
        POWER(a.rank - b.rank, 2) AS d_squared
    FROM user_a_ranks a
    JOIN user_b_ranks b ON a.shop_id = b.shop_id
)
SELECT 
    COUNT(*) AS common_count,
    CASE 
        WHEN COUNT(*) < 2 THEN NULL
        ELSE 1 - (6.0 * SUM(d_squared)) / (COUNT(*) * (POWER(COUNT(*), 2) - 1))
    END AS spearman_correlation
FROM common_ranks;
```

#### 최종 매칭률 계산 예시

```
유저A - 유저B:
- 공통 리뷰: 5개 → W1=0.4, W2=0.6
- 퀴즈 유사도: 0.87
- 리뷰 유사도 (스피어만): 0.80

매칭점수 = (0.87 × 0.4) + (0.80 × 0.6)
        = 0.348 + 0.48
        = 0.828
        
→ 83% 매칭
```

**활용**:
- 프로필 페이지: "입맛 83% 일치"
- 팔로우 추천: 유사도 높은 유저 추천
- 피드 추천: 유사 유저의 콘텐츠 가중치 부여

### 12.3 유저-매장 매칭률

**문제**: 매장 자체에 taste_profile이 없음

**해결**: 해당 매장을 좋아한 유저들의 taste_profile로 추정

```
매장A에 "good" 리뷰 남긴 유저들
├── 유저1: [3, -1, 2, 0, 1, -2, 2]
├── 유저2: [2, 0, 3, -1, 2, -1, 1]
└── 유저3: [3, -2, 2, 1, 0, -2, 3]

매장A 추정 프로필 = 평균: [2.7, -1, 2.3, 0, 1, -1.7, 2]

나의 프로필: [2, -1, 2, 0, 1, -2, 2]
→ 코사인 유사도 → 94% 매칭
```

**구현 단계**:

| Phase | 조건 | 표시 |
|-------|------|------|
| Cold Start | 매장 리뷰 0~2개 | 매칭률 미표시, "리뷰를 남겨주세요" |
| Phase 1 | 매장 리뷰 3개 이상 | 매칭률 표시 (신뢰도 낮음 표시 가능) |
| Phase 2 | 매장 리뷰 10개 이상 | 매칭률 정상 표시 |

**매장 추정 프로필 캐싱**:
```sql
-- shops 테이블에 추가 또는 별도 테이블
ALTER TABLE shops ADD COLUMN estimated_taste JSONB;
ALTER TABLE shops ADD COLUMN taste_sample_count INTEGER DEFAULT 0;

-- 배치로 주기적 업데이트 (1일 1회)
UPDATE shops s SET 
    estimated_taste = (
        SELECT jsonb_build_object(
            'boldness', AVG((ut.taste_profile->>'boldness')::float),
            'acidity', AVG((ut.taste_profile->>'acidity')::float),
            ...
        )
        FROM content c
        JOIN users_taste ut ON c.user_id = ut.user_id
        WHERE c.review_prop->>'shop_id' = s.id::text
          AND c.review_prop->>'satisfaction' = 'good'
    ),
    taste_sample_count = (
        SELECT COUNT(*)
        FROM content c
        WHERE c.review_prop->>'shop_id' = s.id::text
          AND c.review_prop->>'satisfaction' = 'good'
    );
```

### 12.4 피드 추천 알고리즘

**MVP 공식**:
```
score = (유사도 × W1) + (팔로우 × W2) + (최신성 × W3) + (인기도 × W4)
```

| 요소 | 가중치 | 계산 방식 |
|------|:------:|-----------|
| 유사도 | W1 = 0.4 | 콘텐츠 작성자와 나의 taste_profile 코사인 유사도 (0~1) |
| 팔로우 | W2 = 0.3 | 팔로우한 유저면 1, 아니면 0 |
| 최신성 | W3 = 0.2 | `1 / (1 + hours_ago / 24)` 24시간 기준 감쇠 |
| 인기도 | W4 = 0.1 | `log(likes + comments + 1) / 10` 정규화 |

**예시**:
```
콘텐츠A:
- 작성자와 유사도: 0.85
- 팔로우 여부: Yes (1)
- 3시간 전 작성: 1/(1+3/24) = 0.89
- 좋아요 50, 댓글 10: log(61)/10 = 0.18

score = (0.85 × 0.4) + (1 × 0.3) + (0.89 × 0.2) + (0.18 × 0.1)
      = 0.34 + 0.3 + 0.178 + 0.018
      = 0.836
```

**가중치 튜닝**:

| 가중치 | 올리면 | 내리면 |
|--------|--------|--------|
| W1 (유사도) | 입맛 기반 추천 강화 | 다양한 콘텐츠 노출 |
| W2 (팔로우) | 소셜 피드 느낌 | 새로운 유저 발견 |
| W3 (최신성) | 실시간성 강조 | 양질의 과거 콘텐츠 노출 |
| W4 (인기도) | 바이럴/트렌드 | 니치 콘텐츠 기회 |

**튜닝 지표**:

| 지표 | 측정 | 가중치 조정 힌트 |
|------|------|------------------|
| CTR | 피드 → 콘텐츠 클릭률 | 낮으면 W1, W4 ↑ |
| 체류시간 | 콘텐츠 상세 머문 시간 | 짧으면 W1 ↑ |
| 팔로우 전환율 | 콘텐츠 → 작성자 팔로우 | 낮으면 W2 ↓ |
| DAU 리텐션 | 다음날 재방문율 | 전반적 하락 시 공식 재검토 |

**설정값 관리**:
```yaml
# config/recommendation.yml
feed:
  weights:
    similarity: 0.4
    follow: 0.3
    recency: 0.2
    popularity: 0.1
  recency_half_life_hours: 24
  min_score_threshold: 0.1
```

### 12.5 구현 우선순위

| 순위 | 기능 | 난이도 | MVP |
|:----:|------|:------:|:---:|
| 1 | 유저-유저 매칭률 | 쉬움 | ✅ |
| 2 | 피드 추천 (가중치 공식) | 중간 | ✅ |
| 3 | 유저-매장 매칭률 | 중간 | ⚠️ 리뷰 쌓인 후 |
| 4 | 개인화 가중치 (ML) | 어려움 | ❌ 고도화 |

### 12.6 고도화 방향

**Phase 2**:
- A/B 테스트로 가중치 최적화
- 유저 세그먼트별 가중치 차등 적용

**Phase 3**:
- ML 모델로 개인화 가중치 (유저마다 W1~W4 다르게)
- 실시간 피드백 반영 (클릭 안 하면 유사 콘텐츠 가중치 ↓)
- 캐치테이블 리뷰 텍스트 NLP 분석 → 매장 taste_profile 추정

---

## 13. API 엔드포인트

### Auth
| Method | Endpoint | 설명 |
|--------|----------|------|
| POST | `/auth/google` | Google OAuth 로그인 |
| POST | `/auth/apple` | Apple OAuth 로그인 |
| POST | `/auth/email/send-otp` | 이메일 OTP 발송 |
| POST | `/auth/email/verify-otp` | 이메일 OTP 검증 |
| POST | `/auth/logout` | 로그아웃 |

### Register (회원가입)
| Method | Endpoint | 설명 |
|--------|----------|------|
| POST | `/register/phone/send-otp` | 전화번호 인증 OTP 발송 |
| POST | `/register/phone/verify-otp` | 전화번호 인증 OTP 검증 |
| POST | `/register/check-account-id` | account_id 중복 체크 |
| POST | `/register/complete` | 회원가입 완료 |

#### 회원가입 API 상세

**POST /register/phone/send-otp**
```json
// Request
{
  "phone": "01012345678",
  "country_code": "KR"
}

// Response 200
{
  "success": true,
  "expires_in": 180,  // 3분
  "retry_after": 60   // 재발송 가능 시간(초)
}

// Response 400
{
  "error": "ALREADY_REGISTERED",
  "message": "이미 가입된 전화번호입니다"
}
```

**POST /register/phone/verify-otp**
```json
// Request
{
  "phone": "01012345678",
  "code": "123456"
}

// Response 200
{
  "success": true,
  "verification_token": "temp_token_xxx",  // 가입 완료시 사용
  "suggested_account_id": "john"           // 이메일 기반 추천
}

// Response 400
{
  "error": "INVALID_CODE",
  "message": "인증번호가 일치하지 않습니다"
}

// Response 400
{
  "error": "CODE_EXPIRED",
  "message": "인증번호가 만료되었습니다"
}
```

**POST /register/check-account-id**
```json
// Request
{
  "account_id": "tasty_traveler"
}

// Response 200
{
  "available": true
}

// Response 200
{
  "available": false,
  "suggestions": ["tasty_traveler1", "tasty_traveler_", "tasty.traveler"]
}
```

**POST /register/complete**
```json
// Request
{
  "verification_token": "temp_token_xxx",
  "account_id": "tasty_traveler",          // 필수
  "nickname": "맛있는여행자",               // 선택
  "profile_image": "https://...",          // 선택
  "taste_profile": {...}                   // 선택, 퀴즈 결과
}

// Response 200
{
  "user": {
    "id": 123,
    "account_id": "tasty_traveler",
    "nickname": "맛있는여행자",
    "phone_country": "KR",
    ...
  },
  "access_token": "jwt_xxx",
  "refresh_token": "jwt_yyy"
}
```

### Users
| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/users/me` | 내 정보 조회 |
| PATCH | `/users/me` | 내 정보 수정 |
| GET | `/users/:id` | 유저 프로필 조회 |
| POST | `/users/:id/follow` | 팔로우 |
| DELETE | `/users/:id/follow` | 언팔로우 |
| GET | `/users/:id/followers` | 팔로워 목록 |
| GET | `/users/:id/following` | 팔로잉 목록 |

### Taste
| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/taste/quiz` | 퀴즈 문항 조회 |
| POST | `/taste/quiz/submit` | 퀴즈 결과 제출 |
| GET | `/taste/me` | 내 입맛 프로필 |

### Content
| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/content` | 피드 조회 (페이지네이션) |
| GET | `/content/:id` | 콘텐츠 상세 |
| POST | `/content` | 콘텐츠 작성 |
| PATCH | `/content/:id` | 콘텐츠 수정 |
| DELETE | `/content/:id` | 콘텐츠 삭제 |
| POST | `/content/:id/like` | 좋아요 |
| DELETE | `/content/:id/like` | 좋아요 취소 |

### Comments
| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/content/:id/comments` | 댓글 목록 |
| POST | `/content/:id/comments` | 댓글 작성 |
| DELETE | `/comments/:id` | 댓글 삭제 |
| POST | `/comments/:id/like` | 댓글 좋아요 |

### Shops
| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/shops` | 매장 목록 (검색/필터) |
| GET | `/shops/:id` | 매장 상세 |
| POST | `/shops/:id/save` | 매장 저장 (가고싶은곳) |
| DELETE | `/shops/:id/save` | 저장 취소 |
| GET | `/shops/:id/contents` | 매장 관련 콘텐츠 |

### Rankings
| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/rankings/me` | 내 매장 랭킹 |
| POST | `/rankings/compare` | A/B 비교 결과 제출 |
| GET | `/leaderboard` | 전체 유저 랭킹 |

### Lists
| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/lists` | 내 리스트 목록 |
| GET | `/lists/:id` | 리스트 상세 |
| POST | `/lists` | 리스트 생성 |
| PATCH | `/lists/:id` | 리스트 수정 |
| DELETE | `/lists/:id` | 리스트 삭제 |

### WantsToGo
| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/wantstogo` | 저장한 매장 목록 |

---

## 14. 추가 고려사항

### 14.1 TODO / 미정의 항목
- [x] `terms` 테이블 상세 스키마
- [x] 다국어(i18n) 설계
- [x] 입맛 퀴즈/클러스터 캐릭터 (별도 관리)
- [x] 추천/매칭 시스템 설계
- [ ] 경험치 계산 규칙 (이벤트별 delta_exp)
- [ ] 크리에이터 레벨 산정 기준
- [ ] 동영상 업로드 (TBD)
- [ ] 이미지 업로드/리사이즈 처리
- [ ] 이미지 업로드/리사이즈 처리

### 14.2 명명 규칙 변경 내역 (반영 완료)
| 변경 전 | 변경 후 | 사유 |
|---------|---------|------|
| `like` | `likes` | 예약어 충돌 방지 |
| `comment` | `comments` | 복수형 통일 |
| `visiable_rank` | `visible_rank` | 오타 수정 |
| `users_wantstogo.group` | `users_wantstogo.folder` | 예약어 회피 |
| `users_wantstogo.comment` | `users_wantstogo.memo` | 명확성 |
| `shops.catch_id` | `shops.catchtable_id` | 명확성 |
| `shops.catch_ref` | `shops.catchtable_ref` | 명확성 |
| `comment.parent_reply_id` | `comments.parent_id` | 간결성 |

### 14.3 추가된 인덱스 요약
```sql
-- terms
CREATE INDEX idx_terms_code ON terms(code);
CREATE INDEX idx_terms_active ON terms(is_active, country_code);

-- user_term_agreements (신규 테이블)
CREATE INDEX idx_user_term_user ON user_term_agreements(user_id);
CREATE INDEX idx_user_term_term ON user_term_agreements(term_id);

-- shops (개선)
CREATE INDEX idx_shops_location ON shops USING gist (ll_to_earth(lat, lon));  -- 거리 검색용
CREATE INDEX idx_shops_name_search ON shops USING gin (to_tsvector('simple', name));  -- 검색용

-- content (개선)
CREATE INDEX idx_content_feed ON content(created_at DESC) 
    WHERE visibility = TRUE AND is_deleted = FALSE;  -- Partial Index
CREATE INDEX idx_content_shop ON content((review_prop->>'shop_id')) 
    WHERE type = 'review';  -- JSONB 표현식 인덱스
CREATE INDEX idx_content_keyword ON content USING gin(keyword);  -- 해시태그 검색

-- likes (개선)
CREATE INDEX idx_likes_content ON likes(target_id) WHERE target_type = 'content';  -- Partial Index

-- comments (개선)
CREATE INDEX idx_comments_content ON comments(content_id, created_at);  -- 복합 인덱스
CREATE INDEX idx_comments_user ON comments(user_id);

-- users_wantstogo (개선)
CREATE INDEX idx_wantstogo_user_folder ON users_wantstogo(user_id, folder);  -- 폴더별 조회
```

### 14.4 위치 기반 검색 참고
`ll_to_earth` 사용을 위해 PostgreSQL earthdistance 확장 필요:
```sql
CREATE EXTENSION IF NOT EXISTS cube;
CREATE EXTENSION IF NOT EXISTS earthdistance;

-- 특정 좌표에서 반경 N km 내 매장 검색 예시
SELECT * FROM shops
WHERE earth_distance(
    ll_to_earth(lat, lon),
    ll_to_earth(37.5665, 126.9780)  -- 서울시청 좌표
) < 3000;  -- 3km 반경
```
