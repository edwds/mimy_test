/**
 * Taste Type Conversion Utility (Frontend)
 *
 * Converts 7-axis taste scores (-2 to +2) to a 32-type MBTI-style classification.
 * Mirrors server/utils/tasteType.ts for backwards compatibility with existing users.
 *
 * Type Code Structure: [Intensity][Flavor][Pleasure][Exploration]-[Subtype]
 * Example: HASP-A
 */

export interface TasteTypeAxes {
    intensity: 'L' | 'H';    // Low / High (담백 / 강렬)
    flavor: 'D' | 'A';       // Deep / Acidic (깊은맛 / 상큼)
    pleasure: 'U' | 'S';     // Umami / Sweet (감칠맛 / 달콤)
    exploration: 'F' | 'P';  // Familiar / Progressive (익숙 / 도전)
}

export interface TasteType {
    baseCode: string;           // 4-letter code: "HASP"
    subtype: 'A' | 'T';         // Assertive / Turbulent
    fullType: string;           // Full code: "HASP-A"
    axes: TasteTypeAxes;
    stabilityScore: number;     // Mean of |all scores|, rounded to 2 decimals
}

export interface TasteScores {
    boldness?: number;
    acidity?: number;
    richness?: number;
    experimental?: number;
    spiciness?: number;
    sweetness?: number;
    umami?: number;
    [key: string]: number | undefined;
}

// Threshold for Assertive vs Turbulent determination
export const STABILITY_THRESHOLD = 1.2;

/**
 * Converts 7-axis taste scores to a 32-type MBTI-style classification.
 *
 * @param scores - Object with 7 taste axis scores (-2 to +2)
 * @returns TasteType object with full type code and metadata
 */
export function calculateTasteType(scores: TasteScores): TasteType {
    // Extract scores with defaults
    const boldness = Number(scores.boldness ?? 0);
    const acidity = Number(scores.acidity ?? 0);
    const richness = Number(scores.richness ?? 0);
    const experimental = Number(scores.experimental ?? 0);
    const spiciness = Number(scores.spiciness ?? 0);
    const sweetness = Number(scores.sweetness ?? 0);
    const umami = Number(scores.umami ?? 0);

    // Calculate derived metrics for each axis
    const intensityValue = (boldness + spiciness) / 2;
    const flavorValue = acidity - richness;
    const pleasureValue = sweetness - umami;
    const explorationValue = experimental;

    // Determine letters based on > 0 threshold
    const axes: TasteTypeAxes = {
        intensity: intensityValue > 0 ? 'H' : 'L',
        flavor: flavorValue > 0 ? 'A' : 'D',
        pleasure: pleasureValue > 0 ? 'S' : 'U',
        exploration: explorationValue > 0 ? 'P' : 'F'
    };

    // Calculate stability score (mean of absolute values)
    const allScores = [boldness, acidity, richness, experimental, spiciness, sweetness, umami];
    const stabilityScore = allScores.reduce((sum, val) => sum + Math.abs(val), 0) / 7;
    const roundedStability = Math.round(stabilityScore * 100) / 100;

    // Determine subtype based on stability threshold
    const subtype: 'A' | 'T' = stabilityScore >= STABILITY_THRESHOLD ? 'A' : 'T';

    // Build type codes
    const baseCode = `${axes.intensity}${axes.flavor}${axes.pleasure}${axes.exploration}`;
    const fullType = `${baseCode}-${subtype}`;

    return {
        baseCode,
        subtype,
        fullType,
        axes,
        stabilityScore: roundedStability
    };
}

/**
 * Gets taste type from a taste_result object.
 * If tasteType is already present (new users), uses it directly.
 * Otherwise calculates from scores (backwards compatibility for existing users).
 *
 * @param tasteResult - The taste_result object from user data
 * @returns TasteType or null if no scores available
 */
export function getTasteType(tasteResult: any): TasteType | null {
    if (!tasteResult) return null;

    // Use pre-calculated if available (new users after this update)
    if (tasteResult.tasteType) {
        return tasteResult.tasteType as TasteType;
    }

    // Calculate on-the-fly for existing users
    if (tasteResult.scores) {
        return calculateTasteType(tasteResult.scores);
    }

    return null;
}

/**
 * Descriptive labels for each axis letter.
 * Useful for UI display.
 */
export const TASTE_TYPE_LABELS = {
    intensity: {
        L: { ko: '저자극', en: 'Mild' },
        H: { ko: '고자극', en: 'Bold' }
    },
    flavor: {
        D: { ko: '깊이', en: 'Deep' },
        A: { ko: '산뜻', en: 'Fresh' }
    },
    pleasure: {
        U: { ko: '감칠', en: 'Savory' },
        S: { ko: '달콤', en: 'Sweet' }
    },
    exploration: {
        F: { ko: '안정', en: 'Familiar' },
        P: { ko: '탐험', en: 'Adventurous' }
    },
    subtype: {
        A: { ko: '확신형', en: 'Assertive' },
        T: { ko: '탐구형', en: 'Turbulent' }
    }
} as const;

/**
 * Type names and descriptions for the 16 base types (without A/T suffix).
 */
