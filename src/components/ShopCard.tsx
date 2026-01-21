import React from 'react';
import { MapPin, Calendar, Bookmark } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn, formatVisitDate, calculateTasteMatch, getTasteBadgeStyle } from '@/lib/utils';
import { useUser } from '@/context/UserContext';

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
}

export const ShopCard: React.FC<ShopCardProps> = ({ shop, onSave, onWrite, onReserve, onClick, hideActions, reviewSnippet }) => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { user: currentUser } = useUser();



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
            <div className="relative h-36 bg-muted">
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
            </div>

            {/* Content Area */}
            <div className="p-4">
                <div className="flex justify-between items-start mb-2">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
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
                                if (shop.catchtable_ref) {
                                    window.open(`https://app.catchtable.co.kr/ct/shop/${shop.catchtable_ref}`, '_blank');
                                } else {
                                    onReserve?.(shop.id);
                                }
                            }}
                            className="flex-1 py-2 px-3 bg-muted text-foreground text-sm font-medium rounded-lg hover:bg-muted/80 flex items-center justify-center"
                        >
                            <Calendar className="w-4 h-4 mr-2" />
                            {t('discovery.shop_card.reserve_btn')}
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
            {!reviewSnippet && shop.is_saved && shop.saved_at && (
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
