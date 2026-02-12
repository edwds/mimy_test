import { motion } from 'framer-motion';
import { MapPin } from 'lucide-react';
import { RelayShop } from '@/services/RelayService';
import { formatFoodKind } from '@/lib/foodKindMap';

interface RelayCardStackProps {
    shops: RelayShop[];
    currentIndex: number;
}

/**
 * 카드 스택의 뒤쪽 카드들 (2번째, 3번째)을 표시
 * 활성 카드는 RelayCard에서 별도 처리
 */
export const RelayCardStack = ({ shops, currentIndex }: RelayCardStackProps) => {
    return (
        <>
            {/* 3번째 카드 (맨 뒤) */}
            {currentIndex + 2 < shops.length && (
                <motion.div
                    key={`stack-${shops[currentIndex + 2].id}`}
                    className="absolute inset-0 rounded-3xl shadow-lg overflow-hidden bg-white"
                    initial={{ scale: 0.82, y: -36, opacity: 0 }}
                    animate={{ scale: 0.88, y: -24, opacity: 1, zIndex: 1 }}
                    exit={{ scale: 0.94, y: -12, opacity: 1 }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                    style={{ transformOrigin: 'top center' }}
                >
                    <CardPreview shop={shops[currentIndex + 2]} />
                </motion.div>
            )}

            {/* 2번째 카드 (중간) */}
            {currentIndex + 1 < shops.length && (
                <motion.div
                    key={`stack-${shops[currentIndex + 1].id}`}
                    className="absolute inset-0 rounded-3xl shadow-xl overflow-hidden bg-white"
                    initial={{ scale: 0.88, y: -24, opacity: 1 }}
                    animate={{ scale: 0.94, y: -12, opacity: 1, zIndex: 2 }}
                    exit={{ scale: 1, y: 0, opacity: 1 }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                    style={{ transformOrigin: 'top center' }}
                >
                    <CardPreview shop={shops[currentIndex + 1]} />
                </motion.div>
            )}
        </>
    );
};

/**
 * 뒤쪽 카드의 간단한 프리뷰 - RelayCard와 동일한 레이아웃 구조 유지
 */
const CardPreview = ({ shop }: { shop: RelayShop }) => (
    <div className="h-full flex flex-col">
        <div className="flex-1 relative bg-gray-100 min-h-0">
            {shop.thumbnail_img ? (
                <img
                    src={shop.thumbnail_img}
                    alt={shop.name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                />
            ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                    <span className="text-6xl">🍽️</span>
                </div>
            )}
        </div>
        <div className="p-4 bg-white">
            {/* Name & Category */}
            <div className="flex items-center gap-2 mb-1 flex-wrap">
                <h2 className="text-xl font-bold truncate">{shop.name}</h2>
                {shop.food_kind && (
                    <span className="text-xs text-muted-foreground font-medium px-1.5 py-0.5 bg-muted rounded">
                        {formatFoodKind(shop.food_kind)}
                    </span>
                )}
            </div>
            {/* Description - always reserve space */}
            <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                {shop.description || '\u00A0'}
            </p>
            {/* Address & Distance - always present to match RelayCard layout */}
            <div className="flex items-center text-xs text-muted-foreground">
                <MapPin className="w-3 h-3 mr-1 flex-shrink-0" />
                <span className="truncate">
                    {shop.address_full || shop.address_region || '주소 정보 없음'}
                </span>
                {shop.distance_km > 0 && (
                    <span className="ml-2 flex-shrink-0">
                        ({shop.distance_km}km)
                    </span>
                )}
            </div>
        </div>
    </div>
);
