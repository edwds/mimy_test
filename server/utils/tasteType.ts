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
        L: { ko: '담백한', en: 'Mild' },
        H: { ko: '강렬한', en: 'Bold' }
    },
    flavor: {
        D: { ko: '깊은맛', en: 'Deep' },
        A: { ko: '상큼한', en: 'Fresh' }
    },
    pleasure: {
        U: { ko: '감칠맛', en: 'Savory' },
        S: { ko: '달콤한', en: 'Sweet' }
    },
    exploration: {
        F: { ko: '익숙한', en: 'Familiar' },
        P: { ko: '도전적', en: 'Adventurous' }
    },
    subtype: {
        A: { ko: '확신형', en: 'Assertive' },
        T: { ko: '탐구형', en: 'Turbulent' }
    }
} as const;
