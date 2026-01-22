
import { calculateShopMatchScore, TasteScores } from './utils/match.js';

// Mock Data
const viewerTaste: TasteScores = {
    boldness: 1, acidity: 0, richness: 2, experimental: 0, spiciness: 1, sweetness: 0, umami: 2
};

const similarReviewerTaste: TasteScores = { ...viewerTaste }; // Distance 0 -> Match 100%
const differentReviewerTaste: TasteScores = {
    boldness: -2, acidity: -2, richness: -2, experimental: -2, spiciness: -2, sweetness: -2, umami: -2
}; // High distance

// Case 1: Ideal Match
// Reviewer is similar (Weight = 1.0) and ranks shop #1 out of 100.
// Percentile = 1. Satisfaction = 1.
// ScoreRaw approx (10*0 + 1*1) / (10+1) = 1/11 = 0.09.
// Final = 50 * (1.09) = 54.5. Wait, shrinkage is heavy.
// Let's check math:
// alpha=10, sum(w)=1. mu0=0.
// num = 10*0 + 1*1 = 1. den = 11. raw = 0.0909.
// final = 50 * (1.0909) = 54.5 -> 55.
// Note: With alpha=10, a single review pulls very slowly from neutral (50). This is intended for stability.

// Case 2: Many Similar Reviewers loving it
// 20 Reviewers, all similar (w=1), all rank #1/100 (sat=1).
// num = 10*0 + 20*1 = 20. den = 10 + 20 = 30. raw = 0.666.
// final = 50 * (1.666) = 83.3 -> 83.
console.log("--- Test Cases ---");

const test = (name: string, viewer: any, reviewers: any[]) => {
    const score = calculateShopMatchScore(viewer, reviewers);
    console.log(`[${name}] Score: ${score}`);
};

const makeReviewer = (rank: number, total: number, taste: any) => ({
    userId: Math.floor(Math.random() * 10000),
    rankPosition: rank,
    totalRankedCount: total,
    tasteScores: taste
});

// 1. Single Perfect Review
test("Single Perfect Match (Heavy Shrinkage)", viewerTaste, [
    makeReviewer(1, 100, similarReviewerTaste)
]);

// 2. 20 Perfect Reviews
test("20 Perfect Matches", viewerTaste, Array(20).fill(null).map(() => makeReviewer(1, 100, similarReviewerTaste)));

// 3. 20 Terrible Reviews (Rank 100/100 -> P=0 -> Sat=-1)
test("20 Terrible Matches", viewerTaste, Array(20).fill(null).map(() => makeReviewer(100, 100, similarReviewerTaste)));

// 4. Mixed Bag (10 Good, 10 Bad)
test("Mixed Reviews", viewerTaste, [
    ...Array(10).fill(null).map(() => makeReviewer(1, 100, similarReviewerTaste)),
    ...Array(10).fill(null).map(() => makeReviewer(100, 100, similarReviewerTaste))
]);

// 5. Ineligible Reviewer (< 100 ranked)
test("Ineligible Reviewer", viewerTaste, [
    makeReviewer(1, 50, similarReviewerTaste) // Should be ignored
]);

// 6. Dissimilar Reviewer (Low Weight)
// Even if they love it, weight is low, so score stays near 50.
test("Dissimilar Reviewer Loves It", viewerTaste, Array(10).fill(null).map(() => makeReviewer(1, 100, differentReviewerTaste)));
