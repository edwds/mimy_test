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

태
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
