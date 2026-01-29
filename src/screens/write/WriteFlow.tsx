import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { cn } from '@/lib/utils';

import { SearchShopStep } from './SearchShopStep';
import { useLocation } from 'react-router-dom';
import { WriteContentStep } from './WriteContentStep';
import { ContentService } from '@/services/ContentService';
import { ShopService } from '@/services/ShopService';
import { useRanking } from '@/context/RankingContext';
import { Capacitor } from '@capacitor/core';
import { getAccessToken } from '@/lib/tokenStorage';

export const WriteFlow = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    const location = useLocation();
    const { openRanking, isRankingOpen, registerCallback, unregisterCallback } = useRanking();

    const initialShopId = searchParams.get('shop_id');
    const locationState = location.state as { step?: string; shop?: any; satisfaction?: any } | undefined;

    // Data Accumulation
    const [type] = useState<'review' | 'post'>('review'); // Default to review
    const [selectedShop, setSelectedShop] = useState<any>(locationState?.shop || null);
    const [satisfaction, setSatisfaction] = useState<'good' | 'ok' | 'bad'>(locationState?.satisfaction || 'good');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Initial Step Logic
    const [step, setStep] = useState<'SEARCH_SHOP' | 'WRITE_CONTENT' | 'LOADING'>(() => {
        if (locationState?.step === 'WRITE_CONTENT') return 'WRITE_CONTENT';
        if (initialShopId) return 'LOADING'; // Wait for fetch
        return 'SEARCH_SHOP';
    });

    // Get real user ID
    const currentUserId = Number(localStorage.getItem("mimy_user_id") || 0);

    // Sync state with location updates (Critical for same-route navigation from RankingContext)
    useEffect(() => {
        if (location.state && (location.state as any).step) {
            const state = location.state as any;
            if (state.step === 'WRITE_CONTENT') {
                if (state.shop) setSelectedShop(state.shop);
                if (state.satisfaction) setSatisfaction(state.satisfaction);
                setStep('WRITE_CONTENT');
            } else if (state.step === 'SEARCH_SHOP') {
                setStep('SEARCH_SHOP');
            }
        }
    }, [location.state]);

    // Fetch Shop if shop_id is present
    useEffect(() => {
        if (initialShopId) {
            const fetchShop = async () => {
                try {
                    const shopData = await ShopService.getById(Number(initialShopId));
                    setSelectedShop(shopData);
                    setStep('SEARCH_SHOP');
                    openRanking(shopData);
                } catch (error) {
                    console.error("Failed to fetch shop:", error);
                    alert("매장 정보를 불러올 수 없습니다.");
                    navigate(-1);
                }
            };
            fetchShop();
        }
    }, [initialShopId, navigate, openRanking]);

    // Use ref to store callback handler - prevents unmounting on state change
    const handleRankingCompleteRef = useRef((data: any) => {
        console.log('[WriteFlow] Ranking complete callback received:', data);

        // Update satisfaction from ranking data
        if (data.my_review_stats?.satisfaction !== undefined) {
            const tierMap: Record<number, 'good' | 'ok' | 'bad'> = {
                0: 'bad',
                1: 'ok',
                2: 'good'
            };
            const newSatisfaction = tierMap[data.my_review_stats.satisfaction] || 'good';
            setSatisfaction(newSatisfaction);
        }

        // Move to write content step
        setStep('WRITE_CONTENT');
    });

    // Update ref on every render to capture latest state setters
    handleRankingCompleteRef.current = (data: any) => {
        console.log('[WriteFlow] Ranking complete callback received:', data);

        if (data.my_review_stats?.satisfaction !== undefined) {
            const tierMap: Record<number, 'good' | 'ok' | 'bad'> = {
                0: 'bad',
                1: 'ok',
                2: 'good'
            };
            const newSatisfaction = tierMap[data.my_review_stats.satisfaction] || 'good';
            setSatisfaction(newSatisfaction);
        }

        setStep('WRITE_CONTENT');
    };

    // Register callback for ranking completion - only once on mount
    useEffect(() => {
        console.log('[WriteFlow] Registering ranking callback');

        // Register a stable wrapper that calls the ref
        const stableCallback = (data: any) => {
            handleRankingCompleteRef.current(data);
        };

        registerCallback('WriteFlow', stableCallback);

        return () => {
            console.log('[WriteFlow] Component unmounting, unregistering callback');
            unregisterCallback('WriteFlow');
        };
    }, []); // Empty deps - only register on mount, unregister on unmount

    // Handlers
    const handleShopSelect = (shop: any) => {
        setSelectedShop(shop);
        openRanking(shop);
    };





    const handleSubmitContent = async (contentData: { text: string; images: string[]; imgText?: string[]; companions?: number[]; keywords?: string[]; visitDate?: string; links?: { title: string; url: string }[] }) => {
        if (isSubmitting) return;
        setIsSubmitting(true);
        try {
            if (!currentUserId) {
                alert("Login required");
                navigate('/login');
                return;
            }

            // Verify authentication token for native platforms
            if (Capacitor.isNativePlatform()) {
                console.log('[WriteFlow] Native platform detected, verifying token...');
                const token = await getAccessToken();
                if (!token) {
                    console.error('[WriteFlow] ❌ No access token found!');
                    alert('로그인 세션이 만료되었습니다. 다시 로그인해주세요.');
                    navigate('/login');
                    setIsSubmitting(false);
                    return;
                }
                console.log('[WriteFlow] ✅ Token verified, proceeding with submission');
            }

            // Prepare payload (user_id is NOT needed - backend gets it from JWT)
            const payload = {
                type,
                text: contentData.text,
                img: contentData.images,
                video: [],
                review_prop: {
                    shop_id: selectedShop.id,
                    visit_date: contentData.visitDate || new Date().toISOString().split('T')[0],
                    companions: contentData.companions || [],
                    satisfaction: satisfaction
                },
                keyword: contentData.keywords || [],
                link_json: contentData.links || [],
                img_text: contentData.imgText || []
            };

            console.log('[WriteFlow] Submitting content with payload:', {
                type: payload.type,
                textLength: payload.text?.length,
                imageCount: payload.img?.length,
                shopId: payload.review_prop.shop_id
            });

            const result = await ContentService.create(payload);
            console.log('[WriteFlow] ✅ Content created successfully, result:', result);
            navigate('/main');
        } catch (error: any) {
            console.error('[WriteFlow] ❌ Submit failed:', error);
            console.error('[WriteFlow] Error type:', typeof error);
            console.error('[WriteFlow] Error message:', error?.message);
            console.error('[WriteFlow] Error stack:', error?.stack);

            if (error.message?.includes('로그인')) {
                alert('로그인 세션이 만료되었습니다. 다시 로그인해주세요.');
                navigate('/login');
            } else {
                alert(error.message || '글 등록에 실패했습니다.');
            }
            setIsSubmitting(false);
        }
    };



    // Helper for "Complete" (Submit empty review if needed - ACTUALLY ranking is already saved. 
    // Do we need to create a content entry for the ranking to appear in feed? 
    // Yes, usually. The user wants "Evaluation" which implies a record.
    // If they click "Complete" or "Evaluate Another", we should probably save a minimal content entry.
    // Or does Ranking suffice? 
    // "ContentCard" is based on content. Ranking alone appears in profile but maybe not feed.
    // Let's assume we need to create a default content entry if they skip writing.


    if (step === 'LOADING') {
        return <div className="h-full bg-background flex items-center justify-center">Loading...</div>;
    }

    return (
        <div className="relative h-full bg-background">
            {(step === 'SEARCH_SHOP' || isRankingOpen) && (
                <div className={cn("h-full transition-all duration-300", isRankingOpen ? "scale-95 opacity-50 blur-[1px] pointer-events-none" : "")}>
                    <SearchShopStep
                        onSelect={handleShopSelect}
                        onBack={() => navigate('/main')}
                    />
                </div>
            )}

            {step === 'WRITE_CONTENT' && (
                <WriteContentStep
                    mode={type}
                    shop={selectedShop}
                    satisfaction={satisfaction}
                    onNext={handleSubmitContent}
                    isSubmitting={isSubmitting}
                    onBack={() => {
                        // Back from writing content -> Show overlay again or just go back to search?
                        // If they were writing content, going back implies cancelling or re-ranking.
                        // Open ranking for current shop again?
                        if (selectedShop) {
                            setStep('SEARCH_SHOP');
                            openRanking(selectedShop);
                        } else {
                            setStep('SEARCH_SHOP');
                        }
                    }}
                />
            )}
        </div>
    );
};
