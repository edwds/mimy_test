import React, { useState, useEffect } from 'react';
import { Search, ChevronLeft, Utensils, X } from 'lucide-react';
import { ShopService } from '@/services/ShopService';
import { UserService } from '@/services/UserService';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useTranslation } from 'react-i18next';
import { useRecentSearches } from '@/hooks/useRecentSearches';
import { formatFoodKind } from '@/lib/foodKindMap';


interface Props {
    onSelect: (shop: any) => void;
    onClose: () => void;
}

export const DiscoverySearchOverlay: React.FC<Props> = ({ onSelect, onClose }) => {
    const { t } = useTranslation();
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<any[]>([]);
    const [savedShops, setSavedShops] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const { recentSearches, addSearch, removeSearch } = useRecentSearches();

    // Fetch Saved Shops on Mount
    useEffect(() => {
        const fetchSaved = async () => {
            try {
                const user = await UserService.getCurrentUser();
                if (user?.id) {
                    const saved = await UserService.getSavedShops(user.id);
                    setSavedShops(saved || []);
                }
            } catch (error) {
                console.error('Failed to fetch saved shops:', error);
                // Silently fail - user might not be logged in
            }
        };
        fetchSaved();
    }, []);

    // Search Debounce
    useEffect(() => {
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

    // Handle Browser Back (Swipe Back) to close overlay
    useEffect(() => {
        // Push a state to history so that "Back" action can catch it
        window.history.pushState({ overlay: 'discovery-search' }, '');

        const handlePopState = () => {
            onClose();
        };

        window.addEventListener('popstate', handlePopState);

        return () => {
            window.removeEventListener('popstate', handlePopState);
            // If the overlay is closing but the history state is still ours (user didn't use back button),
            // we should conceptually pop it. But checking history state is unreliable.
            // Safest: The close button should trigger history.back() instead of direct onClose.
        };
    }, []);

    const handleBack = () => {
        // Trigger browser back, which fires popstate, which calls onClose
        window.history.back();
    };

    const handleItemClick = async (item: any) => {
        if (query.trim()) {
            addSearch(query);
        }
        onSelect(item);
    };

    const showList = results.length > 0;

    return (
        <div className="absolute inset-0 z-50 bg-background flex flex-col animate-in slide-in-from-bottom-5 duration-200">
            {/* Header */}
            <div
                className="px-4 pb-3 flex items-center bg-background border-b border-border/50"
                style={{ paddingTop: 'calc(env(safe-area-inset-top) + 0.75rem)' }}
            >
                <button
                    onClick={handleBack}
                    className="p-2 -ml-2 text-foreground hover:bg-muted rounded-full transition-colors mr-2"
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
                    {query && (
                        <button
                            onClick={() => setQuery('')}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 rounded-full bg-gray-200 hover:bg-gray-300 text-gray-500"
                        >
                            <X size={12} />
                        </button>
                    )}
                </div>
            </div>

            {/* Content */}
            <div
                className="flex-1 overflow-y-auto px-4 py-4"
                style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 1rem)' }}
                data-scroll-container="true"
            >
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
                            <ul className="space-y-2">
                                {results.map((shop, idx) => (
                                    <li key={shop.id || idx}>
                                        <button
                                            onClick={() => handleItemClick(shop)}
                                            className="items-center group w-full text-left p-3 rounded-2xl flex items-start gap-4 hover:bg-muted/40 transition-colors"
                                        >
                                            <div className="w-14 h-14 bg-muted rounded-xl flex-shrink-0 bg-cover bg-center overflow-hidden border border-border/40"
                                                style={{ backgroundImage: shop.thumbnail_img ? `url(${shop.thumbnail_img})` : undefined }}
                                            >
                                                {!shop.thumbnail_img && (
                                                    <div className="w-full h-full flex items-center justify-center text-muted-foreground/50">
                                                        <Utensils className="w-5 h-5" />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0 py-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="font-bold text-foreground text-base truncate leading-tight">
                                                        {shop.name}
                                                    </span>
                                                    <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full flex-shrink-0">
                                                        {formatFoodKind(shop.food_kind)}
                                                    </span>
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
                            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-6">
                                <Search className="w-6 h-6 text-gray-300" />
                            </div>
                            <h3 className="text-lg font-bold text-foreground mb-2">
                                {t('write.search.no_results')}
                            </h3>
                            <p className="text-muted-foreground text-sm mb-6" dangerouslySetInnerHTML={{ __html: t('write.search.no_results_desc') }} />
                        </div>
                    )
                ) : (
                    // Default View: Saved Shops
                    <div className="space-y-6">
                        {recentSearches.length > 0 && (
                            <div className="mb-2">
                                <h3 className="text-sm font-bold text-muted-foreground mb-3 px-1">{t('write.search.recent_title', '최근 검색어')}</h3>
                                <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide">
                                    {recentSearches.map((keyword) => (
                                        <div
                                            key={keyword}
                                            className="flex items-center bg-muted/60 border border-border/40 rounded-full pl-3 pr-1 py-1.5 flex-shrink-0"
                                        >
                                            <button
                                                onClick={() => setQuery(keyword)}
                                                className="text-sm font-medium text-foreground mr-1"
                                            >
                                                {keyword}
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    removeSearch(keyword);
                                                }}
                                                className="p-1 rounded-full hover:bg-black/10 text-muted-foreground"
                                            >
                                                <X size={12} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {savedShops.length > 0 && (
                            <div>
                                <h3 className="text-sm font-bold text-muted-foreground mb-3 px-1">{t('write.search.saved_title')}</h3>
                                <ul className="space-y-2">
                                    {savedShops.map((shop) => (
                                        <li key={shop.id}>
                                            <button
                                                onClick={() => onSelect(shop)}
                                                className="items-center group w-full text-left p-2.5 rounded-2xl bg-card hover:bg-muted/50 transition-all flex items-start gap-4"
                                            >
                                                <div className="w-14 h-14 bg-muted rounded-xl flex-shrink-0 bg-cover bg-center overflow-hidden"
                                                    style={{ backgroundImage: shop.thumbnail_img ? `url(${shop.thumbnail_img})` : undefined }}
                                                >
                                                    {!shop.thumbnail_img && (
                                                        <div className="w-full h-full flex items-center justify-center text-muted-foreground/50">
                                                            <Utensils className="w-5 h-5" />
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0 py-1">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="font-bold text-foreground text-base truncate leading-tight">
                                                            {shop.name}
                                                        </span>
                                                        <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full flex-shrink-0">
                                                            {formatFoodKind(shop.food_kind)}
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
