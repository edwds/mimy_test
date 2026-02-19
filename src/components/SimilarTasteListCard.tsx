import { useNavigate } from 'react-router-dom';
import { ChevronRight, MapPin, UtensilsCrossed, Crown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useUser } from '@/context/UserContext';
import { scoreToTasteRatingStep } from '@/lib/utils';

interface Shop {
    id: number;
    name: string;
    thumbnail: string | null;
    food_kind: string | null;
    region: string | null;
    rank: number;
    review_text: string | null;
    review_images: string[] | null;
    shop_user_match_score: number | null;
}

interface ListUser {
    id: number;
    nickname: string;
    account_id: string;
    profile_image: string | null;
    taste_match: number;
}

interface SimilarTasteList {
    id: string;
    type: 'OVERALL' | 'CATEGORY' | 'REGION';
    title: string;
    value: string | null;
    user: ListUser;
    shops: Shop[];
}

interface Props {
    list: SimilarTasteList;
}

export const SimilarTasteListCard: React.FC<Props> = ({ list }) => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { user: currentUser } = useUser();

    const handleCardClick = () => {
        const params = new URLSearchParams({
            type: list.type,
            value: list.value || '',
            title: list.title
        });
        navigate(`/list/${list.user.id}?${params.toString()}`);
    };

    const handleUserClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        navigate(`/main/profile?viewUser=${list.user.id}`);
    };

    const getTypeIcon = () => {
        switch (list.type) {
            case 'REGION':
                return <MapPin size={16} />;
            case 'CATEGORY':
                return <UtensilsCrossed size={16} />;
            default:
                return <Crown size={16} />;
        }
    };

    return (
        <div
            onClick={handleCardClick}
            className="mx-5 rounded-2xl overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
            style={{
                background: 'linear-gradient(135deg, hsl(var(--primary) / 0.03) 0%, hsl(var(--primary) / 0.07) 100%)'
            }}
        >
            {/* Header */}
            <div className="px-5 pt-5 pb-4">
                {/* Title */}
                <div className="flex items-start justify-between mb-5">
                    <div className="flex-1 pr-2">
                        <p className="text-base leading-relaxed">
                            <span className="font-medium text-foreground">
                                {currentUser?.nickname || '나'}
                            </span>
                            <span className="text-muted-foreground">님과 입맛이 </span>
                            <span className="font-semibold text-primary">
                                {list.user.taste_match}%
                            </span>
                            <span className="text-muted-foreground"> 일치하는 </span>
                            <span
                                onClick={handleUserClick}
                                className="font-medium text-foreground hover:underline cursor-pointer"
                            >
                                {list.user.nickname || list.user.account_id}
                            </span>
                            <span className="text-muted-foreground">님의</span>
                        </p>
                        <div className="flex items-center gap-1.5 mt-1 text-primary">
                            {getTypeIcon()}
                            <span className="font-bold">{list.title}</span>
                            <span className="text-muted-foreground font-normal">이에요</span>
                        </div>
                    </div>
                    <ChevronRight size={20} className="text-muted-foreground flex-shrink-0 mt-1" />
                </div>

                {/* Shop List */}
                <div className="space-y-3.5">
                    {list.shops.slice(0, 5).map((shop) => (
                        <div
                            key={shop.id}
                            className="flex items-center gap-3"
                        >
                            <div className="w-9 h-9 rounded-md overflow-hidden flex-shrink-0 bg-muted">
                                {shop.thumbnail ? (
                                    <img
                                        src={shop.thumbnail}
                                        alt={shop.name}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full bg-muted" />
                                )}
                            </div>
                            <span className="text-[15px] text-foreground truncate flex-1 font-medium">
                                {shop.name}
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
            </div>

            {/* Footer - View All */}
            <div className="px-5 py-3 border-t border-primary/5">
                <p className="text-sm text-primary font-semibold text-center">
                    {t('home.similar_taste_list.view_all', { count: list.shops.length })}
                </p>
            </div>
        </div>
    );
};
