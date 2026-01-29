import React from 'react';
import { MapPin, Bookmark, Check, Plus, HelpCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn, formatVisitDate, calculateTasteMatch, getTasteBadgeStyle, scoreToTasteRatingStep } from '@/lib/utils';
import { useUser } from '@/context/UserContext';
import { useRanking } from '@/context/RankingContext';
import { useState, useEffect, useRef } from 'react';

import { useNavigate } from 'react-router-dom';

// Define Props interface based on the user's requirements and DB schema
interface ShopCardProps {
    shop: {
        id: number;
        name: string;
        description?: string | null;
        address_full?: string | null;
        thumbnail_img?: string | null;
        food_kind?: string | null; // e.g., "KOREAN", "CAFE"
        is_saved?: boolean; // From backend enrich
        saved_at?: string; // If saved, when it was saved
        catchtable_ref?: string;
        shop_user_match_score?: number | null;
        my_review_stats?: {
            satisfaction: number;
            rank: number;
            percentile: number;
            total_reviews: number;
        } | null;
    };
    onSave?: (shopId: number) => void;
    onWrite?: (shopId: number) => void;
    onReserve?: (shopId: number) => void; // Optional catchtable link
    onClick?: (shopId: number) => void; // Optional click handler for entire card
    hideActions?: boolean;
    reviewSnippet?: {
        id: number;
        text: string;
        user: {
            nickname: string;
            profile_image?: string | null;
            cluster_name?: string;
            taste_result?: any;
        };
    } | null;
    displayContext?: 'default' | 'discovery' | 'saved_list';
}

