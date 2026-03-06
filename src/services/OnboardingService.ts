import { API_BASE_URL } from '@/lib/api';
import { authFetch } from '@/lib/authFetch';

export interface ShopMatch {
    extractedName: string;
    matched: boolean;
    shop: {
        id: number;
        name: string;
        food_kind: string | null;
        thumbnail_img: string | null;
        address_full: string | null;
    } | null;
}

export interface MatchedRecommendation {
    name: string;
    reason: string;
    shop: {
        id: number;
        name: string;
        food_kind: string | null;
        thumbnail_img: string | null;
    } | null;
}

export interface TasteAnalysisResult {
    summary: string;
    insights?: string[];
    avoidNote?: string;
    recommendations?: Array<{ name: string; reason: string }>;
    detailedAnalysis?: string; // backward compat with existing DB data
}

export interface TasteAnalysisResponse {
    analysis: TasteAnalysisResult;
    matchedRecommendations: MatchedRecommendation[];
    shareCode: string;
    tasteType: {
        fullType: string;
        baseCode: string;
        subtype: string;
    };
    tasteProfile: {
        name: string;
        tagline: string;
    };
}

export interface TasteShareData {
    tasteType: string;
    tasteScores: Record<string, number>;
    rankedShopsSummary: Array<{
        name: string;
        food_kind: string | null;
        satisfaction_tier: number;
        rank: number;
    }> | null;
    analysis: TasteAnalysisResult;
    matchedRecommendations: MatchedRecommendation[];
    tasteProfile: { name: string; tagline: string } | null;
    tasteProfileEn: { name: string; tagline: string } | null;
    user: {
        nickname: string | null;
        profile_image: string | null;
    };
    createdAt: string;
}

export interface CatchtableImportResult {
    extractedNames: string[];
    catchtableRefs: Array<{ name: string; shopRef: string }>;
}

export const OnboardingService = {
    importCatchtable: async (): Promise<CatchtableImportResult> => {
        const response = await fetch('https://ct-api.catchtable.co.kr/api/v4/user/reservations/_list?statusGroup=DONE&sortCode=DESC&size=100', {
            credentials: 'include',
        });

        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                throw new Error('AUTH_REQUIRED');
            }
            throw new Error('FETCH_FAILED');
        }

        const json = await response.json();
        const items: any[] = json?.data?.items || [];

        if (items.length === 0) {
            throw new Error('EMPTY');
        }

        // Extract names and shopRefs, deduplicate by shopRef
        const seen = new Set<string>();
        const extractedNames: string[] = [];
        const catchtableRefs: Array<{ name: string; shopRef: string }> = [];

        for (const item of items) {
            const shopName = item?.shop?.shopName;
            const shopRef = item?.shop?.shopRef;
            if (!shopName || !shopRef) continue;
            if (seen.has(shopRef)) continue;
            seen.add(shopRef);
            extractedNames.push(shopName);
            catchtableRefs.push({ name: shopName, shopRef });
        }

        return { extractedNames, catchtableRefs };
    },

    analyzeScreenshots: async (imageUrls: string[]): Promise<{ extractedNames: string[] }> => {
        const response = await authFetch(`${API_BASE_URL}/api/onboarding/analyze-screenshots`, {
            method: 'POST',
            body: JSON.stringify({ imageUrls }),
        });

        if (!response.ok) {
            throw new Error('Failed to analyze screenshots');
        }

        return response.json();
    },

    matchShops: async (names: string[], catchtableRefs?: Array<{ name: string; shopRef: string }>): Promise<{ matches: ShopMatch[] }> => {
        const response = await authFetch(`${API_BASE_URL}/api/onboarding/match-shops`, {
            method: 'POST',
            body: JSON.stringify({ names, catchtableRefs }),
        });

        if (!response.ok) {
            throw new Error('Failed to match shops');
        }

        return response.json();
    },

    generateTasteAnalysis: async (): Promise<TasteAnalysisResponse> => {
        const response = await authFetch(`${API_BASE_URL}/api/onboarding/taste-analysis`, {
            method: 'POST',
        });

        if (!response.ok) {
            throw new Error('Failed to generate taste analysis');
        }

        return response.json();
    },

    getTasteShareData: async (code: string): Promise<TasteShareData> => {
        // Public endpoint - no auth needed
        const response = await fetch(`${API_BASE_URL}/api/onboarding/taste/${code}`);

        if (!response.ok) {
            throw new Error('Taste analysis not found');
        }

        return response.json();
    },
};
