
import React, { useState, useEffect } from 'react';
import { Search, MapPin, ChevronLeft, Utensils } from 'lucide-react';
import { ShopService } from '@/services/ShopService';

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
        }, 500);

        return () => clearTimeout(timer);
    }, [query]);

    return (
        <div className="flex flex-col h-full bg-[var(--color-background)]">
            <div className="p-4 border-b border-[var(--color-border)] bg-[var(--color-surface)] sticky top-0 z-10 flex items-center gap-3">
                <button onClick={onBack} className="p-2 -ml-2 text-[var(--color-text-primary)]">
                    <ChevronLeft size={24} />
                </button>
                <div className="flex-1 relative">
                    <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        className="w-full bg-[var(--color-gray-100)] pl-12 pr-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 transition-all font-medium text-[var(--color-text-primary)] placeholder-gray-400"
                        placeholder="어디를 다녀오셨나요?"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        autoFocus
                    />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
                {loading ? (
                    <div className="text-center py-12 text-gray-400 animate-pulse">검색 중...</div>
                ) : results.length > 0 ? (
                    <ul className="space-y-3">
                        {results.map((shop) => (
                            <li key={shop.id}>
                                <button
                                    onClick={() => onSelect(shop)}
                                    className="w-full text-left p-3 rounded-xl bg-[var(--color-surface)] hover:bg-[var(--color-gray-50)] transition-colors flex items-start gap-4 border border-[var(--color-border)] shadow-sm"
                                >
                                    <div className="w-14 h-14 bg-gray-200 rounded-lg flex-shrink-0 bg-cover bg-center border border-[var(--color-border)]"
                                        style={{ backgroundImage: shop.thumbnail_img ? `url(${shop.thumbnail_img})` : undefined }}
                                    >
                                        {!shop.thumbnail_img && <div className="w-full h-full flex items-center justify-center"><Utensils className="text-gray-400 w-6 h-6" /></div>}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="font-bold text-[var(--color-text-primary)] truncate">{shop.name}</div>
                                        <div className="text-xs text-[var(--color-primary)] font-medium mt-0.5">{shop.food_kind || '음식점'}</div>
                                        <div className="text-sm text-[var(--color-text-secondary)] flex items-center gap-1 mt-1 truncate">
                                            <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                                            <span className="truncate">{shop.address_region || shop.address_full}</span>
                                        </div>
                                    </div>
                                </button>
                            </li>
                        ))}
                    </ul>
                ) : query.length > 1 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center opacity-60">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                            <Search className="w-8 h-8 text-gray-400" />
                        </div>
                        <p className="text-gray-500 font-medium">검색 결과가 없습니다.</p>
                        <p className="text-sm text-gray-400 mt-1">철자를 확인하거나 다른 검색어를 입력해보세요.</p>
                    </div>
                ) : (
                    <div className="text-center py-12 text-gray-400">

                    </div>
                )}
            </div>
        </div>
    );
};
