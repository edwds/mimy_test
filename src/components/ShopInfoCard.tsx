import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Check, PlusCircle, Bookmark } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { API_BASE_URL } from '@/lib/api';
import { authFetch } from '@/lib/authFetch';
import { useRanking } from '@/context/RankingContext';

export interface ShopInfoCardProps {
    shop: {
        id: number;
        name: string;
        address?: string;
        thumbnail_img?: string;
        food_kind?: string;
        address_region?: string;
    };
    rank?: number;
    satisfaction?: 'good' | 'ok' | 'bad';
    visitCount?: number;
    distance?: string;
    initialIsBookmarked?: boolean;
    my_review_stats?: any;
    showActions?: boolean;
    onClick?: () => void;
    className?: string;
}

export const ShopInfoCard = ({
    shop,
    rank,
    satisfaction,
    visitCount,
    distance,
    initialIsBookmarked = false,
    my_review_stats,
    showActions = true,
    onClick,
    className
}: ShopInfoCardProps) => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { openRanking } = useRanking();
    const [isBookmarked, setIsBookmarked] = useState(initialIsBookmarked);

    const handleCardClick = (e: React.MouseEvent) => {
        if (onClick) {
            onClick();
        } else {
            e.stopPropagation();
            const current = new URLSearchParams(window.location.search);
            current.set('viewShop', String(shop.id));
            navigate({ search: current.toString() });
        }
    };

    const handleEvaluate = async (e: React.MouseEvent) => {
        e.stopPropagation();
        openRanking({ ...shop, my_review_stats });
    };

    const handleBookmark = async (e: React.MouseEvent) => {
        e.stopPropagation();
        const prevBookmarked = isBookmarked;
        setIsBookmarked(!prevBookmarked);

        try {
            const res = await authFetch(`${API_BASE_URL}/api/shops/${shop.id}/save`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({})
            });

            if (res.ok) {
                const data = await res.json();
                if (typeof data.is_saved === 'boolean') {
                    setIsBookmarked(data.is_saved);
                }
            } else {
                setIsBookmarked(prevBookmarked);
            }
        } catch (e) {
            console.error(e);
            setIsBookmarked(prevBookmarked);
        }
    };

    const getRankBadgeColor = () => {
        if (!satisfaction) return 'text-gray-500 border-gray-100 bg-gray-50/50';
        return satisfaction === 'good'
            ? 'text-orange-600 border-orange-100 bg-orange-50/50'
            : 'text-gray-500 border-gray-100 bg-gray-50/50';
    };

    return (
        <div
            className={cn(
                "p-3 bg-gray-50 rounded-xl flex items-center gap-3 active:bg-gray-100 transition-colors relative cursor-pointer",
                className
            )}
            onClick={handleCardClick}
        >
            {/* Thumbnail */}
            <div className="w-16 h-16 rounded-xl bg-gray-100 overflow-hidden flex-shrink-0 relative border border-gray-100">
                {shop.thumbnail_img ? (
                    <img src={shop.thumbnail_img} alt={shop.name} className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300">
                        <div className="w-2 h-2 rounded-full bg-gray-300" />
                    </div>
                )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0 flex flex-col gap-1">
                {/* Top: Name & Badge */}
                <div className="flex items-center gap-2">
                    <h3 className="font-bold text-[15px] text-gray-900 leading-tight truncate">
                        {shop.name}
                    </h3>
                    {(rank || satisfaction) && (
                        <span className={cn(
                            "font-bold px-1.5 py-0.5 rounded border text-[11px] whitespace-nowrap flex-shrink-0",
                            getRankBadgeColor()
                        )}>
                            {satisfaction && t(`write.basic.${satisfaction}`)}
                            {satisfaction && rank && <span className="opacity-20 mx-0.5">|</span>}
                            {rank && `#${rank}`}
                        </span>
                    )}
                </div>

                {/* Bottom: Address & Visit & Distance */}
                <div className="flex items-center text-[13px] text-gray-500 gap-1">
                    {shop.address && <span className="truncate">{shop.address}</span>}
                    {!shop.address && shop.address_region && (
                        <span className="truncate">{shop.address_region}</span>
                    )}
                    {visitCount && (
                        <>
                            <span className="mx-1 opacity-30">|</span>
                            <span>{visitCount}{t('content.visit_info.nth', 'th visit')}</span>
                        </>
                    )}
                    {distance && (
                        <>
                            <span className="mx-1 opacity-30">|</span>
                            <span>{distance}</span>
                        </>
                    )}
                </div>
            </div>

            {/* Actions */}
            {showActions && (
                <div className="flex items-center gap-1 flex-shrink-0">
                    {/* Evaluate Button */}
                    <motion.button
                        whileTap={{ scale: 0.85 }}
                        onClick={handleEvaluate}
                        className={cn(
                            'transition-colors p-1',
                            my_review_stats ? "text-primary" : "text-gray-400 hover:text-gray-600"
                        )}
                        aria-label="Evaluate"
                    >
                        {my_review_stats ? (
                            <Check size={22} />
                        ) : (
                            <PlusCircle size={22} />
                        )}
                    </motion.button>

                    {/* Bookmark Button */}
                    <motion.button
                        whileTap={{ scale: 0.85 }}
                        onClick={handleBookmark}
                        className={cn(
                            'transition-colors p-1',
                            isBookmarked ? 'text-orange-600' : 'text-gray-400 hover:text-gray-600'
                        )}
                        aria-label="Bookmark shop"
                    >
                        <motion.div
                            initial={false}
                            animate={{ scale: isBookmarked ? [1, 1.4, 1] : 1 }}
                            transition={{ duration: 0.3 }}
                        >
                            <Bookmark size={22} className={cn(isBookmarked && 'fill-orange-600')} />
                        </motion.div>
                    </motion.button>
                </div>
            )}
        </div>
    );
};
