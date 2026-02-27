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

export interface TasteAnalysisResult {
    summary: string;
    highlights: string[];
    personalityTraits: string[];
    foodRecommendations: string[];
    detailedAnalysis: string;
}

export interface TasteAnalysisResponse {
    analysis: TasteAnalysisResult;
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
    tasteProfile: { name: string; tagline: string } | null;
    tasteProfileEn: { name: string; tagline: string } | null;
    user: {
        nickname: string | null;
        profile_image: string | null;
    };
    createdAt: string;
}

export const OnboardingService = {
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

    matchShops: async (names: string[]): Promise<{ matches: ShopMatch[] }> => {
        const response = await authFetch(`${API_BASE_URL}/api/onboarding/match-shops`, {
            method: 'POST',
            body: JSON.stringify({ names }),
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
