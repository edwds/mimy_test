import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { scoreToTasteRatingStep } from '@/lib/utils';
import { formatFoodKind } from '@/lib/foodKindMap';

interface Shop {
    id: number;
    name: string;
    thumbnail_img?: string | null;
    food_kind?: string | null;
    description?: string | null;
    address_region?: string | null;
    shop_user_match_score?: number | null;
}

interface FoodKindGroup {
    foodKind: string;
    shops: Shop[];
}

interface Props {
    overall: Shop[];
    byFoodKind: FoodKindGroup[];
}

export const TopListCard: React.FC<Props> = ({ overall, byFoodKind }) => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [selectedFilter, setSelectedFilter] = useState<string>('all');

    const filters = [
        { key: 'all', label: t('home.sections.top_overall') },
        ...byFoodKind.map(g => ({ key: g.foodKind, label: g.foodKind })),
    ];

    const activeShops = selectedFilter === 'all'
        ? overall
        : byFoodKind.find(g => g.foodKind === selectedFilter)?.shops || [];

    return (
        <div className="px-5">
            {/* Filter Chips */}
            <div className="flex gap-2 overflow-x-auto no-scrollbar mb-4">
                {filters.map(f => (
                    <button
                        key={f.key}
                        onClick={() => setSelectedFilter(f.key)}
                        className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                            selectedFilter === f.key
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted text-muted-foreground'
                        }`}
                    >
                        {f.label}
                    </button>
                ))}
            </div>

            {/* Shop List */}
            <div className="space-y-3.5">
                {activeShops.slice(0, 10).map((shop, idx) => (
                    <div
                        key={shop.id}
                        onClick={() => navigate(`/main?viewShop=${shop.id}`)}
                        className="flex items-center gap-3 cursor-pointer"
                    >
                        <span className={`text-sm font-bold w-5 text-center flex-shrink-0 ${
                            idx < 3 ? 'text-primary' : 'text-muted-foreground'
                        }`}>
                            {idx + 1}
                        </span>

                        <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-muted">
                            {shop.thumbnail_img ? (
                                <img
                                    src={shop.thumbnail_img}
                                    alt={shop.name}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="w-full h-full bg-muted" />
                            )}
                        </div>

                        <div className="flex-1 min-w-0">
                            <p className="text-[15px] text-foreground truncate font-medium">
                                {shop.name}
                            </p>
                            {shop.food_kind && (
                                <p className="text-xs text-muted-foreground truncate">
                                    {formatFoodKind(shop.food_kind)}
                                </p>
                            )}
                        </div>

                        {shop.shop_user_match_score != null && (
                            <div className="flex items-center gap-1 flex-shrink-0">
                                <span className="text-xs text-muted-foreground">예상</span>
                                <span className="text-sm text-orange-500 font-semibold">
                                    {scoreToTasteRatingStep(shop.shop_user_match_score).toFixed(2)}
                                </span>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};
