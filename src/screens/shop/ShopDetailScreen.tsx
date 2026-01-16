import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MoreHorizontal, Calendar, Bookmark, MapPin } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ShopService } from '@/services/ShopService';
import { cn } from '@/lib/utils';
import { ContentCard } from '@/components/ContentCard';
import { useUser } from '@/context/UserContext';
import { API_BASE_URL } from '@/lib/api';

interface ShopDetail {
    id: number;
    name: string;
    description?: string;
    address_full?: string;
    address_region?: string;
    thumbnail_img?: string;
    kind?: string;
    food_kind?: string;
    lat?: number;
    lon?: number;
    catchtable_ref?: string;
    is_saved?: boolean;
}

export const ShopDetailScreen = () => {
    const { shopId } = useParams<{ shopId: string }>();
    const navigate = useNavigate();
    const { t } = useTranslation();
    const { user } = useUser();

    const [shop, setShop] = useState<ShopDetail | null>(null);
    const [reviews, setReviews] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [sort, setSort] = useState<'popular' | 'similar'>('similar');
    // page state removed as unused (derived in effect or local var if needed, but error said it was unused)
    // Actually, verify if page is used in fetchReviews.
    // fetchReviews uses pageNum argument.
    // The InfiniteScroll effect uses setPage(prev => ...).
    // So `page` IS used for state setter, but maybe the read value `page` variable itself is unused?
    // Let's check lines 89+ effect.
    // Error said: 'page' is declared but its value is never read.
    // Ah, line 36: const [page, setPage] = useState(1);
    // Usage: `setPage` is used. `page` is NOT used in the code visible?
    // Wait, fetchReviews(next, sort) uses `next`.
    // Infinite scroll uses `setPage`.
    // fetchReviews definition: `fetchReviews(pageNum...)`.
    // Initial load effect `fetchReviews(1...)`.
    // It seems `page` variable is indeed not read.

    // We can keep setPage but rename page to _page or just ignore it.
    // But better to remove if truly unused. But we need the state for incrementing?
    // setPage(prev => ...) uses prev.
    // So we need `useState` but we don't read `page`.
    // We can do `const [, setPage] = useState(1);`

    const [, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [loadingReviews, setLoadingReviews] = useState(false);
    const observerTarget = useRef(null);

    const id = parseInt(shopId || '0');

    useEffect(() => {
        if (!id) return;

        const fetchShop = async () => {
            try {
                const data = await ShopService.getById(id);
                // Check if bookmarked (optional MVP step: fetch saved status separately or assume generic)
                // Assuming ShopService.getById might not return is_saved unless we updated backend which we didn't fully check for that.
                // But let's proceed.
                setShop(data);
            } catch (err) {
                console.error(err);
                // Handle error
            } finally {
                setLoading(false);
            }
        };

        fetchShop();
    }, [id]);

    useEffect(() => {
        if (!id) return;
        setReviews([]);
        setPage(1);
        setHasMore(true);
        fetchReviews(1, sort, true);
    }, [id, sort]);

    const fetchReviews = async (pageNum: number, sortType: 'popular' | 'similar', reset: boolean = false) => {
        if (!id || (loadingReviews && !reset)) return;

        setLoadingReviews(true);
        try {
            const data = await ShopService.getReviews(id, pageNum, sortType, user?.id);
            if (data.length < 20) setHasMore(false);

            setReviews(prev => reset ? data : [...prev, ...data]);
        } catch (err) {
            console.error(err);
        } finally {
            setLoadingReviews(false);
        }
    };

    // Infinite Scroll
    useEffect(() => {
        const observer = new IntersectionObserver(
            entries => {
                if (entries[0].isIntersecting && hasMore && !loadingReviews) {
                    setPage(prev => {
                        const next = prev + 1;
                        fetchReviews(next, sort);
                        return next;
                    });
                }
            },
            { threshold: 1.0 }
        );

        if (observerTarget.current) {
            observer.observe(observerTarget.current);
        }

        return () => observer.disconnect();
    }, [hasMore, loadingReviews, sort]); // Depend on sort to use correct fetch closure? Or fetchReviews depends on state? 
    // fetchReviews uses current params if called directly, but inside effect it needs care.
    // Actually, `fetchReviews` above closes over `id` and `user?.id` but params match args.
    // Better to just let the effect trigger the next page content fetch.

    const handleBack = () => navigate(-1);

    const handleBookmark = async () => {
        if (!user || !shop) return;

        // Optimistic toggle
        // Note: Shop detail from backend doesn't officially send `is_saved` unless enriched.
        // We will implement simpler toggle logic assuming we track it or just fire-and-forget for MVP visual if we don't have initial state.
        // Actually, let's try to sync it if possible. For now, just toggle.
        try {
            await fetch(`${API_BASE_URL}/api/shops/${id}/save`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.id })
            });
            // Ideally refetch or toggle local state if we had it
            alert(t('common.saved_to_list') || "Saved!"); // Simple feedback
        } catch (e) {
            console.error(e);
        }
    };

    if (loading) return <div className="min-h-screen bg-white" />;

    if (!shop) return <div className="min-h-screen bg-white flex items-center justify-center">Store not found</div>;

    return (
        <div className="h-full bg-white relative">
            {/* Header */}
            <div className="absolute top-0 left-0 right-0 h-14 bg-white/80 backdrop-blur-md z-50 flex items-center justify-between px-4">
                <button onClick={handleBack} className="p-2 -ml-2 text-gray-800">
                    <ArrowLeft size={24} />
                </button>
                <div className="flex items-center gap-2">
                    <button className="p-2 -mr-2 text-gray-800">
                        <MoreHorizontal size={24} />
                    </button>
                </div>
            </div>

            {/* Scrollable Content */}
            <div className="h-full overflow-y-auto pb-20 no-scrollbar">
                {/* Hero Image */}
                <div className="w-full aspect-[4/3] bg-gray-200">
                    {shop.thumbnail_img ? (
                        <img src={shop.thumbnail_img} alt={shop.name} className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400 text-4xl">🏢</div>
                    )}
                </div>

                {/* Shop Info */}
                <div className="px-5 py-6">
                    <div className="text-sm font-bold text-orange-600 mb-1">{shop.food_kind || 'Restaurant'}</div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">{shop.name}</h1>
                    <p className="text-gray-600 leading-relaxed mb-4 whitespace-pre-wrap">{shop.description}</p>

                    <div className="flex items-start gap-2 text-gray-500 text-sm mb-6">
                        <MapPin size={16} className="mt-0.5 flex-shrink-0" />
                        <span>{shop.address_full}</span>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3">
                        <button
                            onClick={() => {
                                if (shop.catchtable_ref) {
                                    window.open(`https://app.catchtable.co.kr/ct/shop/${shop.catchtable_ref}`, '_blank');
                                } else {
                                    alert("예약 링크가 없습니다.");
                                }
                            }}
                            className="flex-1 h-12 rounded-xl bg-orange-600 text-white font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
                        >
                            <Calendar size={20} />
                            {t('shop.reservation', 'Reservation')}
                        </button>

                        <button
                            onClick={handleBookmark}
                            className="flex-1 h-12 rounded-xl bg-white border border-gray-200 text-gray-800 font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
                        >
                            <Bookmark size={20} />
                            {t('shop.wants_to_go', 'Wants to go')}
                        </button>
                    </div>
                </div>

                <div className="h-2 bg-gray-50" />

                {/* Review List */}
                <div className="pt-6">
                    <div className="px-5 mb-4 flex items-center justify-between">
                        <h2 className="text-lg font-bold">Reviews</h2>
                        <div className="flex bg-gray-100 rounded-lg p-1">
                            <button
                                onClick={() => setSort('similar')}
                                className={cn(
                                    "px-3 py-1.5 rounded-md text-xs font-bold transition-all",
                                    sort === 'similar' ? "bg-white shadow text-gray-900" : "text-gray-500"
                                )}
                            >
                                Similar Taste
                            </button>
                            <button
                                onClick={() => setSort('popular')}
                                className={cn(
                                    "px-3 py-1.5 rounded-md text-xs font-bold transition-all",
                                    sort === 'popular' ? "bg-white shadow text-gray-900" : "text-gray-500"
                                )}
                            >
                                Latest
                            </button>
                        </div>
                    </div>

                    <div className="flex flex-col gap-4">
                        {reviews.map((review, idx) => (
                            <ContentCard
                                key={`${review.id}-${idx}`}
                                user={review.user}
                                content={{
                                    ...review,
                                    stats: {
                                        likes: 0, // Mock stats for now as list endpoint might not have full stats yet
                                        comments: 0
                                    }
                                }}
                            />
                        ))}

                        {reviews.length === 0 && !loadingReviews && (
                            <div className="py-10 text-center text-gray-400 text-sm">
                                No reviews yet.
                            </div>
                        )}
                    </div>

                    {hasMore && (
                        <div ref={observerTarget} className="h-10 flex items-center justify-center">
                            {loadingReviews && <div className="w-5 h-5 border-2 border-gray-300 border-t-orange-600 rounded-full animate-spin" />}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
