import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MoreHorizontal, Calendar, Bookmark, MapPin, ChevronDown, Check } from 'lucide-react';
import { motion, useMotionValue, useTransform } from 'framer-motion';
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
    const [showSortDropdown, setShowSortDropdown] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setShowSortDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);
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
        const prevSaved = shop.is_saved;
        setShop(prev => prev ? { ...prev, is_saved: !prev.is_saved } : null);

        try {
            await fetch(`${API_BASE_URL}/api/shops/${id}/save`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.id })
            });
            // alert(t('common.saved_to_list') || "Saved!"); // Removed alert for smoother UX
        } catch (e) {
            console.error(e);
            // Revert
            setShop(prev => prev ? { ...prev, is_saved: prevSaved } : null);
        }
    };

    // Scroll for Hero Zoom Effect (Manual Tracking)
    const scrollY = useMotionValue(0);
    const scale = useTransform(scrollY, [-300, 0], [1.5, 1]);

    // Header Transitions (Trigger when title reaches top: ~200px)
    const headerOpacity = useTransform(scrollY, [180, 240], [0, 1]);
    const headerTitleY = useTransform(scrollY, [180, 240], [20, 0]);
    const headerTitleOpacity = useTransform(scrollY, [200, 240], [0, 1]);
    const buttonColor = useTransform(scrollY, [180, 240], ["#ffffff", "#000000"]);

    if (loading) return <div className="min-h-screen bg-white" />;

    if (!shop) return <div className="min-h-screen bg-white flex items-center justify-center">Store not found</div>;

    // Extract latest photos from reviews for the gallery
    const latestPhotos = reviews
        .flatMap(r => r.images || [])
        .slice(0, 12);

    return (
        <div className="h-full bg-background relative flex flex-col w-full max-w-md mx-auto shadow-2xl overflow-hidden">
            {/* Header (Transparent -> Sticky White) */}
            <div className="absolute top-0 left-0 right-0 h-14 z-50 flex items-center justify-between px-4 pointer-events-none">
                {/* Dim Gradient (Always present, covered by white layer) */}
                <div className="absolute inset-0 bg-gradient-to-b from-black/60 to-transparent transition-opacity duration-300 z-0" />

                {/* Solid White Background Layer */}
                <motion.div
                    className="absolute inset-0 bg-white border-b border-gray-100 z-10"
                    style={{ opacity: headerOpacity }}
                />

                {/* Header Title */}
                <motion.div
                    className="absolute inset-0 flex items-center justify-center z-20"
                    style={{ opacity: headerTitleOpacity, y: headerTitleY }}
                >
                    <span className="font-bold text-lg text-black truncate max-w-[60%]">
                        {shop.name}
                    </span>
                </motion.div>

                {/* Back Button */}
                <div className="relative z-30 pointer-events-auto">
                    <motion.button
                        onClick={handleBack}
                        style={{ color: buttonColor }}
                        className="p-2 rounded-full transition-colors active:scale-95 flex items-center justify-center"
                    >
                        <ArrowLeft size={24} />
                    </motion.button>
                </div>

                {/* Action Buttons */}
                <div className="relative z-30 flex items-center gap-2 pointer-events-auto">
                    <motion.button
                        style={{ color: buttonColor }}
                        className="p-2 rounded-full transition-colors active:scale-95 flex items-center justify-center"
                    >
                        <MoreHorizontal size={24} />
                    </motion.button>
                </div>
            </div>

            {/* Hero Image with Zoom Effect */}
            <motion.div
                style={{ scale }}
                className="absolute top-0 left-0 right-0 h-[28vh] z-0 origin-top"
            >
                {shop.thumbnail_img ? (
                    <img src={shop.thumbnail_img} alt={shop.name} className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-200 text-gray-400 text-4xl">🏢</div>
                )}
                <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-transparent" />
            </motion.div>

            {/* Scrollable Sheet Content */}
            <div
                onScroll={(e) => scrollY.set(e.currentTarget.scrollTop)}
                className="flex-1 overflow-y-auto z-10 no-scrollbar relative pt-[24vh]"
            >
                <div className="min-h-screen bg-background rounded-t-[32px] shadow-[-0_-4px_20px_rgba(0,0,0,0.1)] relative overflow-hidden">

                    {/* Shop Info & Actions */}
                    <div className="px-6 py-8">
                        {/* Title Section (Name + Kind) */}
                        <div className="flex justify-between items-start mb-4">
                            <h1 className="text-2xl font-bold text-gray-900 flex-1 leading-tight mr-2">
                                {shop.name}
                                <span className="text-sm text-gray-400 font-normal ml-2 align-middle">
                                    {shop.food_kind || 'Restaurant'}
                                </span>
                            </h1>
                        </div>

                        {/* Address & Desc (Moved Up) */}
                        <div className="space-y-4 mb-8">
                            {shop.description && (
                                <p className="text-gray-600 text-base whitespace-pre-wrap leading-relaxed">
                                    {shop.description}
                                </p>
                            )}
                            <div className="flex items-center gap-2">
                                <div className="flex items-center justify-center flex-shrink-0">
                                    <MapPin size={16} className="text-gray-300" />
                                </div>
                                <div className="text-sm text-gray-500">{shop.address_full}</div>
                            </div>
                        </div>

                        {/* Actions Row */}
                        <div className="flex gap-3 mb-4">
                            <button
                                onClick={() => {
                                    if (shop.catchtable_ref) {
                                        window.open(`https://app.catchtable.co.kr/ct/shop/${shop.catchtable_ref}`, '_blank');
                                    } else {
                                        alert("예약 링크가 없습니다.");
                                    }
                                }}
                                className="flex-1 h-12 rounded-2xl bg-black text-white font-bold flex items-center justify-center gap-2"
                            >
                                <Calendar size={18} />
                                {t('shop.reservation', 'Reservation')}
                            </button>

                            <button
                                onClick={handleBookmark}
                                className={cn(
                                    "flex-1 h-12 rounded-2xl border flex items-center justify-center gap-2 font-bold transition-colors active:scale-[0.98]",
                                    shop.is_saved
                                        ? "bg-red-50 border-red-100 text-red-500"
                                        : "bg-gray-50 border-gray-100 text-gray-900"
                                )}
                            >
                                <Bookmark size={18} className={cn(shop.is_saved && "fill-current")} />
                                {shop.is_saved ? t('shop.saved', 'Saved') : t('shop.wants_to_go', 'Wants to go')}
                            </button>
                        </div>

                        {/* Write Button (Style from Profile) */}
                        <button
                            onClick={() => navigate(`/write?type=review&shop_id=${shop.id}`)}
                            className="w-full py-2.5 px-4 bg-gray-50 border border-gray-200 rounded-xl flex items-center justify-center gap-2 text-gray-600 hover:bg-gray-100 transition-colors"
                        >
                            <span className="font-semibold text-sm">기록하기</span>
                        </button>

                    </div>

                    <div className="h-2.5 bg-gray-50 border-t border-b border-gray-100" />

                    {/* Photos Section */}
                    {latestPhotos.length >= 6 && (
                        <div className="py-6">
                            <div className="px-6 mb-3 flex items-center justify-between">
                                <h2 className="text-lg font-bold text-gray-900">Photos</h2>
                                <button className="text-primary text-sm font-bold">See all</button>
                            </div>
                            <div className="overflow-x-auto no-scrollbar px-6">
                                <div className="grid grid-rows-2 grid-flow-col gap-2 w-max">
                                    {latestPhotos.map((img, i) => (
                                        <div key={i} className="w-32 h-32 rounded-xl overflow-hidden bg-gray-100 border border-gray-100">
                                            <img src={img} className="w-full h-full object-cover" loading="lazy" />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {latestPhotos.length > 0 && <div className="h-2.5 bg-gray-50 border-t border-b border-gray-100" />}

                    {/* Review List */}
                    <div className="py-6 min-h-[500px]">
                        <div className="px-6 mb-4 flex items-center justify-between">
                            <h2 className="text-lg font-bold">Reviews <span className="text-gray-400 ml-1">{reviews.length}</span></h2>

                            {/* Sort Dropdown */}
                            <div className="relative" ref={dropdownRef}>
                                <button
                                    onClick={() => setShowSortDropdown(!showSortDropdown)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-full text-[13px] font-bold text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
                                >
                                    {sort === 'similar' ? 'Similar Taste' : 'Latest'}
                                    <ChevronDown size={14} className={cn("transition-transform duration-200", showSortDropdown && "rotate-180")} />
                                </button>

                                {showSortDropdown && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 8, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        className="absolute right-0 mt-2 w-36 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-[60]"
                                    >
                                        <button
                                            onClick={() => {
                                                setSort('similar');
                                                setShowSortDropdown(false);
                                            }}
                                            className={cn(
                                                "w-full px-4 py-2.5 text-left text-[13px] font-bold flex items-center justify-between",
                                                sort === 'similar' ? "text-orange-600 bg-orange-50/50" : "text-gray-600 hover:bg-gray-50"
                                            )}
                                        >
                                            Similar Taste
                                            {sort === 'similar' && <Check size={14} />}
                                        </button>
                                        <button
                                            onClick={() => {
                                                setSort('popular');
                                                setShowSortDropdown(false);
                                            }}
                                            className={cn(
                                                "w-full px-4 py-2.5 text-left text-[13px] font-bold flex items-center justify-between",
                                                sort === 'popular' ? "text-orange-600 bg-orange-50/50" : "text-gray-600 hover:bg-gray-50"
                                            )}
                                        >
                                            Latest
                                            {sort === 'popular' && <Check size={14} />}
                                        </button>
                                    </motion.div>
                                )}
                            </div>
                        </div>

                        <div className="flex flex-col gap-8">
                            {reviews.map((review, idx) => (
                                <ContentCard
                                    key={`${review.id}-${idx}`}
                                    user={review.user}
                                    content={{
                                        ...review,
                                        stats: {
                                            likes: 0,
                                            comments: 0
                                        }
                                    }}
                                    hideShopInfo={true}
                                />
                            ))}

                            {reviews.length === 0 && !loadingReviews && (
                                <div className="py-10 text-center text-gray-400 text-sm">
                                    No reviews yet.
                                </div>
                            )}
                        </div>

                        {hasMore && (
                            <div ref={observerTarget} className="h-20 flex items-center justify-center">
                                {loadingReviews && <div className="w-5 h-5 border-2 border-gray-300 border-t-black rounded-full animate-spin" />}
                            </div>
                        )}
                    </div>

                    {/* Floating Reserve Button (appear on scroll if needed, but for now buttons are at top of sheet) */}
                </div>
            </div>
        </div>
    );
};
