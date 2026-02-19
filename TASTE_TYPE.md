# 32유형 MBTI 스타일 입맛 분류 시스템

## 개요

기존 7축 입맛 점수 시스템(-2 ~ +2)을 32유형 MBTI 스타일 분류 시스템으로 변환합니다.
기존 매칭 알고리즘에서 사용하는 7축 점수와 128 클러스터는 그대로 유지하며, UI 표시만 새로운 타입 코드로 변경됩니다.

## 타입 코드 구조

```
[Intensity][Flavor][Pleasure][Exploration]-[Subtype]
예: HASP-A (선도자형 미식가 - 확신형)
```

### 4개 주요 축 (16 기본 유형)

| 축 | 코드 | 의미 | 계산 공식 | 판정 기준 |
|---|------|------|----------|----------|
| **Intensity** | L / H | 담백 / 강렬 | `(boldness + spiciness) / 2` | > 0 → H |
| **Flavor** | D / A | 깊은맛 / 상큼 | `acidity - richness` | > 0 → A |
| **Pleasure** | U / S | 감칠맛 / 달콤 | `sweetness - umami` | > 0 → S |
| **Exploration** | F / P | 익숙 / 도전 | `experimental` | > 0 → P |

### 5번째 지표: Subtype (-A / -T)

| 코드 | 의미 | 판정 기준 |
|------|------|----------|
| **-A** | Assertive (확신형) | `stabilityScore >= 1.2` |
| **-T** | Turbulent (탐구형) | `stabilityScore < 1.2` |

**Stability Score 계산:**
```typescript
stabilityScore = mean(|boldness|, |acidity|, |richness|, |experimental|, |spiciness|, |sweetness|, |umami|)
```

## 16 기본 유형 프로필

### L (Low Intensity - 담백한 맛 선호)

| 코드 | 한국어 이름 | 영어 이름 | 설명 |
|------|------------|----------|------|
| **LDUF** | 보존자형 미식가 | The Preserver | 익숙하고 깊은 맛을 안정적으로 즐긴다. 한 번 마음에 든 메뉴를 꾸준히 찾는 편이다. |
| **LDUP** | 연구자형 미식가 | The Researcher | 은은한 깊이의 차이를 탐구한다. 전통적인 맛 속에서도 새로운 발견을 즐긴다. |
| **LDSF** | 감상자형 미식가 | The Appreciator | 묵직하고 달콤한 맛을 여유롭게 음미한다. 음식에서 위안을 찾는 타입이다. |
| **LDSP** | 기획자형 미식가 | The Planner | 리치한 디저트를 새롭게 조합해본다. 달콤함을 창의적으로 확장한다. |
| **LAUF** | 절제자형 미식가 | The Minimalist | 산뜻하고 정돈된 감칠을 선호한다. 과하지 않은 균형을 중요하게 여긴다. |
| **LAUP** | 탐색자형 미식가 | The Explorer | 가볍고 산뜻한 메뉴를 중심으로 새로운 맛을 시도한다. |
| **LASF** | 감각자형 미식가 | The Sensualist | 상큼하고 달콤한 조합을 즐긴다. 밝고 경쾌한 취향을 가졌다. |
| **LASP** | 창안자형 미식가 | The Innovator | 산미와 단맛의 새로운 조합에 관심이 많다. 트렌드를 빠르게 받아들인다. |

### H (High Intensity - 강렬한 맛 선호)

| 코드 | 한국어 이름 | 영어 이름 | 설명 |
|------|------------|----------|------|
| **HDUF** | 실천자형 미식가 | The Practitioner | 강하고 묵직한 맛을 선호한다. 취향이 분명하고 흔들림이 적다. |
| **HDUP** | 추적자형 미식가 | The Pursuer | 더 진하고 강한 맛을 찾아다닌다. 깊은 맛에 대한 집요함이 있다. |
| **HDSF** | 집중자형 미식가 | The Concentrator | 강렬한 단맛과 묵직함에 몰입한다. 확실한 쾌감을 추구한다. |
| **HDSP** | 확장자형 미식가 | The Expander | 자극적이고 달콤한 조합을 과감히 시도한다. 강한 맛을 즐긴다. |
| **HAUF** | 정밀자형 미식가 | The Precisionist | 매콤하고 산뜻한 자극을 또렷하게 즐긴다. 취향의 기준이 명확하다. |
| **HAUP** | 개척자형 미식가 | The Pioneer | 날카롭고 강한 맛을 적극적으로 탐험한다. 새로운 메뉴에 개방적이다. |
| **HASF** | 조율자형 미식가 | The Harmonizer | 매콤달콤한 균형을 안정적으로 즐긴다. 강하지만 조화로운 맛을 선호한다. |
| **HASP** | 선도자형 미식가 | The Trendsetter | 강렬하고 생동감 있는 맛을 앞서 경험한다. 새로운 조합을 이끄는 타입이다. |

## 32유형 전체 목록

16개 기본 유형 × 2개 서브타입 = 32유형

