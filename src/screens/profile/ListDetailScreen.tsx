import { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Loader2, Calendar, Bookmark, Share } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { API_BASE_URL, WEB_BASE_URL } from '@/lib/api';
import { ShopService } from '@/services/ShopService';
import { UserService } from '@/services/UserService';
import { cn } from '@/lib/utils';
import { Capacitor } from '@capacitor/core';
import { Share as CapacitorShare } from '@capacitor/share';

interface ListItem {
    rank: number;
    satisfaction: string;
    shop: any;
    satisfaction_tier: number;
    review_text?: string;
    review_images?: string[] | string; // jsonb array of strings, or string if raw
}

interface ListAuthor {
    id: number;
    nickname: string;
    profile_image?: string;
    stats?: {
        content_count: number;
    };
}

interface ListDetailProps {
    userIdProp?: string;
}

export const ListDetailScreen = ({ userIdProp }: ListDetailProps = {}) => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const location = useLocation();
    const { userId: paramUserId, code } = useParams(); // URL param (could be ID or account_id) or share code
    const userId = userIdProp || paramUserId;
    const [searchParams] = useSearchParams();
    // const { toast } = useToast();
    const [showCopied, setShowCopied] = useState(false);

    // List Metadata from URL or initial fetch
    const listType = searchParams.get('type') || 'OVERALL';
    const listValue = searchParams.get('value') || '';
    const [title, setTitle] = useState(searchParams.get('title') || 'Ranking');

    // State
    // const [viewMode, setViewMode] = useState<'list' | 'map'>('list'); // Removed unused
    const [items, setItems] = useState<ListItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [isScrolled, setIsScrolled] = useState(false);
    const SCROLL_THRESHOLD = 200; // Approx height of cover

    // Author Info (we need to fetch this if not passed)
    // Ideally, we fetch user info + list items together, or separately. 
    // Since our backend route just returns the items, we might need to fetch the author details 
    // using the /api/users/:id endpoint if we want to show profile image/nickname properly.
    // However, usually userId is available. Let's fetch basic user info if we can.
    // However, usually userId is available. Let's fetch basic user info if we can.
    const [author, setAuthor] = useState<ListAuthor | null>(null);
    const [savedShopIds, setSavedShopIds] = useState<Set<number>>(new Set());

    useEffect(() => {
        const fetchEverything = async () => {
            if (!userId && !code) return;

            setLoading(true);
            try {
                // 0. Fetch My Saved Shops (to check bookmark status)
                const currentId = UserService.getUserId();
                if (currentId) {
                    const saved = await UserService.getSavedShops(currentId);
                    // Ensure we map to numbers
                    const ids = new Set<number>(saved.map((s: any) => Number(s.id)));
                    setSavedShopIds(ids);
                }

                if (code) {
                    // Shared View
                    const res = await fetch(`${API_BASE_URL}/api/share/${code}`);
                    if (res.ok) {
                        const data = await res.json();
                        setItems(data.items);
                        setAuthor(data.author);

                        // Dynamic Title Generation
                        let displayTitle = data.title;
                        const lType = data.type || listType;
                        const lValue = data.value || listValue;

                        if (lType === 'OVERALL') {
                            displayTitle = t('write.ranking.overall_title', 'Overall Ranking');
                        } else if (lType === 'REGION' || lType === 'CATEGORY') {
                            displayTitle = `${lValue} ${t('write.ranking.ranking_suffix', 'Ranking')}`;
                        }

                        setTitle(displayTitle);
                    }
                } else if (userId) {
                    // 1. Fetch User Info (for header)
                    // If the user navigated from profile, we might know this, but better to be safe for deep links.
                    // We use viewerId to get follow status if needed, but here just basic info.
                    const userRes = await fetch(`${API_BASE_URL}/api/users/${userId}`);
                    if (userRes.ok) {
                        const userData = await userRes.json();
                        setAuthor(userData);
                    }

                    // 2. Fetch List Items
                    const query = new URLSearchParams({
                        type: listType,
                        value: listValue
                    });

                    // Also set title for non-shared view if it's generic "Ranking"
                    if (title === 'Ranking' || !searchParams.get('title')) {
                        if (listType === 'OVERALL') {
                            setTitle(t('write.ranking.overall_title', 'Overall Ranking'));
                        } else if ((listType === 'REGION' || listType === 'CATEGORY') && listValue) {
                            setTitle(`${listValue} ${t('write.ranking.ranking_suffix', 'Ranking')}`);
                        }
                    }
                    const listRes = await fetch(`${API_BASE_URL}/api/users/${userId}/lists/detail?${query.toString()}`);
                    if (listRes.ok) {
                        const listData = await listRes.json();
                        setItems(listData);
                    }
                }
            } catch (error) {
                console.error("Failed to load list details", error);
            } finally {
                setLoading(false);
            }
        };

        fetchEverything();
    }, [userId, listType, listValue, code]);

    const handleShare = async () => {
        let shareUrl = '';

        if (code) {
            // If we are already on a shared page, just share the current URL
            // BUT for Native App, window.location.href is capacitor://... so we must force web url
            shareUrl = `${WEB_BASE_URL}/s/${code}`;
        } else if (userId) {
            // Create a new share link
            try {
                const res = await fetch(`${API_BASE_URL}/api/share/list`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        userId: author?.id || userId,
                        type: listType,
                        value: listValue,
                        title
                    })
                });

                if (res.ok) {
                    const { url } = await res.json();
                    shareUrl = WEB_BASE_URL + url;
                } else {
                    return;
                }
            } catch (error) {
                console.error("Share failed", error);
                return;
            }
        } else {
            return;
        }

        // Common Native/Clipboard Share
        const nav = navigator as any;
        if (Capacitor.isNativePlatform() || (nav.share && nav.canShare && nav.canShare({ url: shareUrl }))) {
            try {
                await CapacitorShare.share({
                    title: title,
                    text: `Check out ${author?.nickname || 'this'} user's ${title} list on Mimy!`,
                    url: shareUrl,
                    dialogTitle: 'Share List'
                });
                return;
            } catch (err) {
                console.log("Native share dismissed or failed, falling back to clipboard", err);
            }
        }

        // Fallback: Clipboard
        await navigator.clipboard.writeText(shareUrl);

        setShowCopied(true);
        setTimeout(() => setShowCopied(false), 2000);
    };


    const handleBack = () => {
        // If there is history (key is not default), go back.
        // Otherwise, fallback to profile.
        if (location.key !== 'default') {
            navigate(-1);
        } else {
            // Fallback to viewing the user profile if no history
            navigate(`/main?viewUser=${userId}`, { replace: true });
        }
    };

    // Helper to get cover image
    const getCoverImage = () => {
        if (items.length > 0) {
            const firstItem = items[0];
            // Prefer review image if available as it might be more relevant/fresh, otherwise shop thumbnail
            // Reusing logic from RankingListItem for consistency could be good, but here we want the "Best" shot.
            // Let's stick to shop thumbnail for stability as cover, or first item's image.

            // Logic similar to RankingListItem for extraction
            let img = firstItem.shop.thumbnail_img;
            const { review_images } = firstItem;
            if (review_images) {
                if (Array.isArray(review_images) && review_images.length > 0) img = review_images[0];
                else if (typeof review_images === 'string') {
                    try {
                        const parsed = JSON.parse(review_images);
                        if (Array.isArray(parsed) && parsed.length > 0) img = parsed[0];
                    } catch (e) {
                        if (review_images.startsWith('http')) img = review_images;
                    }
                }
            }
            return img;
        }
        return null;
    };


    const coverImage = getCoverImage();

    return (
        <div className="flex flex-col h-full bg-background relative">
            {/* Fixed Top Navigation */}
            <div
                className={cn(
                    "absolute top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-3 transition-all duration-300 border-b",
                    isScrolled ? "bg-background/95 backdrop-blur-md border-border/10 shadow-sm" : "bg-transparent border-transparent shadow-none"
                )}
                style={{ paddingTop: Capacitor.isNativePlatform() ? 'calc(env(safe-area-inset-top) + 0.5rem)' : undefined }}
            >
                <div className="flex items-center gap-3 overflow-hidden">
                    <Button
                        variant="ghost"
                        size="icon"
                        className={cn(
                            "rounded-full w-10 h-10 -ml-2 transition-colors hover:bg-transparent",
                            isScrolled
                                ? "text-foreground hover:text-foreground"
                                : "text-white hover:text-white"
                        )}
                        onClick={handleBack}
                    >
                        <ArrowLeft className="w-6 h-6" />
                    </Button>

                    <div className={cn(
                        "flex flex-col transition-all duration-300",
                        isScrolled ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
                    )}>
                        <span className="font-bold text-base truncate">{title}</span>
                        {author && (
                            <span className="text-xs text-muted-foreground truncate">by {author.nickname}</span>
                        )}
                    </div>
                </div>

                <div className="relative">
                    <Button
                        variant="ghost"
                        size="icon"
                        className={cn(
                            "rounded-full w-10 h-10 transition-colors hover:bg-transparent",
                            isScrolled
                                ? "text-foreground hover:text-foreground"
                                : "text-white hover:text-white"
                        )}
                        onClick={handleShare}
                    >
                        <Share className="w-5 h-5" />
                    </Button>
                    {showCopied && (
                        <div className="absolute top-12 right-0 bg-black/80 text-white text-xs px-2 py-1 rounded shadow-lg whitespace-nowrap">
                            {t('common.copied', 'Link Copied!')}
                        </div>
                    )}
                </div>
            </div>

            {/* Scrollable Main Content */}
            {/* Scrollable Main Content */}
            <main
                className="flex-1 overflow-y-auto bg-background"
                data-scroll-container="true"
                onScroll={(e) => {
                    const target = e.currentTarget;
                    if (target.scrollTop > SCROLL_THRESHOLD) {
                        setIsScrolled(true);
                    } else {
                        setIsScrolled(false);
                    }
                }}
            >
                {loading ? (
                    <div className="flex justify-center py-40">
                        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                    </div>
                ) : (
                    <>
                        {/* Spotify Flagship Header */}
                        <div className="relative w-full h-[30vh] min-h-[300px] flex flex-col justify-end overflow-hidden">
                            {/* Background Image Layer */}
                            {coverImage ? (
                                <div className="absolute inset-0 z-0">
                                    <img src={coverImage} alt="Cover" className="w-full h-full object-cover" />
                                </div>
                            ) : (
                                <div className="absolute inset-0 z-0 bg-gradient-to-br from-gray-800 to-gray-900" />
                            )}

                            {/* Gradient Overlay for Text Readability */}
                            <div className="absolute inset-0 z-10 bg-gradient-to-t from-background via-background/60 to-transparent" />
                            <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-background to-transparent z-10" />

                            {/* Content Layer */}
                            <div className="relative z-20 px-6 pb-8">

                                {/* Title - Huge & Bold */}
                                <h1 className="text-3xl font-black mb-4 leading-[1.1] text-foreground tracking-tight">
                                    {title}
                                </h1>

                                {/* Meta Info */}
                                <div className="flex items-center gap-1 text-sm text-foreground/80 font-medium">
                                    {author && (
                                        <div className="flex items-center gap-1">
                                            <div className="w-6 h-6 rounded-full bg-muted overflow-hidden border border-white/10">
                                                {author.profile_image ? (
                                                    <img src={author.profile_image} alt={author.nickname} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full bg-gray-500" />
                                                )}
                                            </div>
                                            <span className="text-foreground hover:underline">{author.nickname}</span>
                                        </div>
                                    )}
                                    <span className="text-foreground/40">•</span>
                                    <span>{items.length} spots</span>
                                    <span className="text-foreground/40">•</span>
                                    <span>{new Date().toLocaleDateString()}</span>
                                </div>
                            </div>
                        </div>

                        {/* List Content */}
                        <div className="px-4 pb-32 pt-2">
                            {items.map((item, index) => (
                                <RankingListItem
                                    key={`${item.shop.id}-${index}`}
                                    item={item}
                                    user={author}
                                    initialIsSaved={savedShopIds.has(item.shop.id)}
                                />
                            ))}

                            {items.length === 0 && (
                                <div className="text-center text-muted-foreground py-10">
                                    {t('profile.empty.list_detail', 'No items in this list.')}
                                </div>
                            )}
                        </div>
                    </>
                )}
            </main>
        </div>
    );
};

