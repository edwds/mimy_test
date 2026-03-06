import { GoogleGenerativeAI } from '@google/generative-ai';
import { formatFoodKind } from './foodKindMap.js';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

/**
 * Extracts restaurant names from reservation app screenshots using Gemini Vision.
 * Supports CatchTable, Naver Reservation, and similar Korean reservation apps.
 *
 * @param imageUrls - Array of image URLs (max 5)
 * @returns Array of extracted restaurant names
 */
export async function extractRestaurantNames(imageUrls: string[]): Promise<string[]> {
    if (!imageUrls.length) return [];

    const model = genAI.getGenerativeModel({ model: 'gemini-3.1-pro-preview' });

    // Fetch images and convert to base64 for Gemini
    const imageParts = await Promise.all(
        imageUrls.map(async (url) => {
            const response = await fetch(url);
            const buffer = await response.arrayBuffer();
            const base64 = Buffer.from(buffer).toString('base64');
            const mimeType = response.headers.get('content-type') || 'image/jpeg';
            return {
                inlineData: { data: base64, mimeType }
            };
        })
    );

    const prompt = `이 이미지는 캐치테이블, 네이버 예약, 또는 다른 예약/방문 기록 앱의 스크린샷입니다.
이미지에서 음식점(레스토랑) 이름만 추출해주세요.

규칙:
- 음식점 이름만 추출 (날짜, 주소, 메뉴 등은 제외)
- 중복 제거
- 이름이 잘려있으면 보이는 부분만 추출
- 음식점이 아닌 항목(호텔, 카페 등)도 포함

JSON 배열로만 응답해주세요. 다른 텍스트 없이:
["음식점이름1", "음식점이름2", ...]

음식점을 찾을 수 없으면 빈 배열 []을 반환해주세요.`;

    const result = await model.generateContent([prompt, ...imageParts]);
    const text = result.response.text().trim();

    // Parse JSON response, handling potential markdown code blocks
    const jsonStr = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    try {
        const names = JSON.parse(jsonStr);
        if (Array.isArray(names)) {
            return names.filter((n: unknown) => typeof n === 'string' && n.trim().length > 0);
        }
        return [];
    } catch {
        console.error('[Gemini] Failed to parse restaurant names:', text);
        return [];
    }
}

export interface TasteAnalysisInput {
    tasteType: {
        fullType: string;
        baseCode: string;
        subtype: string;
    };
    tasteProfile: {
        name: string;
        tagline: string;
    };
    scores: Record<string, number>;
    rankedShops: Array<{
        name: string;
        food_kind: string | null;
        description: string | null;
        address_region: string | null;
        satisfaction_tier: number;
        rank: number;
        briefing: string | null;
    }>;
    hatedFoods: string[];
}

export interface RecommendationItem {
    name: string;
    address: string;
    reason: string;
}

export interface TasteAnalysisResult {
    summary: string;
    insights: string[];
    avoidNote: string;
    recommendations: RecommendationItem[];
}

function formatShopDetail(s: TasteAnalysisInput['rankedShops'][number]): string {
    let line = `  ${s.rank}위. ${s.name} (${formatFoodKind(s.food_kind)})`;
    if (s.address_region) line += ` - ${s.address_region}`;
    if (s.description) line += `\n      설명: ${s.description.slice(0, 200)}`;
    if (s.briefing) {
        const briefingLines = s.briefing.split('\n');
        const trimmed = briefingLines.slice(1).join('\n').trim();
        if (trimmed) line += `\n      브리핑: ${trimmed.slice(0, 300)}`;
    }
    return line;
}

function decodeTypeAxes(baseCode: string): string {
    const axisMap: Record<string, [string, string]> = {
        // [letter, meaning]
        'H': ['고자극', '강하고 자극적인 맛(매운맛·과감한 맛)을 즐김'],
        'L': ['저자극', '부드럽고 담백한 맛을 선호'],
        'D': ['깊은맛', '진하고 묵직한 풍미(숙성·발효·장시간 조리)를 추구'],
        'A': ['산뜻', '가볍고 상큼한 산미 위주의 맛을 선호'],
        'U': ['감칠맛', '단맛보다 감칠맛(우마미·발효·육수)에 끌림'],
        'S': ['달콤', '감칠맛보다 달콤한 맛에 끌림'],
        'P': ['탐험', '새로운 맛과 식당을 적극 시도'],
        'F': ['안정', '검증된 맛과 익숙한 식당을 선호'],
    };
    const subtypeMap: Record<string, string> = {
        'A': '확신형 — 취향이 뚜렷하고 일관됨',
        'T': '탐구형 — 취향이 유동적이고 다양한 시도',
    };
    if (baseCode.length < 4) return '';

    const letters = [
        { pos: 0, axis: '자극 강도' },
        { pos: 1, axis: '풍미 방향' },
        { pos: 2, axis: '쾌감 축' },
        { pos: 3, axis: '탐험 성향' },
    ];
    const lines = letters.map(({ pos, axis }) => {
        const letter = baseCode[pos];
        const info = axisMap[letter];
        return info ? `- ${axis}: ${info[0]}(${letter}) — ${info[1]}` : '';
    }).filter(Boolean);
    return lines.join('\n');
}

