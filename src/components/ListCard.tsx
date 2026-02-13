import { MapPin } from 'lucide-react';
import { useTranslation } from 'react-i18next';

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
    preview_images?: string[];
    center_lat?: number;
    center_lng?: number;
    onPress?: () => void;
}

export const ListCard = ({
    type,
    title,
    count,
    preview_images,
    center_lat,
    center_lng,
    onPress
}: ListCardProps) => {
    const { t } = useTranslation();
    const apiKey = import.meta.env.VITE_MAPTILER_API_KEY;

    // Static map URL for REGION type
    const staticMapUrl = type === 'REGION' && center_lat && center_lng
        ? `https://api.maptiler.com/maps/streets-v2/static/${center_lng},${center_lat},11/300x200@2x.png?key=${apiKey}`
        : null;

    // Placeholder image for missing thumbnails
    const placeholderImg = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"%3E%3Crect fill="%23f3f4f6" width="100" height="100"/%3E%3C/svg%3E';

    return (
        <div
            onClick={onPress}
            className="bg-white rounded-2xl overflow-hidden border border-gray-100 active:scale-[0.98] transition-transform cursor-pointer shadow-sm"
        >
            {/* Image Area */}
            <div className="aspect-[4/3] relative bg-gray-100">
                {type === 'REGION' && staticMapUrl ? (
                    // Map preview for REGION
                    <div className="w-full h-full relative">
                        <img
                            src={staticMapUrl}
                            alt={title}
                            className="w-full h-full object-cover"
                            loading="lazy"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                        <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-full">
                            <MapPin className="w-3 h-3 text-gray-600" />
                            <span className="text-[10px] font-medium text-gray-700">{count}개</span>
                        </div>
                    </div>
                ) : preview_images && preview_images.length > 0 ? (
                    // 3-image grid for OVERALL/CATEGORY
                    <div className="w-full h-full flex gap-0.5">
                        {/* Main image */}
                        <div className="flex-[2] h-full">
                            <img
                                src={preview_images[0] || placeholderImg}
                                alt={title}
                                className="w-full h-full object-cover"
                                loading="lazy"
                            />
                        </div>
                        {/* Sub images */}
                        <div className="flex-1 h-full flex flex-col gap-0.5">
                            <div className="flex-1">
                                <img
                                    src={preview_images[1] || placeholderImg}
                                    alt=""
                                    className="w-full h-full object-cover"
                                    loading="lazy"
                                />
                            </div>
                            <div className="flex-1">
                                <img
                                    src={preview_images[2] || placeholderImg}
                                    alt=""
                                    className="w-full h-full object-cover"
                                    loading="lazy"
                                />
                            </div>
                        </div>
                    </div>
                ) : (
                    // Fallback placeholder
                    <div className="w-full h-full flex items-center justify-center bg-gray-100">
                        <span className="text-4xl">🍽️</span>
                    </div>
                )}
            </div>

            {/* Text Area */}
            <div className="p-3">
                <h3 className="text-sm font-bold text-gray-900 truncate leading-tight mb-1">
                    {title}
                </h3>
                <span className="text-xs text-gray-500">
                    {t('profile.list_card.shop_count', '{{count}}개 맛집', { count })}
                </span>
            </div>
        </div>
    );
};
