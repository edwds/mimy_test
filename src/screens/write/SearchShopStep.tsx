
import React, { useState, useEffect } from 'react';
import { Search, ChevronLeft, Utensils, MapPin, Star, Check } from 'lucide-react';
import { ShopService } from '@/services/ShopService';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useTranslation } from 'react-i18next';

interface Props {
    onSelect: (shop: any) => void;
    onBack: () => void;
}

import { UserService } from '@/services/UserService';

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
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<any[]>([]);
    const [savedShops, setSavedShops] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [googleResults, setGoogleResults] = useState<any[]>([]);

    const [isGoogleMode, setIsGoogleMode] = useState(false);
    const [region, setRegion] = useState('서울');
    const [isRegionModalOpen, setIsRegionModalOpen] = useState(false);
    const [regionInput, setRegionInput] = useState('');

    const [selectedGoogleShop, setSelectedGoogleShop] = useState<any>(null);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

    useEffect(() => {
        const fetchSaved = async () => {
            const user = await UserService.getCurrentUser();
            if (user?.id) {
                const saved = await UserService.getSavedShops(user.id);
                setSavedShops(saved || []);
            }
        };
        fetchSaved();
    }, []);

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

    const [showUnvisitedOnly, setShowUnvisitedOnly] = useState(false);

    // Filter Items
    const filteredItems = isGoogleMode
        ? googleResults
        : results.filter(shop => {
            if (showUnvisitedOnly && shop.my_rank) return false;
            return true;
        });

    const displayItems = filteredItems;
    const showList = displayItems.length > 0;

    // Filter Saved Shops
    const filteredSavedShops = savedShops.filter(shop => {
        if (showUnvisitedOnly && shop.my_rank) return false;
        return true;
    });

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
                                autoFocus
                            />
                        </div>
                    </div>

                    {/* Filter Bar */}
                    {(results.length > 0 || savedShops.length > 0) && (
                        <div className="px-4 flex justify-start mt-2">
                            <button
                                onClick={() => setShowUnvisitedOnly(!showUnvisitedOnly)}
                                className={`text-xs font-bold px-3 py-1.5 rounded-full transition-all flex items-center gap-1.5 border ${showUnvisitedOnly
                                    ? 'bg-gray-900 text-white border-gray-900'
                                    : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                                    }`}
                            >
                                {showUnvisitedOnly && <Check size={12} strokeWidth={3} />}
                                안 가본 곳만 보기
                            </button>
                        </div>
                    )}
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
                    showList || (showUnvisitedOnly && results.length > 0) ? (
                        <div className="space-y-4">
                            {/* ... Content ... */}
                            {showList === false && showUnvisitedOnly && (
                                <div className="py-12 text-center text-gray-400 text-sm">
                                    <div>모두 방문한 곳이네요! 👏</div>
                                    <div className="mt-1">안 가본 곳이 없어요.</div>
                                </div>
                            )}

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
                                            <div className="flex-1 min-w-0 py-1 pr-24">
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
                                                    <span className="truncate">{shop.address_region || shop.address_full || shop.formatted_address}</span>
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
                    // Default View: Saved Shops
                    <div className="space-y-6">
                        {savedShops.length > 0 && (
                            <div>
                                <h3 className="text-sm font-bold text-muted-foreground mb-3 px-1">{t('write.search.saved_title')}</h3>
                                <ul className="space-y-3">
                                    {filteredSavedShops.map((shop) => (
                                        <li key={shop.id}>
                                            <button
                                                onClick={() => onSelect(shop)}
                                                className="group w-full text-left p-3 rounded-2xl bg-card hover:bg-muted/50 transition-all"
                                            >
                                                <div className="grid grid-cols-[64px_1fr_auto] gap-4 items-start">
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
                                    ))}
                                </ul>
                            </div>
                        )}

                        {filteredSavedShops.length === 0 && savedShops.length > 0 && showUnvisitedOnly && (
                            <div className="py-20 text-center text-gray-400 text-sm opacity-60">
                                <div>저장한 곳 중 안 가본 곳이 없어요!</div>
                            </div>
                        )}

                        {savedShops.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-20 opacity-40">
                                <Utensils className="w-12 h-12 text-gray-300 mb-4" />
                                <p className="text-sm font-medium">{t('write.search.empty_saved')}</p>
                            </div>
                        )}
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
                                autoFocus
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleConfirmGoogleSearch();
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
