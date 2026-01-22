
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
    totalRankedCount: number; // Must be >= 100 for eligibility
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

    // 1. Filter eligible reviewers (N >= 100)
    const eligibleReviewers = reviewers.filter(r => r.totalRankedCount >= 100);

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
            // Tier Logic
            // Tier 2 (Good): [0.3, 1.0]
            // Tier 1 (OK):   [-0.2, 0.2]
            // Tier 0 (Bad):  [-1.0, -0.3]

            switch (r.satisfactionTier) {
                case 2: // Good
                    // rank 1 -> 1.0, rank N -> 0.3
                    satisfaction = 0.3 + (0.7 * percentile);
                    break;
                case 1: // OK
                    // rank 1 -> 0.2, rank N -> -0.2
                    satisfaction = -0.2 + (0.4 * percentile);
                    break;
                case 0: // Bad
                    // rank 1 -> -0.3, rank N -> -1.0
                    // Note: higher rank (more percentile) means "better" bad, so closer to -0.3?
                    // Or rank 1 (best of bad) = -0.3, rank N (worst of bad) = -1.0.
                    // Percentile 1.0 is "best rank".
                    satisfaction = -1.0 + (0.7 * percentile);
                    break;
                default:
                    // Fallback to pure rank if tier is weird
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
    const scoreRaw = (ALPHA * MU_0 + weightedSum) / (ALPHA + totalWeight);

    // 6. Map back to 0-100
    // score_raw is in approx [-1, 1] (influenced by prior 0).
    // map [-1, 1] -> [0, 100]
    const finalScore = Math.round(50 * (scoreRaw + 1));

    // Clamp just in case
    return Math.max(0, Math.min(100, finalScore));
};
