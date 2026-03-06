import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Crown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { formatFoodKind } from '@/lib/foodKindMap';
import { type Satisfaction, TIER_COLOR, TIER_BG } from '@/services/RankingService';

// --- Types ---

export interface PlacementShop {
    shopId: number;
    shopName: string;
    photo_url?: string | null;
    food_kind?: string | null;
    region?: string | null;
}

interface PlacementOverlayProps {
    newShop: PlacementShop;
    tier: Satisfaction;
    tierShops: PlacementShop[]; // existing shops in this tier, ordered best→worst
    tierOffset: number; // number of shops ranked above this tier (for global rank display)
    onPlaced: (insertIndex: number) => void;
    onSkip: () => void; // skip = place at bottom of tier
}

// --- Component ---

export const PlacementOverlay = ({
    newShop,
    tier,
    tierShops,
    tierOffset,
    onPlaced,
    onSkip,
}: PlacementOverlayProps) => {
    const { t } = useTranslation();

    // Binary search state
    const [low, setLow] = useState(0);
    const [high, setHigh] = useState(tierShops.length);
    const [mid, setMid] = useState(Math.floor(tierShops.length / 2));
    const [isAutoPlacing] = useState(tierShops.length === 0);
    const [selected, setSelected] = useState<'A' | 'B' | null>(null);
    const [placed, setPlaced] = useState(false);
    const [placedIndex, setPlacedIndex] = useState(-1);

    // Auto-place when tier is empty
    useEffect(() => {
        if (isAutoPlacing) {
            const timer = setTimeout(() => {
                setPlacedIndex(0);
                setPlaced(true);
                setTimeout(() => onPlaced(0), 800);
            }, 300);
            return () => clearTimeout(timer);
        }
    }, [isAutoPlacing, onPlaced]);

    // Recalc mid when bounds change
    useEffect(() => {
        setMid(Math.floor((low + high) / 2));
    }, [low, high]);

    // Handle selection (A = new shop, B = existing shop)
    const handleSelect = useCallback((side: 'A' | 'B') => {
        if (placed || selected) return;
        setSelected(side);

        const pickedNew = side === 'A';

        setTimeout(() => {
            let newLow = low;
            let newHigh = high;

            if (pickedNew) {
                newHigh = mid;
            } else {
                newLow = mid + 1;
            }

            if (newLow >= newHigh) {
                const idx = newLow;
                setPlacedIndex(idx);
                setPlaced(true);
                setTimeout(() => onPlaced(idx), 800);
            } else {
                setLow(newLow);
                setHigh(newHigh);
                setSelected(null);
            }
        }, 500);
    }, [low, high, mid, placed, selected, onPlaced]);

    const comparisonShop = tierShops[mid];
    const tierColor = TIER_COLOR[tier];
    const tierBg = TIER_BG[tier];

    // Auto-place: brief confirmation
    if (isAutoPlacing) {
        return (
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, transition: { duration: 0.25, ease: 'easeIn' } }}
                className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
            >
                <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                    className="text-center"
                >
                    <div className={cn("inline-flex items-center gap-2 px-6 py-3.5 rounded-full text-lg font-bold shadow-lg", tierBg, tierColor)}>
                        <Crown className="w-5 h-5" />
                        {tierOffset + 1}{t('relay.placement.rank_suffix', '위')}
                    </div>
                </motion.div>
            </motion.div>
        );
    }

    // Comparison UI — same layout as RelayComparison
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.25, ease: 'easeIn' } }}
            className="fixed inset-0 bg-background flex flex-col items-center justify-center z-50 pt-safe-offset-6 pb-safe-offset-6"
        >
            {/* Background blur overlay - fades out on enter */}
            <motion.div
                className="absolute inset-0 bg-white/60 backdrop-blur-md z-30 pointer-events-none"
                initial={{ opacity: 1 }}
                animate={{ opacity: 0 }}
                transition={{ duration: 0.5, delay: 0.1, ease: 'easeOut' }}
            />

            {/* Prompt */}
            <div className="text-center mb-3 z-40">
                <h2 className="text-xl font-bold mb-1">
                    {t('relay.comparison_title', '어디가 더 좋았어요?')}
                </h2>
            </div>

            {/* Two half-height cards stacked vertically */}
            <div className="flex flex-col items-center w-full max-w-md px-4 z-40">
                {/* New shop (top) */}
                <motion.button
                    onClick={() => handleSelect('A')}
                    disabled={!!selected || placed}
                    className={cn(
                        "w-full rounded-3xl overflow-hidden bg-white shadow-lg border-2 transition-colors duration-300",
                        selected === 'A' ? 'border-primary' : 'border-transparent'
                    )}
                    animate={
                        placed
                            ? { scale: 0.95, opacity: 0.3, filter: 'blur(4px)' }
                            : selected === 'A'
                                ? { scale: 1.02, opacity: 1 }
                                : selected === 'B'
                                    ? { scale: 0.95, opacity: 0.4, filter: 'blur(2px)' }
                                    : { scale: 1, opacity: 1, filter: 'blur(0px)' }
                    }
                    transition={{ duration: 0.35, ease: 'easeOut' }}
                >
                    <HalfCard shop={newShop} isWinner={!placed && selected === 'A'} rank={null} />
                </motion.button>

                {/* VS Badge */}
                <motion.div
                    className="z-20 -my-2 pointer-events-none"
                    animate={{ opacity: selected || placed ? 0 : 1, scale: selected || placed ? 0.5 : 1 }}
                    transition={{ duration: 0.3 }}
                >
                    <div className="bg-foreground text-background font-black text-base w-11 h-11 rounded-full shadow-lg border-2 border-white flex items-center justify-center">
                        VS
                    </div>
                </motion.div>

                {/* Existing shop (bottom) */}
                {comparisonShop && (
                    <motion.button
                        onClick={() => handleSelect('B')}
                        disabled={!!selected || placed}
                        className={cn(
                            "w-full rounded-3xl overflow-hidden bg-white shadow-lg border-2 transition-colors duration-300",
                            selected === 'B' ? 'border-primary' : 'border-transparent'
                        )}
                        animate={
                            placed
                                ? { scale: 0.95, opacity: 0.3, filter: 'blur(4px)' }
                                : selected === 'B'
                                    ? { scale: 1.02, opacity: 1 }
                                    : selected === 'A'
                                        ? { scale: 0.95, opacity: 0.4, filter: 'blur(2px)' }
                                        : { scale: 1, opacity: 1, filter: 'blur(0px)' }
                        }
                        transition={{ duration: 0.35, ease: 'easeOut' }}
                    >
                        <HalfCard shop={comparisonShop} isWinner={!placed && selected === 'B'} rank={tierOffset + mid + 1} />
                    </motion.button>
                )}
            </div>

            {/* Skip button */}
            <button
                onClick={onSkip}
                disabled={!!selected || placed}
                className={cn(
                    "py-3 px-6 text-sm text-gray-400 transition-colors mt-2 z-40",
                    !selected && !placed && "hover:text-gray-500 active:text-gray-600",
                    (selected || placed) && "opacity-50"
                )}
            >
                {t('relay.comparison_skip', '건너뛰기')}
            </button>

            {/* Rank overlay - shows on top of comparison cards */}
            <AnimatePresence>
                {placed && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="absolute inset-0 flex items-center justify-center z-50 pointer-events-none"
                    >
                        <motion.div
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                            className="text-center"
                        >
                            <div className={cn("inline-flex items-center gap-2 px-6 py-3.5 rounded-full text-lg font-bold shadow-lg", tierBg, tierColor)}>
                                <Crown className="w-5 h-5" />
                                {tierOffset + placedIndex + 1}{t('relay.placement.rank_suffix', '위')}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

// --- HalfCard: same design as RelayComparison's HalfCard ---

const HalfCard = ({
    shop,
    isWinner,
    rank,
}: {
    shop: PlacementShop;
    isWinner: boolean;
    rank: number | null;
}) => {
    return (
        <div className="flex flex-col relative">
            {/* Image area */}
            <div className="h-36 relative bg-gray-100">
                {shop.photo_url ? (
                    <img
                        src={shop.photo_url}
                        alt={shop.shopName}
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                        <span className="text-4xl">🍽️</span>
                    </div>
                )}

                {/* Rank badge */}
                {rank !== null && (
                    <div className="absolute left-3 bottom-3">
                        <div className="text-xs font-bold text-white bg-black/60 px-2.5 py-1 rounded-full border border-white/20 backdrop-blur-md flex items-center gap-1">
                            <Crown className="w-3 h-3" />
                            <span>{rank}위</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Info bar */}
            <div className="px-4 py-3 bg-white text-left">
                <div className="flex items-center gap-2 mb-0.5">
                    <h3 className="text-lg font-bold truncate">{shop.shopName}</h3>
                    {shop.food_kind && (
                        <span className="text-xs text-muted-foreground font-medium px-1.5 py-0.5 bg-muted rounded flex-shrink-0">
                            {formatFoodKind(shop.food_kind)}
                        </span>
                    )}
                </div>
                <div className="flex items-center text-xs text-muted-foreground">
                    <MapPin className="w-3 h-3 mr-1 flex-shrink-0" />
                    <span className="truncate">
                        {shop.region || '주소 정보 없음'}
                    </span>
                </div>
            </div>

            {/* Winner overlay */}
            <AnimatePresence>
                {isWinner && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="absolute inset-0 flex items-center justify-center bg-primary/15 rounded-3xl"
                    >
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: [0, 1.3, 1] }}
                            transition={{ duration: 0.3 }}
                            className="w-14 h-14 rounded-full bg-primary flex items-center justify-center shadow-lg"
                        >
                            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
