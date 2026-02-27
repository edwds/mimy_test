import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, Loader2, Smile, Meh, Frown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RelayShop } from '@/services/RelayService';
import { RelayService } from '@/services/RelayService';
import { RelayCard } from '@/screens/relay/components/RelayCard';
import { RelayCardStack } from '@/screens/relay/components/RelayCardStack';
import { useOnboarding, type OnboardingRating } from '@/context/OnboardingContext';
import { useUser } from '@/context/UserContext';

type SwipeDirection = 'left' | 'right' | 'up' | 'back';
type Satisfaction = 'good' | 'ok' | 'bad';

export const OnboardingRelay = () => {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const { confirmedShops, addRating, ratings } = useOnboarding();
    const { coordinates } = useUser();

    const [shops, setShops] = useState<RelayShop[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [exitDirection, setExitDirection] = useState<SwipeDirection | null>(null);
    const [showGuide, setShowGuide] = useState(true);
    const [stats, setStats] = useState({ good: 0, ok: 0, bad: 0 });
    const [phase, setPhase] = useState<'confirmed' | 'nearby'>('confirmed');
    const [showPhaseTransition, setShowPhaseTransition] = useState(false);

    const seenIdsRef = useRef<Set<number>>(new Set());

    useEffect(() => {
        if (confirmedShops.length > 0) {
            // Convert confirmed shops to RelayShop format
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
            // No confirmed shops (skipped screenshot), load nearby
            setPhase('nearby');
            loadNearbyShops();
        }
    }, []);

    const loadNearbyShops = useCallback(async (offset = 0) => {
        if (!coordinates?.lat) {
            setIsLoading(false);
            return;
        }

        try {
            setIsLoading(true);
            const response = await RelayService.fetchShops(
                coordinates.lat,
                coordinates.lon,
                offset,
                20
            );

            const newShops = response.shops.filter(shop => {
                if (seenIdsRef.current.has(shop.id)) return false;
                seenIdsRef.current.add(shop.id);
                return true;
            });

            setShops(prev => [...prev, ...newShops]);
        } catch (error) {
            console.error('Failed to load nearby shops:', error);
        } finally {
            setIsLoading(false);
        }
    }, [coordinates]);

    const moveToNext = useCallback(() => {
        setExitDirection(null);
        setCurrentIndex(prev => {
            const next = prev + 1;
            // Check if we've finished confirmed shops
            if (phase === 'confirmed' && next >= shops.length) {
                setShowPhaseTransition(true);
            }
            return next;
        });
    }, [phase, shops.length]);

    const handleSwipe = useCallback((direction: SwipeDirection) => {
        if (exitDirection) return;

        const currentShop = shops[currentIndex];
        if (!currentShop) return;

        let satisfaction: Satisfaction;
        if (direction === 'right') satisfaction = 'good';
        else if (direction === 'up') satisfaction = 'ok';
        else satisfaction = 'bad';

        setStats(prev => ({ ...prev, [satisfaction]: prev[satisfaction] + 1 }));

        const rating: OnboardingRating = {
            shopId: currentShop.id,
            satisfaction,
            shop: {
                shopId: currentShop.id,
                name: currentShop.name,
                food_kind: currentShop.food_kind,
                thumbnail_img: currentShop.thumbnail_img,
            },
        };
        addRating(rating);

        setExitDirection(direction);
        setTimeout(() => moveToNext(), 350);
    }, [currentIndex, shops, exitDirection, addRating, moveToNext]);

    const handleContinueToNearby = useCallback(() => {
        setShowPhaseTransition(false);
        setPhase('nearby');
        loadNearbyShops();
    }, [loadNearbyShops]);

    const handleFinish = useCallback(() => {
        if (ratings.length === 0) {
            navigate('/onboarding/analysis');
            return;
        }
        navigate('/onboarding/ranking');
    }, [ratings, navigate]);

    const allDone = currentIndex >= shops.length && !isLoading;
    const showCard = currentIndex < shops.length;

    if (isLoading && shops.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full gap-4">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
                <p className="text-sm text-muted-foreground">
                    {t('onboarding.relay.loading', { defaultValue: '맛집을 불러오고 있어요...' })}
                </p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-background pt-safe-offset-0 pb-safe-offset-6">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3">
                <button onClick={() => navigate(-1)} className="p-2 -ml-2">
                    <ArrowLeft className="w-6 h-6" />
                </button>
                <div className="flex items-center gap-3 text-sm">
                    <span className="flex items-center gap-1">
                        <Smile className="w-4 h-4 text-orange-500" />
                        {stats.good}
                    </span>
                    <span className="flex items-center gap-1">
                        <Meh className="w-4 h-4 text-yellow-500" />
                        {stats.ok}
                    </span>
                    <span className="flex items-center gap-1">
                        <Frown className="w-4 h-4 text-gray-400" />
                        {stats.bad}
                    </span>
                </div>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleFinish}
                >
                    {t('onboarding.relay.done', { defaultValue: '완료' })}
                </Button>
            </div>

            {/* Progress */}
            {shops.length > 0 && (
                <div className="px-6 pb-2">
                    <div className="h-1 bg-muted rounded-full overflow-hidden">
                        <motion.div
                            className="h-full bg-primary rounded-full"
                            animate={{ width: `${Math.min((currentIndex / shops.length) * 100, 100)}%` }}
                            transition={{ duration: 0.3 }}
                        />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 text-center">
                        {currentIndex < shops.length
                            ? `${currentIndex + 1} / ${shops.length}`
                            : t('onboarding.relay.all_done_label', { defaultValue: '모두 완료!' })}
                    </p>
                </div>
            )}

            {/* Card Area */}
            <div className="flex-1 px-6 pt-2 pb-4 relative">
                <div className="relative w-full h-full max-w-md mx-auto" style={{ perspective: '1200px' }}>
                    <AnimatePresence mode="popLayout">
                        {showCard && (
                            <>
                                <RelayCardStack
                                    key="stack"
                                    shops={shops}
                                    currentIndex={currentIndex}
                                />
                                <RelayCard
                                    key={`card-${shops[currentIndex].id}`}
                                    shop={shops[currentIndex]}
                                    isActive={true}
                                    exitDirection={exitDirection}
                                    showGuide={showGuide && currentIndex === 0}
                                    onSwipe={handleSwipe}
                                    onDismissGuide={() => setShowGuide(false)}
                                />
                            </>
                        )}
                    </AnimatePresence>

                    {/* Phase transition */}
                    {showPhaseTransition && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="absolute inset-0 flex flex-col items-center justify-center bg-background rounded-3xl border shadow-lg p-8 text-center"
                        >
                            <span className="text-4xl mb-4">🎉</span>
                            <h2 className="text-xl font-bold mb-2">
                                {t('onboarding.relay.phase_complete', { defaultValue: '스크린샷 맛집 평가 완료!' })}
                            </h2>
                            <p className="text-sm text-muted-foreground mb-6">
                                {t('onboarding.relay.phase_next', { defaultValue: '근처 맛집도 더 평가해볼까요?\n더 많이 평가할수록 분석이 정확해져요.' })}
                            </p>
                            <div className="space-y-3 w-full">
                                <Button
                                    size="lg"
                                    className="w-full rounded-full"
                                    onClick={handleContinueToNearby}
                                >
                                    {t('onboarding.relay.continue_nearby', { defaultValue: '근처 맛집도 평가하기' })}
                                </Button>
                                <Button
                                    size="lg"
                                    variant="outline"
                                    className="w-full rounded-full"
                                    onClick={handleFinish}
                                >
                                    {t('onboarding.relay.skip_nearby', { defaultValue: '바로 순위 정리하기' })}
                                </Button>
                            </div>
                        </motion.div>
                    )}

                    {/* All done (nearby phase) */}
                    {allDone && phase === 'nearby' && !showPhaseTransition && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="absolute inset-0 flex flex-col items-center justify-center bg-background rounded-3xl border shadow-lg p-8 text-center"
                        >
                            <span className="text-4xl mb-4">✅</span>
                            <h2 className="text-xl font-bold mb-2">
                                {t('onboarding.relay.nearby_done', { defaultValue: '평가 완료!' })}
                            </h2>
                            <p className="text-sm text-muted-foreground mb-6">
                                {t('onboarding.relay.nearby_done_desc', {
                                    defaultValue: `총 ${ratings.length}개 맛집을 평가했어요`,
                                    count: ratings.length,
                                })}
                            </p>
                            <Button
                                size="lg"
                                className="w-full rounded-full"
                                onClick={handleFinish}
                            >
                                {t('onboarding.relay.go_ranking', { defaultValue: '순위 정리하러 가기' })}
                            </Button>
                        </motion.div>
                    )}
                </div>
            </div>

            {/* Swipe hints */}
            {showCard && !showGuide && (
                <div className="flex justify-center gap-6 pb-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                        ← <Frown className="w-3.5 h-3.5" /> {t('relay.bad', '별로')}
                    </span>
                    <span className="flex items-center gap-1">
                        ↑ <Meh className="w-3.5 h-3.5" /> {t('relay.ok', '괜찮아')}
                    </span>
                    <span className="flex items-center gap-1">
                        → <Smile className="w-3.5 h-3.5" /> {t('relay.good', '맛있어')}
                    </span>
                </div>
            )}
        </div>
    );
};
