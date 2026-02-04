import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';

import { SearchShopStep } from './SearchShopStep';
import { useLocation } from 'react-router-dom';
import { WriteContentStep } from './WriteContentStep';
import { ContentService } from '@/services/ContentService';
import { ShopService } from '@/services/ShopService';
import { useRanking } from '@/context/RankingContext';
import { useUser } from '@/context/UserContext';

export const WriteFlow = () => {
    console.log('[WriteFlow] Component rendering');

    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    const location = useLocation();
    console.log('[WriteFlow] Location:', location.pathname, 'State:', location.state);

    const { openRanking, isRankingOpen, registerCallback, unregisterCallback } = useRanking();
    const { user } = useUser();

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

    // Track current step in ref for callback closure
    const stepRef = useRef(step);
    useEffect(() => {
        stepRef.current = step;
    }, [step]);

    // Get real user ID from context
    const currentUserId = user?.id || 0;
    console.log('[WriteFlow] Current user ID:', currentUserId);

    // Sync state with location updates (Critical for same-route navigation from RankingContext)
    useEffect(() => {
        if (location.state && (location.state as any).step) {
            const state = location.state as any;
            console.log('[WriteFlow] Location state changed:', state);

            if (state.step === 'WRITE_CONTENT') {
                if (state.shop) setSelectedShop(state.shop);
                if (state.satisfaction) setSatisfaction(state.satisfaction);
                setStep('WRITE_CONTENT');
            } else if (state.step === 'SEARCH_SHOP') {
                // Explicitly going back to search (e.g., from EVALUATE_ANOTHER)
                console.log('[WriteFlow] Resetting to SEARCH_SHOP');
                setStep('SEARCH_SHOP');
                // Reset callback processed flag to allow new ranking flow
                callbackProcessedRef.current = false;
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

    // Track if callback has been processed to prevent duplicate state updates
    const callbackProcessedRef = useRef(false);
    const isMountedRef = useRef(true);

    // Register callback for ranking completion - only once on mount
    useEffect(() => {
        console.log('[WriteFlow] Mounting, registering ranking callback');
        isMountedRef.current = true;

        const handleRankingComplete = (data: any) => {
            console.log('[WriteFlow] Ranking complete callback received:', data);
            console.log('[WriteFlow] isMounted:', isMountedRef.current, 'callbackProcessed:', callbackProcessedRef.current, 'currentStep:', stepRef.current, 'action:', data.action);

            // If action is QUIT, don't transition to WRITE_CONTENT
            // User wants to save ranking and quit, not write a review
            if (data.action === 'QUIT') {
                console.log('[WriteFlow] Action is QUIT, not transitioning to WRITE_CONTENT');
                return;
            }

            // Prevent duplicate processing
            if (callbackProcessedRef.current) {
                console.log('[WriteFlow] Callback already processed, skipping');
                return;
            }

            if (!isMountedRef.current) {
                console.log('[WriteFlow] Component not mounted, skipping callback');
                return;
            }

            callbackProcessedRef.current = true;

            // Use setTimeout to ensure state updates happen after RankingContext cleanup
            setTimeout(() => {
                if (!isMountedRef.current) {
                    console.log('[WriteFlow] Component unmounted during timeout, skipping state update');
                    return;
                }

                console.log('[WriteFlow] Processing ranking data, transitioning to WRITE_CONTENT');

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
            }, 100); // Increased delay to 100ms
        };

        registerCallback('WriteFlow', handleRankingComplete);

        return () => {
            console.log('[WriteFlow] Unmounting, unregistering callback');
            isMountedRef.current = false;
            unregisterCallback('WriteFlow');
            callbackProcessedRef.current = false;
        };
    }, []); // Empty deps - only register once on mount

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
        <div className="relative h-full bg-background overflow-hidden">
            <AnimatePresence mode="wait" initial={false}>
                {(step === 'SEARCH_SHOP' || isRankingOpen) && (
                    <SearchShopStep
                        key="search-shop"
                        onSelect={handleShopSelect}
                        onBack={() => navigate('/main')}
                        isRankingOpen={isRankingOpen}
                    />
                )}

                {step === 'WRITE_CONTENT' && (
                    <WriteContentStep
                        key="write-content"
                        mode={type}
                        shop={selectedShop}
                        satisfaction={satisfaction}
                        onNext={handleSubmitContent}
                        isSubmitting={isSubmitting}
                        onBack={() => {
                            // Ask user if they want to cancel writing
                            const shouldCancel = window.confirm(
                                '글쓰기를 취소하시겠습니까?\n랭킹은 이미 저장되었습니다.'
                            );

                            if (shouldCancel) {
                                // Cancel writing and go back to main with ranking saved
                                navigate('/main');
                            }
                            // If user clicks "Cancel" on the confirm dialog, stay on current step
                        }}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};
