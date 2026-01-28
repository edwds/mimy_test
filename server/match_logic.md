# Match Score Logic & Calculation

This document explains how the **Match Score** (User ↔ Shop compatibility) is calculated, transmitted, and displayed.

## 1. Overview

The matching system produces a "Predicted Rating" (1.0 - 5.0) for a shop based on a user's taste profile.
It follows a two-step process:
1. **Backend**: Calculates a raw **Match Score (0-100)** based on Bayesian averaging of reviewer signals.
2. **Frontend**: Converts this **Match Score** into a **5-Point Rating**.

---

## 2. Backend Calculation (0-100 Score)

**File**: `server/utils/match.ts`
**Function**: `calculateShopMatchScore`

The backend computes a score between `0` and `100` representing how well the shop matches the user.

### Core Formula
The score is a **Bayesian Weighted Average** of satisfaction signals from similar users.

$$ score_{raw} = \frac{\alpha \cdot \mu_0 + \sum (w_i \cdot s_i)}{\alpha + \sum w_i} $$

Where:
- **$\mu_0$ (Prior Mean)**: `0.0` (Neutral).
- **$\alpha$ (Prior Weight)**: `0.2`. Controls how much "evidence" is needed to move away from neutral.
- **$w_i$ (Weight)**: Reviewer relevance (Similarity ^ 2).
- **$s_i$ (Signal)**: Reviewer's satisfaction mapped to `[-1, 1]`.

### Steps:
1.  **Filter Reviewers**: Only reviewers who have ranked at least **100 shops** are considered "Reliable Signals".
2.  **Calculate Similarity ($w_i$)**:
    *   Compare the **Viewer's Taste Profile** vs. **Reviewer's Taste Profile** using a Gaussian (RBF) Kernel.
    *   `Similarity (0-100)` is calculated.
    *   **Weight $w_i$** = $(\frac{Similarity}{100})^{power}$ (Default power = 2).
    *   *Result: Users with similar tastes have exponentially higher influence.*
3.  **Determine Satisfaction ($s_i$)**:
    *   Based on the reviewer's **Satisfaction Tier** (`Best`, `Good`, `Ok`, `Bad`) and **Percentile Rank** for that shop.
    *   Examples:
        *   **Best/Good**: Maps to positive values (`0.3` to `1.0`).
        *   **Bad**: Maps to negative values (`-1.0` to `-0.3`).
4.  **Bayesian Shrinkage**:
    *   Combines the weighted satisfaction signals with a neutral prior.
    *   Prevents shops with very few reviews from swinging wildly.
5.  **Normalization**:
    *   The raw Bayesian result (approx `[-1, 1]`) is mapped to `[0, 100]`.
    *   $$ FinalScore = 50 \times (score_{raw} + 1) $$

---

## 3. Frontend Conversion (5-Point Scale)

**File**: `src/lib/utils.ts`
**Function**: `scoreToTasteRatingStep`

The frontend receives the `0-100` score and converts it to a familiar `5.0` star scale.

### Formula
$$ Rating = 1 + \left( \frac{Score}{25} \right) $$

| Match Score (0-100) | Predicted Rating (1.0-5.0) | Meaning |
| :--- | :--- | :--- |
| **100** | **5.00** | Perfect Match |
| **75** | **4.00** | Good Match |
| **50** | **3.00** | Neutral / Average |
| **25** | **2.00** | Below Average |
| **0** | **1.00** | Terrible Match |

### Display Logic
- The rating is rounded to the nearest **0.05** (e.g., `4.35`, `4.40`).
- Displayed in the UI as "예상 평가" (Predicted Evaluation).

---

## 4. Admin & Debugging

**File**: `server/routes/admin.ts`
**Endpoint**: `POST /api/admin/match/simulate`

There is an admin simulation tool to debug why a specific score was calculated.

**Request**:
```json
{
  "shopId": 123,
  "viewerId": 456,
  "options": {
    "power": 2,
    "alpha": 0.2
  }
}
```

**Response**:
Returns the final score and a list of **Contributing Reviewers**:
- **Reviewer Info**: ID, Nickname, Rank Count.
- **Match Score**: Taste similarity with the viewer.
- **Weight**: Calculated influence weight.
- **Satisfaction**: The extracted signal value from their review.
- **Eligible**: Whether they were included in the calculation.

Use this endpoint to audit if a "bad recommendation" is due to:
1.  **Low Similarity**: No similar users have visited the shop.
2.  **Conflicting Signals**: Similar users disagreed (some liked, some disliked).
3.  **Low Data**: Not enough "Elite Reviewers" (100+ ranks) have visited.
