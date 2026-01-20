
import React, { useState, useEffect } from 'react';
import { Search, ChevronLeft, Utensils, MapPin, Star } from 'lucide-react';
import { ShopService } from '@/services/ShopService';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useTranslation } from 'react-i18next';

interface Props {
    onSelect: (shop: any) => void;
    onBack: () => void;
}

import { UserService } from '@/services/UserService';

export const SearchShopStep: React.FC<Props> = ({ onSelect, onBack }) => {
    const { t } = useTranslation();
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<any[]>([]);
    const [savedShops, setSavedShops] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [googleResults, setGoogleResults] = useState<any[]>([]);

    const [isGoogleMode, setIsGoogleMode] = useState(false);
    const [region, setRegion] = useState('서울');

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

    const handleGoogleSearch = async () => {
        if (!query) return;
        setLoading(true);
        try {
            const data = await ShopService.searchGoogle(query, region);
            setGoogleResults(data);
            setIsGoogleMode(true);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleItemClick = async (item: any) => {
        if (isGoogleMode) {
            setLoading(true);
            try {
                const shop = await ShopService.importGoogleShop(item);
                onSelect(shop);
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        } else {
            onSelect(item);
        }
    };

    const displayItems = isGoogleMode ? googleResults : results;
    const showList = displayItems.length > 0;

    return (
        <div className="flex flex-col h-full bg-[var(--color-background)]">
            {/* Header */}
            <div
                className="pl-4 pr-8 pb-3 flex items-center bg-background/80 backdrop-blur-md sticky top-0 z-10 transition-colors"
                style={{ paddingTop: 'calc(env(safe-area-inset-top) + 0.75rem)' }}
            >
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

            {/* Results */}
            <div className="flex-1 overflow-y-auto px-4 py-4">
                {loading ? (
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
                    showList ? (
                        <div className="space-y-4">
                            {isGoogleMode && (
                                <div className="px-1 py-1">
                                    <div className="flex items-center gap-2 text-sm text-blue-600 bg-blue-50 px-3 py-2 rounded-lg">
                                        <MapPin size={16} />
                                        <span className="font-semibold">Google Maps 검색 결과 ({region})</span>
                                    </div>
                                </div>
                            )}
                            <ul className="space-y-3">
                                {displayItems.map((shop, idx) => (
                                    <li key={shop.id || shop.google_place_id || idx}>
                                        <button
                                            onClick={() => handleItemClick(shop)}
                                            className="items-center group w-full text-left p-3 rounded-2xl flex items-start gap-4 hover:bg-muted/40 transition-colors"
                                        >
                                            <div className="w-16 h-16 bg-muted rounded-xl flex-shrink-0 bg-cover bg-center overflow-hidden border border-border/40"
                                                style={{ backgroundImage: shop.thumbnail_img ? `url(${shop.thumbnail_img})` : undefined }}
                                            >
                                                {!shop.thumbnail_img && (
                                                    <div className="w-full h-full flex items-center justify-center text-muted-foreground/50">
                                                        <Utensils className="w-6 h-6" />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0 py-1">
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
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-24 text-center">
                            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6">
                                <Search className="w-8 h-8 text-gray-300" />
                            </div>
                            <h3 className="text-lg font-bold text-foreground mb-2">
                                {isGoogleMode ? 'Google Maps에서도 찾을 수 없어요' : t('write.search.no_results')}
                            </h3>
                            <p className="text-muted-foreground text-sm mb-6" dangerouslySetInnerHTML={{ __html: t('write.search.no_results_desc') }} />

                            <div className="flex flex-col gap-3 w-full max-w-xs mx-auto">
                                {!isGoogleMode && (
                                    <>
                                        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 h-11 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all">
                                            <MapPin className="w-4 h-4 text-gray-400 shrink-0" />
                                            <input
                                                className="flex-1 bg-transparent border-none text-sm outline-none placeholder:text-gray-400"
                                                placeholder="지역 (예: 서울, 부산, 강남)"
                                                value={region}
                                                onChange={(e) => setRegion(e.target.value)}
                                            />
                                        </div>
                                        <button
                                            onClick={handleGoogleSearch}
                                            className="w-full h-11 bg-white border border-gray-200 shadow-sm rounded-xl text-sm font-bold text-gray-900 flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors active:scale-95"
                                        >
                                            <MapPin className="w-4 h-4 text-blue-500" />
                                            Google Maps에서 찾기
                                        </button>
                                    </>
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
                                    {savedShops.map((shop) => (
                                        <li key={shop.id}>
                                            <button
                                                onClick={() => onSelect(shop)}
                                                className="items-center group w-full text-left p-3 rounded-2xl bg-card hover:bg-muted/50 transition-all flex items-start gap-4"
                                            >
                                                <div className="w-16 h-16 bg-muted rounded-xl flex-shrink-0 bg-cover bg-center overflow-hidden"
                                                    style={{ backgroundImage: shop.thumbnail_img ? `url(${shop.thumbnail_img})` : undefined }}
                                                >
                                                    {!shop.thumbnail_img && (
                                                        <div className="w-full h-full flex items-center justify-center text-muted-foreground/50">
                                                            <Utensils className="w-6 h-6" />
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0 py-1">
                                                    <div className="flex items-center gap-2 mb-1">
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
                                            </button>
                                        </li>
                                    ))}
                                </ul>
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
        </div>
    );
};
