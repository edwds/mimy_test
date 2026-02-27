import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, PlusCircle, Bookmark, Star } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn, scoreToTasteRatingStep } from '@/lib/utils';
import { API_BASE_URL } from '@/lib/api';
import { authFetch } from '@/lib/authFetch';
import { useRanking } from '@/context/RankingContext';
import { useUser } from '@/context/UserContext';

export interface ShopInfoCardProps {
    shop: {
        id: number;
        name: string;
        address?: string;
        thumbnail_img?: string;
        food_kind?: string;
        address_region?: string;
    };
    distance?: string;
    initialIsBookmarked?: boolean;
    my_review_stats?: any;
    matchScore?: number | null;
    showActions?: boolean;
    onClick?: () => void;
    className?: string;
    darkMode?: boolean;
    sourceUserId?: number; // 다른 유저의 콘텐츠에서 저장 시 해당 유저 ID
}

export const ShopInfoCard = ({
    shop,
    distance: _distance,
    initialIsBookmarked = false,
    my_review_stats,
    matchScore,
    showActions = true,
    onClick,
    className,
    darkMode = false,
    sourceUserId
}: ShopInfoCardProps) => {
    const navigate = useNavigate();
    const { openRanking } = useRanking();
    const { refreshSavedShops } = useUser();
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
            // sourceUserId가 있으면 해당 유저 ID를 channel로, 없으면 'discovery'
            const channel = sourceUserId ? String(sourceUserId) : 'discovery';
            const res = await authFetch(`${API_BASE_URL}/api/shops/${shop.id}/save`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ channel })
            });

            if (res.ok) {
                const data = await res.json();
                if (typeof data.is_saved === 'boolean') {
                    setIsBookmarked(data.is_saved);
                    // Context의 savedShops 갱신
                    refreshSavedShops();
                }
            } else {
                setIsBookmarked(prevBookmarked);
            }
        } catch (e) {
            console.error(e);
            setIsBookmarked(prevBookmarked);
        }
    };

    return (
        <div
            className={cn(
                "p-3 rounded-xl flex items-center gap-3 active:bg-gray-100 transition-colors relative cursor-pointer",
                darkMode ? "bg-gray-900/95 active:bg-gray-800" : "bg-gray-50",
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
                {/* Shop Name */}
                <h3 className={cn(
                    "font-bold text-[15px] leading-tight truncate",
                    darkMode ? "text-white" : "text-gray-900"
                )}>
                    {shop.name}
                </h3>

                {/* My Ranking or Match Score */}
                {my_review_stats ? (() => {
                    const tier = my_review_stats.satisfaction;
                    const label = tier === 2 ? '맛있어요' : tier === 1 ? '괜찮아요' : '별로예요';
                    const color = tier === 2
                        ? (darkMode ? 'text-orange-400' : 'text-orange-500')
                        : (darkMode ? 'text-gray-400' : 'text-gray-500');
                    return (
                        <div className={cn("flex items-center gap-0.5 text-[12px]", color)}>
                            <span>{label}</span>
                            {typeof my_review_stats.rank === 'number' && (
                                <span className="font-bold">{my_review_stats.rank}위</span>
                            )}
                        </div>
                    );
                })() : matchScore != null && matchScore >= 0 && (
                    <div className={cn(
                        "flex items-center gap-0.5 text-[12px]",
                        darkMode ? "text-orange-400" : "text-orange-500"
                    )}>
                        <Star size={12} className="fill-current" />
                        <span>예상 평가</span>
                        <span className="font-bold">{scoreToTasteRatingStep(matchScore).toFixed(2)}</span>
                    </div>
                )}
            </div>

            {/* Actions */}
            {showActions && (
                <div className="flex items-center gap-3 flex-shrink-0">
                    {/* Evaluate Button */}
                    <motion.button
                        whileTap={{ scale: 0.85 }}
                        onClick={handleEvaluate}
                        className={cn(
                            'transition-colors p-1',
                            my_review_stats
                                ? (darkMode ? "text-orange-500" : "text-primary")
                                : (darkMode ? "text-gray-500 hover:text-gray-300" : "text-gray-400 hover:text-gray-600")
                        )}
                        aria-label="Evaluate"
                    >
                        {my_review_stats ? (
                            <Check size={26} />
                        ) : (
                            <PlusCircle size={26} />
                        )}
                    </motion.button>

                    {/* Bookmark Button */}
                    <motion.button
                        whileTap={{ scale: 0.85 }}
                        onClick={handleBookmark}
                        className={cn(
                            'transition-colors p-1',
                            isBookmarked
                                ? 'text-orange-600'
                                : (darkMode ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600')
                        )}
                        aria-label="Bookmark shop"
                    >
                        <motion.div
                            initial={false}
                            animate={{ scale: isBookmarked ? [1, 1.4, 1] : 1 }}
                            transition={{ duration: 0.3 }}
                        >
                            <Bookmark size={26} className={cn(isBookmarked && 'fill-orange-600')} />
                        </motion.div>
                    </motion.button>
                </div>
            )}
        </div>
    );
};
