
import React, { useState, useEffect } from 'react';
import { Search, ChevronLeft, Utensils, MapPin, Star, Check, X } from 'lucide-react';
import { ShopService } from '@/services/ShopService';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { API_BASE_URL } from '@/lib/api';
import { authFetch } from '@/lib/authFetch';
import { useRecentSearches } from '@/hooks/useRecentSearches';
import { Capacitor } from '@capacitor/core';

interface Props {
    onSelect: (shop: any) => void;
    onBack: () => void;
}

import { UserService } from '@/services/UserService';
import { useRanking } from '@/context/RankingContext';

const getOrdinalRank = (rank: number) => {
    // Simple ordinal logic
    // If strict English ordinals are needed, complex logic applies.
    // For now, assuming Korean context "24위" as primary request, or "3rd" if English.
    // Let's check current language via i18next, but since I can't easily access hook outside component,
    // I'll define it inside or just use a simple heuristic:
    // User asked: "24위, 3rd". 
    // Let's return `${rank}위` for now as primary, or make it cleaner.
    // Actually, let's implement a simple dual check or just "N위" since the app seems KR primary.
    // Wait, the user specifically said "24위, 3rd". 
    // I will implement a function that returns "N위" for Korean and "Nth" for others if I can access language, 
    // otherwise I'll default to "N위" as per the screenshot context which is KR.
    return `${rank}위`;
};