export const ShopCard: React.FC<ShopCardProps> = ({ shop, onSave, onWrite, onClick, hideActions, reviewSnippet, displayContext = 'default' }) => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { user: currentUser } = useUser();
    const { openRanking } = useRanking();
    const [showTooltip, setShowTooltip] = useState(false);
    const tooltipRef = useRef<HTMLDivElement>(null);

    // Close tooltip on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (showTooltip && tooltipRef.current && !tooltipRef.current.contains(event.target as Node)) {
                setShowTooltip(false);
            }
        };

        if (showTooltip) {
            document.addEventListener('click', handleClickOutside);
        }
        return () => {
            document.removeEventListener('click', handleClickOutside);
        };
    }, [showTooltip]);



    const handleCardClick = () => {
        if (onClick) {
            onClick(shop.id);
        } else {
            const current = new URLSearchParams(window.location.search);
            current.set('viewShop', String(shop.id));
            navigate({ search: current.toString() });
        }
    };

    return (
        <div
            className="bg-background border border-border rounded-xl overflow-hidden shadow-sm mb-4 cursor-pointer active:opacity-95 transition-opacity"
            onClick={handleCardClick}
        >
            {/* Image Area */}
            <div className="relative h-36 bg-muted text-left">
                {shop.thumbnail_img ? (
                    <img
                        src={shop.thumbnail_img}
                        alt={shop.name}
                        className="w-full h-full object-cover border-b border-border border-gray-100"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground border-b">
                        <span className="text-4xl">🍽️</span>
                    </div>
                )}

                {/* Badge Overlay */}
                <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/60 to-transparent flex items-end">
                    {shop.my_review_stats ? (
                        <div className="flex items-center gap-1.5">
                            {/* Satisfaction & Ranking (Merged Badge) */}
                            <div className={cn(
                                "font-bold px-2 py-0.5 rounded-full border border-white/20 text-[10px] flex items-center gap-1 backdrop-blur-md shadow-sm",
                                shop.my_review_stats.satisfaction === 2
                                    ? "bg-orange-500/90 text-white border-orange-400/50"
                                    : "bg-black/60 text-white"
                            )}>
                                {/* Satisfaction Text */}
                                {shop.my_review_stats.satisfaction === 2 ? '맛있어요' :
                                    shop.my_review_stats.satisfaction === 1 ? '괜찮아요' : '별로예요'}

                                {/* Separator if both exist */}
                                {shop.my_review_stats.satisfaction != null && shop.my_review_stats.rank > 0 && shop.my_review_stats.total_reviews >= 50 && (
                                    <span className="opacity-40 mx-0.5">|</span>
                                )}

                                {/* Tier Info (Inside Badge) - Only if total_reviews >= 50 */}
                                {shop.my_review_stats.rank > 0 && shop.my_review_stats.total_reviews >= 50 && (
                                    <span>
                                        상위 {shop.my_review_stats.percentile}%
                                    </span>
                                )}
                            </div>

                            {/* Rank (Outside Badge) */}
                            {shop.my_review_stats.rank > 0 && (
                                <div className="font-bold text-[13px] text-white flex items-center gap-0.5 drop-shadow-md">
                                    {(shop.my_review_stats.percentile <= 5 || shop.my_review_stats.rank <= 10) && (
                                        <span>🏆</span>
                                    )}
                                    {shop.my_review_stats.rank}위
                                </div>
                            )}
                        </div>
                    ) : (
                        shop.shop_user_match_score != null && (
                            <div className="relative z-10" ref={tooltipRef}>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setShowTooltip(!showTooltip);
                                    }}
                                    className="text-xs font-medium text-white bg-black/60 pl-2 pr-1.5 py-1 rounded-full border border-white/20 flex items-center gap-1 backdrop-blur-md shadow-sm active:bg-black/80 transition-colors"
                                >
                                    <span>예상 평가</span>
                                    <span className="text-orange-400 font-bold">{scoreToTasteRatingStep(shop.shop_user_match_score).toFixed(2)}</span>
                                    <HelpCircle className="w-3 h-3 text-white/50" />
                                </button>
                                {showTooltip && (
                                    <div
                                        className="absolute left-0 bottom-full mb-2 w-52 p-3 bg-gray-900/95 text-white text-xs rounded-xl shadow-xl z-50 text-left leading-relaxed animate-in fade-in zoom-in-95 duration-200"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <p>{t('discovery.shop_card.match_tooltip')}</p>
                                        <div className="absolute left-4 -bottom-1 w-2 h-2 bg-gray-900/95 rotate-45" />
                                    </div>
                                )}
                            </div>
                        )
                    )}
                </div>
            </div>

            {/* Content Area */}
            <div className="p-4">
                <div className="flex justify-between items-start mb-2">
                    <div>
                        <div className="flex items-center gap-2 mb-1 flex-wrap relative">
                            <h3 className="text-xl font-bold text-foreground">{shop.name}</h3>
                            {shop.food_kind && (
                                <span className="text-xs text-muted-foreground font-medium px-1.5 py-0.5 bg-muted rounded">
                                    {shop.food_kind}
                                </span>
                            )}

                        </div>
                        {shop.description && (
                            <p className="text-sm text-muted-foreground line-clamp-2">
                                {shop.description}
                            </p>
                        )}
                    </div>
                </div>

                <div className="flex items-center text-xs text-muted-foreground mb-4">
                    <MapPin className="w-3 h-3 mr-1" />
                    <span className="truncate">{shop.address_full || t('discovery.shop_card.no_address')}</span>
                </div>

                {/* Actions */}
                {!hideActions && (
                    <div className="flex gap-2">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                if (onWrite) {
                                    onWrite(shop.id);
                                } else {
                                    openRanking(shop);
                                }
                            }}
                            className={cn(
                                "flex-1 py-2 px-3 text-sm font-medium rounded-lg flex items-center justify-center hover:opacity-80 transition-opacity",
                                shop.my_review_stats
                                    ? "bg-primary/10 text-primary" // Completed Style
                                    : "bg-muted text-foreground" // Default Style
                            )}
                        >
                            {shop.my_review_stats ? (
                                <>
                                    <Check className="w-4 h-4 mr-2" />
                                    {t('discovery.shop_card.evaluated', 'Completed')}
                                </>
                            ) : (
                                <>
                                    <Plus className="w-4 h-4 mr-2" />
                                    {t('discovery.shop_card.record')}
                                </>
                            )}
                        </button>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onSave?.(shop.id);
                            }}
                            className={cn(
                                "flex-1 py-2 px-3 text-sm font-medium rounded-lg border transition-colors flex items-center justify-center",
                                shop.is_saved
                                    ? "bg-primary/10 text-primary border-primary/20"
                                    : "bg-transparent text-foreground border-border hover:bg-muted"
                            )}
                        >
                            <Bookmark className={cn("w-4 h-4 mr-2", shop.is_saved && "fill-current")} />
                            {shop.is_saved ? t('discovery.shop_card.saved') : t('discovery.shop_card.save')}
                        </button>
                    </div>
                )}
            </div>

            {/* Review Snippet (Priority over Saved Footer if both exist, or stack? User said "at bottom") */}
            {/* Let's stack them or prioritize. Review snippet is usually more dynamic context. */}
            {reviewSnippet && reviewSnippet.user && (
                <div className="bg-gray-50 px-4 py-3 border-t border-border">
                    <div className="flex items-start gap-2">
                        <div className="flex-1 min-w-0">
                            <div className="flex items-baseline gap-1.5 mb-0.5">
                                <span className="text-xs font-bold text-gray-900 truncate">
                                    {reviewSnippet.user.nickname}
                                </span>
                                {reviewSnippet.user.cluster_name && (
                                    (() => {
                                        const myScores = (currentUser as any)?.taste_result?.scores;
                                        const theirScores = reviewSnippet.user.taste_result?.scores;

                                        const matchScore = (myScores && theirScores)
                                            ? calculateTasteMatch(myScores, theirScores)
                                            : null;

                                        return (
                                            <span className={cn(
                                                "text-xs font-medium truncate",
                                                getTasteBadgeStyle(matchScore)
                                            )}>
                                                {reviewSnippet.user.cluster_name}
                                            </span>
                                        );
                                    })()
                                )}
                            </div>
                            <p className="text-sm text-gray-600 line-clamp-2 leading-relaxed">
                                {reviewSnippet.text}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Saved Footer (Conditional) - Only show if no review snippet OR if we want both? */}
            {/* User request didn't specify removing saved footer. But "Review 1개 노출" implies this is the footer. */}
            {/* Let's show BELOW review if both exist? Or replace? */}
            {/* If I saved it, the save date is metadata. The review is content. */}
            {/* Let's stack them for now, but ensure it looks okay. */}
            {/* Saved Footer (Conditional) - Only show if not in discovery context AND (no snippet OR in saved_list context) */}
            {/* If context is 'saved_list', we prioritize showing the footer even if there is a snippet? 
                Actually, user said: "Profile > Wants to go ... existing saved date. record. should appear."
                And "Saved shops exposed in ShopBottomSheet... not record button but other people's reviews".
                
                So:
                - Discovery: Hide Saved Footer. Show Snippet.
                - Saved List: Show Saved Footer.
            */}
            {displayContext !== 'discovery' && (!reviewSnippet || displayContext === 'saved_list') && shop.is_saved && shop.saved_at && (
                <div className="bg-muted/30 px-4 py-3 border-t border-border flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                        {t('discovery.shop_card.saved_date')} {formatVisitDate(shop.saved_at, t)}
                        <span className="mx-1">·</span>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onWrite?.(shop.id);
                            }}
                            className="text-primary hover:underline font-medium inline-flex items-center"
                        >
                            {t('discovery.shop_card.record')}
                        </button>
                    </span>
                </div>
            )}
        </div>
    );
};
