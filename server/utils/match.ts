
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

export const calculateShopMatchScore = (viewerScores: TasteScores | null, reviewers: ReviewerSignal[]): number | null => {
    // 1. Filter ineligible reviewers (N < 100)
    // Note: Caller should ideally filter this db-side, but we enforce here too.
    const eligibleReviewers = reviewers.filter(r => r.totalRankedCount >= 100);

    if (eligibleReviewers.length === 0) {
        return null;
    }

    // Parameters
    const ALPHA = 10.0; // Bayesian prior weight
    const MU_0 = 0.0;   // Neutral prior mean

    let weightedSum = 0;
    let totalWeight = 0;

    for (const r of eligibleReviewers) {
        // 2. Calculate Rank Percentile P
        // 1 is best, N is worst.
        // Percentile 1.0 = Best, 0.0 = Worst
        let percentile = 0.5; // Default if N=1 ??
        if (r.totalRankedCount > 1) {
            percentile = 1.0 - ((r.rankPosition - 1) / (r.totalRankedCount - 1));
        } else {
            // If strictly enforced N>=100, this branch is unreachable.
            percentile = 1.0;
        }

        // 3. Satisfaction Signal S in [-1, +1]
        // Map [0, 1] -> [-1, 1]
        const satisfaction = (2 * percentile) - 1;

        // 4. Weight W using Taste Match
        // If viewer has no taste profile, assume neutral weight or generic?
        // Requirement: "Weighted by taste match".
        // If viewerScores is null, we can't compute taste match.
        // Return null if viewer has no taste? Or use unweighted average?
        // "If no eligible reviewers or SUM(w)=0, return null" implies we need weights.
        // If viewer unknown, weight is undefined. Let's return null.
        if (!viewerScores || !r.tasteScores) {
            // If either side has no scores, we can't compuate similarity. 
            // We could fallback to w=0.5 but strict interpretation says return null.
            continue;
        }

        // Taste match matches 0-100 range. Convert to 0-1 range for weighting?
        // Formula: SUM(w * sat) / SUM(w). Scale doesn't strictly matter for W as long as consistent.
        // But usually weights are normalized. Let's use 0-1.
        const matchScore = calculateTasteMatch(viewerScores, r.tasteScores); // 0-100 float
        const w = matchScore / 100.0;

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
    // (s + 1) * 50
    const finalScore = Math.round(50 * (scoreRaw + 1));

    // Clamp just in case
    return Math.max(0, Math.min(100, finalScore));
};