function computePatterns(shops: TasteAnalysisInput['rankedShops']): string {
    const goodShops = shops.filter(s => s.satisfaction_tier === 2);

    // Genre count (normalized)
    const genreCounts: Record<string, number> = {};
    for (const s of goodShops) {
        const genre = formatFoodKind(s.food_kind);
        genreCounts[genre] = (genreCounts[genre] || 0) + 1;
    }
    const topGenres = Object.entries(genreCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([g, c]) => `${g}(${c})`)
        .join(', ');

    // Region count
    const regionCounts: Record<string, number> = {};
    for (const s of goodShops) {
        if (s.address_region) {
            regionCounts[s.address_region] = (regionCounts[s.address_region] || 0) + 1;
        }
    }
    const topRegions = Object.entries(regionCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([r, c]) => `${r}(${c})`)
        .join(', ');

    const parts: string[] = [];
    if (topGenres) parts.push(`Good 상위 장르: ${topGenres}`);
    if (topRegions) parts.push(`주요 지역: ${topRegions}`);
    return parts.join(' | ');
}

/**
 * Generates a detailed taste analysis using Gemini Pro.
 *
 * @param data - User's taste type, scores, and ranked shops
 * @returns Structured analysis result
 */
export async function generateTasteAnalysis(data: TasteAnalysisInput): Promise<TasteAnalysisResult> {
    const model = genAI.getGenerativeModel({ model: 'gemini-3.1-pro-preview' });

    const shopsByTier = {
        good: data.rankedShops.filter(s => s.satisfaction_tier === 2),
        ok: data.rankedShops.filter(s => s.satisfaction_tier === 1),
        bad: data.rankedShops.filter(s => s.satisfaction_tier === 0),
    };

    const scoreLabel = (v: number): string => {
        if (v >= 2) return '매우 높음';
        if (v >= 1) return '높음';
        if (v <= -2) return '매우 낮음';
        if (v <= -1) return '낮음';
        return '보통';
    };

    const patternSummary = computePatterns(data.rankedShops);
    const hateSection = data.hatedFoods.length > 0
        ? `못 먹는 음식: ${data.hatedFoods.join(', ')}`
        : '';

    const decodedAxes = decodeTypeAxes(data.tasteType.baseCode);
    const subtypeLabel = data.tasteType.subtype === 'A'
        ? '확신형(A) — 취향이 뚜렷하고 일관됨'
        : '탐구형(T) — 취향이 유동적이고 다양한 시도';

    const prompt = `당신은 미식 행동 분석가입니다. 맛집 리스트에서 본인도 모르는 숨은 패턴을 찾아냅니다.

## 핵심 원칙
- 당연한 말 금지. "깊은맛 선호 → 숙성 전문점 선택" 수준은 누구나 알 수 있다. 그 너머를 봐라.
- 장르 다른 매장들이 왜 같은 tier에 있는지, 장르 같은 매장들이 왜 다른 tier에 있는지 — 그 이유가 진짜 인사이트다.
- 입맛 DNA는 분석의 렌즈로만 쓴다. "X축 선호가 Y로 나타납니다" 같은 기계적 연결 금지.
- 이 사람이 읽고 "나도 몰랐는데 그러네" 하고 놀랄 문장만 써라.

## 이 사람의 입맛 DNA (분석 렌즈로만 활용)
코드: ${data.tasteType.fullType}
${decodedAxes}
- 서브타입: ${subtypeLabel}

7축 원점수:
과감함 ${scoreLabel(data.scores.boldness ?? 0)} | 산미 ${scoreLabel(data.scores.acidity ?? 0)} | 깊은맛 ${scoreLabel(data.scores.richness ?? 0)} | 도전정신 ${scoreLabel(data.scores.experimental ?? 0)} | 매운맛 ${scoreLabel(data.scores.spiciness ?? 0)} | 단맛 ${scoreLabel(data.scores.sweetness ?? 0)} | 감칠맛 ${scoreLabel(data.scores.umami ?? 0)}

## 맥락 요약
${patternSummary}${hateSection ? '\n' + hateSection : ''}

## 이 사용자가 직접 평가한 맛집 (순위순, 1위가 가장 좋아하는 곳)
순위는 사용자가 직접 매긴 순서입니다. Good/OK/Bad는 대분류이고, 그 안의 순서가 이 사람의 진짜 정렬 기준을 보여줍니다.
순서는 "얼마나 좋아하는가"의 단순 척도가 아닙니다. 최근 방문, 방문 빈도, 임팩트 등 사람마다 정렬 기준이 다릅니다.
${shopsByTier.good.length > 0 ? `★ Good (만족):\n${shopsByTier.good.map(s => formatShopDetail(s)).join('\n')}` : ''}
${shopsByTier.ok.length > 0 ? `○ OK (보통):\n${shopsByTier.ok.map(s => formatShopDetail(s)).join('\n')}` : ''}
${shopsByTier.bad.length > 0 ? `✗ Bad (불만족):\n${shopsByTier.bad.map(s => formatShopDetail(s)).join('\n')}` : ''}

## 분석 방법론 (이 순서로 사고하되, 출력엔 결론만 쓴다)

Step 1 - 정렬 기준 추론: 같은 Good이라도 순서가 있다. 이 순서에서 "이 사람이 맛집을 어떤 기준으로 줄 세우는가"가 드러난다.
  주의: 상위권이 "더 좋아하는 곳"이 아닐 수 있다. 최근 방문순, 임팩트순, 자주 가는 순 등 사람마다 정렬 기준이 다르다.
  예: Good 상위에 최근 오픈한 곳이 몰려 있다면 → "새로 발견한 곳에 높은 가중치를 두는 성향"
  예: Good 상위에 장르 불문 코스 요리가 집중 → "코스 구성이 있는 곳을 더 인상적으로 기억하는 패턴"

Step 2 - 구조적 공통점: Good 매장들을 장르 무시하고 놓으면 공유하는 구조가 뭔가?
  (셰프 운영 방식, 조리 공정, 식재료 수급, 공간 설계, 가격 구조, 코스 vs 단품, 전문 vs 종합 등)

Step 3 - 모순/긴장 찾기: 입맛 DNA와 실제 선택이 겉보기에 모순되는 점은?
  예: 도전정신 높은데 한 동네에만 몰림 → "이동 반경은 좁지만 그 안에서 장르를 극대화"
  예: 감칠맛 선호인데 파인다이닝 뷔페도 Good → "다양한 감칠맛을 한 번에 훑으려는 효율"

Step 4 - 행동 패턴: 매장 선택에서 드러나는 이 사람만의 의사결정 규칙은?
  (예: "불을 직접 다루는 곳만 Good", "코스 있으면 무조건 상위", "혼밥 가능한 곳이 높음")

## 응답 형식

반드시 아래 JSON으로만 응답. 다른 텍스트 없이:

{
    "summary": "1문장",
    "insights": ["1문장", "1문장", "1문장", "1문장", "1문장", "1문장"],
    "recommendations": [{"name": "맛집이름", "address": "서울특별시 OO구 OO동", "reason": "이유 1문장"}, {"name": "맛집이름", "address": "서울특별시 OO구 OO동", "reason": "이유 1문장"}, {"name": "맛집이름", "address": "서울특별시 OO구 OO동", "reason": "이유 1문장"}]
}

## 톤
- 객관적 3인칭 관찰체. 짧은 문장. 부드러운 추정 톤.
- 종결어: "~로 보입니다", "~인 듯합니다", "~경향이 있습니다", "~편입니다" (추정형 존댓말).
- 극단적/단정적 표현 금지: "확연히", "철저히", "배척", "반드시", "오직", "~만", "완전히", "극도로", "무조건", "압도적"
- 대신 부드러운 표현 사용: "주로", "대체로", "~하는 편입니다", "~쪽에 가깝습니다", "~가능성이 높습니다"
- 금지: 반말, 감탄사, 아첨, 수식어 과다, "~하시는" 경어.

## 필드별 규칙

**summary** (1문장)
- 이 사람의 선택을 관통하는 하나의 원리. 축 라벨을 직접 쓰지 않되, 축이 만들어낸 행동 패턴을 담는다.
- 금지어: "미식가", "고수", "하이엔드", "프리미엄", "깐깐", "집요", "끈질기게"
- 좋은 예: "조리에 시간이 녹아든 한 그릇 쪽으로 자연스럽게 기우는 혀"
- 좋은 예: "불 앞에 서는 셰프가 있는 곳을 주로 기억하는 미각"
- 나쁜 예: "진한 감칠맛을 찾아 새 식당을 끈질기게 파는 혀" (← 축 라벨 직역 + 금지어)
- 나쁜 예: "식재료의 급과 조리 전문성을 깐깐하게 따지는 하이엔드 취향" (← 수식 과다 + 금지어)
- 나쁜 예: "시간이 응축된 한 그릇에만 반응하는 혀" (← "~에만"은 단정적)

**insights** (6~7개, 각 1문장)
- 매장 이름을 근거로 포함하되, 축 라벨("깊은맛 선호", "감칠맛 갈망")로 문장을 시작하지 마라.
- 패턴 → 근거(매장) 순서가 아닌, 관찰(매장) → 해석(패턴) 순서로 써라.
  나쁜 예: "묵직한 깊은맛 선호가 볼트, 우탭 같은 숙성점 선택으로 나타납니다." (← 축 라벨 직역, 당연한 결론)
  좋은 예: "볼트와 우탭의 공통점은 '고기를 가장 오래 재운 곳'이라는 점으로, 조리 시간이 긴 식당을 선호하는 경향이 보입니다."
  좋은 예: "진수사와 평가옥은 장르가 다르지만 둘 다 '국물을 오래 우린 곳'입니다. 장르보다 추출 시간 쪽에 더 반응하는 듯합니다."
  좋은 예: "같은 이탈리안이어도 생면 수타 여부로 Good/OK가 갈리는 편입니다. 셰프의 수작업 밀도가 주요 기준으로 보입니다."
- 최소 1개는 순서 패턴에서 이 사람의 정렬 기준을 추론한 내용을 다뤄라.
- 최소 1개는 본인이 인지 못했을 가능성이 높은 패턴이어야 한다.

**recommendations** (3개, 각 {name, address, reason})
- 분석에서 도출된 이 사람의 취향 패턴에 맞을 것 같은 실제 존재하는 맛집을 추천한다.
- 이미 Good 리스트에 있는 매장은 제외. 사용자가 아직 안 가봤을 법한 곳을 추천해라.
- 추천 이유는 앞서 도출한 인사이트와 연결되어야 한다.
  좋은 예: "리스토란테 에오 — Good 상위권의 공통점인 '셰프가 직접 불 앞에 서는 구조'를 갖춘 이탈리안입니다"
  좋은 예: "스시 코우 — 코스 완결성과 네타 품질이 이 사람의 상위 기준에 부합하는 편입니다"
- 서울/수도권의 실제 존재하는 식당만 추천. 확실하지 않으면 장르+특성으로 설명해도 좋다.
  예: "숙성 전문 야키니쿠 — 조리 시간이 긴 곳을 선호하는 패턴에 맞는 장르입니다"

## 금지사항
- 점수/수치/퍼센트 노출 금지.
- "X 선호가 Y 선택으로 나타납니다/발현됩니다/이어집니다" 공식 금지.
- 축 이름(깊은맛, 감칠맛, 탐험 성향 등)으로 문장을 시작하는 것 금지.
- 유형 이름(추적자형, 장인형 등) 사용 금지.
- 단정적·극단적 표현 금지: "확연히", "철저히", "배척", "기피", "~만", "오직", "무조건", "압도적", "극도로", "완전히", "반드시"
- 대신 추정·경향 표현 사용: "주로", "대체로", "~하는 편", "~쪽으로 기우는", "~로 보입니다", "~인 듯합니다"`;

    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();

    const jsonStr = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    try {
        const parsed = JSON.parse(jsonStr);
        return {
            summary: parsed.summary || '',
            insights: Array.isArray(parsed.insights) ? parsed.insights : [],
            avoidNote: '',
            recommendations: Array.isArray(parsed.recommendations)
                ? parsed.recommendations.map((r: any) => ({ name: r.name || '', address: r.address || '', reason: r.reason || '' }))
                : [],
        };
    } catch {
        console.error('[Gemini] Failed to parse taste analysis:', text);
        return {
            summary: `${data.tasteProfile.name} 유형으로, ${data.tasteProfile.tagline}`,
            insights: [],
            avoidNote: '',
            recommendations: [],
        };
    }
}
