
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
}

export interface MatchOptions {
    power?: number;       // Exponent for weight (default 2)
    alpha?: number;       // Bayesian prior weight (default 5)
    minReviewers?: number; // Minimum eligible reviewers (default 3)
}

export const calculateShopMatchScore = (viewerScores: TasteScores | null, reviewers: ReviewerSignal[], options?: MatchOptions): number | null => {
    const POWER = options?.power ?? 4.0;
    const ALPHA = options?.alpha ?? 1.0; // Bayesian prior weight
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
        // Map [0, 1] -> [-1, 1]
        const satisfaction = (2 * percentile) - 1;

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
