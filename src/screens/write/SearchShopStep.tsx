
import React, { useState, useEffect } from 'react';
import { Search, MapPin, ChevronLeft, Utensils } from 'lucide-react';
import { ShopService } from '@/services/ShopService';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';

interface Props {
    onSelect: (shop: any) => void;
    onBack: () => void;
}

export const SearchShopStep: React.FC<Props> = ({ onSelect, onBack }) => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

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
            <div className="px-4 py-3 flex items-center gap-3 bg-[var(--color-surface)] border-b border-[var(--color-border)] sticky top-0 z-10">
                <button
                    onClick={onBack}
                    className="p-2 -ml-2 text-[var(--color-text-primary)] hover:bg-[var(--color-gray-50)] rounded-full transition-colors"
                >
                    <ChevronLeft size={24} />
                </button>
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                        className="pl-10 h-11 bg-[var(--color-gray-50)] border-transparent focus:bg-[var(--color-surface)] focus:border-[var(--color-primary)] transition-all"
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
                ) : results.length > 0 ? (
                    <ul className="space-y-3">
                        {results.map((shop) => (
                            <li key={shop.id}>
                                <button
                                    onClick={() => onSelect(shop)}
                                    className="group w-full text-left p-3 rounded-2xl bg-[var(--color-surface)] hover:bg-[var(--color-gray-50)] transition-all flex items-start gap-4 border border-[var(--color-border)] hover:border-[var(--color-border)] hover:shadow-sm active:scale-[0.99]"
                                >
                                    <div className="w-16 h-16 bg-gray-100 rounded-xl flex-shrink-0 bg-cover bg-center border border-[var(--color-border)] overflow-hidden"
                                        style={{ backgroundImage: shop.thumbnail_img ? `url(${shop.thumbnail_img})` : undefined }}
                                    >
                                        {!shop.thumbnail_img && (
                                            <div className="w-full h-full flex items-center justify-center text-gray-400">
                                                <Utensils className="w-6 h-6" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0 py-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="font-bold text-[var(--color-text-primary)] text-lg truncate leading-tight">
                                                {shop.name}
                                            </span>
                                            <span className="text-[11px] font-bold text-[var(--color-primary)] bg-[var(--color-primary)]/10 px-2 py-0.5 rounded-full flex-shrink-0">
                                                {shop.food_kind || '음식점'}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1.5 text-sm text-[var(--color-text-secondary)]">
                                            <MapPin className="w-3.5 h-3.5 flex-shrink-0 text-[var(--color-text-tertiary)]" />
                                            <span className="truncate">{shop.address_region || shop.address_full}</span>
                                        </div>
                                    </div>
                                </button>
                            </li>
                        ))}
                    </ul>
                ) : query.length > 1 ? (
                    <div className="flex flex-col items-center justify-center py-24 text-center">
                        <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6">
                            <Search className="w-8 h-8 text-gray-300" />
                        </div>
                        <h3 className="text-lg font-bold text-[var(--color-text-primary)] mb-2">검색 결과가 없습니다</h3>
                        <p className="text-[var(--color-text-tertiary)] text-sm">
                            철자를 확인하거나 주소의 일부를 포함해서<br />다시 검색해보세요.
                        </p>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-20 opacity-40">
                        <Utensils className="w-12 h-12 text-gray-300 mb-4" />
                        <p className="text-sm font-medium">방문하신 매장을 검색해주세요</p>
                    </div>
                )}
            </div>
        </div>
    );
};
