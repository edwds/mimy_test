import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useUser } from '@/context/UserContext';
import { useRanking } from '@/context/RankingContext';
import { API_BASE_URL } from '@/lib/api';
import { authFetch } from '@/lib/authFetch';
import { ChevronLeft, Loader2, MapPin, ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ContentCard } from '@/components/ContentCard';
import { RegionSearchSheet } from '@/components/home/RegionSearchSheet';
import { FoodKindSheet } from '@/components/home/FoodKindSheet';
import { MainHeader } from '@/components/MainHeader';
import { FilterChip } from '@/components/FilterChip';
import { useSmartScroll } from '@/hooks/useSmartScroll';

type FilterType = 'similar_taste' | 'similar_taste_region' | 'follow' | 'like';

const FILTER_KEYS: FilterType[] = ['similar_taste', 'similar_taste_region', 'follow', 'like'];

const FILTER_LABEL_MAP: Record<FilterType, string> = {
    similar_taste: 'feed.filters.similar_taste',
    similar_taste_region: 'feed.filters.region',
    follow: 'feed.filters.following',
    like: 'feed.filters.like',
};

export const HomeFeedScreen = ({ isTab = false }: { isTab?: boolean }) => {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const [searchParams] = useSearchParams();
    const { user, coordinates } = useUser();
    const { registerCallback, unregisterCallback } = useRanking();

    // Initial values from URL params
    const initialFilter = (searchParams.get('filter') as FilterType) || 'similar_taste';
    const initialRegionLat = searchParams.get('regionLat');
    const initialRegionLon = searchParams.get('regionLon');
    const initialRegionName = searchParams.get('regionName');
    const initialFoodKinds = searchParams.get('foodKinds');

    // Active filter state
    const [activeFilter, setActiveFilter] = useState<FilterType>(
        FILTER_KEYS.includes(initialFilter) ? initialFilter : 'similar_taste'
    );

    // Region sub-filter state
    const [regionName, setRegionName] = useState<string | null>(initialRegionName);
    const [regionLat, setRegionLat] = useState<string | null>(initialRegionLat);
    const [regionLon, setRegionLon] = useState<string | null>(initialRegionLon);
    const [selectedFoodKind, setSelectedFoodKind] = useState<string | null>(initialFoodKinds);

    // Sheet visibility
    const [regionSheetOpen, setRegionSheetOpen] = useState(false);
    const [foodKindSheetOpen, setFoodKindSheetOpen] = useState(false);

    // Content state
    const [contents, setContents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);

    const pageRef = useRef(1);
    const loadingMoreRef = useRef(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Smart header (tab mode)
    const { isVisible: isHeaderVisible, handleScroll: onSmartScroll } = useSmartScroll(containerRef);
    const headerRef = useRef<HTMLDivElement>(null);
    const [headerHeight, setHeaderHeight] = useState(0);

    useEffect(() => {
        const el = headerRef.current;
        if (!el) return;
        const update = () => {
            const h = el.offsetHeight;
            if (h > 0) setHeaderHeight(h);
        };
        update();
        const ro = new ResizeObserver(update);
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    // When switching to region filter without pre-set coords, use current location + reverse geocode
    const regionInitializedRef = useRef(false);
    useEffect(() => {
        if (activeFilter !== 'similar_taste_region') {
            regionInitializedRef.current = false;
            return;
        }
        // Skip if already has coords from URL params or previous selection
        if (regionLat || regionInitializedRef.current) return;
        regionInitializedRef.current = true;

        if (!coordinates) return;

        setRegionLat(coordinates.lat.toString());
        setRegionLon(coordinates.lon.toString());
        setSelectedFoodKind(null);

        // Reverse geocode for display name (same logic as HomeTabV2)
        const apiKey = import.meta.env.VITE_MAPTILER_API_KEY;
        if (!apiKey) return;

        (async () => {
            try {
                const res = await fetch(
                    `https://api.maptiler.com/geocoding/${coordinates.lon},${coordinates.lat}.json?key=${apiKey}`
                );
                if (!res.ok) return;
                const data = await res.json();
                const features = data.features || [];

                for (const f of features) {
                    const text = f.text || '';
                    if (text.match(/구$|시$|군$/)) {
                        const ctx = f.context || [];
                        const province = ctx.find((c: any) =>
                            (c.text || '').match(/도$|특별시$|광역시$|특별자치시$|특별자치도$/)
                        );
                        setRegionName(province ? `${province.text} ${text}` : text);
                        return;
                    }
                }
            } catch {
                // Silently fail
            }
        })();
    }, [activeFilter, regionLat, coordinates]);

    const fetchContents = useCallback(async (pageNum: number, isInitial: boolean) => {
        if (!user?.id) return;

        if (isInitial) {
            setLoading(true);
        } else {
            setLoadingMore(true);
            loadingMoreRef.current = true;
        }

        try {
            const params = new URLSearchParams({
                filter: activeFilter,
                page: pageNum.toString(),
            });

            if (activeFilter === 'similar_taste_region') {
                if (regionLat) params.append('regionLat', regionLat);
                if (regionLon) params.append('regionLon', regionLon);
                if (selectedFoodKind) params.append('foodKinds', selectedFoodKind);
            }

            const LIMIT = 20;
            params.set('limit', LIMIT.toString());

            const res = await authFetch(`${API_BASE_URL}/api/content/feed?${params}`);
            const data = await res.json();

            if (!Array.isArray(data) || data.length < LIMIT) {
                setHasMore(false);
            }

            if (isInitial) {
                setContents(Array.isArray(data) ? data : []);
            } else {
                setContents(prev => [...prev, ...(Array.isArray(data) ? data : [])]);
            }
        } catch (error) {
            console.error('Failed to fetch feed:', error);
        } finally {
            setLoading(false);
            setLoadingMore(false);
            loadingMoreRef.current = false;
        }
    }, [user?.id, activeFilter, regionLat, regionLon, selectedFoodKind]);

    // Fetch on filter/params change
    useEffect(() => {
        pageRef.current = 1;
        setHasMore(true);
        if (containerRef.current) {
            containerRef.current.scrollTop = 0;
        }
        fetchContents(1, true);
    }, [fetchContents]);

    // Ranking update callback
    useEffect(() => {
        const handleRankingUpdate = (data: { shopId: number; my_review_stats: any }) => {
            setContents(prev =>
                prev.map(item =>
                    item.poi?.shop_id === data.shopId
                        ? { ...item, poi: { ...item.poi, my_review_stats: data.my_review_stats } }
                        : item
                )
            );
        };

        registerCallback('HomeFeedScreen', handleRankingUpdate);
        return () => unregisterCallback('HomeFeedScreen');
    }, []);

    const handleScroll = () => {
        if (!containerRef.current || loadingMoreRef.current || !hasMore) return;

        const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
        if (scrollHeight - scrollTop <= clientHeight + 300) {
            pageRef.current += 1;
            fetchContents(pageRef.current, false);
        }
    };

    const handleFilterChange = (filter: FilterType) => {
        if (filter === activeFilter) return;
        setActiveFilter(filter);
        setContents([]);
    };

    const handleRegionSelect = (region: { name: string; lat: number; lon: number }) => {
        setRegionName(region.name);
        setRegionLat(region.lat.toString());
        setRegionLon(region.lon.toString());
    };

    const handleFoodKindSelect = (foodKind: string | null) => {
        setSelectedFoodKind(foodKind);
    };

    const filterChips = (
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            {FILTER_KEYS.map((key) => (
                <FilterChip
                    key={key}
                    label={t(FILTER_LABEL_MAP[key])}
                    isActive={activeFilter === key}
                    onClick={() => handleFilterChange(key)}
                />
            ))}
        </div>
    );

    const regionChips = activeFilter === 'similar_taste_region' && (
        <div className="flex gap-2 py-2.5">
            <button
                onClick={() => setRegionSheetOpen(true)}
                className="flex items-center gap-1 px-3 py-1.5 text-sm bg-muted/60 rounded-full hover:bg-muted"
            >
                <MapPin size={14} className="text-muted-foreground" />
                <span>{regionName || t('home.sections.search_region')}</span>
                <ChevronDown size={14} className="text-muted-foreground" />
            </button>
            <button
                onClick={() => setFoodKindSheetOpen(true)}
                className="flex items-center gap-1 px-3 py-1.5 text-sm bg-muted/60 rounded-full hover:bg-muted"
            >
                <span>{selectedFoodKind || t('home.sections.food_kind_all')}</span>
                <ChevronDown size={14} className="text-muted-foreground" />
            </button>
        </div>
    );

    if (isTab) {
        return (
            <div className="flex flex-col h-full bg-background relative overflow-hidden">
                <MainHeader
                    ref={headerRef}
                    title={t('feed.community')}
                    isVisible={isHeaderVisible}
                />

                <main
                    ref={containerRef}
                    className="flex-1 overflow-y-auto"
                    data-scroll-container="true"
                    onScroll={() => { onSmartScroll(); handleScroll(); }}
                    style={{ paddingTop: headerHeight }}
                >
                    <div className="px-5 mb-4">
                        <div className="flex flex-col gap-4 mb-6">
                            {filterChips}
                            {regionChips}
                        </div>
                    </div>
                    {loading ? (
                        <div className="flex-1 flex items-center justify-center py-20">
                            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : contents.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20">
                            <p className="text-sm text-muted-foreground">{t('home.empty')}</p>
                        </div>
                    ) : (
                        <div className="pb-20">
                            {contents.map((item: any) => (
                                <div key={item.id} className="mb-4">
                                    <ContentCard user={item.user} content={item} showActions={true} />
                                </div>
                            ))}
                            {loadingMore && (
                                <div className="flex justify-center py-4">
                                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                                </div>
                            )}
                            {!hasMore && contents.length > 0 && (
                                <div className="flex justify-center py-8">
                                    <p className="text-sm text-muted-foreground">{t('home.end')}</p>
                                </div>
                            )}
                        </div>
                    )}
                </main>

                <RegionSearchSheet open={regionSheetOpen} onClose={() => setRegionSheetOpen(false)} onSelect={handleRegionSelect} currentRegion={regionName || undefined} />
                <FoodKindSheet open={foodKindSheetOpen} onClose={() => setFoodKindSheetOpen(false)} onSelect={handleFoodKindSelect} currentFoodKind={selectedFoodKind} />
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-background">
            <header className="sticky top-0 z-20 bg-background">
                <div className="flex items-center h-14 px-4">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 -ml-2 hover:bg-muted rounded-full"
                    >
                        <ChevronLeft className="w-6 h-6" />
                    </button>
                    <h1 className="ml-2 text-lg font-semibold">{t('feed.title')}</h1>
                </div>
                {filterChips}
                {regionChips}
            </header>

            <main
                ref={containerRef}
                className="flex-1 overflow-y-auto"
                data-scroll-container="true"
                onScroll={handleScroll}
            >
                {loading ? (
                    <div className="flex-1 flex items-center justify-center py-20">
                        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                    </div>
                ) : contents.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20">
                        <p className="text-sm text-muted-foreground">{t('home.empty')}</p>
                    </div>
                ) : (
                    <div className="pb-20">
                        {contents.map((item: any) => (
                            <div key={item.id} className="mb-4">
                                <ContentCard
                                    user={item.user}
                                    content={item}
                                    showActions={true}
                                />
                            </div>
                        ))}

                        {loadingMore && (
                            <div className="flex justify-center py-4">
                                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                            </div>
                        )}

                        {!hasMore && contents.length > 0 && (
                            <div className="flex justify-center py-8">
                                <p className="text-sm text-muted-foreground">{t('home.end')}</p>
                            </div>
                        )}
                    </div>
                )}
            </main>

            {/* Region Search Sheet */}
            <RegionSearchSheet
                open={regionSheetOpen}
                onClose={() => setRegionSheetOpen(false)}
                onSelect={handleRegionSelect}
                currentRegion={regionName || undefined}
            />

            {/* Food Kind Sheet */}
            <FoodKindSheet
                open={foodKindSheetOpen}
                onClose={() => setFoodKindSheetOpen(false)}
                onSelect={handleFoodKindSelect}
                currentFoodKind={selectedFoodKind}
            />
        </div>
    );
};