| 기본 유형 | 확신형 (-A) | 탐구형 (-T) |
|----------|------------|------------|
| LDUF | LDUF-A | LDUF-T |
| LDUP | LDUP-A | LDUP-T |
| LDSF | LDSF-A | LDSF-T |
| LDSP | LDSP-A | LDSP-T |
| LAUF | LAUF-A | LAUF-T |
| LAUP | LAUP-A | LAUP-T |
| LASF | LASF-A | LASF-T |
| LASP | LASP-A | LASP-T |
| HDUF | HDUF-A | HDUF-T |
| HDUP | HDUP-A | HDUP-T |
| HDSF | HDSF-A | HDSF-T |
| HDSP | HDSP-A | HDSP-T |
| HAUF | HAUF-A | HAUF-T |
| HAUP | HAUP-A | HAUP-T |
| HASF | HASF-A | HASF-T |
| HASP | HASP-A | HASP-T |

## 코드 구현

### 핵심 파일

| 파일 | 설명 |
|------|------|
| [server/utils/tasteType.ts](server/utils/tasteType.ts) | 서버 타입 변환 유틸리티 |
| [server/utils/tasteType.test.ts](server/utils/tasteType.test.ts) | 40개 단위 테스트 |
| [src/lib/tasteType.ts](src/lib/tasteType.ts) | 프론트엔드 타입 유틸리티 (하위 호환용) |

### 주요 함수

```typescript
// 7축 점수 → 32유형 변환
function calculateTasteType(scores: TasteScores): TasteType

// taste_result에서 타입 가져오기 (신규/기존 사용자 모두 지원)
function getTasteType(tasteResult: any): TasteType | null

// 타입 프로필 (이름/설명) 가져오기
function getTasteTypeProfile(tasteType: TasteType | string, lang: 'ko' | 'en'): { name: string; tagline: string } | null
```

### 타입 인터페이스

```typescript
interface TasteType {
    baseCode: string;           // "HASP"
    subtype: 'A' | 'T';         // Assertive / Turbulent
    fullType: string;           // "HASP-A"
    axes: TasteTypeAxes;
    stabilityScore: number;     // 0 ~ 2 (소수점 2자리)
}

interface TasteTypeAxes {
    intensity: 'L' | 'H';
    flavor: 'D' | 'A';
    pleasure: 'U' | 'S';
    exploration: 'F' | 'P';
}
```

## 데이터 마이그레이션

### 기존 사용자 처리

기존 사용자의 `taste_result`에 `tasteType` 필드가 없는 경우, 프론트엔드에서 `scores`를 기반으로 실시간 계산합니다.

```typescript
// src/lib/tasteType.ts - getTasteType()
export function getTasteType(tasteResult: any): TasteType | null {
    // 1. 이미 tasteType이 있으면 그대로 사용 (신규 사용자)
    if (tasteResult.tasteType) {
        return tasteResult.tasteType;
    }
    // 2. 없으면 scores에서 계산 (기존 사용자)
    if (tasteResult.scores) {
        return calculateTasteType(tasteResult.scores);
    }
    return null;
}
```

### 마이그레이션 스크립트

```bash
# 기존 사용자 일괄 업데이트
npx tsx server/scripts/migrate-taste-types.ts
```

**실행 결과 (2026-02-19):**
- 전체: 1,178명
- 업데이트: 1,177명
- 스킵: 1명 (이미 tasteType 보유)
- 에러: 0건

## UI 적용 위치

| 화면 | 파일 | 표시 내용 |
|------|------|----------|
| 퀴즈 결과 | [QuizResult.tsx](src/screens/quiz/QuizResult.tsx) | 타입 코드 (대형) + 프로필 이름/설명 |
| 내 프로필 | [ProfileScreen.tsx](src/screens/main/ProfileScreen.tsx) | 타입 코드 + 프로필 이름 |
| 사용자 프로필 | [UserProfileScreen.tsx](src/screens/profile/UserProfileScreen.tsx) | 타입 코드 + 프로필 이름 |
| 입맛 프로필 시트 | [TasteProfileSheet.tsx](src/components/TasteProfileSheet.tsx) | 타입 배지 + 프로필 정보 |
| 리더보드 | [LeaderboardTab.tsx](src/screens/main/LeaderboardTab.tsx) | 타입 배지 |
| 콘텐츠 카드 | [ContentCard.tsx](src/components/ContentCard.tsx) | 프로필 이름 (닉네임 옆) |

## 번역

번역 키: `taste_type.*`

| 키 | 한국어 | 영어 |
|---|--------|------|
| `taste_type.axes.intensity.L` | 담백 | Mild |
| `taste_type.axes.intensity.H` | 강렬 | Bold |
| `taste_type.axes.flavor.D` | 깊은맛 | Deep |
| `taste_type.axes.flavor.A` | 상큼 | Fresh |
| `taste_type.axes.pleasure.U` | 감칠맛 | Umami |
| `taste_type.axes.pleasure.S` | 달콤 | Sweet |
| `taste_type.axes.exploration.F` | 익숙 | Familiar |
| `taste_type.axes.exploration.P` | 도전 | Progressive |
| `taste_type.subtype.A` | 확신형 | Assertive |
| `taste_type.subtype.T` | 탐구형 | Turbulent |

## 테스트

```bash
# 단위 테스트 실행
npx jest server/utils/tasteType.test.ts
```

**테스트 케이스:**
- 샘플 입력 변환 (HASP-A)
- 경계값 테스트 (0, 극값)
- 32유형 전체 생성 검증
- Stability threshold 테스트
- 유효성 검사 함수 테스트

---

**최종 업데이트**: 2026-02-19
**버전**: v1.0
