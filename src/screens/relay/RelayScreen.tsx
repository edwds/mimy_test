import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, Loader2, MapPinOff, Smile, Meh, Frown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { RelayService, RelayShop } from '@/services/RelayService';
import { useUser } from '@/context/UserContext';
import { RelayCard } from './components/RelayCard';
import { RelayCardStack } from './components/RelayCardStack';
import { RelayComparison } from './components/RelayComparison';

type SwipeDirection = 'left' | 'right' | 'up' | 'back';
type Satisfaction = 'good' | 'ok' | 'bad';

// Milestone: trigger ranking organization after this many ratings
const RATINGS_PER_BATCH = 30;
// Comparison: insert A vs B comparisons every N ratings
const COMPARISON_INTERVAL = 5;

export interface RelayRating {
    shopId: number;
    satisfaction: Satisfaction;
    shop: RelayShop; // Include shop info for ManageRankingScreen
}

export const RelayScreen = () => {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const { coordinates } = useUser();

    // State
    const [shops, setShops] = useState<RelayShop[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [hasMore, setHasMore] = useState(true);
    const [exitDirection, setExitDirection] = useState<SwipeDirection | null>(null);
    const [showGuide, setShowGuide] = useState(true);
    const [locationError, setLocationError] = useState(false);

    // Modal states
    const [showBackConfirm, setShowBackConfirm] = useState(false);
    const [showMilestoneModal, setShowMilestoneModal] = useState(false);

    // Stats tracking (for future analytics)
    const [_stats, setStats] = useState({
        recorded: 0,
        skipped: 0,
        good: 0,
        ok: 0,
        bad: 0
    });

    // Store ratings locally during relay
    const [ratings, setRatings] = useState<RelayRating[]>([]);

    // Comparison mode state
    const [comparisonMode, setComparisonMode] = useState(false);
    const [comparisonQueue, setComparisonQueue] = useState<Array<{ a: RelayRating; b: RelayRating }>>([]);
    const [comparisonIndex, setComparisonIndex] = useState(0);

    // Track seen shop IDs in a ref (to avoid stale closure issues)
    const seenIdsRef = useRef<Set<number>>(new Set());

    // Track pagination offset
    const [offset, setOffset] = useState(0);

    // Load shops with pagination, filter duplicates on client
    const loadShops = useCallback(async (pageOffset: number = 0) => {
        if (!coordinates?.lat || !coordinates?.lon) {
            setLocationError(true);
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

            // Filter out shops we've already seen (client-side deduplication)
            const newShops = response.shops.filter(shop => {
                if (seenIdsRef.current.has(shop.id)) {
                    return false;
                }
                // Add to seen set
                seenIdsRef.current.add(shop.id);
                return true;
            });

            if (pageOffset === 0) {
                // Initial load
                setShops(newShops);
            } else {
                // Append new shops
                setShops(prev => [...prev, ...newShops]);
            }

            // Update offset for next page
            setOffset(pageOffset + response.shops.length);

            // has_more only if API says so AND we got some new shops
            setHasMore(response.has_more);
        } catch (error) {
            console.error('[RelayScreen] Failed to load shops:', error);
        } finally {
            setIsLoading(false);
        }
    }, [coordinates]);

    // Initial load
    useEffect(() => {
        // Reset seen IDs on new session
        seenIdsRef.current = new Set();
        setOffset(0);
        loadShops(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [coordinates]);

    // Handle swipe action
    const handleSwipe = async (direction: SwipeDirection) => {
        if (exitDirection || showMilestoneModal || comparisonMode) return;

        // Dismiss guide on first swipe
        if (showGuide) {
            setShowGuide(false);
        }

        const currentShop = shops[currentIndex];
        if (!currentShop) return;

        setExitDirection(direction);

        // Map swipe to satisfaction
        // right = good, up = ok, left = bad
        const satisfactionMap: Record<SwipeDirection, 'good' | 'ok' | 'bad'> = {
            right: 'good',
            up: 'ok',
            left: 'bad',
            back: 'ok' // fallback, shouldn't be used
        };
        const satisfaction = satisfactionMap[direction];

        // Update stats
        setStats(prev => ({
            ...prev,
            recorded: prev.recorded + 1,
            [satisfaction]: prev[satisfaction] + 1
        }));

        // Store rating locally (include shop info for ManageRankingScreen)
        const newRatings = [...ratings, { shopId: currentShop.id, satisfaction, shop: currentShop }];
        setRatings(newRatings);

        // Check if milestone reached (every RATINGS_PER_BATCH ratings)
        if (newRatings.length >= RATINGS_PER_BATCH && newRatings.length % RATINGS_PER_BATCH === 0) {
            setTimeout(() => {
                setExitDirection(null);
                setShowMilestoneModal(true);
            }, 350);
            return;
        }

        // Check if comparison should trigger (every COMPARISON_INTERVAL ratings)
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

        // Move to next card after animation completes
        setTimeout(() => {
            setExitDirection(null);
            moveToNext();
        }, 350);
    };

    // Handle skip (not visited)
    const handleSkip = () => {
        if (exitDirection || showMilestoneModal || comparisonMode) return;

        if (showGuide) {
            setShowGuide(false);
        }

        setStats(prev => ({
            ...prev,
            skipped: prev.skipped + 1
        }));

        setExitDirection('back'); // Card goes to back of stack

        // Move to next card after animation completes
        setTimeout(() => {
            setExitDirection(null);
            moveToNext();
        }, 350);
    };

    // Move to next card
    const moveToNext = () => {
        const nextIndex = currentIndex + 1;

        if (nextIndex >= shops.length) {
            // All cards done
            if (hasMore) {
                // Load more with current offset
                loadShops(offset);
                setCurrentIndex(nextIndex);
            } else {
                // No more cards - show milestone modal to save
                setShowMilestoneModal(true);
            }
        } else {
            setCurrentIndex(nextIndex);

            // Preload more when near end
            if (nextIndex >= shops.length - 5 && hasMore && !isLoading) {
                loadShops(offset);
            }
        }
    };

    // Handle complete button click
    const handleComplete = () => {
        if (ratings.length === 0) {
            navigate(-1);
            return;
        }
        setShowMilestoneModal(true);
    };

    // Handle back button click
    const handleBack = () => {
        if (ratings.length > 0) {
            setShowBackConfirm(true);
        } else {
            navigate(-1);
        }
    };

    // Confirm back (discard ratings)
    const confirmBack = () => {
        setShowBackConfirm(false);
        navigate(-1);
    };

    // Navigate to ManageRankingScreen with new ratings
    // Don't save here - ManageRankingScreen will merge with existing rankings and save all at once
    const saveAndNavigate = () => {
        setShowMilestoneModal(false);

        // Pass ratings to ManageRankingScreen via router state
        // ManageRankingScreen will merge these with existing rankings
        navigate('/profile/manage/ranking', {
            state: { newRatings: ratings }
        });
    };

    // Continue after milestone (don't save yet, keep going)
    const continueAfterMilestone = () => {
        setShowMilestoneModal(false);
        // Move to next card
        moveToNext();
    };

    // Generate comparison pairs from ratings within the same tier
    const generateComparisonPairs = (currentRatings: RelayRating[]): Array<{ a: RelayRating; b: RelayRating }> => {
        // Group by tier
        const groups: Record<Satisfaction, RelayRating[]> = { good: [], ok: [], bad: [] };
        for (const r of currentRatings) {
            groups[r.satisfaction].push(r);
        }

        // Pick the largest tier with 2+ items
        const tiers: Satisfaction[] = ['good', 'ok', 'bad'];
        let targetTier: Satisfaction | null = null;
        let maxCount = 0;
        for (const tier of tiers) {
            if (groups[tier].length >= 2 && groups[tier].length > maxCount) {
                maxCount = groups[tier].length;
                targetTier = tier;
            }
        }

        if (!targetTier) return [];

        const tierItems = groups[targetTier];
        const pairs: Array<{ a: RelayRating; b: RelayRating }> = [];

        // Generate 1-2 pairs from adjacent items (most recently added)
        const len = tierItems.length;
        if (len >= 2) {
            pairs.push({ a: tierItems[len - 2], b: tierItems[len - 1] });
        }
        if (len >= 4) {
            pairs.push({ a: tierItems[len - 4], b: tierItems[len - 3] });
        }

        return pairs;
    };

    // Handle comparison selection: winner moves ahead of loser within the same tier
    const handleComparisonSelect = (winnerId: number) => {
        setRatings(prev => {
            const updated = [...prev];
            const winnerIdx = updated.findIndex(r => r.shopId === winnerId);
            const currentPair = comparisonQueue[comparisonIndex];
            const loserId = currentPair.a.shopId === winnerId ? currentPair.b.shopId : currentPair.a.shopId;
            const loserIdx = updated.findIndex(r => r.shopId === loserId);

            // If winner is behind loser, move winner in front of loser
            if (winnerIdx > loserIdx && winnerIdx >= 0 && loserIdx >= 0) {
                const [winner] = updated.splice(winnerIdx, 1);
                updated.splice(loserIdx, 0, winner);
            }

            return updated;
        });

        // Advance to next pair or exit comparison mode
        const nextIndex = comparisonIndex + 1;
        if (nextIndex < comparisonQueue.length) {
            setComparisonIndex(nextIndex);
        } else {
            exitComparisonMode();
        }
    };

    // Handle comparison skip
    const handleComparisonSkip = () => {
        const nextIndex = comparisonIndex + 1;
        if (nextIndex < comparisonQueue.length) {
            setComparisonIndex(nextIndex);
        } else {
            exitComparisonMode();
        }
    };

    // Exit comparison mode and resume swiping
    const exitComparisonMode = () => {
        setComparisonMode(false);
        setComparisonQueue([]);
        setComparisonIndex(0);
    };

    const currentShop = shops[currentIndex];

    // Location error state
    if (locationError) {
        return (
            <div className="flex flex-col h-full bg-background pt-safe-offset-6 pb-safe-offset-6">
                <Header onBack={() => navigate(-1)} onComplete={() => {}} showComplete={false} />
                <div className="flex-1 flex flex-col items-center justify-center px-6">
                    <MapPinOff className="w-16 h-16 text-gray-300 mb-4" />
                    <h2 className="text-xl font-bold mb-2">
                        {t('relay.location_required', '위치 정보가 필요해요')}
                    </h2>
                    <p className="text-gray-500 text-center mb-6">
                        {t('relay.location_desc', '주변 맛집을 찾기 위해 위치 권한을 허용해주세요')}
                    </p>
                    <Button onClick={() => navigate(-1)} variant="outline">
                        {t('common.back', '돌아가기')}
                    </Button>
                </div>
            </div>
        );
    }

    // Loading state
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

    // Satisfaction button handler
    const handleSatisfactionButton = (satisfaction: 'good' | 'ok' | 'bad') => {
        const directionMap: Record<string, 'right' | 'up' | 'left'> = {
            good: 'right',
            ok: 'up',
            bad: 'left'
        };
        handleSwipe(directionMap[satisfaction]);
    };

    // Button order matches swipe direction: left=bad, center=ok, right=good
    const satisfactionButtons = [
        { value: 'bad', icon: Frown, label: t('write.basic.bad', '별로였어요'), color: 'text-gray-500', bgColor: 'bg-gray-100 hover:bg-gray-200' },
        { value: 'ok', icon: Meh, label: t('write.basic.ok', '괜찮았어요'), color: 'text-yellow-500', bgColor: 'bg-yellow-50 hover:bg-yellow-100' },
        { value: 'good', icon: Smile, label: t('write.basic.good', '맛있었어요'), color: 'text-orange-500', bgColor: 'bg-orange-50 hover:bg-orange-100' },
    ];

    return (
        <div className="flex flex-col h-full bg-background pt-safe-offset-6 pb-safe-offset-6">
            {/* Header */}
            <Header
                onBack={handleBack}
                onComplete={handleComplete}
                showComplete={true}
                progress={`${ratings.length}${t('relay.count_suffix', '개 기록')}`}
            />

            {comparisonMode ? (
                /* Comparison Mode */
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
                            {/* Background cards */}
                            <RelayCardStack shops={shops} currentIndex={currentIndex} />

                            {/* Active card */}
                            <AnimatePresence mode="popLayout">
                                {currentShop && (
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
                        </div>
                    </main>

                    {/* Satisfaction Buttons */}
                    <div className="px-6 pt-4">
                        <div className="flex gap-2">
                            {satisfactionButtons.map((item) => (
                                <button
                                    key={item.value}
                                    onClick={() => handleSatisfactionButton(item.value as 'good' | 'ok' | 'bad')}
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

                    {/* Skip button */}
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
                                {t('relay.back_confirm_desc', '지금까지 기록한 {{count}}개가 저장되지 않습니다.', { count: ratings.length })}
                            </p>
                            <div className="flex gap-3">
                                <Button
                                    variant="outline"
                                    className="flex-1 rounded-xl h-11"
                                    onClick={() => setShowBackConfirm(false)}
                                >
                                    {t('common.cancel', '취소')}
                                </Button>
                                <Button
                                    variant="destructive"
                                    className="flex-1 rounded-xl h-11"
                                    onClick={confirmBack}
                                >
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
                                {t('relay.milestone_desc', '{{count}}개의 맛집을 기록했어요!', { count: ratings.length })}
                            </p>
                            <p className="text-xs text-gray-500 mb-6">
                                {t('relay.milestone_hint', '랭킹 순서를 정리하고 저장할 수 있어요.')}
                            </p>
                            <div className="flex flex-col gap-3">
                                <Button
                                    className="w-full rounded-xl h-11"
                                    onClick={saveAndNavigate}
                                >
                                    {t('relay.organize_ranking', '랭킹 정리하기')}
                                </Button>
                                {hasMore && currentIndex < shops.length && (
                                    <Button
                                        variant="outline"
                                        className="w-full rounded-xl h-11"
                                        onClick={continueAfterMilestone}
                                    >
                                        {t('relay.continue_recording', '더 기록하기')}
                                    </Button>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

// Header component
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
                    <div className="w-12" /> // Spacer
                )}
            </div>
        </div>
    );
};

export default RelayScreen;
