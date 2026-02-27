/**
 * Taste Type Conversion Utility
 *
 * Converts 7-axis taste scores (-2 to +2) to a 32-type MBTI-style classification.
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

// All 7 axes used in the system
const AXIS_KEYS = ['boldness', 'acidity', 'richness', 'experimental', 'spiciness', 'sweetness', 'umami'] as const;

/**
 * Converts 7-axis taste scores to a 32-type MBTI-style classification.
 *
 * Axis Calculations:
 * - Intensity (L/H): mean(boldness, spiciness) > 0 → H
 * - Flavor Direction (D/A): acidity - richness > 0 → A
 * - Pleasure Bias (U/S): sweetness - umami > 0 → S
 * - Exploration (F/P): experimental > 0 → P
 *
 * Subtype:
 * - Stability = mean(|all 7 scores|)
 * - >= STABILITY_THRESHOLD → A (Assertive: 성향이 분명함)
 * - < STABILITY_THRESHOLD → T (Turbulent: 중간값이 많음)
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
 * Generates all possible 32 type codes for validation/reference.
 *
 * @returns Array of 32 unique type codes (e.g., ["LDUF-A", "LDUF-T", ...])
 */
export function getAllTasteTypes(): string[] {
    const types: string[] = [];
    const options = {
        intensity: ['L', 'H'] as const,
        flavor: ['D', 'A'] as const,
        pleasure: ['U', 'S'] as const,
        exploration: ['F', 'P'] as const,
        subtype: ['A', 'T'] as const
    };

    for (const i of options.intensity) {
        for (const f of options.flavor) {
            for (const p of options.pleasure) {
                for (const e of options.exploration) {
                    for (const s of options.subtype) {
                        types.push(`${i}${f}${p}${e}-${s}`);
                    }
                }
            }
        }
    }

    return types; // Returns exactly 32 types
}

/**
 * Validates that a type code is one of the 32 valid types.
 *
 * @param typeCode - Type code to validate (e.g., "HASP-A")
 * @returns true if valid, false otherwise
 */
export function isValidTasteType(typeCode: string): boolean {
    const validTypes = getAllTasteTypes();
    return validTypes.includes(typeCode);
}

/**
 * Gets descriptive labels for each axis letter.
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
        tagline: { ko: '익숙하고 깊은 맛을 안정적으로 즐긴다. 한 번 마음에 든 메뉴를 꾸준히 찾는 편이다.', en: 'Enjoys familiar, deep flavors consistently. Once a favorite is found, they stick with it.' }
    },
    'LDUP': {
        name: { ko: '연구자형 미식가', en: 'The Researcher' },
        tagline: { ko: '은은한 깊이의 차이를 탐구한다. 전통적인 맛 속에서도 새로운 발견을 즐긴다.', en: 'Explores subtle depth differences. Finds new discoveries within traditional flavors.' }
    },
    'LDSF': {
        name: { ko: '감상자형 미식가', en: 'The Appreciator' },
        tagline: { ko: '묵직하고 달콤한 맛을 여유롭게 음미한다. 음식에서 위안을 찾는 타입이다.', en: 'Savors rich and sweet flavors leisurely. Finds comfort in food.' }
    },
    'LDSP': {
        name: { ko: '조합자형 미식가', en: 'The Composer' },
        tagline: { ko: '깊은 풍미와 달콤함을 새롭게 조합한다. 익숙한 재료에서 창의적인 맛을 만들어낸다.', en: 'Composes new combinations of deep flavors and sweetness. Creates creative tastes from familiar ingredients.' }
    },
    'LAUF': {
        name: { ko: '절제자형 미식가', en: 'The Minimalist' },
        tagline: { ko: '산뜻하고 정돈된 감칠을 선호한다. 과하지 않은 균형을 중요하게 여긴다.', en: 'Prefers crisp, refined umami. Values balance without excess.' }
    },
    'LAUP': {
        name: { ko: '탐색자형 미식가', en: 'The Explorer' },
        tagline: { ko: '가볍고 산뜻한 메뉴를 중심으로 새로운 맛을 시도한다.', en: 'Tries new flavors centered on light, fresh dishes.' }
    },
    'LASF': {
        name: { ko: '감각자형 미식가', en: 'The Sensualist' },
        tagline: { ko: '상큼하고 달콤한 조합을 즐긴다. 밝고 경쾌한 취향을 가졌다.', en: 'Enjoys fresh and sweet combinations. Has a bright, cheerful palate.' }
    },
    'LASP': {
        name: { ko: '창안자형 미식가', en: 'The Innovator' },
        tagline: { ko: '산미와 단맛의 새로운 조합에 관심이 많다. 트렌드를 빠르게 받아들인다.', en: 'Interested in new acid-sweet combinations. Quick to adopt trends.' }
    },
    'HDUF': {
        name: { ko: '장인형 미식가', en: 'The Artisan' },
        tagline: { ko: '강하고 묵직한 맛을 선호한다. 취향이 분명하고 흔들림이 적다.', en: 'Prefers strong, heavy flavors. Has clear, unwavering tastes.' }
    },
    'HDUP': {
        name: { ko: '추적자형 미식가', en: 'The Pursuer' },
        tagline: { ko: '더 진하고 강한 맛을 찾아다닌다. 깊은 맛에 대한 집요함이 있다.', en: 'Seeks richer, stronger flavors. Persistent about deep tastes.' }
    },
    'HDSF': {
        name: { ko: '집중자형 미식가', en: 'The Concentrator' },
        tagline: { ko: '강렬한 단맛과 묵직함에 몰입한다. 확실한 쾌감을 추구한다.', en: 'Immerses in intense sweetness and richness. Seeks definite pleasure.' }
    },
    'HDSP': {
        name: { ko: '도전자형 미식가', en: 'The Challenger' },
        tagline: { ko: '자극적이고 달콤한 조합을 과감히 시도한다. 강한 맛의 한계를 넓혀간다.', en: 'Boldly tries stimulating sweet combinations. Pushes the boundaries of bold flavors.' }
    },
    'HAUF': {
        name: { ko: '정밀자형 미식가', en: 'The Precisionist' },
        tagline: { ko: '매콤하고 산뜻한 자극을 또렷하게 즐긴다. 취향의 기준이 명확하다.', en: 'Clearly enjoys spicy, fresh stimulation. Has precise taste standards.' }
    },
    'HAUP': {
        name: { ko: '개척자형 미식가', en: 'The Pioneer' },
        tagline: { ko: '날카롭고 강한 맛을 적극적으로 탐험한다. 새로운 메뉴에 개방적이다.', en: 'Actively explores sharp, strong flavors. Open to new dishes.' }
    },
    'HASF': {
        name: { ko: '조율자형 미식가', en: 'The Harmonizer' },
        tagline: { ko: '매콤달콤한 균형을 안정적으로 즐긴다. 강하지만 조화로운 맛을 선호한다.', en: 'Steadily enjoys spicy-sweet balance. Prefers strong but harmonious flavors.' }
    },
    'HASP': {
        name: { ko: '선도자형 미식가', en: 'The Trendsetter' },
        tagline: { ko: '강렬하고 생동감 있는 맛을 앞서 경험한다. 새로운 조합을 이끄는 타입이다.', en: 'Experiences vibrant, intense flavors first. Leads in new combinations.' }
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