// Custom Ranking List Item Component
const RankingListItem = ({ item, user, initialIsSaved = false }: { item: ListItem; user: ListAuthor | null; initialIsSaved?: boolean }) => {
    const { shop, rank, satisfaction_tier, review_text, review_images } = item;
    const navigate = useNavigate();
    const { t, i18n } = useTranslation();
    const [isSaved, setIsSaved] = useState(initialIsSaved);

    const handleToggleSave = async (e: React.MouseEvent) => {
        e.stopPropagation();
        const newState = !isSaved;
        setIsSaved(newState); // Optimistic update
        try {
            await ShopService.toggleSave(shop.id);
        } catch (error) {
            console.error("Failed to toggle save", error);
            setIsSaved(!newState); // Revert
        }
    };

    // Derive satisfaction string
    const tierMap: Record<number, string> = { 1: 'good', 2: 'good', 3: 'ok', 4: 'bad' };
    const satisfaction = tierMap[satisfaction_tier] || '';

    const getRankingTier = (rank: number, total: number | undefined): number | null => {
        if (!total || total < 50) return null;
        const percentage = (rank / total) * 100;
        const tiers = [1, 5, 10, 20, 30, 40, 50, 60, 70, 80, 90];
        for (const tier of tiers) {
            if (percentage <= tier) return tier;
        }
        return null;
    };

    const rankingCount = user?.stats?.content_count;

    let displayImage = shop.thumbnail_img;

    if (review_images) {
        if (Array.isArray(review_images) && review_images.length > 0) {
            displayImage = review_images[0];
        } else if (typeof review_images === 'string') {
            try {
                const parsed = JSON.parse(review_images);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    displayImage = parsed[0];
                }
            } catch (e) {
                if (review_images.startsWith('http')) {
                    displayImage = review_images;
                }
            }
        }
    }

    return (
        <div
            className="flex flex-col py-4 border-b border-border/40 gap-3 cursor-pointer group"
            onClick={() => {
                const current = new URLSearchParams(window.location.search);
                current.set('viewShop', String(shop.id));
                navigate({ search: current.toString() });
            }}
        >
            {/* Top Row: Thumbnail + Info + Actions */}
            <div className="flex items-start gap-3">
                {/* Thumbnail */}
                <div className="w-16 h-16 rounded-xl bg-gray-100 overflow-hidden flex-shrink-0 relative border border-border/60 shadow-sm">
                    {displayImage ? (
                        <img src={displayImage} alt={shop.name} className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300">
                            <div className="w-2 h-2 rounded-full bg-gray-300" />
                        </div>
                    )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0 flex flex-col justify-center h-16 py-0.5">
                    <h3 className="font-bold text-[17px] leading-tight truncate text-foreground mb-1">{shop.name}</h3>
                    <div className="flex items-center text-[13px] text-muted-foreground gap-1.5 truncate">
                        <span className="truncate">{shop.food_kind}</span>
                        <span className="w-0.5 h-0.5 rounded-full bg-muted-foreground/50" />
                        <span className="truncate">{shop.address_region || shop.address_full?.split(' ')[1]}</span>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3 self-center pl-2">
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-10 w-10 p-0 rounded-full border-gray-200 text-gray-600"
                        onClick={(e) => {
                            e.stopPropagation();
                            // Reserve Logic
                            const ref = shop.catchtable_ref;
                            if (ref) {
                                window.open(`https://app.catchtable.co.kr/ct/shop/${ref}`, '_blank');
                            } else {
                                alert("예약 링크가 없습니다.");
                            }
                        }}
                    >
                        <Calendar className="w-5 h-5" />
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        className={cn(
                            "h-10 w-10 p-0 rounded-full border-gray-200 text-gray-600",
                            isSaved ? "text-primary" : "text-gray-400"
                        )}
                        onClick={handleToggleSave}
                    >
                        <Bookmark className={cn("w-5 h-5", isSaved && "fill-current")} />
                    </Button>
                </div>
            </div>

            {/* Bottom Row: Content (Satisfaction + Rank + Text) */}
            {(satisfaction || review_text || (typeof rank === 'number' && rank > 0)) && (
                <div>
                    {/* Satisfaction Badge + Rank Line */}
                    {(satisfaction || (typeof rank === 'number' && rank > 0)) && (
                        <div className="flex items-center gap-2 mb-2">
                            {/* Badge */}
                            {(satisfaction || (rankingCount && rankingCount >= 50)) && (
                                <span className={cn(
                                    "font-bold px-2 py-0.5 rounded-md border text-xs flex items-center gap-1.5",
                                    satisfaction === 'good'
                                        ? "text-orange-600 border-orange-100 bg-orange-50/50"
                                        : "text-gray-500 border-gray-100 bg-gray-50/50"
                                )}>
                                    {satisfaction && t(`write.basic.${satisfaction}`)}

                                    {/* Separator */}
                                    {satisfaction && typeof rank === 'number' && rank > 0 && getRankingTier(rank, rankingCount) && (
                                        <span className="opacity-20">|</span>
                                    )}

                                    {/* Tier Text */}
                                    {typeof rank === 'number' && rank > 0 && (() => {
                                        const tier = getRankingTier(rank, rankingCount);
                                        return tier ? (
                                            <span>{t('common.top')} {tier}%</span>
                                        ) : null;
                                    })()}
                                </span>
                            )}

                            {/* Raw Rank if prominent */}
                            {/* Raw Rank if prominent */}
                            {typeof rank === 'number' && rank > 0 && (() => {
                                // Localized Rank Display
                                const isKo = i18n.language.startsWith('ko');
                                let rankText = `#${rank}`;

                                if (isKo) {
                                    rankText = `${rank}위`;
                                } else {
                                    // English Ordinals
                                    const pr = new Intl.PluralRules('en-US', { type: 'ordinal' });
                                    const suffixes = new Map([
                                        ['one', 'st'],
                                        ['two', 'nd'],
                                        ['few', 'rd'],
                                        ['other', 'th'],
                                    ]);
                                    const rule = pr.select(rank);
                                    const suffix = suffixes.get(rule);
                                    rankText = `${rank}${suffix}`;
                                }

                                return (
                                    <span className="font-semibold text-xs text-foreground/60">
                                        {rankText}
                                    </span>
                                );
                            })()}
                        </div>
                    )}

                    {/* Review Text */}
                    {review_text ? (
                        <div className="relative">
                            <p className="pl-1 text-xs text-foreground/80 leading-relaxed line-clamp-2">
                                {review_text}
                            </p>
                        </div>
                    ) : shop.description ? (
                        <p className="pl-1 text-xs text-muted-foreground line-clamp-2">
                            {shop.description}
                        </p>
                    ) : null}
                </div>
            )}
        </div>
    );
};
