import { MapPin, UtensilsCrossed, Crown, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { scoreToTasteRatingStep } from '@/lib/utils';

interface TopShop {
    id: number;
    name: string;
    thumbnail: string | null;
    food_kind: string | null;
    shop_user_match_score?: number | null;
}

export interface ListCardProps {
    id: string;
    type: string;
    title: string;
    count: number;
    updatedAt: string;
    author: {
        nickname: string;
        profile_image: string | null;
    };
    top_shops?: TopShop[];
    preview_images?: string[];
    center_lat?: number;
    center_lng?: number;
    onPress?: () => void;
}

const getTypeIcon = (type: string) => {
    switch (type) {
        case 'REGION':
            return <MapPin size={16} />;
        case 'CATEGORY':
            return <UtensilsCrossed size={16} />;
        default:
            return <Crown size={16} />;
    }
};

export const ListCard = ({
    type,
    title,
    count,
    author,
    top_shops,
    onPress
}: ListCardProps) => {
    const { t } = useTranslation();

    return (
        <div
            onClick={onPress}
            className="rounded-2xl overflow-hidden cursor-pointer active:scale-[0.98] transition-all"
            style={{
                background: 'linear-gradient(135deg, hsl(var(--primary) / 0.03) 0%, hsl(var(--primary) / 0.07) 100%)'
            }}
        >
            {/* Header */}
            <div className="px-5 pt-5 pb-4">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-1.5">
                        <span className="text-primary">{getTypeIcon(type)}</span>
                        <p className="text-base leading-snug">
                            <span className="font-medium text-foreground">{author.nickname}</span>
                            <span className="text-muted-foreground">님의 </span>
                            <span className="font-bold text-primary">{title}</span>
                        </p>
                    </div>
                    <ChevronRight size={20} className="text-muted-foreground flex-shrink-0" />
                </div>

                {/* Top 5 Shops */}
                {top_shops && top_shops.length > 0 && (
                    <div className="space-y-3">
                        {top_shops.slice(0, 5).map((shop, index) => (
                            <div key={shop.id} className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-md overflow-hidden flex-shrink-0 bg-muted">
                                    {shop.thumbnail ? (
                                        <img
                                            src={shop.thumbnail}
                                            alt={shop.name}
                                            className="w-full h-full object-cover"
                                            loading="lazy"
                                        />
                                    ) : (
                                        <div className="w-full h-full bg-muted" />
                                    )}
                                </div>
                                <span className="text-[15px] text-foreground truncate flex-1 font-medium">
                                    {index + 1}. {shop.name}
                                </span>
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
                )}
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-primary/5">
                <p className="text-sm text-primary font-semibold text-center">
                    {t('home.similar_taste_list.view_all', '모두 보기 ({{count}}개)', { count })}
                </p>
            </div>
        </div>
    );
};
