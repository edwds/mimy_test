
export interface TasteScores {
    [key: string]: number;
}

// Reuse RBF kernel logic from frontend (or shared lib if available)
export const calculateTasteMatch = (myScores: TasteScores, targetScores: TasteScores): number => {
    const axes = ['boldness', 'acidity', 'richness', 'experimental', 'spiciness', 'sweetness', 'umami'];

    let sumSqDiff = 0;
    axes.forEach(axis => {
        const v1 = Number(myScores[axis] || 0);
        const v2 = Number(targetScores[axis] || 0);
        sumSqDiff += Math.pow(v1 - v2, 2);
    });

    // Gaussian (RBF) Kernel: exp(-distance^2 / (2 * sigma^2))
    // Sigma determines the width of the "bell curve".
    const sigma = 5;
    const similarity = Math.exp(-sumSqDiff / (2 * sigma * sigma)) * 100;

    return similarity; // Return 0-100 float
};

export interface ReviewerSignal {
    userId: number;
    rankPosition: number;
    totalRankedCount: number; // Must be >= MIN_RANKINGS_FOR_MATCH for eligibility
    tasteScores: TasteScores | null;
    satisfactionTier?: number; // 2=Good, 1=OK, 0=Bad. Optional for backward compatibility.
}

export interface MatchOptions {
    power?: number;       // Exponent for weight (default 2)
    alpha?: number;       // Bayesian prior weight (default 5)
    minReviewers?: number; // Minimum eligible reviewers (default 3)
}

export const calculateShopMatchScore = (viewerScores: TasteScores | null, reviewers: ReviewerSignal[], options?: MatchOptions): number | null => {
    const POWER = options?.power ?? 2.0;
    const ALPHA = options?.alpha ?? 0.2; // Bayesian prior weight
    const MIN_REVIEWERS = options?.minReviewers ?? 3;
    const MU_0 = 0.0;   // Neutral prior mean
    const MIN_RANKINGS = parseInt(process.env.MIN_RANKINGS_FOR_MATCH || '30');

    // 1. Filter eligible reviewers (N >= MIN_RANKINGS)
    const eligibleReviewers = reviewers.filter(r => r.totalRankedCount >= MIN_RANKINGS);

    // Check minimum threshold
    if (eligibleReviewers.length < MIN_REVIEWERS) {
        return null; // Not enough reliable signal
    }

    let weightedSum = 0;
    let totalWeight = 0;

    for (const r of eligibleReviewers) {
        // 2. Calculate Rank Percentile P
        // 1 is best, N is worst.
        // Percentile 1.0 = Best, 0.0 = Worst
        let percentile = 0.5; // Default if N=1
        if (r.totalRankedCount > 1) {
            percentile = 1.0 - ((r.rankPosition - 1) / (r.totalRankedCount - 1));
        } else {
            percentile = 1.0;
        }

        // 3. Satisfaction Signal S in [-1, +1]
        // Old Logic: Map [0, 1] -> [-1, 1] purely based on rank
        // New Logic: Use Tier if available to set baseline range.

        let satisfaction = 0;

        if (r.satisfactionTier !== undefined) {
            // 5-Tier System:
            // Tier 4 (GOAT): [0.75, 1.0]  - tier-internal rank-based percentile
            // Tier 3 (BEST): [0.40, 0.75]  - tier-internal rank-based percentile
            // Tier 2 (GOOD): fixed ~0.30    - bucket (no comparison)
            // Tier 1 (OK):   fixed ~0.00    - bucket
            // Tier 0 (BAD):  fixed ~-0.60   - bucket

            switch (r.satisfactionTier) {
                case 4: // GOAT
                    satisfaction = 0.75 + (0.25 * percentile);
                    break;
                case 3: // BEST
                    satisfaction = 0.40 + (0.35 * percentile);
                    break;
                case 2: // GOOD (bucket - no ranking within tier)
                    satisfaction = 0.30;
                    break;
                case 1: // OK (bucket)
                    satisfaction = 0.00;
                    break;
                case 0: // BAD (bucket)
                    satisfaction = -0.60;
                    break;
                default:
                    satisfaction = (2 * percentile) - 1;
            }

        } else {
            // Legacy Fallback
            satisfaction = (2 * percentile) - 1;
        }

        // 4. Weight W using Taste Match
        if (!viewerScores || !r.tasteScores) {
            continue;
        }

        const matchScore = calculateTasteMatch(viewerScores, r.tasteScores); // 0-100 float

        // New Formula: w = (match / 100) ^ power
        const base = matchScore / 100.0;
        const w = Math.pow(base, POWER);

        weightedSum += w * satisfaction;
        totalWeight += w;
    }

    if (totalWeight === 0) {
        return null; // No meaningful signals found
    }

    // 5. Shrinkage / Bayesian Average
    // score_raw = (alpha * mu0 + sum(w*s)) / (alpha + sum(w))
    let scoreRaw = (ALPHA * MU_0 + weightedSum) / (ALPHA + totalWeight);

    // 6. Map back to 0-100
    // score_raw is in approx [-1, 1] (influenced by prior 0).

    // map [-1, 1] -> [0, 100]
    const finalScore = 50 * (scoreRaw + 1);

    // Keep 2 decimal places precision (0.01 unit)
    const preciseScore = Math.round(finalScore * 100) / 100;

    // Clamp just in case
    return Math.max(0, Math.min(100, preciseScore));
};

/**
 * Calculate global shop score (no user-specific taste matching)
 * Uses pure satisfaction signals from all eligible reviewers
 */
export const calculateGlobalShopScore = (reviewers: ReviewerSignal[], options?: MatchOptions): number | null => {
    const ALPHA = options?.alpha ?? 0.2;
    const MIN_REVIEWERS = options?.minReviewers ?? 3;
    const MU_0 = 0.0;
    const MIN_RANKINGS = parseInt(process.env.MIN_RANKINGS_FOR_MATCH || '30');

    // Filter eligible reviewers
    const eligibleReviewers = reviewers.filter(r => r.totalRankedCount >= MIN_RANKINGS);

    if (eligibleReviewers.length < MIN_REVIEWERS) {
        return null;
    }

    let satisfactionSum = 0;

    for (const r of eligibleReviewers) {
        // Calculate percentile
        let percentile = 0.5;
        if (r.totalRankedCount > 1) {
            percentile = 1.0 - ((r.rankPosition - 1) / (r.totalRankedCount - 1));
        } else {
            percentile = 1.0;
        }

        // Satisfaction signal
        let satisfaction = 0;

        if (r.satisfactionTier !== undefined) {
            switch (r.satisfactionTier) {
                case 4: // GOAT
                    satisfaction = 0.75 + (0.25 * percentile);
                    break;
                case 3: // BEST
                    satisfaction = 0.40 + (0.35 * percentile);
                    break;
                case 2: // GOOD (bucket)
                    satisfaction = 0.30;
                    break;
                case 1: // OK (bucket)
                    satisfaction = 0.00;
                    break;
                case 0: // BAD (bucket)
                    satisfaction = -0.60;
                    break;
                default:
                    satisfaction = (2 * percentile) - 1;
            }
        } else {
            satisfaction = (2 * percentile) - 1;
        }

        satisfactionSum += satisfaction;
    }

    // Bayesian average (all weights = 1 for global score)
    const count = eligibleReviewers.length;
    const scoreRaw = (ALPHA * MU_0 + satisfactionSum) / (ALPHA + count);

    // Map to 0-100
    const finalScore = 50 * (scoreRaw + 1);
    const preciseScore = Math.round(finalScore * 100) / 100;

    return Math.max(0, Math.min(100, preciseScore));
};
