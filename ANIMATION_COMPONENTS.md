# Mimy 애니메이션 컴포넌트 가이드

이 문서는 Mimy 프로젝트에서 사용되는 애니메이션 컴포넌트들을 정리합니다.

## 목차

1. [개요](#개요)
2. [WriteGuideOverlay 컴포넌트](#writeguideoverlay-컴포넌트)
3. [AboutScreen 컴포넌트](#aboutscreen-컴포넌트)
4. [공통 패턴 및 기술](#공통-패턴-및-기술)
5. [컴포넌트 비교표](#컴포넌트-비교표)
6. [재사용 가능 패턴](#재사용-가능-패턴)

---

## 개요

Mimy에는 두 곳에서 주요 애니메이션 데모 컴포넌트가 사용됩니다:

| 위치 | 파일 | 용도 |
|------|------|------|
| **WriteGuideOverlay** | `src/components/WriteGuideOverlay.tsx` | 글쓰기 온보딩 가이드 |
| **AboutScreen** | `src/screens/profile/AboutScreen.tsx` | 서비스 소개 페이지 |

---

## WriteGuideOverlay 컴포넌트

글쓰기 플로우의 첫 방문 사용자를 위한 온보딩 오버레이입니다.

### 1. SearchRankingGuideDemo

**용도**: 검색 → 랭킹 등록 플로우 시연

**애니메이션 단계**:
1. 검색어 타이핑 (150ms 간격)
2. 검색 결과 표시
3. 매장 선택 (scale bounce)
4. 랭킹 카드로 슬라이드 전환
5. 만족도 선택 (Good/OK/Bad)
6. 비교 화면 (기존 매장 vs 신규 매장)
7. 결과 화면 (순위 확정)

**핵심 코드**:
```tsx
// 카드 슬라이드 전환
<motion.div
    initial={{ x: '0%', opacity: 1 }}
    animate={{
        x: phase === 'search' ? '0%' : '-110%',
        opacity: phase === 'search' ? 1 : 0
    }}
    transition={{ duration: 0.4, ease: 'easeInOut' }}
/>
```

**타이밍** (~6.2초 사이클):
- 검색 타이핑: ~450ms (3글자 x 150ms)
- 결과 표시: 400ms
- 매장 선택: 600ms
- 랭킹 전환: 500ms
- 만족도 선택: 600ms
- 비교 화면: 800ms
- 결과 표시: 800ms + 1200ms 홀드

---

### 2. WriteGuideDemo

**용도**: 리뷰 작성 플로우 시연

**애니메이션 단계**:
1. 사진 추가 (3장, 400ms 간격)
2. 텍스트 타이핑 (30ms 간격)
3. 완료 상태

**핵심 코드**:
```tsx
// 사진 추가 애니메이션
<motion.div
    initial={{ opacity: 0, scale: 0.8 }}
    animate={{
        opacity: photoCount > idx ? 1 : 0.3,
        scale: photoCount > idx ? 1 : 0.9
    }}
    transition={{ duration: 0.3 }}
/>
```

---

### 3. FeedGuideDemo

**용도**: 피드 노출 및 인터랙션 시연

**애니메이션 단계**:
1. 카드 fade-in
2. 이미지 캐로셀 페이지네이션 (3장)
3. 좋아요 애니메이션 (하트 오버레이)

**핵심 코드**:
```tsx
// 이미지 캐로셀
<motion.div
    className="flex gap-2 pl-3"
    animate={{ x: [0, -180, -360][currentPhotoIndex] }}
    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
/>

// 좋아요 오버레이
<AnimatePresence>
    {showLikeOverlay && (
        <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: [0, 1.3, 1], opacity: [0, 1, 1] }}
            exit={{ scale: 0, opacity: 0 }}
        >
            <Heart size={64} className="fill-red-500" />
        </motion.div>
    )}
</AnimatePresence>
```

**타이밍** (~5.8초 사이클):
- 카드 표시: 300ms
- 사진 1→2: 1200ms
- 사진 2→3: 800ms
- 사진 3→1: 800ms
- 좋아요: 3500ms
- 하트 숨김: 700ms
- 좋아요 취소: 600ms

---

## AboutScreen 컴포넌트

서비스 소개 페이지의 섹션별 데모 애니메이션입니다.

### 1. IntroPage

**용도**: 히어로 섹션

**애니메이션**:
- 로고/태그라인 순차 fade-in (y: 30 → 0)
- 스크롤 힌트 bounce (y: [0, 10, 0])

**핵심 기술**:
```tsx
const isInView = useInView(ref, { once: false, margin: "-10%" });

<motion.h1
    initial={{ opacity: 0, y: 30 }}
    animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
    transition={{ duration: 0.7, delay: 0 }}
/>
```

---

### 2. FlowingTasteCards

**용도**: 입맛 클러스터 소개 (Discover 섹션)

**애니메이션**: 무한 좌우 흐름

**핵심 코드**:
```tsx
<motion.div
    animate={{ x: ['0%', '-50%'] }}
    transition={{ duration: 25, ease: 'linear', repeat: Infinity }}
/>
```

---

### 3. RankingDemo

**용도**: 랭킹 등록 플로우 (Rank 섹션)

**애니메이션 단계**:
1. 만족도 선택
2. 비교 화면
3. 결과 화면
4. **리스트 뷰 슬라이드** (WriteGuideOverlay에 없음)
5. 리스트 스크롤

**WriteGuideOverlay와 차이점**:
- 결과 후 리스트 뷰로 전환되는 추가 단계
- 리스트 스크롤 애니메이션 포함
- 카드 좌우 슬라이드 (% 기반)

**핵심 코드**:
```tsx
// 카드 슬라이드
<motion.div
    animate={{ x: `${rankingCardX}%`, opacity: rankingCardX === 0 ? 1 : 0 }}
    transition={{ duration: 0.4, ease: 'easeInOut' }}
/>

// 리스트 스크롤
<motion.div
    animate={{ y: -listScrollY }}
    transition={{ duration: 1.8, ease: 'easeInOut' }}
/>
```

---

### 4. FeedDemo

**용도**: 피드 및 유저 프로필 (Share 섹션)

**애니메이션 단계**:
1. 피드 스크롤
2. 유저 클릭 하이라이트
3. **3D 카드 플립** → 유저 프로필
4. 매칭 스코어 강조
5. 다시 플립해서 복귀

**WriteGuideOverlay와 차이점**:
- 3D 카드 플립 효과 (perspective, rotateY)
- 유저 프로필 뒷면 카드
- 피드 스크롤 (여러 아이템)

**핵심 코드**:
```tsx
// 3D 플립
<div style={{ perspective: '1000px' }}>
    <motion.div
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ duration: 0.6, ease: 'easeInOut' }}
        style={{ transformStyle: 'preserve-3d' }}
    >
        {/* 앞면 */}
        <div style={{ backfaceVisibility: 'hidden' }}>...</div>
        {/* 뒷면 */}
        <div style={{
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)'
        }}>...</div>
    </motion.div>
</div>
```

---

### 5. MapDemo

**용도**: 지도 기반 탐색 (Find 섹션)

**애니메이션**:
- MapTiler SDK 실제 지도
- 커스텀 Speech Bubble 마커
- flyTo 카메라 이동
- 카드 페이지네이션 (하단 슬라이드)

**핵심 코드**:
```tsx
// 카메라 이동
map.flyTo({
    center: [pin.lng, pin.lat],
    zoom: 15,
    duration: 800
});

// 카드 슬라이드
<motion.div
    animate={{ y: cardY, x: `${-cardIndex * 100}%` }}
    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
/>
```

---

### 6. LeaderboardDemo

**용도**: 리더보드 필터 (Compete 섹션)

**애니메이션**:
- 필터 탭 전환 (회사/동네/전체)
- 리스트 fade 전환
- 순위 하이라이트

---

### 7. ScrollSection

**용도**: 스크롤 기반 섹션 전환

**핵심 기술**:
```tsx
const { scrollYProgress } = useScroll({
    container: containerRef,
    target: sectionRef,
    offset: ["start end", "end start"]
});

const opacity = useTransform(scrollYProgress, [0, 0.25, 0.75, 1], [0, 1, 1, 0]);
const y = useTransform(scrollYProgress, [0, 0.25, 0.75, 1], [80, 0, 0, -40]);
```

---

## 공통 패턴 및 기술

### 1. Framer Motion 기본

```tsx
import { motion, AnimatePresence, useInView } from 'framer-motion';

// 기본 애니메이션
<motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -20 }}
    transition={{ duration: 0.3 }}
/>

// 조건부 애니메이션
<AnimatePresence mode="wait">
    {condition && <motion.div key="unique" ... />}
</AnimatePresence>
```

### 2. 타이머 시퀀스 패턴

```tsx
useEffect(() => {
    const timers: NodeJS.Timeout[] = [];

    const runAnimation = () => {
        // Reset states
        setState(initialValue);

        // Timeline
        timers.push(setTimeout(() => setStep1(true), 500));
        timers.push(setTimeout(() => setStep2(true), 1000));
        // ...

        // Restart
        timers.push(setTimeout(runAnimation, totalDuration));
    };

    runAnimation();
    return () => timers.forEach(clearTimeout);
}, []);
```

### 3. 슬라이드/페이지네이션

```tsx
// 픽셀 기반
animate={{ x: [0, -180, -360][index] }}

// 퍼센트 기반
animate={{ x: `${-index * 100}%` }}

// Spring 물리
transition={{ type: 'spring', stiffness: 300, damping: 30 }}
```

### 4. 스케일 바운스

```tsx
animate={isSelected ? { scale: [1, 1.02, 1] } : {}}
```

---

## 컴포넌트 비교표

| 기능 | WriteGuideOverlay | AboutScreen |
|------|-------------------|-------------|
| **검색 타이핑** | SearchRankingGuideDemo | - |
| **만족도 선택** | SearchRankingGuideDemo | RankingDemo |
| **비교 화면** | SearchRankingGuideDemo | RankingDemo |
| **순위 결과** | SearchRankingGuideDemo | RankingDemo |
| **리스트 스크롤** | - | RankingDemo |
| **사진 추가** | WriteGuideDemo | - |
| **텍스트 타이핑** | WriteGuideDemo | - |
| **이미지 캐로셀** | FeedGuideDemo | FeedDemo |
| **좋아요 오버레이** | FeedGuideDemo | - |
| **ShopInfoCard** | FeedGuideDemo | FeedDemo |
| **3D 카드 플립** | - | FeedDemo |
| **유저 프로필** | - | FeedDemo |
| **지도** | - | MapDemo |
| **입맛 클러스터** | - | FlowingTasteCards |
| **리더보드** | - | LeaderboardDemo |
| **스크롤 페이드** | - | ScrollSection |

---

## 재사용 가능 패턴

### 1. 기본 카드 슬라이드

```tsx
const [phase, setPhase] = useState<'a' | 'b'>('a');

// Card A
<motion.div
    animate={{
        x: phase === 'a' ? '0%' : '-110%',
        opacity: phase === 'a' ? 1 : 0
    }}
    transition={{ duration: 0.4, ease: 'easeInOut' }}
/>

// Card B
<motion.div
    initial={{ x: '110%', opacity: 0 }}
    animate={{
        x: phase === 'b' ? '0%' : '110%',
        opacity: phase === 'b' ? 1 : 0
    }}
/>
```

### 2. 타이핑 애니메이션

```tsx
const [text, setText] = useState('');
const fullText = '검색어';

useEffect(() => {
    for (let i = 1; i <= fullText.length; i++) {
        setTimeout(() => setText(fullText.slice(0, i)), i * 150);
    }
}, []);

return (
    <span>
        {text}
        <span className="animate-pulse">|</span>
    </span>
);
```

### 3. 좋아요 오버레이

```tsx
<AnimatePresence>
    {showLike && (
        <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: [0, 1.3, 1], opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center"
        >
            <Heart className="fill-red-500 text-red-500" size={64} />
        </motion.div>
    )}
</AnimatePresence>
```

---

## 파일 구조

```
src/
├── components/
│   └── WriteGuideOverlay.tsx      # 글쓰기 온보딩
│       ├── SearchRankingGuideDemo # 검색 + 랭킹
│       ├── WriteGuideDemo         # 글쓰기
│       └── FeedGuideDemo          # 피드
│
└── screens/profile/
    └── AboutScreen.tsx            # 서비스 소개
        ├── IntroPage              # 히어로
        ├── FlowingTasteCards      # 입맛 클러스터
        ├── RankingDemo            # 랭킹 + 리스트
        ├── FeedDemo               # 피드 + 3D 플립
        ├── MapDemo                # 지도
        ├── LeaderboardDemo        # 리더보드
        ├── OutroPage              # 아웃트로
        └── ScrollSection          # 스크롤 래퍼
```

---

**마지막 업데이트**: 2026-02-11
**작성자**: Claude Code
