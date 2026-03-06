import { useNavigate } from 'react-router-dom';
import { User as UserIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useUser } from '@/context/UserContext';
import { cn, calculateTasteMatch, getTasteBadgeStyle } from '@/lib/utils';
import { getTasteType, getTasteTypeProfile } from '@/lib/tasteType';

interface Props {
    content: {
        id: number;
        type: string;
        text: string | null;
        images: string[];
        user_id: number;
        review_prop?: any;
        poi?: any;
        user?: {
            id: number;
            nickname: string | null;
            profile_image: string | null;
            taste_result?: any;
        };
    };
}

export const MiniReviewCard: React.FC<Props> = ({ content }) => {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const { user: currentUser } = useUser();

    const shopName = content.review_prop?.shop_name || content.poi?.shop_name;
    const satisfaction = content.poi?.satisfaction ?? content.review_prop?.satisfaction;
    // 콘텐츠 자체 사진만 사용 (상점 사진 X)
    const images = content.images && content.images.length > 0 ? content.images : [];
    const imageCount = images.length;

    const handleClick = () => {
        navigate(`/content/detail?contentId=${content.id}`);
    };

    // Calculate taste type and match
    const tasteType = content.user?.taste_result?.scores ? getTasteType(content.user.taste_result) : null;
    const tasteProfile = tasteType ? getTasteTypeProfile(tasteType, 'ko') : null;
    const tasteMatch = (currentUser?.taste_result?.scores && content.user?.taste_result?.scores)
        ? calculateTasteMatch(currentUser.taste_result.scores, content.user.taste_result.scores)
        : null;

    return (
        <div
            onClick={handleClick}
            className="flex-shrink-0 w-[75vw] max-w-[300px] cursor-pointer group"
        >
            {/* Thumbnail Collage */}
            <div className="w-full aspect-[4/3] rounded-2xl overflow-hidden bg-muted mb-3">
                {imageCount === 0 ? (
                    <div className="w-full h-full bg-muted" />
                ) : imageCount === 1 ? (
                    <img
                        src={images[0]}
                        alt={shopName || ''}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                ) : imageCount === 2 ? (
                    <div className="flex gap-0.5 h-full">
                        <img src={images[0]} alt="" className="w-1/2 h-full object-cover" />
                        <img src={images[1]} alt="" className="w-1/2 h-full object-cover" />
                    </div>
                ) : imageCount === 3 ? (
                    <div className="flex gap-0.5 h-full">
                        <img src={images[0]} alt="" className="w-1/2 h-full object-cover" />
                        <div className="w-1/2 flex flex-col gap-0.5">
                            <img src={images[1]} alt="" className="w-full h-1/2 object-cover" />
                            <img src={images[2]} alt="" className="w-full h-1/2 object-cover" />
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 grid-rows-2 gap-0.5 h-full">
                        <img src={images[0]} alt="" className="w-full h-full object-cover" />
                        <img src={images[1]} alt="" className="w-full h-full object-cover" />
                        <img src={images[2]} alt="" className="w-full h-full object-cover" />
                        <div className="relative">
                            <img src={images[3]} alt="" className="w-full h-full object-cover" />
                            {imageCount > 4 && (
                                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                    <span className="text-white text-xl font-bold">+{imageCount - 4}</span>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Author row */}
            {content.user && (
                <div className="flex items-center gap-2 mb-1.5">
                    <div className="w-6 h-6 rounded-full overflow-hidden bg-muted flex-shrink-0">
                        {content.user.profile_image ? (
                            <img
                                src={content.user.profile_image}
                                alt=""
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                                <UserIcon size={12} />
                            </div>
                        )}
                    </div>
                    <span className="text-sm text-foreground font-medium truncate">
                        {content.user.nickname}
                    </span>
                    {tasteProfile && (
                        <span className={cn(
                            "text-xs font-medium truncate flex-shrink-0",
                            getTasteBadgeStyle(tasteMatch)
                        )}>
                            {tasteProfile.name}
                        </span>
                    )}
                </div>
            )}

            {/* Shop Name + Satisfaction Badge */}
            {content.type === 'review' && shopName && (
                <div className="flex items-center gap-1.5">
                    <p className="text-base font-bold text-foreground truncate">{shopName}</p>
                    {satisfaction && (
                        <span className={`text-xs font-bold flex-shrink-0 ${
                            satisfaction === 'good' ? 'text-orange-600' : satisfaction === 'bad' ? 'text-gray-400' : 'text-gray-500'
                        }`}>
                            {t(`write.basic.${satisfaction}`)}
                        </span>
                    )}
                </div>
            )}

            {/* Text snippet */}
            {content.text && (
                <p className="text-sm text-muted-foreground line-clamp-3 mt-1 leading-relaxed">
                    {content.text}
                </p>
            )}
        </div>
    );
};
