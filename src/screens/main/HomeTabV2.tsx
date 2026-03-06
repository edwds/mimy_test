import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainHeader } from '@/components/MainHeader';
import { useSmartScroll } from '@/hooks/useSmartScroll';
import { Bell, User as UserIcon, PenLine, MapPin } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useUser } from '@/context/UserContext';
import { useRanking } from '@/context/RankingContext';
import { API_BASE_URL } from '@/lib/api';
import { authFetch } from '@/lib/authFetch';

import { HomeSection } from '@/components/home/HomeSection';
import { MiniReviewCard } from '@/components/home/MiniReviewCard';
import { MiniShopCard } from '@/components/home/MiniShopCard';
import { VsSection } from '@/components/home/VsSection';
import { SimilarTasteListCard } from '@/components/SimilarTasteListCard';
import { RegionSearchSheet } from '@/components/home/RegionSearchSheet';
import { FoodKindSheet } from '@/components/home/FoodKindSheet';
import { TopListCard } from '@/components/home/TopListCard';
import { LeaderboardTopCard } from '@/components/home/LeaderboardTopCard';
import { HomeService } from '@/services/HomeService';
import { OnboardingProgress } from '@/components/home/OnboardingProgress';

interface Props {
    refreshTrigger?: number;
    isEnabled?: boolean;
}

