
import React, { useState, useEffect } from 'react';
import { Search, MapPin, ChevronLeft, Utensils } from 'lucide-react';
import { ShopService } from '@/services/ShopService';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';

interface Props {
    onSelect: (shop: any) => void;
    onBack: () => void;
}

import { UserService } from '@/services/UserService';

export const SearchShopStep: React.FC<Props> = ({ onSelect, onBack }) => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<any[]>([]);
    const [savedShops, setSavedShops] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

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

    return (
        <div className="flex flex-col h-full bg-[var(--color-background)]">
            {/* Header */}
            <div className="px-4 py-3 flex items-center gap-3 bg-background/80 backdrop-blur-md border-b sticky top-0 z-10 transition-colors">
                <button
                    onClick={onBack}
                    className="p-2 -ml-2 text-foreground hover:bg-muted rounded-full transition-colors"
                >
                    <ChevronLeft size={24} />
                </button>
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        className="pl-10 h-11 bg-muted/50 border-transparent focus:bg-background focus:ring-2 focus:ring-primary/20 transition-all rounded-xl"
                        placeholder="매장명 또는 주소 검색"
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
                    results.length > 0 ? (
                        <ul className="space-y-3">
                            {results.map((shop) => (
                                <li key={shop.id}>
                                    <button
                                        onClick={() => onSelect(shop)}
                                        className="group w-full text-left p-3 rounded-2xl bg-card hover:bg-muted/50 transition-all flex items-start gap-4 border border-border hover:border-primary/30 hover:shadow-sm active:scale-[0.99]"
                                    >
                                        <div className="w-16 h-16 bg-muted rounded-xl flex-shrink-0 bg-cover bg-center border border-border overflow-hidden"
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
                                                <span className="font-bold text-foreground text-lg truncate leading-tight group-hover:text-primary transition-colors">
                                                    {shop.name}
                                                </span>
                                                <span className="text-[11px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full flex-shrink-0">
                                                    {shop.food_kind || '음식점'}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                                <MapPin className="w-3.5 h-3.5 flex-shrink-0 opacity-70" />
                                                <span className="truncate">{shop.address_region || shop.address_full}</span>
                                            </div>
                                        </div>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-24 text-center">
                            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6">
                                <Search className="w-8 h-8 text-gray-300" />
                            </div>
                            <h3 className="text-lg font-bold text-foreground mb-2">검색 결과가 없습니다</h3>
                            <p className="text-muted-foreground text-sm">
                                철자를 확인하거나 주소의 일부를 포함해서<br />다시 검색해보세요.
                            </p>
                        </div>
                    )
                ) : (
                    // Default View: Saved Shops
                    <div className="space-y-6">
                        {savedShops.length > 0 && (
                            <div>
                                <h3 className="text-sm font-bold text-muted-foreground mb-3 px-1">가고싶어요 저장 목록</h3>
                                <ul className="space-y-3">
                                    {savedShops.map((shop) => (
                                        <li key={shop.id}>
                                            <button
                                                onClick={() => onSelect(shop)}
                                                className="group w-full text-left p-3 rounded-2xl bg-card hover:bg-muted/50 transition-all flex items-start gap-4 border border-border hover:border-primary/30 hover:shadow-sm active:scale-[0.99]"
                                            >
                                                <div className="w-16 h-16 bg-muted rounded-xl flex-shrink-0 bg-cover bg-center border border-border overflow-hidden"
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
                                                        <span className="font-bold text-foreground text-lg truncate leading-tight group-hover:text-primary transition-colors">
                                                            {shop.name}
                                                        </span>
                                                        <span className="text-[11px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full flex-shrink-0">
                                                            {shop.food_kind || '음식점'}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                                        <MapPin className="w-3.5 h-3.5 flex-shrink-0 opacity-70" />
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
                                <p className="text-sm font-medium">방문하신 매장을 검색해주세요</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