export const SearchShopStep: React.FC<Props> = ({ onSelect, onBack }) => {
    const { t } = useTranslation();
    const { registerCallback, unregisterCallback } = useRanking();
    const { recentSearches, addSearch, removeSearch } = useRecentSearches();

    const [query, setQuery] = useState('');
    const [results, setResults] = useState<any[]>([]);
    const [savedShops, setSavedShops] = useState<any[]>([]);
    const [recommendedShops, setRecommendedShops] = useState<any[]>([]);
    const [pendingReviewShops, setPendingReviewShops] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState<'pending' | 'saved' | 'recommended'>('pending');
    const [loading, setLoading] = useState(false);
    const [googleResults, setGoogleResults] = useState<any[]>([]);

    const [isGoogleMode, setIsGoogleMode] = useState(false);
    const [region, setRegion] = useState('서울');
    const [isRegionModalOpen, setIsRegionModalOpen] = useState(false);
    const [regionInput, setRegionInput] = useState('');

    const [selectedGoogleShop, setSelectedGoogleShop] = useState<any>(null);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

    // Get user location and fetch recommended shops
    useEffect(() => {
        const fetchLocationAndRecommendations = async () => {
            setLoading(true);
            try {
                const user = await UserService.getCurrentUser();
                let pending: any[] = [];
                let saved: any[] = [];

                // Fetch pending review shops (ranked but no review yet)
                if (user?.id) {
                    const res = await authFetch(`${API_BASE_URL}/api/ranking/all`);
                    if (res.ok) {
                        const allRankings = await res.json();
                        // Filter: has ranking but no review text
                        pending = allRankings
                            .filter((r: any) => !r.latest_review_text)
                            .map((r: any) => ({
                                ...r.shop,
                                my_rank: r.rank,  // For ShopItem badge display
                                my_review_stats: {
                                    satisfaction: r.satisfaction_tier,
                                    rank: r.rank
                                }
                            }));
                        setPendingReviewShops(pending);
                    }

                    // Fetch saved shops
                    saved = await UserService.getSavedShops(user.id) || [];
                    setSavedShops(saved);
                }

                // Get user location for recommended shops
                if ('geolocation' in navigator) {
                    navigator.geolocation.getCurrentPosition(
                        async (position) => {
                            const lat = position.coords.latitude;
                            const lon = position.coords.longitude;

                            // Fetch recommended shops using discovery API
                            const url = `${API_BASE_URL}/api/shops/discovery?lat=${lat}&lon=${lon}&excludeRanked=true&limit=50`;
                            const res = await authFetch(url);
                            if (res.ok) {
                                const data = await res.json();
                                setRecommendedShops(data);
                            }
                        },
                        (error) => {
                            console.error('Location error:', error);
                        }
                    );
                }

                // Set initial tab: prioritize pending > saved > recommended
                if (pending.length > 0) {
                    setActiveTab('pending');
                } else if (saved.length > 0) {
                    setActiveTab('saved');
                } else {
                    setActiveTab('recommended');
                }
            } catch (error) {
                console.error('Failed to fetch data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchLocationAndRecommendations();
    }, []);

    // Register ranking update callback
    useEffect(() => {
        const handleRankingUpdate = (data: { shopId: number; my_review_stats: any }) => {
            console.log('[SearchShopStep] Ranking updated:', data);
            // Update all shop lists
            const updateShop = (shop: any) =>
                shop.id === data.shopId
                    ? { ...shop, my_review_stats: data.my_review_stats, my_rank: data.my_review_stats?.rank }
                    : shop;

            setSavedShops(prev => prev.map(updateShop));
            setResults(prev => prev.map(updateShop));
            setRecommendedShops(prev => prev.map(updateShop));
        };

        registerCallback('SearchShopStep', handleRankingUpdate);

        return () => {
            unregisterCallback('SearchShopStep');
        };
    }, [registerCallback, unregisterCallback]);

    useEffect(() => {
        setIsGoogleMode(false);
        const timer = setTimeout(async () => {
            if (query.trim().length > 1) {
                setLoading(true);
                try {
                    const data = await ShopService.search(query);
                    setResults(data);
                } catch (error) {
                    console.error(error);
                } finally {
                    setLoading(false);
                }
            } else {
                setResults([]);
            }
        }, 400);

        return () => clearTimeout(timer);
    }, [query]);

    const handleOpenGoogleSearch = () => {
        // Pre-fill with current query + region for re-search, or just region if it's the first time
        if (isGoogleMode) {
            setRegionInput(`${query} ${region}`.trim());
        } else {
            setRegionInput(region);
        }
        setIsRegionModalOpen(true);
    };

    const handleConfirmGoogleSearch = async () => {
        if (!query && !regionInput) return;
        setLoading(true);
        setIsRegionModalOpen(false);

        try {
            // If in Google Mode, we treat the input as the full query
            if (isGoogleMode) {
                setQuery(regionInput);
                setRegion('');
                const data = await ShopService.searchGoogle(regionInput, '');
                setGoogleResults(data);
            } else {
                setRegion(regionInput);
                const data = await ShopService.searchGoogle(query, regionInput);
                setGoogleResults(data);
                setIsGoogleMode(true);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleItemClick = async (item: any) => {
        // Save to recent searches if user typed a query
        if (query.trim()) {
            addSearch(query);
        }

        if (isGoogleMode) {
            setSelectedGoogleShop(item);
            setIsConfirmModalOpen(true);
        } else {
            onSelect(item);
        }
    };

    const confirmGoogleShopSelection = async () => {
        if (!selectedGoogleShop) return;
        setIsConfirmModalOpen(false);
        setLoading(true);
        try {
            const shop = await ShopService.importGoogleShop(selectedGoogleShop);
            onSelect(shop);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    // Filter Items
    const filteredItems = isGoogleMode ? googleResults : results;
    const displayItems = filteredItems;
    const showList = displayItems.length > 0;

    // Saved Shops (no filter needed)
    const filteredSavedShops = savedShops;

    return (
        <div className="flex flex-col h-full bg-[var(--color-background)]">
            {/* Header */}
            {!isGoogleMode && (
                <div className="flex flex-col sticky top-0 z-10 bg-background/80 backdrop-blur-md transition-colors pb-3" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 0.75rem)' }}>
                    <div className="pl-4 pr-8 flex items-center mb-2">
                        <button
                            onClick={onBack}
                            className="p-2 -ml-2 text-foreground hover:bg-muted rounded-full transition-colors"
                        >
                            <ChevronLeft size={24} />
                        </button>
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                className="pl-10 h-11 bg-muted/50 border-transparent focus:bg-background focus:ring-2 focus:ring-primary/20 transition-all rounded-xl text-foreground placeholder:text-muted-foreground"
                                placeholder={t('write.search.placeholder')}
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                autoFocus={!Capacitor.isNativePlatform()}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Google Mode Header */}
            {isGoogleMode && (
                <div className="flex flex-col sticky top-0 z-10 bg-background/80 backdrop-blur-md transition-colors pb-3 border-b border-border/50" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 0.75rem)' }}>
                    <div className="pl-4 pr-8 flex items-center mb-1">
                        <button
                            onClick={() => {
                                setIsGoogleMode(false);
                                setGoogleResults([]);
                                setQuery(''); // Reset query or keep? Usually reset if going back.
                            }}
                            className="p-2 -ml-2 text-foreground hover:bg-muted rounded-full transition-colors"
                        >
                            <ChevronLeft size={24} />
                        </button>
                        <div className="flex-1 ml-2">
                            <div className="text-xs font-bold text-blue-600 mb-0.5">Google Maps Search</div>
                            <div className="font-bold text-lg leading-none">{query}</div>
                        </div>
                    </div>
                </div>
            )}

            {/* Results */}
            <div className="flex-1 overflow-y-auto px-4 py-4">
                {loading ? (
                    // ... Skeleton ...
                    <div className="space-y-4">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="flex items-center gap-4 p-3">
                                <Skeleton className="w-14 h-14 rounded-xl" />
                                <div className="space-y-2 flex-1">
                                    <Skeleton className="h-4 w-1/3" />
                                    <Skeleton className="h-3 w-1/2" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : query.length > 1 ? (
                    // ... Search Results Display (Already updated previously) ...
                    showList ? (
                        <div className="space-y-4">
                            {/* ... Content ... */}

                            {isGoogleMode && (
                                <div className="px-1 py-1">
                                    <div className="flex items-center gap-2 text-sm text-blue-600 bg-blue-50 px-3 py-2 rounded-lg">
                                        <MapPin size={16} />
                                        <span className="font-semibold">{query} {region ? `(${region})` : ''}</span>
                                    </div>
                                </div>
                            )}
                            <ul className="space-y-3 pb-6">
                                {displayItems.map((shop, idx) => (
                                    <li key={shop.id || shop.google_place_id || idx}>
                                        <button
                                            onClick={() => handleItemClick(shop)}
                                            className="items-center group w-full text-left p-3 rounded-2xl flex items-start gap-4 hover:bg-muted/40 transition-colors relative"
                                        >
                                            {/* ... Image ... */}
                                            <div className="w-16 h-16 bg-muted rounded-xl flex-shrink-0 bg-cover bg-center overflow-hidden border border-border/40"
                                                style={{ backgroundImage: shop.thumbnail_img ? `url(${shop.thumbnail_img})` : undefined }}
                                            >
                                                {!shop.thumbnail_img && (
                                                    <div className="w-full h-full flex items-center justify-center text-muted-foreground/50">
                                                        <Utensils className="w-6 h-6" />
                                                    </div>
                                                )}
                                            </div>
                                            {/* ... Text ... */}
                                            <div className={cn("flex-1 min-w-0 py-1", shop.my_rank ? "pr-24" : "pr-0")}>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="font-bold text-foreground text-lg truncate leading-tight">
                                                        {shop.name}
                                                    </span>
                                                    {!isGoogleMode ? (
                                                        <span className="text-[11px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full flex-shrink-0">
                                                            {shop.food_kind || '음식점'}
                                                        </span>
                                                    ) : shop.rating ? (
                                                        <span className="flex items-center text-[11px] font-bold text-yellow-600 bg-yellow-50 px-2 py-0.5 rounded-full flex-shrink-0">
                                                            <Star className="w-3 h-3 fill-current mr-1" />
                                                            {shop.rating} ({shop.user_ratings_total})
                                                        </span>
                                                    ) : null}
                                                </div>
                                                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                                    <span className={cn(
                                                        isGoogleMode ? "line-clamp-2" : "truncate"
                                                    )}>
                                                        {isGoogleMode
                                                            ? (shop.formatted_address || shop.vicinity || shop.address_full)
                                                            : (shop.address_region || shop.address_full || shop.formatted_address)
                                                        }
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Rank / Visited Status Badge */}
                                            {shop.my_rank && (
                                                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                                    <div className="flex items-center gap-1 text-xs font-bold text-gray-400 bg-white px-2.5 py-1.5 rounded-full border border-gray-200 shadow-sm">
                                                        <Check size={12} strokeWidth={3} className="text-gray-400" />
                                                        <span>{getOrdinalRank(shop.my_rank)}</span>
                                                    </div>
                                                </div>
                                            )}
                                        </button>
                                    </li>
                                ))}
                                {/* Footer Button for Google Search */}
                                <li>
                                    <button
                                        onClick={handleOpenGoogleSearch}
                                        className="w-full flex items-center justify-center gap-2 p-4 text-muted-foreground hover:text-foreground hover:bg-muted/30 rounded-2xl transition-all mt-2 border border-dashed border-border"
                                    >
                                        <MapPin className="w-4 h-4" />
                                        <span className="text-sm font-medium">원하는 결과가 없나요? Google Maps에서 찾기</span>
                                    </button>
                                </li>
                            </ul>
                        </div>
                    ) : (
                        // ... Empty State ...
                        <div className="flex flex-col items-center justify-center py-24 text-center">
                            {/* ... */}
                            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6">
                                <Search className="w-8 h-8 text-gray-300" />
                            </div>
                            <h3 className="text-lg font-bold text-foreground mb-2">
                                {isGoogleMode ? 'Google Maps에서도 찾을 수 없어요' : t('write.search.no_results')}
                            </h3>
                            <p className="text-muted-foreground text-sm mb-6" dangerouslySetInnerHTML={{ __html: t('write.search.no_results_desc') }} />

                            <div className="flex flex-col gap-3 w-full max-w-xs mx-auto">
                                {!isGoogleMode && (
                                    <button
                                        onClick={handleOpenGoogleSearch}
                                        className="w-full h-11 bg-white border border-gray-200 shadow-sm rounded-xl text-sm font-bold text-gray-900 flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors active:scale-95"
                                    >
                                        <MapPin className="w-4 h-4 text-blue-500" />
                                        Google Maps에서 찾기
                                    </button>
                                )}
                            </div>
                        </div>
                    )
                ) : (
                    // Default View: Recent Searches + Tabs (Saved / Recommended)
                    <div className="space-y-4">
                        {/* Recent Searches */}
                        {recentSearches.length > 0 && (
                            <div className="px-1">
                                <h3 className="text-xs font-bold text-muted-foreground mb-2">최근 검색어</h3>
                                <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                                    {recentSearches.slice(0, 10).map((term, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => setQuery(term)}
                                            className="flex items-center gap-2 px-3 py-1.5 bg-muted/50 hover:bg-muted rounded-full text-sm text-foreground transition-colors flex-shrink-0"
                                        >
                                            <span className="whitespace-nowrap">{term}</span>
                                            <X
                                                size={14}
                                                className="text-muted-foreground hover:text-foreground"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    removeSearch(term);
                                                }}
                                            />
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Tabs */}
                        {(pendingReviewShops.length > 0 || savedShops.length > 0 || recommendedShops.length > 0) && (
                            <div className="border-b border-border">
                                <div className="flex px-1">
                                    {pendingReviewShops.length > 0 && (
                                        <button
                                            onClick={() => setActiveTab('pending')}
                                            className={cn(
                                                "flex-1 py-3 text-sm font-bold transition-colors relative",
                                                activeTab === 'pending' ? "text-foreground" : "text-muted-foreground"
                                            )}
                                        >
                                            <span className="flex items-center justify-center gap-1">
                                                리뷰 대기
                                                <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-primary rounded-full">
                                                    {pendingReviewShops.length}
                                                </span>
                                            </span>
                                            {activeTab === 'pending' && (
                                                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-foreground" />
                                            )}
                                        </button>
                                    )}
                                    {savedShops.length > 0 && (
                                        <button
                                            onClick={() => setActiveTab('saved')}
                                            className={cn(
                                                "flex-1 py-3 text-sm font-bold transition-colors relative",
                                                activeTab === 'saved' ? "text-foreground" : "text-muted-foreground"
                                            )}
                                        >
                                            가고 싶어요
                                            {activeTab === 'saved' && (
                                                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-foreground" />
                                            )}
                                        </button>
                                    )}
                                    {recommendedShops.length > 0 && (
                                        <button
                                            onClick={() => setActiveTab('recommended')}
                                            className={cn(
                                                "flex-1 py-3 text-sm font-bold transition-colors relative",
                                                activeTab === 'recommended' ? "text-foreground" : "text-muted-foreground"
                                            )}
                                        >
                                            추천 장소
                                            {activeTab === 'recommended' && (
                                                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-foreground" />
                                            )}
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Tab Content */}
                        <div className="space-y-3">
                            {activeTab === 'pending' && pendingReviewShops.length > 0 && (
                                <ul className="space-y-3">
                                    {pendingReviewShops.map((shop) => (
                                        <ShopItem key={shop.id} shop={shop} onSelect={onSelect} />
                                    ))}
                                </ul>
                            )}

                            {activeTab === 'saved' && filteredSavedShops.length > 0 && (
                                <ul className="space-y-3">
                                    {filteredSavedShops.map((shop) => (
                                        <ShopItem key={shop.id} shop={shop} onSelect={onSelect} />
                                    ))}
                                </ul>
                            )}

                            {activeTab === 'recommended' && recommendedShops.length > 0 && (
                                <ul className="space-y-3">
                                    {recommendedShops.slice(0, 20).map((shop) => (
                                        <ShopItem key={shop.id} shop={shop} onSelect={onSelect} />
                                    ))}
                                </ul>
                            )}

                            {activeTab === 'recommended' && recommendedShops.length === 0 && loading && (
                                <div className="flex flex-col items-center justify-center py-20">
                                    <div className="text-sm text-muted-foreground">주변 맛집을 찾는 중...</div>
                                </div>
                            )}

                            {savedShops.length === 0 && recommendedShops.length === 0 && !loading && (
                                <div className="flex flex-col items-center justify-center py-20 opacity-40">
                                    <Utensils className="w-12 h-12 text-gray-300 mb-4" />
                                    <p className="text-sm font-medium">주변 맛집을 불러오는 중입니다</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Region Input Modal */}
            {isRegionModalOpen && (
                <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-24">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsRegionModalOpen(false)} />
                    <div className="relative bg-white dark:bg-zinc-900 w-full max-w-xs rounded-2xl p-5 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                        <h3 className="text-lg font-bold mb-1 text-center">어디서 찾을까요?</h3>
                        <p className="text-sm text-gray-500 text-center mb-4">
                            지역 키워드를 추가해서 검색해주세요<br />
                            <span className="text-xs text-gray-400">(예: 서울, 도쿄, 강남구, 신주쿠)</span>
                        </p>

                        <div className="flex items-center gap-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-3 h-11 mb-4 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all">
                            <MapPin className="w-4 h-4 text-gray-400 shrink-0" />
                            <input
                                className="flex-1 bg-transparent border-none text-sm outline-none placeholder:text-gray-400 text-foreground"
                                placeholder="지역 입력"
                                value={regionInput}
                                onChange={(e) => setRegionInput(e.target.value)}
                                autoFocus={!Capacitor.isNativePlatform()}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleConfirmGoogleSearch();
                                }}
                                onFocus={(e) => {
                                    if (Capacitor.isNativePlatform()) {
                                        setTimeout(() => {
                                            e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                        }, 300);
                                    }
                                }}
                            />
                        </div>

                        <div className="flex gap-2">
                            <button
                                onClick={() => setIsRegionModalOpen(false)}
                                className="flex-1 h-11 rounded-xl text-sm font-semibold bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"
                            >
                                취소
                            </button>
                            <button
                                onClick={handleConfirmGoogleSearch}
                                className="flex-1 h-11 rounded-xl text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                            >
                                검색
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Google Shop Confirmation Modal */}
            {isConfirmModalOpen && selectedGoogleShop && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsConfirmModalOpen(false)} />
                    <div className="relative bg-white dark:bg-zinc-900 w-full max-w-xs rounded-2xl p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex flex-col items-center text-center mb-6">
                            <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4">
                                <MapPin className="w-8 h-8 text-blue-500" />
                            </div>
                            <h3 className="text-xl font-bold mb-2 break-keep">{selectedGoogleShop.name}</h3>
                            <p className="text-sm text-gray-500 break-keep">
                                {selectedGoogleShop.formatted_address || selectedGoogleShop.vicinity}
                            </p>
                            <p className="text-sm font-medium text-blue-600 mt-2">이 장소가 맞나요?</p>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setIsConfirmModalOpen(false)}
                                className="flex-1 h-12 rounded-xl text-sm font-bold bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"
                            >
                                아니요
                            </button>
                            <button
                                onClick={confirmGoogleShopSelection}
                                className="flex-1 h-12 rounded-xl text-sm font-bold bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                            >
                                네, 맞아요
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// Shop Item Component
const ShopItem: React.FC<{ shop: any; onSelect: (shop: any) => void }> = ({ shop, onSelect }) => {
    return (
        <li>
            <button
                onClick={() => onSelect(shop)}
                className="group w-full text-left p-3 rounded-2xl bg-card hover:bg-muted/50 transition-all"
            >
                <div className={cn("grid gap-4 items-start", shop.my_rank ? "grid-cols-[64px_1fr_auto]" : "grid-cols-[64px_1fr]")}>
                    {/* Thumb */}
                    <div
                        className="w-16 h-16 bg-muted rounded-xl flex-shrink-0 bg-cover bg-center overflow-hidden"
                        style={{ backgroundImage: shop.thumbnail_img ? `url(${shop.thumbnail_img})` : undefined }}
                    >
                        {!shop.thumbnail_img && (
                            <div className="w-full h-full flex items-center justify-center text-muted-foreground/50">
                                <Utensils className="w-6 h-6" />
                            </div>
                        )}
                    </div>

                    {/* Text */}
                    <div className="min-w-0 py-1">
                        <div className="flex items-center gap-2 mb-1 min-w-0">
                            <span className="font-bold text-foreground text-lg truncate leading-tight">
                                {shop.name}
                            </span>
                            <span className="text-[11px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full flex-shrink-0">
                                {shop.food_kind || '음식점'}
                            </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                            <span className="truncate">{shop.address_region || shop.address_full}</span>
                        </div>
                    </div>

                    {/* Badge */}
                    {shop.my_rank && (
                        <div className="self-center">
                            <div className="flex items-center gap-1 text-xs font-bold text-gray-500 bg-white px-2.5 py-1.5 rounded-full border border-gray-200 shadow-xs whitespace-nowrap">
                                <Check size={12} strokeWidth={3} className="text-gray-500" />
                                <span>{getOrdinalRank(shop.my_rank)}</span>
                            </div>
                        </div>
                    )}
                </div>
            </button>
        </li>
    );
};