export const HomeTabV2: React.FC<Props> = ({ refreshTrigger, isEnabled = true }) => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { user: currentUser, loading: isUserLoading } = useUser();
    const { registerCallback, unregisterCallback } = useRanking();

    // Header
    const containerRef = useRef<HTMLDivElement>(null);
    const { isVisible: isHeaderVisible, handleScroll: onSmartScroll } = useSmartScroll(containerRef);
    const headerRef = useRef<HTMLDivElement>(null);
    const [headerHeight, setHeaderHeight] = useState(0);

    // Notification
    const [hasNewNotification, setHasNewNotification] = useState(false);

    // Section data
    const [similarTasteReviews, setSimilarTasteReviews] = useState<any[]>([]);
    const [recommendedShops, setRecommendedShops] = useState<any[]>([]);
    const [vsItems, setVsItems] = useState<any[]>([]);
    const [hateItems, setHateItems] = useState<any[]>([]);
    const [popularPosts, setPopularPosts] = useState<any[]>([]);
    const [followingFeed, setFollowingFeed] = useState<any[]>([]);
    const [banners, setBanners] = useState<any[]>([]);

    // Loading states
    const [eagerLoading, setEagerLoading] = useState(true);
    const [lazyLoaded, setLazyLoaded] = useState(false);
    const [lazyLoading, setLazyLoading] = useState(false);
    const lazyTriggerRef = useRef<HTMLDivElement>(null);

    // User location (for recommended shops)
    const [userLocation, setUserLocation] = useState<{ lat: number; lon: number } | null>(null);

    // Regional similar taste reviews
    const [regionName, setRegionName] = useState<string | null>(null);
    const [regionCoords, setRegionCoords] = useState<{ lat: number; lon: number } | null>(null);
    const [regionReviews, setRegionReviews] = useState<any[]>([]);
    const [regionLoading, setRegionLoading] = useState(false);
    const [showRegionSearch, setShowRegionSearch] = useState(false);

    // Food kind filter for regional section
    const [selectedFoodKind, setSelectedFoodKind] = useState<string | null>(null);
    const [showFoodKindSheet, setShowFoodKindSheet] = useState(false);

    // Eager similar taste lists (for Section 4, v1 style cards in horizontal scroll)
    const [eagerTasteLists, setEagerTasteLists] = useState<any[]>([]);

    // Top lists (overall + per food kind)
    const [topOverall, setTopOverall] = useState<any[]>([]);
    const [topByFoodKind, setTopByFoodKind] = useState<{ foodKind: string; shops: any[] }[]>([]);

    // Leaderboard TOP 10
    const [leaderboardGroup, setLeaderboardGroup] = useState<any[]>([]);
    const [leaderboardNeighborhood, setLeaderboardNeighborhood] = useState<any[]>([]);
    const [leaderboardOverall, setLeaderboardOverall] = useState<any[]>([]);

    // Measure header
    useEffect(() => {
        if (headerRef.current) {
            setHeaderHeight(headerRef.current.offsetHeight);
        }
    }, []);

    // Get user location
    useEffect(() => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => setUserLocation({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
                () => {} // Silently fail
            );
        }
    }, []);

    // Reverse geocode user location → regionName (display only) + set regionCoords
    useEffect(() => {
        if (!userLocation) return;

        // Set coords for API calls (initial = user's current location)
        setRegionCoords({ lat: userLocation.lat, lon: userLocation.lon });

        // Reverse geocode for display name
        const apiKey = import.meta.env.VITE_MAPTILER_API_KEY;
        if (!apiKey) return;

        const geocode = async () => {
            try {
                const res = await fetch(
                    `https://api.maptiler.com/geocoding/${userLocation.lon},${userLocation.lat}.json?key=${apiKey}`
                );
                if (!res.ok) return;
                const data = await res.json();
                const features = data.features || [];

                // Extract region: look for municipality or county level
                let region: string | null = null;
                for (const f of features) {
                    const text = f.text || '';
                    // Korean district (구) or city (시)
                    if (text.match(/구$|시$|군$/)) {
                        // Find parent province
                        const ctx = f.context || [];
                        const province = ctx.find((c: any) =>
                            (c.text || '').match(/도$|특별시$|광역시$|특별자치시$|특별자치도$/)
                        );
                        if (province) {
                            region = `${province.text} ${text}`;
                        } else {
                            region = text;
                        }
                        break;
                    }
                }
                if (region) setRegionName(region);
            } catch {
                // Silently fail
            }
        };

        geocode();
    }, [userLocation]);

    // Fetch regional similar taste reviews when regionCoords/foodKind changes or section 1 data is ready
    useEffect(() => {
        if (!regionCoords || !currentUser?.id || eagerLoading) return;

        const fetchRegionReviews = async () => {
            setRegionLoading(true);
            try {
                // Exclude content IDs already shown in section 1
                const excludeIds = similarTasteReviews.map((r: any) => r.id).filter(Boolean);
                const foodKinds = selectedFoodKind ? [selectedFoodKind] : undefined;
                const data = await HomeService.getSimilarTasteReviewsByRegion(
                    regionCoords.lat, regionCoords.lon, 5, 10, excludeIds, foodKinds
                );
                setRegionReviews(data || []);
            } catch {
                setRegionReviews([]);
            } finally {
                setRegionLoading(false);
            }
        };

        fetchRegionReviews();
    }, [regionCoords, currentUser?.id, eagerLoading, selectedFoodKind]);

    // Fetch eager sections (top 4)
    useEffect(() => {
        if (!isEnabled || isUserLoading || !currentUser?.id) return;

        const fetchEager = async () => {
            setEagerLoading(true);
            try {
                const results = await Promise.allSettled([
                    HomeService.getSimilarTasteReviews(10),
                    userLocation
                        ? HomeService.getRecommendedShops(userLocation.lat, userLocation.lon, 10)
                        : Promise.resolve([]),
                    HomeService.getVsCandidates(currentUser.id),
                    HomeService.getHateCandidates(currentUser.id),
                    HomeService.getSimilarTasteLists(5),
                ]);

                if (results[0].status === 'fulfilled') setSimilarTasteReviews(results[0].value || []);
                if (results[1].status === 'fulfilled') setRecommendedShops(results[1].value || []);
                if (results[2].status === 'fulfilled') setVsItems(results[2].value || []);
                if (results[3].status === 'fulfilled') setHateItems(results[3].value || []);
                if (results[4].status === 'fulfilled') {
                    setEagerTasteLists(results[4].value || []);
                }
            } catch (e) {
                console.error('[HomeTabV2] Eager fetch error:', e);
            } finally {
                setEagerLoading(false);
            }
        };

        fetchEager();
    }, [isEnabled, isUserLoading, currentUser?.id, userLocation]);

    // Fetch lazy sections (bottom 3) - triggered by IntersectionObserver
    const fetchLazy = useCallback(async () => {
        if (lazyLoaded || lazyLoading || !currentUser?.id) return;
        setLazyLoading(true);

        const userGroupName = currentUser?.group_name;
        const userNeighborhood = currentUser?.neighborhood;

        try {
            const results = await Promise.allSettled([
                HomeService.getPopularPosts(10),
                HomeService.getFollowingFeed(10),
                HomeService.getTopLists(),
                // Leaderboard: fetch available filters
                userGroupName
                    ? HomeService.getLeaderboardTop('company', userGroupName, 10)
                    : Promise.resolve([]),
                userNeighborhood?.value
                    ? HomeService.getLeaderboardTop('neighborhood', userNeighborhood.value, 10)
                    : Promise.resolve([]),
                HomeService.getLeaderboardTop('overall', null, 10),
            ]);

            if (results[0].status === 'fulfilled') setPopularPosts(results[0].value || []);
            if (results[1].status === 'fulfilled') setFollowingFeed(results[1].value || []);
            if (results[2].status === 'fulfilled') {
                const topData = results[2].value || {};
                setTopOverall(topData.overall || []);
                setTopByFoodKind(topData.byFoodKind || []);
            }
            if (results[3].status === 'fulfilled') setLeaderboardGroup(results[3].value || []);
            if (results[4].status === 'fulfilled') setLeaderboardNeighborhood(results[4].value || []);
            if (results[5].status === 'fulfilled') setLeaderboardOverall(results[5].value || []);
            setLazyLoaded(true);
        } catch (e) {
            console.error('[HomeTabV2] Lazy fetch error:', e);
        } finally {
            setLazyLoading(false);
        }
    }, [lazyLoaded, lazyLoading, currentUser?.id, currentUser?.group_name, currentUser?.neighborhood]);

    // IntersectionObserver for lazy loading
    useEffect(() => {
        if (!lazyTriggerRef.current || lazyLoaded) return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting) {
                    fetchLazy();
                }
            },
            { rootMargin: '200px' }
        );

        observer.observe(lazyTriggerRef.current);
        return () => observer.disconnect();
    }, [fetchLazy, lazyLoaded]);

    // Fetch banners
    useEffect(() => {
        HomeService.getBanners().then(data => setBanners(data || [])).catch(() => {});
    }, []);

    // Notification check
    useEffect(() => {
        if (!currentUser?.id) return;

        const checkNotifications = async () => {
            try {
                const res = await authFetch(`${API_BASE_URL}/api/notifications/latest?user_id=${currentUser.id}`);
                const data = await res.json();
                if (data.latest_notification) {
                    const lastCheck = localStorage.getItem('lastNotificationCheck');
                    if (!lastCheck || new Date(data.latest_notification) > new Date(lastCheck)) {
                        setHasNewNotification(true);
                    }
                }
            } catch (error) {
                console.error('Failed to check notifications:', error);
            }
        };

        checkNotifications();
        const interval = setInterval(checkNotifications, 30000);
        return () => clearInterval(interval);
    }, [currentUser?.id]);

    // Ranking update callback
    useEffect(() => {
        if (!isEnabled) return;

        const handleRankingUpdate = (data: { shopId: number; my_review_stats: any }) => {
            // Update recommended shops
            setRecommendedShops(prev =>
                prev.map(shop =>
                    shop.id === data.shopId ? { ...shop, my_review_stats: data.my_review_stats } : shop
                )
            );
            // Update similar taste reviews
            setSimilarTasteReviews(prev =>
                prev.map(item =>
                    item.poi?.shop_id === data.shopId
                        ? { ...item, poi: { ...item.poi, my_review_stats: data.my_review_stats } }
                        : item
                )
            );
            // Update regional reviews
            setRegionReviews(prev =>
                prev.map(item =>
                    item.poi?.shop_id === data.shopId
                        ? { ...item, poi: { ...item.poi, my_review_stats: data.my_review_stats } }
                        : item
                )
            );
        };

        registerCallback('HomeTabV2', handleRankingUpdate);
        return () => unregisterCallback('HomeTabV2');
    }, [isEnabled]);

    // Double-tap refresh
    useEffect(() => {
        if (refreshTrigger && refreshTrigger > 0) {
            // Reset all data and refetch
            setSimilarTasteReviews([]);
            setRecommendedShops([]);
            setVsItems([]);
            setHateItems([]);
            setEagerTasteLists([]);
            setPopularPosts([]);
            setFollowingFeed([]);
            setRegionReviews([]);
            setTopOverall([]);
            setTopByFoodKind([]);
            setLeaderboardGroup([]);
            setLeaderboardNeighborhood([]);
            setLeaderboardOverall([]);
            setLazyLoaded(false);
            setEagerLoading(true);

            if (containerRef.current) {
                containerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
            }
        }
    }, [refreshTrigger]);

    // Banner click handler (from HomeTab v1)
    const handleBannerClick = (banner: any) => {
        switch (banner.action_type) {
            case 'write': navigate('/write'); break;
            case 'link': if (banner.action_value) window.open(banner.action_value, '_blank'); break;
            case 'navigate': if (banner.action_value) navigate(banner.action_value); break;
        }
    };

    return (
        <div className="flex flex-col h-full bg-background relative overflow-hidden">
            {/* Smart Header */}
            <MainHeader
                ref={headerRef}
                title={t('home.today')}
                isVisible={isHeaderVisible}
                rightAction={
                    <div className="flex gap-4">
                        <button
                            onClick={() => {
                                navigate('/notifications');
                                setHasNewNotification(false);
                            }}
                            className="p-2 rounded-full hover:bg-muted transition-colors relative"
                        >
                            <Bell className="text-foreground" />
                            {hasNewNotification && (
                                <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border border-background" />
                            )}
                        </button>
                    </div>
                }
            />

            {/* Scrollable Content */}
            <div
                ref={containerRef}
                className="flex-1 overflow-y-auto"
                data-scroll-container="true"
                onScroll={onSmartScroll}
                style={{ paddingTop: headerHeight }}
            >
                <div className="pb-8">
                    {/* Onboarding Progress */}
                    <OnboardingProgress />

                    {/* Dynamic Banners - Carousel */}
                    {banners.length > 0 && (
                        <div className="mb-2">
                            <div className="flex overflow-x-auto snap-x snap-mandatory no-scrollbar">
                                {banners.map((banner, index) => {
                                    const titleWithName = banner.title.replace('{{name}}', currentUser?.nickname || '회원');
                                    const isFirst = index === 0;
                                    const isLast = index === banners.length - 1;
                                    const isSingle = banners.length === 1;

                                    return (
                                        <div
                                            key={banner.id}
                                            className="flex-shrink-0 snap-center"
                                            style={{
                                                width: isSingle ? '100%' : 'calc(100% - 30px)',
                                                paddingLeft: isFirst ? '20px' : '5px',
                                                paddingRight: isLast ? '20px' : '5px',
                                            }}
                                        >
                                            <div
                                                onClick={() => handleBannerClick(banner)}
                                                className="p-6 rounded-3xl shadow-sm relative overflow-hidden cursor-pointer group"
                                                style={{ background: banner.background_gradient }}
                                            >
                                                <div className="relative z-10 flex justify-between items-start">
                                                    <div className="flex-1 pr-4">
                                                        <h2 className="text-xl font-bold mb-2 text-foreground leading-tight whitespace-pre-line">
                                                            {titleWithName}
                                                        </h2>
                                                        {banner.description && (
                                                            <p className="text-muted-foreground text-sm whitespace-pre-line line-clamp-1">
                                                                {banner.description}
                                                            </p>
                                                        )}
                                                    </div>
                                                    <div className="flex relative mt-1">
                                                        {banner.icon_type === 'user' && (
                                                            <>
                                                                <div className="w-12 h-12 rounded-full border-2 border-background overflow-hidden bg-muted shadow-md z-10">
                                                                    {currentUser?.profile_image ? (
                                                                        <img src={currentUser.profile_image} alt="Profile" className="w-full h-full object-cover" />
                                                                    ) : (
                                                                        <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-400">
                                                                            <UserIcon size={20} />
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center absolute -bottom-1 -right-1 z-20 shadow-lg border-2 border-background group-hover:scale-110 transition-transform">
                                                                    <PenLine size={14} />
                                                                </div>
                                                            </>
                                                        )}
                                                        {banner.icon_type === 'pen' && (
                                                            <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg border-2 border-background group-hover:scale-110 transition-transform">
                                                                <PenLine size={20} />
                                                            </div>
                                                        )}
                                                        {banner.icon_type === 'custom' && banner.icon_url && (
                                                            <img src={banner.icon_url} alt="Banner Icon" className="w-12 h-12 rounded-full object-cover shadow-lg border-2 border-background group-hover:scale-110 transition-transform" />
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Section 1: Similar Taste Reviews */}
                    <HomeSection
                        title={t('home.sections.similar_taste_reviews_title')}
                        loading={eagerLoading}
                        empty={similarTasteReviews.length === 0}
                        onSeeAll={() => navigate('/main/feed')}
                        seeAllLabel={t('home.sections.see_all')}
                    >
                        {similarTasteReviews.map((item) => (
                            <MiniReviewCard key={item.id} content={item} />
                        ))}
                    </HomeSection>

                    {/* Section 2: Regional Similar Taste Reviews + Food Kind */}
                    {regionCoords && (
                        <HomeSection
                            title={
                                <span className="flex items-center gap-1">
                                    <button
                                        onClick={() => setShowRegionSearch(true)}
                                        className="inline-flex items-center gap-1 px-2 py-0.5 bg-muted rounded-full hover:bg-muted/80 transition-colors"
                                    >
                                        <MapPin size={14} />
                                        <span>{regionName || '현재 위치'}</span>
                                    </button>
                                    <span>근처의</span>
                                    {selectedFoodKind ? (
                                        <button
                                            onClick={() => setShowFoodKindSheet(true)}
                                            className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary/10 text-primary rounded-full hover:bg-primary/20 transition-colors"
                                        >
                                            <span>{selectedFoodKind}</span>
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => setShowFoodKindSheet(true)}
                                            className="inline-flex items-center gap-1 px-2 py-0.5 bg-muted rounded-full hover:bg-muted/80 transition-colors text-muted-foreground"
                                        >
                                            <span>{t('home.sections.food_kind_all')}</span>
                                        </button>
                                    )}
                                </span>
                            }
                            loading={regionLoading}
                            empty={regionReviews.length === 0}
                            onSeeAll={() => navigate('/main/feed')}
                            seeAllLabel={t('home.sections.see_all')}
                        >
                            {regionReviews.map((item) => (
                                <MiniReviewCard key={item.id} content={item} />
                            ))}
                        </HomeSection>
                    )}

                    {/* Section 2: Recommended Shops */}
                    <HomeSection
                        title={t('home.sections.recommended_shops')}
                        loading={eagerLoading}
                        empty={recommendedShops.length === 0}
                    >
                        {recommendedShops.map((shop) => (
                            <MiniShopCard key={shop.id} shop={shop} />
                        ))}
                    </HomeSection>

                    {/* Section 3: VS / Balance Game */}
                    {(vsItems.length > 0 || hateItems.length > 0) && (
                        <HomeSection
                            title={t('home.sections.vs_game')}
                            loading={eagerLoading}
                            empty={vsItems.length === 0 && hateItems.length === 0}
                            fullWidth
                        >
                            <VsSection vsItems={vsItems} hateItems={hateItems} />
                        </HomeSection>
                    )}

                    {/* Section 4: Similar Taste Lists (v1 style, horizontal scroll) */}
                    <HomeSection
                        title={t('home.sections.similar_taste_lists')}
                        loading={eagerLoading}
                        empty={eagerTasteLists.length === 0}
                    >
                        {eagerTasteLists.map((list) => (
                            <SimilarTasteListCard key={list.id} list={list} />
                        ))}
                    </HomeSection>

                    {/* Lazy load trigger */}
                    <div ref={lazyTriggerRef} className="h-1" />

                    {/* Section 5: TOP 10 */}
                    <HomeSection
                        title={t('home.sections.top_section', { name: currentUser?.nickname || '' })}
                        subtitle={t('home.sections.top_subtitle')}
                        loading={lazyLoading}
                        empty={topOverall.length === 0 && topByFoodKind.length === 0 && lazyLoaded}
                        fullWidth
                    >
                        <TopListCard overall={topOverall} byFoodKind={topByFoodKind} />
                    </HomeSection>

                    {/* Section 6: Leaderboard TOP 10 */}
                    {(leaderboardGroup.length > 0 || leaderboardNeighborhood.length > 0 || leaderboardOverall.length > 0) && (
                        <HomeSection
                            title={t('home.sections.leaderboard_section')}
                            subtitle={t('home.sections.leaderboard_subtitle')}
                            loading={lazyLoading}
                            empty={leaderboardGroup.length === 0 && leaderboardNeighborhood.length === 0 && leaderboardOverall.length === 0 && lazyLoaded}
                            fullWidth
                            onSeeAll={() => navigate('/main/ranking')}
                            seeAllLabel={t('home.sections.see_all')}
                        >
                            <LeaderboardTopCard
                                groupData={leaderboardGroup}
                                neighborhoodData={leaderboardNeighborhood}
                                overallData={leaderboardOverall}
                                groupName={currentUser?.group_name || null}
                                neighborhoodName={currentUser?.neighborhood?.localName || null}
                            />
                        </HomeSection>
                    )}

                    {/* Section 7: Popular Posts */}
                    <HomeSection
                        title={t('home.sections.popular_posts')}
                        loading={lazyLoading}
                        empty={popularPosts.length === 0 && lazyLoaded}
                    >
                        {popularPosts.map((item) => (
                            <MiniReviewCard key={item.id} content={item} />
                        ))}
                    </HomeSection>

                    {/* Section 7: Following Feed */}
                    <HomeSection
                        title={t('home.sections.following_feed')}
                        loading={lazyLoading}
                        empty={followingFeed.length === 0 && lazyLoaded}
                    >
                        {followingFeed.map((item) => (
                            <MiniReviewCard key={item.id} content={item} />
                        ))}
                    </HomeSection>
                </div>
            </div>

            {/* Region Search Sheet */}
            <RegionSearchSheet
                open={showRegionSearch}
                onClose={() => setShowRegionSearch(false)}
                onSelect={(region) => {
                    setRegionName(region.name);
                    setRegionCoords({ lat: region.lat, lon: region.lon });
                }}
                currentRegion={regionName || undefined}
            />

            {/* Food Kind Sheet */}
            <FoodKindSheet
                open={showFoodKindSheet}
                onClose={() => setShowFoodKindSheet(false)}
                onSelect={setSelectedFoodKind}
                currentFoodKind={selectedFoodKind}
            />
        </div>
    );
};