export const TASTE_TYPE_PROFILES: Record<string, { name: { ko: string; en: string }; tagline: { ko: string; en: string } }> = {
    'LDUF': {
        name: { ko: '보존자형 미식가', en: 'The Preserver' },
        tagline: { ko: '한 번 마음에 든 깊은 맛을 꾸준히 찾는다.', en: 'Sticks with familiar, deep flavors they love.' }
    },
    'LDUP': {
        name: { ko: '연구자형 미식가', en: 'The Researcher' },
        tagline: { ko: '전통 속에서 새로운 깊이를 발견한다.', en: 'Finds new depth within traditional flavors.' }
    },
    'LDSF': {
        name: { ko: '감상자형 미식가', en: 'The Appreciator' },
        tagline: { ko: '묵직하고 달콤한 맛에서 위안을 찾는다.', en: 'Finds comfort in rich, sweet flavors.' }
    },
    'LDSP': {
        name: { ko: '조합자형 미식가', en: 'The Composer' },
        tagline: { ko: '깊은 풍미와 달콤함을 창의적으로 조합한다.', en: 'Creatively combines deep flavors with sweetness.' }
    },
    'LAUF': {
        name: { ko: '절제자형 미식가', en: 'The Minimalist' },
        tagline: { ko: '과하지 않은 산뜻한 균형을 추구한다.', en: 'Pursues crisp, balanced flavors without excess.' }
    },
    'LAUP': {
        name: { ko: '탐색자형 미식가', en: 'The Explorer' },
        tagline: { ko: '가볍고 산뜻한 새로운 맛을 시도한다.', en: 'Tries new light, fresh flavors.' }
    },
    'LASF': {
        name: { ko: '감각자형 미식가', en: 'The Sensualist' },
        tagline: { ko: '상큼달콤한 밝은 맛을 즐긴다.', en: 'Enjoys bright, fresh-sweet combinations.' }
    },
    'LASP': {
        name: { ko: '창안자형 미식가', en: 'The Innovator' },
        tagline: { ko: '산미와 단맛의 트렌디한 조합을 좇는다.', en: 'Chases trendy acid-sweet combinations.' }
    },
    'HDUF': {
        name: { ko: '장인형 미식가', en: 'The Artisan' },
        tagline: { ko: '강하고 묵직한 맛에 흔들림 없는 취향.', en: 'Unwavering taste for strong, heavy flavors.' }
    },
    'HDUP': {
        name: { ko: '추적자형 미식가', en: 'The Pursuer' },
        tagline: { ko: '더 진하고 강한 맛을 끈질기게 찾아다닌다.', en: 'Relentlessly seeks richer, stronger flavors.' }
    },
    'HDSF': {
        name: { ko: '집중자형 미식가', en: 'The Concentrator' },
        tagline: { ko: '강렬한 단맛과 묵직함에 몰입한다.', en: 'Immerses in intense sweetness and richness.' }
    },
    'HDSP': {
        name: { ko: '도전자형 미식가', en: 'The Challenger' },
        tagline: { ko: '자극적이고 달콤한 조합을 과감히 넓혀간다.', en: 'Boldly pushes boundaries of bold-sweet combos.' }
    },
    'HAUF': {
        name: { ko: '정밀자형 미식가', en: 'The Precisionist' },
        tagline: { ko: '매콤하고 산뜻한 자극에 기준이 명확하다.', en: 'Has precise standards for spicy, fresh flavors.' }
    },
    'HAUP': {
        name: { ko: '개척자형 미식가', en: 'The Pioneer' },
        tagline: { ko: '날카롭고 강한 새 맛을 적극 탐험한다.', en: 'Actively explores sharp, bold new flavors.' }
    },
    'HASF': {
        name: { ko: '조율자형 미식가', en: 'The Harmonizer' },
        tagline: { ko: '매콤달콤의 강하지만 조화로운 균형파.', en: 'Finds harmony in strong spicy-sweet balance.' }
    },
    'HASP': {
        name: { ko: '선도자형 미식가', en: 'The Trendsetter' },
        tagline: { ko: '강렬한 새 맛을 누구보다 먼저 경험한다.', en: 'Experiences bold new flavors before anyone.' }
    }
};

/**
 * Gets the profile (name & tagline) for a taste type.
 *
 * @param tasteType - The taste type object or base code string
 * @param lang - Language code ('ko' or 'en')
 * @returns Object with name and tagline, or null if not found
 */
export function getTasteTypeProfile(tasteType: TasteType | string, lang: 'ko' | 'en' = 'ko'): { name: string; tagline: string } | null {
    const baseCode = typeof tasteType === 'string' ? tasteType : tasteType.baseCode;
    const profile = TASTE_TYPE_PROFILES[baseCode];

    if (!profile) return null;

    return {
        name: profile.name[lang],
        tagline: profile.tagline[lang]
    };
}

/**
 * Gets a descriptive name for a taste type in the specified language.
 *
 * @param tasteType - The taste type object
 * @param lang - Language code ('ko' or 'en')
 * @returns Descriptive string like "고자극 산뜻 달콤 탐험 확신형"
 */
export function getTasteTypeDescription(tasteType: TasteType, lang: 'ko' | 'en' = 'ko'): string {
    const { axes, subtype } = tasteType;
    return [
        TASTE_TYPE_LABELS.intensity[axes.intensity][lang],
        TASTE_TYPE_LABELS.flavor[axes.flavor][lang],
        TASTE_TYPE_LABELS.pleasure[axes.pleasure][lang],
        TASTE_TYPE_LABELS.exploration[axes.exploration][lang],
        TASTE_TYPE_LABELS.subtype[subtype][lang]
    ].join(' ');
}
