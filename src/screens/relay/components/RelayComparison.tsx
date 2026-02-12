import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { formatFoodKind } from '@/lib/foodKindMap';
import { scoreToTasteRatingStep } from '@/lib/utils';
import { RelayRating } from '../RelayScreen';

interface RelayComparisonProps {
    shopA: RelayRating;
    shopB: RelayRating;
    onSelect: (winnerId: number) => void;
    onSkip: () => void;
}

export const RelayComparison = ({
    shopA,
    shopB,
    onSelect,
    onSkip
}: RelayComparisonProps) => {
    const { t } = useTranslation();
    const [selected, setSelected] = useState<'A' | 'B' | null>(null);

    const handleSelect = (side: 'A' | 'B') => {
        if (selected) return;
        setSelected(side);

        const winnerId = side === 'A' ? shopA.shopId : shopB.shopId;

        setTimeout(() => {
            onSelect(winnerId);
        }, 500);
    };

    const shopAData = shopA.shop;
    const shopBData = shopB.shop;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col items-center justify-center w-full h-full relative"
        >
            {/* Background blur overlay - fades out on enter */}
            <motion.div
                className="absolute inset-0 bg-white/60 backdrop-blur-md z-30 pointer-events-none"
                initial={{ opacity: 1 }}
                animate={{ opacity: 0 }}
                transition={{ duration: 0.5, delay: 0.1, ease: 'easeOut' }}
            />

            {/* Prompt */}
            <div className="text-center mb-3">
                <h2 className="text-xl font-bold mb-1">
                    {t('relay.comparison_title', '어디가 더 좋았어요?')}
                </h2>
            </div>

            {/* Two half-height swipe-style cards stacked vertically */}
            <div className="flex flex-col items-center w-full max-w-md px-4">
                {/* Shop A (top) */}
                <motion.button
                    onClick={() => handleSelect('A')}
                    disabled={!!selected}
                    className={cn(
                        "w-full rounded-3xl overflow-hidden bg-white shadow-lg border-2 transition-colors duration-300",
                        selected === 'A' ? 'border-primary' : 'border-transparent'
                    )}
                    animate={
                        selected === 'A'
                            ? { scale: 1.02, opacity: 1 }
                            : selected === 'B'
                                ? { scale: 0.95, opacity: 0.4, filter: 'blur(2px)' }
                                : { scale: 1, opacity: 1, filter: 'blur(0px)' }
                    }
                    transition={{ duration: 0.35, ease: 'easeOut' }}
                >
                    <HalfCard shop={shopAData} isWinner={selected === 'A'} />
                </motion.button>

                {/* VS Badge */}
                <motion.div
                    className="z-20 -my-2 pointer-events-none"
                    animate={{ opacity: selected ? 0 : 1, scale: selected ? 0.5 : 1 }}
                    transition={{ duration: 0.3 }}
                >
                    <div className="bg-foreground text-background font-black text-base w-11 h-11 rounded-full shadow-lg border-2 border-white flex items-center justify-center">
                        VS
                    </div>
                </motion.div>

                {/* Shop B (bottom) */}
                <motion.button
                    onClick={() => handleSelect('B')}
                    disabled={!!selected}
                    className={cn(
                        "w-full rounded-3xl overflow-hidden bg-white shadow-lg border-2 transition-colors duration-300",
                        selected === 'B' ? 'border-primary' : 'border-transparent'
                    )}
                    animate={
                        selected === 'B'
                            ? { scale: 1.02, opacity: 1 }
                            : selected === 'A'
                                ? { scale: 0.95, opacity: 0.4, filter: 'blur(2px)' }
                                : { scale: 1, opacity: 1, filter: 'blur(0px)' }
                    }
                    transition={{ duration: 0.35, ease: 'easeOut' }}
                >
                    <HalfCard shop={shopBData} isWinner={selected === 'B'} />
                </motion.button>
            </div>

            {/* Skip button */}
            <button
                onClick={onSkip}
                disabled={!!selected}
                className={cn(
                    "py-3 px-6 text-sm text-gray-400 transition-colors mt-2",
                    !selected && "hover:text-gray-500 active:text-gray-600",
                    selected && "opacity-50"
                )}
            >
                {t('relay.comparison_skip', '건너뛰기')}
            </button>
        </motion.div>
    );
};

// Half-height version of RelayCard: image area + info bar
const HalfCard = ({
    shop,
    isWinner
}: {
    shop: RelayRating['shop'];
    isWinner: boolean;
}) => {
    const { t } = useTranslation();

    return (
        <div className="flex flex-col relative">
            {/* Image area - fixed height, half of original swipe card */}
            <div className="h-36 relative bg-gray-100">
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

                {/* Match score badge */}
                {shop.shop_user_match_score != null && (
                    <div className="absolute left-3 bottom-3">
                        <div className="text-xs font-medium text-white bg-black/60 px-2 py-1 rounded-full border border-white/20 flex items-center gap-1 backdrop-blur-md">
                            <span>{t('relay.expected_rating', '예상 평가')}</span>
                            <span className="text-orange-400 font-bold">
                                {scoreToTasteRatingStep(shop.shop_user_match_score).toFixed(2)}
                            </span>
                        </div>
                    </div>
                )}
            </div>

            {/* Info bar */}
            <div className="px-4 py-3 bg-white text-left">
                <div className="flex items-center gap-2 mb-0.5">
                    <h3 className="text-lg font-bold truncate">{shop.name}</h3>
                    {shop.food_kind && (
                        <span className="text-xs text-muted-foreground font-medium px-1.5 py-0.5 bg-muted rounded flex-shrink-0">
                            {formatFoodKind(shop.food_kind)}
                        </span>
                    )}
                </div>
                <div className="flex items-center text-xs text-muted-foreground">
                    <MapPin className="w-3 h-3 mr-1 flex-shrink-0" />
                    <span className="truncate">
                        {shop.address_full || shop.address_region || '주소 정보 없음'}
                    </span>
                    {shop.distance_km > 0 && (
                        <span className="ml-2 flex-shrink-0">({shop.distance_km}km)</span>
                    )}
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
