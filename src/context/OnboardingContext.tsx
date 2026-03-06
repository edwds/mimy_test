import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import type { TasteAnalysisResult, MatchedRecommendation } from '@/services/OnboardingService';

export interface OnboardingShop {
    shopId: number;
    name: string;
    food_kind: string | null;
    thumbnail_img: string | null;
    address_full?: string | null;
}

export interface OnboardingRating {
    shopId: number;
    satisfaction: 'good' | 'ok' | 'bad';
    shop: OnboardingShop;
}

export interface CatchtableRef {
    name: string;
    shopRef: string;
}

interface OnboardingState {
    extractedNames: string[];
    catchtableRefs: CatchtableRef[];
    confirmedShops: OnboardingShop[];
    ratings: OnboardingRating[];
    analysis: TasteAnalysisResult | null;
    matchedRecommendations: MatchedRecommendation[];
    shareCode: string | null;
    tasteType: {
        fullType: string;
        baseCode: string;
        subtype: string;
    } | null;
    tasteProfile: {
        name: string;
        tagline: string;
    } | null;
}

interface OnboardingContextType extends OnboardingState {
    setExtractedNames: (names: string[]) => void;
    setCatchtableRefs: (refs: CatchtableRef[]) => void;
    setConfirmedShops: (shops: OnboardingShop[]) => void;
    addRating: (rating: OnboardingRating) => void;
    setRatings: (ratings: OnboardingRating[]) => void;
    setAnalysisResult: (analysis: TasteAnalysisResult, shareCode: string, tasteType: OnboardingState['tasteType'], tasteProfile: OnboardingState['tasteProfile'], matchedRecommendations?: MatchedRecommendation[]) => void;
    reset: () => void;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

const initialState: OnboardingState = {
    extractedNames: [],
    catchtableRefs: [],
    confirmedShops: [],
    ratings: [],
    analysis: null,
    matchedRecommendations: [],
    shareCode: null,
    tasteType: null,
    tasteProfile: null,
};

export const OnboardingProvider = ({ children }: { children: React.ReactNode }) => {
    const [state, setState] = useState<OnboardingState>(initialState);

    const setExtractedNames = useCallback((names: string[]) => {
        setState(prev => ({ ...prev, extractedNames: names }));
    }, []);

    const setCatchtableRefs = useCallback((refs: CatchtableRef[]) => {
        setState(prev => ({ ...prev, catchtableRefs: refs }));
    }, []);

    const setConfirmedShops = useCallback((shops: OnboardingShop[]) => {
        setState(prev => ({ ...prev, confirmedShops: shops }));
    }, []);

    const addRating = useCallback((rating: OnboardingRating) => {
        setState(prev => ({
            ...prev,
            ratings: [...prev.ratings.filter(r => r.shopId !== rating.shopId), rating],
        }));
    }, []);

    const setRatings = useCallback((ratings: OnboardingRating[]) => {
        setState(prev => ({ ...prev, ratings }));
    }, []);

    const setAnalysisResult = useCallback((
        analysis: TasteAnalysisResult,
        shareCode: string,
        tasteType: OnboardingState['tasteType'],
        tasteProfile: OnboardingState['tasteProfile'],
        matchedRecommendations?: MatchedRecommendation[],
    ) => {
        setState(prev => ({ ...prev, analysis, shareCode, tasteType, tasteProfile, matchedRecommendations: matchedRecommendations || [] }));
    }, []);

    const reset = useCallback(() => {
        setState(initialState);
    }, []);

    const contextValue = useMemo(() => ({
        ...state,
        setExtractedNames,
        setCatchtableRefs,
        setConfirmedShops,
        addRating,
        setRatings,
        setAnalysisResult,
        reset,
    }), [state, setExtractedNames, setCatchtableRefs, setConfirmedShops, addRating, setRatings, setAnalysisResult, reset]);

    return (
        <OnboardingContext.Provider value={contextValue}>
            {children}
        </OnboardingContext.Provider>
    );
};

export const useOnboarding = () => {
    const context = useContext(OnboardingContext);
    if (!context) {
        throw new Error('useOnboarding must be used within an OnboardingProvider');
    }
    return context;
};
