
import React, { useState, useEffect } from 'react';
import { Search, MapPin } from 'lucide-react';
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
        <div className="flex flex-col h-full bg-[var(--color-surface)]">
            <div className="p-4 border-b border-[var(--color-border)] flex items-center gap-2">
                <button onClick={onBack} className="text-[var(--color-text-secondary)]">
                    취소
                </button>
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        className="w-full bg-[var(--color-background)] pl-10 pr-4 py-2 rounded-lg focus:outline-none"
                        placeholder="어디를 다녀오셨나요?"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        autoFocus
                    />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
                {loading ? (
                    <div className="text-center py-8 text-gray-400">검색 중...</div>
                ) : results.length > 0 ? (
                    <ul className="space-y-2">
                        {results.map((shop) => (
                            <li key={shop.id}>
                                <button
                                    onClick={() => onSelect(shop)}
                                    className="w-full text-left p-3 rounded-xl hover:bg-[var(--color-background)] flex items-start gap-3"
                                >
                                    <div className="w-12 h-12 bg-gray-200 rounded-lg flex-shrink-0 bg-cover bg-center"
                                        style={{ backgroundImage: shop.thumbnail_img ? `url(${shop.thumbnail_img})` : undefined }} />
                                    <div>
                                        <div className="font-bold text-[var(--color-text-primary)]">{shop.name}</div>
                                        <div className="text-sm text-[var(--color-text-secondary)] flex items-center gap-1">
                                            <MapPin className="w-3 h-3" />
                                            {shop.address_region || shop.address_full}
                                        </div>
                                        <div className="text-xs text-[var(--color-text-tertiary)] mt-1">{shop.food_kind}</div>
                                    </div>
                                </button>
                            </li>
                        ))}
                    </ul>
                ) : query.length > 1 ? (
                    <div className="text-center py-8 text-gray-400">검색 결과가 없습니다.</div>
                ) : (
                    <div className="text-center py-8 text-gray-400">매장 이름을 검색해주세요.</div>
                )}
            </div>
        </div>
    );
};
