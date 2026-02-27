import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, Loader2, Smile, Meh, Frown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { RelayService, RelayShop } from '@/services/RelayService';
import { RelayCard } from '@/screens/relay/components/RelayCard';
import { RelayCardStack } from '@/screens/relay/components/RelayCardStack';
import { RelayComparison } from '@/screens/relay/components/RelayComparison';
import { useOnboarding, type OnboardingRating } from '@/context/OnboardingContext';
import { useUser } from '@/context/UserContext';
import { RelayRating } from '@/screens/relay/RelayScreen';

type SwipeDirection = 'left' | 'right' | 'up' | 'back';
type Satisfaction = 'good' | 'ok' | 'bad';

const COMPARISON_INTERVAL = 5;

export const OnboardingRelay = () => {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const { confirmedShops, addRating, ratings: onboardingRatings } = useOnboarding();
    const { coordinates } = useUser();

    // State
    const [shops, setShops] = useState<RelayShop[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [hasMore, setHasMore] = useState(true);
    const [exitDirection, setExitDirection] = useState<SwipeDirection | null>(null);
    const [showGuide, setShowGuide] = useState(true);

    // Modal states
    const [showBackConfirm, setShowBackConfirm] = useState(false);
    const [showMilestoneModal, setShowMilestoneModal] = useState(false);

    // Phase: confirmed shops first, then nearby
    const [phase, setPhase] = useState<'confirmed' | 'nearby'>('confirmed');
    const [showPhaseTransition, setShowPhaseTransition] = useState(false);

    // Stats
    const [_stats, setStats] = useState({ recorded: 0, skipped: 0, good: 0, ok: 0, bad: 0 });

    // Local ratings for comparison logic
    const [ratings, setRatings] = useState<RelayRating[]>([]);

    // Comparison mode
    const [comparisonMode, setComparisonMode] = useState(false);
    const [comparisonQueue, setComparisonQueue] = useState<Array<{ a: RelayRating; b: RelayRating }>>([]);
    const [comparisonIndex, setComparisonIndex] = useState(0);

    // Track seen IDs & pagination
    const seenIdsRef = useRef<Set<number>>(new Set());
    const [offset, setOffset] = useState(0);

    useEffect(() => {
        if (confirmedShops.length > 0) {
            const relayShops: RelayShop[] = confirmedShops.map(shop => ({
                id: shop.shopId,
                name: shop.name,
                description: null,
                thumbnail_img: shop.thumbnail_img,
                food_kind: shop.food_kind,
                address_full: shop.address_full || null,
                address_region: null,
                shop_user_match_score: null,
                distance_km: 0,
            }));
            setShops(relayShops);
            relayShops.forEach(s => seenIdsRef.current.add(s.id));
            setPhase('confirmed');
            setIsLoading(false);
        } else {
            setPhase('nearby');
            loadNearbyShops(0);
        }
    }, []);

    const loadNearbyShops = useCallback(async (pageOffset: number = 0) => {
        if (!coordinates?.lat || !coordinates?.lon) {
            setIsLoading(false);
            return;
        }

        try {
            setIsLoading(true);
            const response = await RelayService.fetchShops(
                coordinates.lat,
                coordinates.lon,
                pageOffset
            );

            const newShops = response.shops.filter(shop => {
                if (seenIdsRef.current.has(shop.id)) return false;
                seenIdsRef.current.add(shop.id);
                return true;
            });

            setShops(prev => [...prev, ...newShops]);
            setOffset(pageOffset + response.shops.length);
            setHasMore(response.has_more);
        } catch (error) {
            console.error('[OnboardingRelay] Failed to load nearby shops:', error);
        } finally {
            setIsLoading(false);
        }
    }, [coordinates]);

    const handleSwipe = async (direction: SwipeDirection) => {
        if (exitDirection || showMilestoneModal || comparisonMode || showPhaseTransition) return;

        if (showGuide) setShowGuide(false);

        const currentShop = shops[currentIndex];
        if (!currentShop) return;

        setExitDirection(direction);

        const satisfactionMap: Record<SwipeDirection, Satisfaction> = {
            right: 'good', up: 'ok', left: 'bad', back: 'ok',
        };
        const satisfaction = satisfactionMap[direction];

        setStats(prev => ({ ...prev, recorded: prev.recorded + 1, [satisfaction]: prev[satisfaction] + 1 }));

        // Store in local ratings (for comparison)
        const newRatings = [...ratings, { shopId: currentShop.id, satisfaction, shop: currentShop }];
        setRatings(newRatings);

        // Store in onboarding context
        const onboardingRating: OnboardingRating = {
            shopId: currentShop.id,
            satisfaction,
            shop: {
                shopId: currentShop.id,
                name: currentShop.name,
                food_kind: currentShop.food_kind,
                thumbnail_img: currentShop.thumbnail_img,
            },
        };
        addRating(onboardingRating);

        // Check comparison trigger
        if (newRatings.length >= COMPARISON_INTERVAL && newRatings.length % COMPARISON_INTERVAL === 0) {
            const pairs = generateComparisonPairs(newRatings);
            if (pairs.length > 0) {
                setTimeout(() => {
                    setExitDirection(null);
                    setComparisonQueue(pairs);
                    setComparisonIndex(0);
                    setComparisonMode(true);
                }, 350);
                return;
            }
        }

        setTimeout(() => {
            setExitDirection(null);
            moveToNext();
        }, 350);
    };

    const handleSkip = () => {
        if (exitDirection || showMilestoneModal || comparisonMode || showPhaseTransition) return;
        if (showGuide) setShowGuide(false);

        setStats(prev => ({ ...prev, skipped: prev.skipped + 1 }));
        setExitDirection('back');

        setTimeout(() => {
            setExitDirection(null);
            moveToNext();
        }, 350);
    };

    const moveToNext = () => {
        const nextIndex = currentIndex + 1;

        // Check if confirmed phase is done
        if (phase === 'confirmed' && nextIndex >= shops.length) {
            setCurrentIndex(nextIndex);
            setShowPhaseTransition(true);
            return;
        }

        if (nextIndex >= shops.length) {
            if (hasMore && phase === 'nearby') {
                loadNearbyShops(offset);
                setCurrentIndex(nextIndex);
            } else {
                setShowMilestoneModal(true);
            }
        } else {
            setCurrentIndex(nextIndex);
            if (phase === 'nearby' && nextIndex >= shops.length - 5 && hasMore && !isLoading) {
                loadNearbyShops(offset);
            }
        }
    };

    const handleComplete = () => {
        if (onboardingRatings.length === 0) {
            navigate('/onboarding/analysis');
            return;
        }
        navigate('/onboarding/ranking');
    };

    const handleBack = () => {
        if (onboardingRatings.length > 0) {
            setShowBackConfirm(true);
        } else {
            navigate(-1);
        }
    };

    const confirmBack = () => {
        setShowBackConfirm(false);
        navigate(-1);
    };

    const handleContinueToNearby = () => {
        setShowPhaseTransition(false);
        setPhase('nearby');
        loadNearbyShops(0);
    };

    const handleFinishFromPhaseTransition = () => {
        setShowPhaseTransition(false);
        if (onboardingRatings.length === 0) {
            navigate('/onboarding/analysis');
            return;
        }
        navigate('/onboarding/ranking');
    };

    // Comparison logic
    const generateComparisonPairs = (currentRatings: RelayRating[]): Array<{ a: RelayRating; b: RelayRating }> => {
        const groups: Record<Satisfaction, RelayRating[]> = { good: [], ok: [], bad: [] };
        for (const r of currentRatings) groups[r.satisfaction].push(r);

        let targetTier: Satisfaction | null = null;
        let maxCount = 0;
        for (const tier of ['good', 'ok', 'bad'] as Satisfaction[]) {
            if (groups[tier].length >= 2 && groups[tier].length > maxCount) {
                maxCount = groups[tier].length;
                targetTier = tier;
            }
        }
        if (!targetTier) return [];

        const tierItems = groups[targetTier];
        const pairs: Array<{ a: RelayRating; b: RelayRating }> = [];
        const len = tierItems.length;
        if (len >= 2) pairs.push({ a: tierItems[len - 2], b: tierItems[len - 1] });
        if (len >= 4) pairs.push({ a: tierItems[len - 4], b: tierItems[len - 3] });
        return pairs;
    };

    const handleComparisonSelect = (winnerId: number) => {
        setRatings(prev => {
            const updated = [...prev];
            const winnerIdx = updated.findIndex(r => r.shopId === winnerId);
            const currentPair = comparisonQueue[comparisonIndex];
            const loserId = currentPair.a.shopId === winnerId ? currentPair.b.shopId : currentPair.a.shopId;
            const loserIdx = updated.findIndex(r => r.shopId === loserId);
            if (winnerIdx > loserIdx && winnerIdx >= 0 && loserIdx >= 0) {
                const [winner] = updated.splice(winnerIdx, 1);
                updated.splice(loserIdx, 0, winner);
            }
            return updated;
        });

        const nextIdx = comparisonIndex + 1;
        if (nextIdx < comparisonQueue.length) {
            setComparisonIndex(nextIdx);
        } else {
            exitComparisonMode();
        }
    };

    const handleComparisonSkip = () => {
        const nextIdx = comparisonIndex + 1;
        if (nextIdx < comparisonQueue.length) {
            setComparisonIndex(nextIdx);
        } else {
            exitComparisonMode();
        }
    };

    const exitComparisonMode = () => {
        setComparisonMode(false);
        setComparisonQueue([]);
        setComparisonIndex(0);
        moveToNext();
    };

    const currentShop = shops[currentIndex];

    const handleSatisfactionButton = (satisfaction: Satisfaction) => {
        const directionMap: Record<Satisfaction, SwipeDirection> = { good: 'right', ok: 'up', bad: 'left' };
        handleSwipe(directionMap[satisfaction]);
    };

    const satisfactionButtons = [
        { value: 'bad' as Satisfaction, icon: Frown, label: t('write.basic.bad', '별로였어요'), color: 'text-gray-500', bgColor: 'bg-gray-100 hover:bg-gray-200' },
        { value: 'ok' as Satisfaction, icon: Meh, label: t('write.basic.ok', '괜찮았어요'), color: 'text-yellow-500', bgColor: 'bg-yellow-50 hover:bg-yellow-100' },
        { value: 'good' as Satisfaction, icon: Smile, label: t('write.basic.good', '맛있었어요'), color: 'text-orange-500', bgColor: 'bg-orange-50 hover:bg-orange-100' },
    ];

    // Loading
    if (isLoading && shops.length === 0) {
        return (
            <div className="flex flex-col h-full bg-background pt-safe-offset-6 pb-safe-offset-6">
                <Header onBack={() => navigate(-1)} onComplete={() => {}} showComplete={false} />
                <div className="flex-1 flex flex-col items-center justify-center">
                    <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
                    <p className="text-gray-500">
                        {t('relay.loading', '맛집을 불러오는 중...')}
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-background pt-safe-offset-6 pb-safe-offset-6">
            {/* Header */}
            <Header
                onBack={handleBack}
                onComplete={handleComplete}
                showComplete={true}
                progress={`${onboardingRatings.length}${t('relay.count_suffix', '개 기록')}`}
            />

            {comparisonMode ? (
                <main className="flex-1 flex flex-col items-center justify-center px-6 pt-4 relative">
                    <AnimatePresence mode="wait">
                        {comparisonQueue[comparisonIndex] && (
                            <RelayComparison
                                key={`${comparisonQueue[comparisonIndex].a.shopId}-${comparisonQueue[comparisonIndex].b.shopId}`}
                                shopA={comparisonQueue[comparisonIndex].a}
                                shopB={comparisonQueue[comparisonIndex].b}
                                onSelect={handleComparisonSelect}
                                onSkip={handleComparisonSkip}
                            />
                        )}
                    </AnimatePresence>
                </main>
            ) : (
                <>
                    {/* Card Stack */}
                    <main className="flex-1 flex flex-col items-center justify-center px-6 pt-4 relative overflow-visible">
                        <div
                            className="relative w-full max-w-md"
                            style={{ height: 'min(calc(100vw * 1.2), 480px)', perspective: '1000px' }}
                        >
                            <RelayCardStack shops={shops} currentIndex={currentIndex} />

                            <AnimatePresence mode="popLayout">
                                {currentShop && !showPhaseTransition && (
                                    <RelayCard
                                        key={currentShop.id}
                                        shop={currentShop}
                                        isActive={true}
                                        exitDirection={exitDirection}
                                        showGuide={showGuide}
                                        onSwipe={handleSwipe}
                                        onDismissGuide={() => setShowGuide(false)}
                                    />
                                )}
                            </AnimatePresence>

                            {/* Phase transition */}
                            {showPhaseTransition && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="absolute inset-0 flex flex-col items-center justify-center bg-white rounded-3xl border shadow-lg p-6 text-center"
                                >
                                    <h3 className="font-bold text-lg mb-2">
                                        {t('onboarding.relay.phase_complete', '스크린샷 맛집 평가 완료!')}
                                    </h3>
                                    <p className="text-sm text-gray-600 mb-2">
                                        {t('relay.milestone_desc', '{{count}}개의 맛집을 기록했어요!', { count: onboardingRatings.length })}
                                    </p>
                                    <p className="text-xs text-gray-500 mb-6">
                                        {t('onboarding.relay.phase_next', '근처 맛집도 더 평가해볼까요?\n더 많이 평가할수록 분석이 정확해져요.')}
                                    </p>
                                    <div className="flex flex-col gap-3 w-full">
                                        <Button className="w-full rounded-xl h-11" onClick={handleContinueToNearby}>
                                            {t('onboarding.relay.continue_nearby', '근처 맛집도 평가하기')}
                                        </Button>
                                        <Button variant="outline" className="w-full rounded-xl h-11" onClick={handleFinishFromPhaseTransition}>
                                            {t('onboarding.relay.skip_nearby', '바로 순위 정리하기')}
                                        </Button>
                                    </div>
                                </motion.div>
                            )}
                        </div>
                    </main>

                    {/* Satisfaction Buttons */}
                    {!showPhaseTransition && (
                        <div className="px-6 pt-4">
                            <div className="flex gap-2">
                                {satisfactionButtons.map((item) => (
                                    <button
                                        key={item.value}
                                        onClick={() => handleSatisfactionButton(item.value)}
                                        disabled={!!exitDirection || showMilestoneModal}
                                        className={cn(
                                            "flex-1 flex flex-col items-center justify-center py-3 rounded-xl transition-all active:scale-[0.98]",
                                            item.bgColor,
                                            (exitDirection || showMilestoneModal) && "opacity-50"
                                        )}
                                    >
                                        <item.icon className={cn("w-6 h-6 mb-1", item.color)} strokeWidth={2} />
                                        <span className={cn("text-xs font-medium", item.color)}>{item.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Skip button */}
                    {!showPhaseTransition && (
                        <div className="px-6 pb-10 pt-3">
                            <button
                                onClick={handleSkip}
                                disabled={!!exitDirection || showMilestoneModal}
                                className={cn(
                                    "w-full py-4 text-base text-gray-400 transition-colors",
                                    !exitDirection && !showMilestoneModal && "hover:text-gray-500 active:text-gray-600",
                                    (exitDirection || showMilestoneModal) && "opacity-50"
                                )}
                            >
                                {t('relay.not_visited', '안 가봤어요')}
                            </button>
                        </div>
                    )}
                </>
            )}

            {/* Back Confirmation Modal */}
            <AnimatePresence>
                {showBackConfirm && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-6"
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white rounded-2xl p-6 w-full max-w-xs shadow-xl"
                        >
                            <h3 className="font-bold text-lg mb-2">
                                {t('relay.back_confirm_title', '기록을 중단할까요?')}
                            </h3>
                            <p className="text-sm text-gray-600 mb-6">
                                {t('relay.back_confirm_desc', '지금까지 기록한 {{count}}개가 저장되지 않습니다.', { count: onboardingRatings.length })}
                            </p>
                            <div className="flex gap-3">
                                <Button variant="outline" className="flex-1 rounded-xl h-11" onClick={() => setShowBackConfirm(false)}>
                                    {t('common.cancel', '취소')}
                                </Button>
                                <Button variant="destructive" className="flex-1 rounded-xl h-11" onClick={confirmBack}>
                                    {t('relay.discard', '중단하기')}
                                </Button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Milestone Modal */}
            <AnimatePresence>
                {showMilestoneModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-6"
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white rounded-2xl p-6 w-full max-w-xs shadow-xl"
                        >
                            <h3 className="font-bold text-lg mb-2">
                                {t('relay.milestone_title', '랭킹을 정리할까요?')}
                            </h3>
                            <p className="text-sm text-gray-600 mb-2">
                                {t('relay.milestone_desc', '{{count}}개의 맛집을 기록했어요!', { count: onboardingRatings.length })}
                            </p>
                            <p className="text-xs text-gray-500 mb-6">
                                {t('relay.milestone_hint', '랭킹 순서를 정리하고 저장할 수 있어요.')}
                            </p>
                            <div className="flex flex-col gap-3">
                                <Button className="w-full rounded-xl h-11" onClick={handleComplete}>
                                    {t('relay.organize_ranking', '랭킹 정리하기')}
                                </Button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

// Header — same as RelayScreen
const Header = ({
    onBack,
    onComplete,
    showComplete,
    progress
}: {
    onBack: () => void;
    onComplete: () => void;
    showComplete: boolean;
    progress?: string;
}) => {
    const { t } = useTranslation();

    return (
        <div className="px-4 pb-4">
            <div className="flex items-center justify-between">
                <button
                    onClick={onBack}
                    className="p-2 -ml-2 rounded-full hover:bg-muted transition-colors"
                >
                    <ArrowLeft className="w-6 h-6" />
                </button>
                <span className="text-sm text-muted-foreground">
                    {progress || t('relay.title', '빠른 기록')}
                </span>
                {showComplete ? (
                    <button
                        onClick={onComplete}
                        className="px-3 py-1.5 text-sm font-medium text-primary hover:bg-primary/10 rounded-lg transition-colors"
                    >
                        {t('common.complete', '완료')}
                    </button>
                ) : (
                    <div className="w-12" />
                )}
            </div>
        </div>
    );
};
