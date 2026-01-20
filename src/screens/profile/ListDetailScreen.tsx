import { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Loader2, Map as MapIcon, List as ListIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { API_BASE_URL } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Capacitor } from '@capacitor/core';

interface ListItem {
    rank: number;
    shop: any;
    satisfaction_tier: number;
    review_text?: string;
    review_images?: string[] | string; // jsonb array of strings, or string if raw
}

interface ListAuthor {
    id: number;
    nickname: string;
    profile_image?: string;
}

export const ListDetailScreen = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { userId } = useParams(); // URL param (could be ID or account_id)
    const [searchParams] = useSearchParams();

    // List Metadata from URL or initial fetch
    const listType = searchParams.get('type') || 'OVERALL';
    const listValue = searchParams.get('value') || '';
    const initialTitle = searchParams.get('title') || 'Ranking';

    // State
    const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
    const [items, setItems] = useState<ListItem[]>([]);
    const [loading, setLoading] = useState(true);

    // Author Info (we need to fetch this if not passed)
    // Ideally, we fetch user info + list items together, or separately. 
    // Since our backend route just returns the items, we might need to fetch the author details 
    // using the /api/users/:id endpoint if we want to show profile image/nickname properly.
    // However, usually userId is available. Let's fetch basic user info if we can.
    const [author, setAuthor] = useState<ListAuthor | null>(null);

    useEffect(() => {
        const fetchEverything = async () => {
            if (!userId) return;

            setLoading(true);
            try {
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
                const listRes = await fetch(`${API_BASE_URL}/api/users/${userId}/lists/detail?${query.toString()}`);
                if (listRes.ok) {
                    const listData = await listRes.json();
                    setItems(listData);
                }
            } catch (error) {
                console.error("Failed to load list details", error);
            } finally {
                setLoading(false);
            }
        };

        fetchEverything();
    }, [userId, listType, listValue]);


    const handleBack = () => {
        if (window.history.state && window.history.state.idx > 0) {
            navigate(-1);
        } else {
            navigate(`/main/user/${userId}`, { replace: true });
        }
    };

    return (
        <div className="flex flex-col h-full bg-background relative">
            {/* Header */}
            <header
                className="bg-background border-b border-border z-20 sticky top-0"
                style={{ paddingTop: Capacitor.isNativePlatform() ? 'calc(env(safe-area-inset-top) + 0.5rem)' : undefined }}
            >
                <div className="flex items-center gap-2 px-4 py-3">
                    <Button variant="ghost" size="icon" className="-ml-2" onClick={handleBack}>
                        <ArrowLeft className="w-6 h-6" />
                    </Button>
                    <div className="flex-1 min-w-0">
                        <h1 className="text-lg font-bold truncate">{initialTitle}</h1>
                    </div>
                    {/* View Toggle */}
                    <div className="flex items-center bg-muted rounded-lg p-0.5 ml-2">
                        <button
                            onClick={() => setViewMode('list')}
                            className={cn(
                                "p-1.5 rounded-md transition-all",
                                viewMode === 'list' ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <ListIcon className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setViewMode('map')}
                            className={cn(
                                "p-1.5 rounded-md transition-all",
                                viewMode === 'map' ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <MapIcon className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* List Info / Author Profile */}
                {!loading && author && (
                    <div className="px-5 pb-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-muted overflow-hidden border border-border/50">
                                {author.profile_image ? (
                                    <img src={author.profile_image} alt={author.nickname} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-lg">😊</div>
                                )}
                            </div>
                            <div>
                                <div className="text-sm font-semibold">{author.nickname}</div>
                                <div className="text-xs text-muted-foreground flex items-center gap-1">
                                    <span>{items.length} {t('profile.list_detail.items_count', 'items')}</span>
                                    <span>·</span>
                                    {/* Showing current date as update time or fetch from list metadata if we had it but we rely on realtime fetch */}
                                    <span>{new Date().toLocaleDateString()}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </header>

            {/* Content */}
            <main className="flex-1 overflow-y-auto bg-muted/5 relative">
                {loading ? (
                    <div className="flex justify-center py-20">
                        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                    </div>
                ) : (
                    <>
                        {viewMode === 'list' ? (
                            <div className="p-5 pb-20 space-y-4">
                                {items.map((item) => (
                                    <RankingListItem key={item.shop.id} item={item} />
                                ))}

                                {items.length === 0 && (
                                    <div className="text-center text-muted-foreground py-20">
                                        {t('profile.empty.list_detail', 'No items in this list.')}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="h-full flex items-center justify-center text-muted-foreground p-10 flex-col">
                                <MapIcon className="w-12 h-12 mb-4 opacity-20" />
                                <p>Map View Coming Soon</p>
                                {/* Placeholder for Map implementation */}
                            </div>
                        )}
                    </>
                )}
            </main>
        </div>
    );
};

// Custom Ranking List Item Component
const RankingListItem = ({ item }: { item: ListItem }) => {
    const { shop, rank, satisfaction_tier, review_text, review_images } = item;
    const navigate = useNavigate();
    const { t } = useTranslation();

    // Parse images if needed (it comes as string[] or string from sql?) -> Drizzle sql<string[]> usually returns valid array or null.
    // Parse images if needed (it comes as string[] or string from sql?) -> Drizzle sql<string[]> usually returns valid array or null.
    // If it's a raw JSON string, we might need JSON.parse. But sql<string[]> type hint suggests array.
    // Let's safe check.

    let displayImage = shop.thumbnail_img;
    // Users requested "small photo from review".
    // If review_images exists and has length, use the first one.
    if (review_images && Array.isArray(review_images) && review_images.length > 0) {
        displayImage = review_images[0];
    } else if (typeof review_images === 'string') {
        try {
            const parsed = JSON.parse(review_images);
            if (Array.isArray(parsed) && parsed.length > 0) {
                displayImage = parsed[0];
            }
        } catch (e) {
            // If parse fails, maybe it's a raw URL string? Unlikely for jsonb but possible legacy
            if (review_images.startsWith('http')) {
                displayImage = review_images;
            }
        }
    }

    return (
        <div
            className="flex bg-background rounded-xl p-4 shadow-sm border border-border/50 items-start gap-4 active:scale-[0.99] transition-transform cursor-pointer"
            onClick={() => navigate(`/shop/${shop.id}`)}
        >
            {/* Rank */}
            <div className="flex-shrink-0 flex flex-col items-center justify-center w-8 pt-1">
                <span className={cn(
                    "text-xl font-black",
                    rank <= 3 ? "text-primary" : "text-muted-foreground"
                )}>
                    {rank <= 999 ? rank : '-'}
                </span>
            </div>

            {/* Main Info */}
            <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between mb-1">
                    <h3 className="font-bold text-base truncate pr-2">{shop.name}</h3>
                    {(() => {
                        // Map tier to string code
                        const tierMap: Record<number, string> = { 1: 'good', 2: 'good', 3: 'ok', 4: 'bad' };
                        const satisfaction = tierMap[satisfaction_tier] || 'good';

                        return (
                            <span className={cn(
                                "font-bold text-sm",
                                satisfaction === 'good' ? "text-orange-600" : "text-gray-500"
                            )}>
                                {t(`write.basic.${satisfaction}`)}
                            </span>
                        );
                    })()}
                </div>

                {/* Review Text */}
                {review_text && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                        "{review_text}"
                    </p>
                )}
                {!review_text && shop.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                        {shop.description}
                    </p>
                )}

                {/* Shop Metadata */}
                <div className="flex items-center text-xs text-gray-400 gap-2">
                    <span className="truncate max-w-[120px]">{shop.food_kind}</span>
                    <span>·</span>
                    <span className="truncate max-w-[120px]">{shop.address_region || shop.address_full}</span>
                </div>
            </div>

            {/* Thumbnail Image (Small) */}
            <div className="w-16 h-16 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0 border border-gray-100">
                {displayImage ? (
                    <img src={displayImage} alt={shop.name} className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">
                        no img
                    </div>
                )}
            </div>
        </div>
    );
};
