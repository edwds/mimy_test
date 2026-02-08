import { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Loader2, Share } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { API_BASE_URL, WEB_BASE_URL } from '@/lib/api';
import { UserService } from '@/services/UserService';
import { useUser } from '@/context/UserContext';
import { cn, formatVisitDate } from '@/lib/utils';
import { Capacitor } from '@capacitor/core';
import { Share as CapacitorShare } from '@capacitor/share';
import { authFetch } from '@/lib/authFetch';
import { ShopInfoCard } from '@/components/ShopInfoCard';
import { RankingBadge } from '@/components/RankingBadge';

interface ListItem {
    rank: number;
    satisfaction: string;
    shop: any;
    satisfaction_tier: number;
    updated_at?: string;
    review_text?: string;
    review_images?: string[] | string; // jsonb array of strings, or string if raw
    my_review_stats?: {
        satisfaction: number;
        rank: number;
        percentile: number;
        total_reviews: number;
    } | null;
}

interface ListAuthor {
    id: number;
    nickname: string;
    profile_image?: string;
    stats?: {
        content_count: number;
        ranking_count: number;
    };
    updated_at?: string;
}

interface ListDetailProps {
    userIdProp?: string;
}

export const ListDetailScreen = ({ userIdProp }: ListDetailProps = {}) => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useUser();
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
    const [listUpdatedAt, setListUpdatedAt] = useState<string | null>(null);

    useEffect(() => {
        const fetchEverything = async () => {
            if (!userId && !code) return;

            setLoading(true);
            try {
                // 0. Fetch My Saved Shops (to check bookmark status)
                if (user?.id) {
                    const saved = await UserService.getSavedShops(user.id);
                    // Ensure we map to numbers
                    const ids = new Set<number>(saved.map((s: any) => Number(s.id)));
                    setSavedShopIds(ids);
                }

                if (code) {
                    // Shared View (public, no auth required)
                    const res = await fetch(`${API_BASE_URL}/api/share/${code}`);
                    if (res.ok) {
                        const data = await res.json();
                        setItems(data.items);
                        setAuthor(data.author);
                        setListUpdatedAt(data.updated_at);

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
                    const userRes = await authFetch(`${API_BASE_URL}/api/users/${userId}`);
                    if (userRes.ok) {
                        const userData = await userRes.json();
                        setAuthor(userData);
                    }

                    // 2. Fetch List Items with my ranking info
                    const query = new URLSearchParams({
                        type: listType,
                        value: listValue
                    });
                    if (user?.id) {
                        query.set('viewer_id', String(user.id));
                    }

                    // Also set title for non-shared view if it's generic "Ranking"
                    if (title === 'Ranking' || !searchParams.get('title')) {
                        if (listType === 'OVERALL') {
                            setTitle(t('write.ranking.overall_title', 'Overall Ranking'));
                        } else if ((listType === 'REGION' || listType === 'CATEGORY') && listValue) {
                            setTitle(`${listValue} ${t('write.ranking.ranking_suffix', 'Ranking')}`);
                        }
                    }
                    const listRes = await authFetch(`${API_BASE_URL}/api/users/${userId}/lists/detail?${query.toString()}`);
                    if (listRes.ok) {
                        const listData = await listRes.json();
                        setItems(listData);

                        // Get most recent updated_at from items
                        if (listData.length > 0) {
                            const mostRecent = listData.reduce((latest: any, item: any) => {
                                if (!item.updated_at) return latest;
                                if (!latest) return item.updated_at;
                                return new Date(item.updated_at) > new Date(latest) ? item.updated_at : latest;
                            }, null);
                            if (mostRecent) {
                                setListUpdatedAt(mostRecent);
                            }
                        }
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
                const res = await authFetch(`${API_BASE_URL}/api/share/list`, {
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
        console.log('[ListDetailScreen] handleBack called', {
            locationKey: location.key,
            userId,
            pathname: location.pathname
        });

        // Always try to go back first
        if (window.history.length > 1) {
            navigate(-1);
        } else {
            // Fallback to main profile
            navigate('/main/profile', { replace: true });
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
        <div className="flex flex-col h-full bg-background relative max-w-[448px] mx-auto">
            {/* Top Navigation */}
            <div
                className={cn(
                    "absolute top-0 left-0 right-0 z-[100] flex items-center justify-between px-4 py-3 transition-all duration-300 border-b",
                    isScrolled ? "bg-background/95 backdrop-blur-md border-border/10 shadow-sm" : "bg-transparent border-transparent shadow-none"
                )}
                style={{
                    paddingTop: Capacitor.isNativePlatform()
                        ? 'calc(env(safe-area-inset-top) + 0.5rem)'
                        : '1rem'
                }}
            >
                <div className="flex items-center gap-3 overflow-hidden pointer-events-auto">
                    <Button
                        variant="ghost"
                        size="icon"
                        className={cn(
                            "rounded-full w-10 h-10 -ml-2 transition-colors",
                            isScrolled
                                ? "text-foreground hover:text-foreground hover:bg-muted"
                                : "text-white hover:text-white hover:bg-white/10"
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

                <div className="relative pointer-events-auto">
                    <Button
                        variant="ghost"
                        size="icon"
                        className={cn(
                            "rounded-full w-10 h-10 transition-colors",
                            isScrolled
                                ? "text-foreground hover:text-foreground hover:bg-muted"
                                : "text-white hover:text-white hover:bg-white/10"
                        )}
                        onClick={handleShare}
                    >
                        <Share className="w-5 h-5" />
                    </Button>
                    {showCopied && (
                        <div className="absolute top-12 right-0 bg-black/80 text-white text-xs px-2 py-1 rounded shadow-lg whitespace-nowrap z-10">
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

                            {/* Top Black Dim for Button Visibility */}
                            <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/40 to-transparent z-10" />

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
                                <div className="flex items-center gap-2 text-sm text-foreground/80 font-medium flex-wrap">
                                    {author && (
                                        <>
                                            <div className="flex items-center gap-1.5">
                                                <div className="w-6 h-6 rounded-full bg-muted overflow-hidden border border-white/10">
                                                    {author.profile_image ? (
                                                        <img src={author.profile_image} alt={author.nickname} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full bg-gray-500" />
                                                    )}
                                                </div>
                                                <span className="text-foreground font-semibold">{author.nickname}</span>
                                            </div>
                                            <span className="text-foreground/40">•</span>
                                        </>
                                    )}
                                    <span>{t('profile.list_detail.items_count', '{{count}} spots', { count: items.length })}</span>
                                    {listUpdatedAt && (
                                        <>
                                            <span className="text-foreground/40">•</span>
                                            <span>{formatVisitDate(listUpdatedAt, t)}</span>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* List Content */}
                        <div className="px-4 pb-32 pt-2">
                            {items.map((item, index) => (
                                <RankingListItem
                                    key={`${item.shop.id}-${index}`}
                                    item={item}
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
const RankingListItem = ({ item, initialIsSaved = false }: { item: ListItem; initialIsSaved?: boolean }) => {
    const { shop, rank, satisfaction_tier, review_text, review_images, my_review_stats } = item;
    const navigate = useNavigate();
    const { t } = useTranslation();

    // Derive satisfaction string
    const tierMap: Record<number, string> = { 1: 'good', 2: 'good', 3: 'ok', 4: 'bad' };
    const satisfaction = tierMap[satisfaction_tier] || '';

    // Get display image from review images
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

    // Update shop object with display image
    const shopWithImage = { ...shop, thumbnail_img: displayImage };

    return (
        <div className="flex flex-col py-4 border-b border-border/40 gap-3">
            {/* Shop Info Card */}
            <ShopInfoCard
                shop={shopWithImage}
                initialIsBookmarked={initialIsSaved}
                my_review_stats={my_review_stats}
                showActions={true}
                onClick={() => {
                    const current = new URLSearchParams(window.location.search);
                    current.set('viewShop', String(shop.id));
                    navigate({ search: current.toString() });
                }}
                className="p-0 bg-transparent rounded-none active:bg-gray-50/50"
            />

            {/* Rank & Satisfaction Badge */}
            {(rank || satisfaction) && (
                <div className="flex items-center gap-2">
                    {satisfaction && (
                        <span className={cn(
                            "font-bold px-2 py-0.5 rounded border text-[11px] whitespace-nowrap",
                            satisfaction === 'good'
                                ? "text-orange-600 border-orange-100 bg-orange-50/50"
                                : "text-gray-500 border-gray-100 bg-gray-50/50"
                        )}>
                            {t(`write.basic.${satisfaction}`)}
                        </span>
                    )}
                    {rank && rank > 0 && (
                        <RankingBadge
                            rank={rank}
                            percentile={my_review_stats?.percentile}
                            size="sm"
                            variant="badge"
                        />
                    )}
                </div>
            )}

            {/* Review Text or Shop Description */}
            {review_text ? (
                <div className="relative -mt-1">
                    <p className="pl-1 text-sm text-foreground/70 leading-relaxed line-clamp-2">
                        {review_text}
                    </p>
                </div>
            ) : shop.description ? (
                <div className="relative">
                    <p className="pl-1 text-sm text-foreground/70 leading-relaxed line-clamp-2">
                        {shop.description}
                    </p>
                </div>
            ) : null}
        </div>
    );
};
