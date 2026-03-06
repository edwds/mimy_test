import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Loader2, MapPin, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useOnboarding } from '@/context/OnboardingContext';
import { RankingService } from '@/services/RankingService';
import { formatFoodKind } from '@/lib/foodKindMap';
import type { RelayRating } from '@/screens/relay/RelayScreen';

// --- Types ---

import {
    type Satisfaction,
    TIER_ORDER,
    TIER_NUM,
    TIER_LABEL,
    TIER_COLOR,
    BUCKET_TIERS,
    TIER_FROM_NUM,
} from '@/services/RankingService';

interface PlaceableShop {
    shopId: number;
    satisfaction: Satisfaction;
    name: string;
    food_kind: string | null;
    thumbnail_img: string | null;
    address?: string | null;
}

interface PlacedShop extends PlaceableShop {
    isExisting: boolean;
}

type Phase = 'loading' | 'placing' | 'complete' | 'saving';
type PlacingSubPhase = 'auto_place' | 'bucket_place' | 'comparing' | 'placed';

// --- Component ---

export const BinaryPlacementFlow = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { t } = useTranslation();
    const { ratings: onboardingRatings } = useOnboarding();

    // Determine mode from route
    const isOnboarding = location.pathname.includes('onboarding');
    const routeState = location.state as { newRatings?: RelayRating[] } | null;

    // Core state
    const [phase, setPhase] = useState<Phase>('loading');
    const [placingSubPhase, setPlacingSubPhase] = useState<PlacingSubPhase>('comparing');

    // Ranked items per tier (built up during placement)
    const [rankedTiers, setRankedTiers] = useState<Record<Satisfaction, PlacedShop[]>>({
        goat: [], best: [], good: [], ok: [], bad: [],
    });

    // Queue of shops to place
    const [queue, setQueue] = useState<PlaceableShop[]>([]);
    const [currentIdx, setCurrentIdx] = useState(0);

    // Binary search state
    const [candidates, setCandidates] = useState<PlacedShop[]>([]);
    const [minIdx, setMinIdx] = useState(0);
    const [maxIdx, setMaxIdx] = useState(-1);
    const [compareIdx, setCompareIdx] = useState(0);
    const [selected, setSelected] = useState<'new' | 'existing' | null>(null);

    // Progress tracking
    const [placedCount, setPlacedCount] = useState(0);
    const totalToPlace = queue.length;

    // Skip all visibility
    const [showSkipAll, setShowSkipAll] = useState(false);

    // Saving
    const [saving, setSaving] = useState(false);

    // Track new shop IDs for batchCreate
    const newShopIdsRef = useRef<Set<number>>(new Set());

    // --- Initialize ---
    useEffect(() => {
        const init = async () => {
            let existingTiers: Record<Satisfaction, PlacedShop[]> = { goat: [], best: [], good: [], ok: [], bad: [] };
            let newRatings: PlaceableShop[] = [];

            if (isOnboarding) {
                // Onboarding: no existing rankings, use context ratings
                newRatings = onboardingRatings.map(r => ({
                    shopId: r.shopId,
                    satisfaction: r.satisfaction,
                    name: r.shop.name,
                    food_kind: r.shop.food_kind,
                    thumbnail_img: r.shop.thumbnail_img,
                    address: r.shop.address_full,
                }));
            } else {
                // Relay: load existing rankings, use route state
                const relayRatings = routeState?.newRatings || [];
                newRatings = relayRatings.map(r => ({
                    shopId: r.shopId,
                    satisfaction: r.satisfaction,
                    name: r.shop.name,
                    food_kind: r.shop.food_kind,
                    thumbnail_img: r.shop.thumbnail_img,
                    address: r.shop.address_full || r.shop.address_region,
                }));

                try {
                    const existing = await RankingService.getAll();
                    for (const item of existing) {
                        const sat: Satisfaction = TIER_FROM_NUM[item.satisfaction_tier] ?? 'good';
                        existingTiers[sat].push({
                            shopId: item.shop_id,
                            satisfaction: sat,
                            name: item.shop.name,
                            food_kind: null,
                            thumbnail_img: item.shop.thumbnail_img,
                            address: item.shop.address_region,
                            isExisting: true,
                        });
                    }
                } catch (err) {
                    console.error('Failed to load existing rankings:', err);
                }
            }

            // Track new shop IDs
            const newIds = new Set<number>();
            for (const r of newRatings) newIds.add(r.shopId);
            newShopIdsRef.current = newIds;

            // Filter out duplicates (shops already ranked)
            const existingIds = new Set<number>();
            for (const tier of TIER_ORDER) {
                for (const shop of existingTiers[tier]) existingIds.add(shop.shopId);
            }
            newRatings = newRatings.filter(r => !existingIds.has(r.shopId));

            // Build placement queue: Good first, then OK, then Bad
            const sortedQueue: PlaceableShop[] = [];
            for (const tier of TIER_ORDER) {
                sortedQueue.push(...newRatings.filter(r => r.satisfaction === tier));
            }

            setRankedTiers(existingTiers);
            setQueue(sortedQueue);

            if (sortedQueue.length === 0) {
                setPhase('complete');
            } else {
                setPhase('placing');
            }
        };

        init();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // --- Start binary search for current shop ---
    useEffect(() => {
        if (phase !== 'placing' || currentIdx >= queue.length) return;

        const shop = queue[currentIdx];
        const tierItems = rankedTiers[shop.satisfaction];
        const isBucketTier = BUCKET_TIERS.includes(shop.satisfaction);

        if (isBucketTier) {
            // Bucket tiers (GOOD/OK/BAD): no comparison, auto-place at end
            setPlacingSubPhase('bucket_place');
        } else if (tierItems.length === 0) {
            // Ranked tier but empty: auto-place
            setPlacingSubPhase('auto_place');
        } else {
            // Ranked tier (GOAT/BEST): start binary search
            setCandidates(tierItems);
            setMinIdx(0);
            setMaxIdx(tierItems.length - 1);
            setCompareIdx(Math.floor((tierItems.length - 1) / 2));
            setSelected(null);
            setPlacingSubPhase('comparing');
        }
    }, [phase, currentIdx, queue]); // eslint-disable-line react-hooks/exhaustive-deps

    // --- Auto-place timer (ranked tier, first item) ---
    useEffect(() => {
        if (placingSubPhase !== 'auto_place') return;
        const timer = setTimeout(() => placeShopAt(0), 600);
        return () => clearTimeout(timer);
    }, [placingSubPhase, currentIdx]); // eslint-disable-line react-hooks/exhaustive-deps

    // --- Bucket-place timer (GOOD/OK/BAD - no comparison, append to end) ---
    useEffect(() => {
        if (placingSubPhase !== 'bucket_place') return;
        const shop = queue[currentIdx];
        if (!shop) return;
        const tierLen = rankedTiers[shop.satisfaction].length;
        const timer = setTimeout(() => placeShopAt(tierLen), 400);
        return () => clearTimeout(timer);
    }, [placingSubPhase, currentIdx]); // eslint-disable-line react-hooks/exhaustive-deps

    // --- Place shop at index ---
    const placeShopAt = useCallback((insertIdx: number) => {
        const shop = queue[currentIdx];
        const tier = shop.satisfaction;
        const placed: PlacedShop = { ...shop, isExisting: false };

        setRankedTiers(prev => {
            const tierList = [...prev[tier]];
            tierList.splice(insertIdx, 0, placed);
            return { ...prev, [tier]: tierList };
        });

        setPlacedCount(c => c + 1);
        setPlacingSubPhase('placed');

        // Show skip-all after 3 placements
        if (placedCount + 1 >= 3) setShowSkipAll(true);

        // Advance after brief pause
        setTimeout(() => {
            const nextIdx = currentIdx + 1;
            if (nextIdx >= queue.length) {
                setPhase('complete');
            } else {
                setCurrentIdx(nextIdx);
            }
        }, 500);
    }, [currentIdx, queue, placedCount]);

    // --- Handle comparison choice ---
    const handleChoice = useCallback((choice: 'new' | 'existing') => {
        if (selected) return;
        setSelected(choice);

        setTimeout(() => {
            let newMin = minIdx;
            let newMax = maxIdx;

            if (choice === 'new') {
                // New shop is better → search higher (lower index)
                newMax = compareIdx - 1;
            } else {
                // Existing is better → search lower (higher index)
                newMin = compareIdx + 1;
            }

            if (newMin > newMax) {
                // Found insertion point
                placeShopAt(newMin);
            } else {
                // Continue binary search
                setMinIdx(newMin);
                setMaxIdx(newMax);
                setCompareIdx(Math.floor((newMin + newMax) / 2));
                setSelected(null);
            }
        }, 450);
    }, [selected, minIdx, maxIdx, compareIdx, placeShopAt]);

    // --- Skip current comparison ---
    const handleSkip = useCallback(() => {
        // Place at end of tier
        const shop = queue[currentIdx];
        const tierLen = rankedTiers[shop.satisfaction].length;
        placeShopAt(tierLen);
    }, [currentIdx, queue, rankedTiers, placeShopAt]);

    // --- Skip all remaining ---
    const handleSkipAll = useCallback(() => {
        const tiers = { ...rankedTiers };
        for (const tier of TIER_ORDER) {
            tiers[tier] = [...tiers[tier]];
        }

        for (let i = currentIdx; i < queue.length; i++) {
            const shop = queue[i];
            const placed: PlacedShop = { ...shop, isExisting: false };
            tiers[shop.satisfaction] = [...tiers[shop.satisfaction], placed];
        }

        setRankedTiers(tiers);
        setPlacedCount(queue.length);
        setPhase('complete');
    }, [currentIdx, queue, rankedTiers]);

    // --- Save ---
    const handleSave = useCallback(async () => {
        setSaving(true);
        setPhase('saving');

        try {
            // Build batch create items (only new shops)
            const batchItems: { shop_id: number; satisfaction: Satisfaction }[] = [];
            for (const tier of TIER_ORDER) {
                for (const shop of rankedTiers[tier]) {
                    if (newShopIdsRef.current.has(shop.shopId)) {
                        batchItems.push({ shop_id: shop.shopId, satisfaction: tier });
                    }
                }
            }

            // Build reorder payload (all shops)
            const reorderPayload: { shop_id: number; rank: number; satisfaction_tier: number }[] = [];
            let rank = 1;
            for (const tier of TIER_ORDER) {
                for (const shop of rankedTiers[tier]) {
                    reorderPayload.push({
                        shop_id: shop.shopId,
                        rank: rank++,
                        satisfaction_tier: TIER_NUM[tier],
                    });
                }
            }

            if (batchItems.length > 0) {
                await RankingService.batchCreate(batchItems);
            }
            if (reorderPayload.length > 0) {
                await RankingService.reorder(reorderPayload);
            }

            if (isOnboarding) {
                navigate('/onboarding/analysis', { replace: true });
            } else {
                navigate(-1);
            }
        } catch (err) {
            console.error('Failed to save ranking:', err);
            setPhase('complete');
            setSaving(false);
        }
    }, [rankedTiers, isOnboarding, navigate]);

    // --- Current shop being placed ---
    const currentShop = queue[currentIdx] ?? null;
    const currentCandidate = candidates[compareIdx] ?? null;

    // --- Tier progress ---
    const tierCounts = TIER_ORDER.map(tier => {
        const total = queue.filter(q => q.satisfaction === tier).length;
        const placed = queue.filter((q, i) => q.satisfaction === tier && i < currentIdx).length + (currentShop?.satisfaction === tier && placingSubPhase === 'placed' ? 1 : 0);
        return { tier, total, placed };
    }).filter(tc => tc.total > 0);

    // --- Render ---
    if (phase === 'loading') {
        return (
            <div className="flex flex-col items-center justify-center h-full gap-4">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-background pt-safe-offset-0 pb-safe-offset-6">
            {/* Header */}
            <div className="flex items-center px-4 py-3">
                <button onClick={() => navigate(-1)} className="p-2 -ml-2">
                    <ArrowLeft className="w-6 h-6" />
                </button>
                <h1 className="flex-1 text-center text-lg font-bold">
                    {t('ranking.placement.title', '순위 배치')}
                </h1>
                {phase === 'placing' && (
                    <span className="text-sm text-muted-foreground font-medium pr-2">
                        {Math.min(currentIdx + 1, totalToPlace)}/{totalToPlace}
                    </span>
                )}
                {phase !== 'placing' && <div className="w-10" />}
            </div>

            {/* Progress bar */}
            {phase === 'placing' && (
                <div className="px-6 pb-3">
                    <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden mb-2">
                        <motion.div
                            className="h-full bg-primary rounded-full"
                            animate={{ width: `${(placedCount / totalToPlace) * 100}%` }}
                            transition={{ duration: 0.3 }}
                        />
                    </div>
                    <div className="flex gap-3 text-xs text-muted-foreground">
                        {tierCounts.map(tc => (
                            <span key={tc.tier} className={cn(TIER_COLOR[tc.tier], 'font-medium')}>
                                {TIER_LABEL[tc.tier]} {tc.placed}/{tc.total}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {/* Content */}
            <div className="flex-1 flex flex-col items-center justify-center px-6 overflow-hidden">
                <AnimatePresence mode="wait">
                    {/* --- PLACING: Bucket-place (GOOD/OK/BAD) --- */}
                    {phase === 'placing' && placingSubPhase === 'bucket_place' && currentShop && (
                        <motion.div
                            key={`bucket-${currentShop.shopId}`}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="flex flex-col items-center gap-4"
                        >
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: [0, 1.2, 1] }}
                                transition={{ duration: 0.4 }}
                                className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center"
                            >
                                <Check className="w-7 h-7 text-primary" />
                            </motion.div>
                            <p className="text-lg font-bold">{currentShop.name}</p>
                            <p className="text-sm text-muted-foreground">
                                <span className={cn('font-bold', TIER_COLOR[currentShop.satisfaction])}>
                                    {TIER_LABEL[currentShop.satisfaction]}
                                </span>
                                {' '}
                                {t('ranking.placement.added_to_bucket', '추가됨')}
                            </p>
                        </motion.div>
                    )}

                    {/* --- PLACING: Auto-place (ranked tier, first item) --- */}
                    {phase === 'placing' && placingSubPhase === 'auto_place' && currentShop && (
                        <motion.div
                            key={`auto-${currentShop.shopId}`}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="flex flex-col items-center gap-4"
                        >
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: [0, 1.2, 1] }}
                                transition={{ duration: 0.4 }}
                                className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center"
                            >
                                <Check className="w-7 h-7 text-primary" />
                            </motion.div>
                            <p className="text-lg font-bold">{currentShop.name}</p>
                            <p className="text-sm text-muted-foreground">
                                <span className={cn('font-bold', TIER_COLOR[currentShop.satisfaction])}>
                                    {TIER_LABEL[currentShop.satisfaction]}
                                </span>
                                {' '}
                                {t('ranking.placement.first_in_tier', '첫 번째!')}
                            </p>
                        </motion.div>
                    )}

                    {/* --- PLACING: Comparing --- */}
                    {phase === 'placing' && placingSubPhase === 'comparing' && currentShop && currentCandidate && (
                        <motion.div
                            key={`compare-${currentShop.shopId}-${currentCandidate.shopId}-${compareIdx}`}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.25 }}
                            className="flex flex-col items-center w-full max-w-md"
                        >
                            <h2 className="text-lg font-bold mb-4">
                                {t('ranking.placement.which_better', '어디가 더 좋았어요?')}
                            </h2>

                            {/* New shop card */}
                            <motion.button
                                onClick={() => handleChoice('new')}
                                disabled={!!selected}
                                className={cn(
                                    "w-full rounded-2xl overflow-hidden bg-white shadow-lg border-2 transition-colors duration-300",
                                    selected === 'new' ? 'border-primary' : 'border-primary/40'
                                )}
                                animate={
                                    selected === 'new'
                                        ? { scale: 1.02, opacity: 1 }
                                        : selected === 'existing'
                                            ? { scale: 0.95, opacity: 0.4 }
                                            : { scale: 1, opacity: 1 }
                                }
                                transition={{ duration: 0.3 }}
                            >
                                <ComparisonCard shop={currentShop} isNew />
                                {/* Winner overlay */}
                                <AnimatePresence>
                                    {selected === 'new' && (
                                        <motion.div
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            className="absolute inset-0 flex items-center justify-center bg-primary/15 rounded-2xl"
                                        >
                                            <motion.div
                                                initial={{ scale: 0 }}
                                                animate={{ scale: [0, 1.3, 1] }}
                                                transition={{ duration: 0.3 }}
                                                className="w-12 h-12 rounded-full bg-primary flex items-center justify-center shadow-lg"
                                            >
                                                <Check className="w-6 h-6 text-white" />
                                            </motion.div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.button>

                            {/* VS badge */}
                            <motion.div
                                className="z-20 -my-2 pointer-events-none"
                                animate={{ opacity: selected ? 0 : 1, scale: selected ? 0.5 : 1 }}
                                transition={{ duration: 0.3 }}
                            >
                                <div className="bg-foreground text-background font-black text-sm w-10 h-10 rounded-full shadow-lg border-2 border-white flex items-center justify-center">
                                    VS
                                </div>
                            </motion.div>

                            {/* Existing shop card */}
                            <motion.button
                                onClick={() => handleChoice('existing')}
                                disabled={!!selected}
                                className={cn(
                                    "w-full rounded-2xl overflow-hidden bg-white shadow-lg border-2 transition-colors duration-300",
                                    selected === 'existing' ? 'border-primary' : 'border-transparent'
                                )}
                                animate={
                                    selected === 'existing'
                                        ? { scale: 1.02, opacity: 1 }
                                        : selected === 'new'
                                            ? { scale: 0.95, opacity: 0.4 }
                                            : { scale: 1, opacity: 1 }
                                }
                                transition={{ duration: 0.3 }}
                            >
                                <ComparisonCard shop={currentCandidate} />
                                <AnimatePresence>
                                    {selected === 'existing' && (
                                        <motion.div
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            className="absolute inset-0 flex items-center justify-center bg-primary/15 rounded-2xl"
                                        >
                                            <motion.div
                                                initial={{ scale: 0 }}
                                                animate={{ scale: [0, 1.3, 1] }}
                                                transition={{ duration: 0.3 }}
                                                className="w-12 h-12 rounded-full bg-primary flex items-center justify-center shadow-lg"
                                            >
                                                <Check className="w-6 h-6 text-white" />
                                            </motion.div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.button>

                            {/* Skip */}
                            <button
                                onClick={handleSkip}
                                disabled={!!selected}
                                className={cn(
                                    "py-3 px-6 text-sm text-gray-400 transition-colors mt-2",
                                    !selected && "hover:text-gray-500 active:text-gray-600",
                                    selected && "opacity-50"
                                )}
                            >
                                {t('ranking.placement.skip', '건너뛰기')}
                            </button>
                        </motion.div>
                    )}

                    {/* --- PLACING: Placed confirmation --- */}
                    {phase === 'placing' && placingSubPhase === 'placed' && currentShop && (
                        <motion.div
                            key={`placed-${currentShop.shopId}`}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0 }}
                            className="flex flex-col items-center gap-3"
                        >
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: [0, 1.2, 1] }}
                                transition={{ duration: 0.3 }}
                                className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center"
                            >
                                <Check className="w-6 h-6 text-green-600" />
                            </motion.div>
                            <p className="font-bold">{currentShop.name}</p>
                            <p className="text-sm text-muted-foreground">
                                {t('ranking.placement.placed', '배치 완료')}
                            </p>
                        </motion.div>
                    )}

                    {/* --- COMPLETE --- */}
                    {phase === 'complete' && (
                        <motion.div
                            key="complete"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex flex-col items-center gap-6 w-full"
                        >
                            <span className="text-5xl">
                                {totalToPlace === 0 ? '📋' : '🎉'}
                            </span>
                            <div className="text-center">
                                <h2 className="text-xl font-bold mb-2">
                                    {totalToPlace === 0
                                        ? t('ranking.placement.nothing_to_place', '배치할 맛집이 없어요')
                                        : t('ranking.placement.complete_title', '순위 배치 완료!')}
                                </h2>
                                {totalToPlace > 0 && (
                                    <p className="text-muted-foreground">
                                        {t('ranking.placement.complete_desc', '{{count}}개 맛집의 순위를 정했어요', { count: totalToPlace })}
                                    </p>
                                )}
                            </div>

                            {totalToPlace > 0 && (
                                <div className="flex gap-3">
                                    {TIER_ORDER.map(tier => {
                                        const count = rankedTiers[tier].filter(s => !s.isExisting).length;
                                        if (count === 0) return null;
                                        return (
                                            <span key={tier} className={cn('text-sm font-bold', TIER_COLOR[tier])}>
                                                {TIER_LABEL[tier]} {count}
                                            </span>
                                        );
                                    })}
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Bottom buttons */}
            <div className="px-6 pt-3 pb-4 space-y-2">
                {phase === 'placing' && showSkipAll && placingSubPhase === 'comparing' && (
                    <button
                        onClick={handleSkipAll}
                        className="w-full text-sm text-muted-foreground py-2 hover:text-foreground transition-colors"
                    >
                        {t('ranking.placement.skip_all', '나머지 자동 배치')}
                    </button>
                )}

                {phase === 'complete' && (
                    <Button
                        size="lg"
                        className="w-full text-lg py-6 rounded-full"
                        onClick={handleSave}
                        disabled={saving}
                    >
                        {saving ? (
                            <span className="flex items-center gap-2">
                                <Loader2 className="w-5 h-5 animate-spin" />
                                {t('common.saving', '저장 중...')}
                            </span>
                        ) : (
                            isOnboarding
                                ? t('ranking.placement.save_and_analyze', '저장하고 분석받기')
                                : t('ranking.placement.save', '저장하기')
                        )}
                    </Button>
                )}
            </div>

            {/* Saving overlay */}
            {saving && (
                <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center">
                    <div className="bg-white rounded-2xl p-6 flex flex-col items-center gap-3 shadow-xl">
                        <Loader2 className="w-8 h-8 text-primary animate-spin" />
                        <p className="text-sm font-medium">{t('common.saving', '저장 중...')}</p>
                    </div>
                </div>
            )}
        </div>
    );
};

// --- Comparison Card ---

const ComparisonCard = ({
    shop,
    isNew = false,
}: {
    shop: PlaceableShop | PlacedShop;
    isNew?: boolean;
}) => {
    return (
        <div className="flex flex-col relative">
            {/* Image */}
            <div className="h-32 relative bg-gray-100">
                {shop.thumbnail_img ? (
                    <img
                        src={shop.thumbnail_img}
                        alt={shop.name}
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                        <span className="text-4xl">🍽️</span>
                    </div>
                )}

                {/* NEW badge */}
                {isNew && (
                    <div className="absolute top-0 left-0 bg-primary text-white text-xs px-2 py-1 rounded-br-lg font-bold">
                        NEW
                    </div>
                )}
            </div>

            {/* Info */}
            <div className="px-4 py-3 bg-white text-left">
                <div className="flex items-center gap-2 mb-0.5">
                    <h3 className="text-lg font-bold truncate">{shop.name}</h3>
                    {shop.food_kind && (
                        <span className="text-xs text-muted-foreground font-medium px-1.5 py-0.5 bg-muted rounded flex-shrink-0">
                            {formatFoodKind(shop.food_kind)}
                        </span>
                    )}
                </div>
                {shop.address && (
                    <div className="flex items-center text-xs text-muted-foreground">
                        <MapPin className="w-3 h-3 mr-1 flex-shrink-0" />
                        <span className="truncate">{shop.address}</span>
                    </div>
                )}
            </div>
        </div>
    );
};
