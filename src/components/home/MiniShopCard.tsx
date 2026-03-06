import { useNavigate } from 'react-router-dom';
import { scoreToTasteRatingStep, calculateTasteMatch, cn, getTasteBadgeStyle } from '@/lib/utils';
import { getTasteType, getTasteTypeProfile } from '@/lib/tasteType';
import { formatFoodKind } from '@/lib/foodKindMap';
import { useUser } from '@/context/UserContext';

interface Props {
    shop: {
        id: number;
        name: string;
        thumbnail_img?: string | null;
        food_kind?: string | null;
        description?: string | null;
        address_region?: string | null;
        address_full?: string | null;
        shop_user_match_score?: number | null;
        reviewSnippet?: {
            id: number;
            text: string;
            user: {
                nickname: string;
                profile_image?: string | null;
                taste_result?: any;
            };
        } | null;
    };
}

export const MiniShopCard: React.FC<Props> = ({ shop }) => {
    const navigate = useNavigate();
    const { user: currentUser } = useUser();

    const handleClick = () => {
        navigate(`/main?viewShop=${shop.id}`);
    };

    const snippet = shop.reviewSnippet;

    // Calculate taste type and match with reviewer
    const reviewerTasteType = snippet?.user?.taste_result?.scores ? getTasteType(snippet.user.taste_result) : null;
    const reviewerProfile = reviewerTasteType ? getTasteTypeProfile(reviewerTasteType, 'ko') : null;
    const reviewerMatch = (snippet?.user?.taste_result?.scores && currentUser?.taste_result?.scores)
        ? calculateTasteMatch(currentUser.taste_result.scores, snippet.user.taste_result.scores)
        : null;

    return (
        <div
            onClick={handleClick}
            className="flex-shrink-0 w-[75vw] max-w-[300px] cursor-pointer group"
        >
            {/* Thumbnail with badge overlay - 3:2 ratio */}
            <div className="w-full aspect-[3/2] rounded-2xl overflow-hidden bg-muted mb-3 relative">
                {shop.thumbnail_img ? (
                    <img
                        src={shop.thumbnail_img}
                        alt={shop.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                ) : (
                    <div className="w-full h-full bg-muted flex items-center justify-center text-muted-foreground">
                        <span className="text-4xl">🍽️</span>
                    </div>
                )}

                {/* Badge overlay on image */}
                {shop.shop_user_match_score != null && (
                    <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/60 to-transparent flex items-end">
                        <div className="text-xs font-medium text-white bg-black/60 pl-2 pr-1.5 py-1 rounded-full border border-white/20 flex items-center gap-1 backdrop-blur-md shadow-sm">
                            <span>예상 평가</span>
                            <span className="text-orange-400 font-bold">
                                {scoreToTasteRatingStep(shop.shop_user_match_score).toFixed(2)}
                            </span>
                        </div>
                    </div>
                )}
            </div>

            {/* Shop Name + Food Kind */}
            <div className="flex items-center gap-1.5 mb-0.5">
                <p className="text-base font-bold text-foreground truncate">{shop.name}</p>
                {shop.food_kind && (
                    <span className="text-xs text-muted-foreground font-medium px-1.5 py-0.5 bg-muted rounded flex-shrink-0">
                        {formatFoodKind(shop.food_kind)}
                    </span>
                )}
            </div>

            {/* Shop Description */}
            {shop.description && (
                <p className="text-sm text-muted-foreground line-clamp-1 mb-1">{shop.description}</p>
            )}

            {/* Review snippet - nickname flows into text, no profile image */}
            {snippet && snippet.user && (
                <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed mt-1">
                    <span className="font-medium text-foreground">{snippet.user.nickname}</span>
                    {reviewerProfile && (
                        <span className={cn("font-medium", getTasteBadgeStyle(reviewerMatch))}> {reviewerProfile.name}</span>
                    )}
                    {' '}
                    {snippet.text}
                </p>
            )}
        </div>
    );
};
