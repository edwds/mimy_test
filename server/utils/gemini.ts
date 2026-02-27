import { GoogleGenerativeAI } from '@google/generative-ai';

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
    }>;
}

export interface TasteAnalysisResult {
    summary: string;
    highlights: string[];
    personalityTraits: string[];
    foodRecommendations: string[];
    detailedAnalysis: string;
}

function formatShopDetail(s: TasteAnalysisInput['rankedShops'][number]): string {
    let line = `  ${s.rank}위. ${s.name} (${s.food_kind || '기타'})`;
    if (s.address_region) line += ` - ${s.address_region}`;
    if (s.description) line += `\n      설명: ${s.description.slice(0, 100)}`;
    return line;
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

    const prompt = `당신은 미식 심리학 전문가입니다. 사용자의 입맛 분석 데이터를 기반으로 재미있고 통찰력 있는 분석을 작성해주세요.

## 사용자 데이터

**입맛 유형**: ${data.tasteType.fullType} (${data.tasteProfile.name})
**유형 설명**: ${data.tasteProfile.tagline}

**7축 점수** (-2~+2 스케일):
- 과감함(boldness): ${data.scores.boldness ?? 0}
- 산미(acidity): ${data.scores.acidity ?? 0}
- 깊은맛(richness): ${data.scores.richness ?? 0}
- 도전정신(experimental): ${data.scores.experimental ?? 0}
- 매운맛(spiciness): ${data.scores.spiciness ?? 0}
- 단맛(sweetness): ${data.scores.sweetness ?? 0}
- 감칠맛(umami): ${data.scores.umami ?? 0}

**평가한 맛집** (순위순):
${shopsByTier.good.length > 0 ? `최고 (Good):\n${shopsByTier.good.map(s => formatShopDetail(s)).join('\n')}` : ''}
${shopsByTier.ok.length > 0 ? `괜찮음 (OK):\n${shopsByTier.ok.map(s => formatShopDetail(s)).join('\n')}` : ''}
${shopsByTier.bad.length > 0 ? `별로 (Bad):\n${shopsByTier.bad.map(s => formatShopDetail(s)).join('\n')}` : ''}

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
- 맛집의 설명 정보가 있으면 어떤 종류의 음식을 선호하는지 더 구체적으로 분석`;

    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();

    const jsonStr = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    try {
        const parsed = JSON.parse(jsonStr);
        return {
            summary: parsed.summary || '',
            highlights: Array.isArray(parsed.highlights) ? parsed.highlights : [],
            personalityTraits: Array.isArray(parsed.personalityTraits) ? parsed.personalityTraits : [],
            foodRecommendations: Array.isArray(parsed.foodRecommendations) ? parsed.foodRecommendations : [],
            detailedAnalysis: parsed.detailedAnalysis || '',
        };
    } catch {
        console.error('[Gemini] Failed to parse taste analysis:', text);
        // Return a fallback analysis
        return {
            summary: `${data.tasteProfile.name} 유형으로, ${data.tasteProfile.tagline}`,
            highlights: ['분석 생성 중 오류'],
            personalityTraits: ['다시 시도해주세요'],
            foodRecommendations: [],
            detailedAnalysis: '',
        };
    }
}
