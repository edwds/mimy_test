import React from 'react';
import { MapPin, Calendar, Bookmark } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatVisitDate } from '@/lib/utils';

// Define Props interface based on the user's requirements and DB schema
interface ShopCardProps {
    shop: {
        id: number;
        name: string;
        description?: string | null;
        address_full?: string | null;
        thumbnail_img?: string | null;
        food_kind?: string | null; // e.g., "KOREAN", "CAFE"
        is_saved?: boolean; // From backend enrich
        saved_at?: string; // If saved, when it was saved
        catchtable_ref?: string;
    };
    onSave?: (shopId: number) => void;
    onWrite?: (shopId: number) => void;
    onReserve?: (shopId: number) => void; // Optional catchtable link
}

export const ShopCard: React.FC<ShopCardProps> = ({ shop, onSave, onWrite, onReserve }) => {
    return (
        <div className="bg-background border border-border rounded-xl overflow-hidden shadow-sm mb-4">
            {/* Image Area */}
            <div className="relative h-48 bg-muted">
                {shop.thumbnail_img ? (
                    <img
                        src={shop.thumbnail_img}
                        alt={shop.name}
                        className="w-full h-full object-cover border-b border-border border-gray-100"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground border-b">
                        <span className="text-4xl">🍽️</span>
                    </div>
                )}
            </div>

            {/* Content Area */}
            <div className="p-4">
                <div className="flex justify-between items-start mb-2">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-xl font-bold text-foreground">{shop.name}</h3>
                            {shop.food_kind && (
                                <span className="text-xs text-muted-foreground font-medium px-1.5 py-0.5 bg-muted rounded">
                                    {shop.food_kind}
                                </span>
                            )}
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                            {shop.description || "맛있는 경험을 제공하는 공간입니다."}
                        </p>
                    </div>
                </div>

                <div className="flex items-center text-xs text-muted-foreground mb-4">
                    <MapPin className="w-3 h-3 mr-1" />
                    <span className="truncate">{shop.address_full || "주소 정보 없음"}</span>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                    <button
                        onClick={() => {
                            if (shop.catchtable_ref) {
                                window.open(`https://app.catchtable.co.kr/ct/shop/${shop.catchtable_ref}`, '_blank');
                            } else {
                                onReserve?.(shop.id);
                            }
                        }}
                        className="flex-1 py-2 px-3 bg-muted text-foreground text-sm font-medium rounded-lg hover:bg-muted/80 flex items-center justify-center"
                    >
                        <Calendar className="w-4 h-4 mr-2" />
                        캐치테이블 예약
                    </button>
                    <button
                        onClick={() => onSave?.(shop.id)}
                        className={cn(
                            "flex-1 py-2 px-3 text-sm font-medium rounded-lg border transition-colors flex items-center justify-center",
                            shop.is_saved
                                ? "bg-primary/10 text-primary border-primary/20"
                                : "bg-transparent text-foreground border-border hover:bg-muted"
                        )}
                    >
                        <Bookmark className={cn("w-4 h-4 mr-2", shop.is_saved && "fill-current")} />
                        {shop.is_saved ? "저장됨" : "저장"}
                    </button>
                </div>
            </div>

            {/* Saved Footer (Conditional) */}
            {shop.is_saved && shop.saved_at && (
                <div className="bg-muted/30 px-4 py-3 border-t border-border flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                        저장: {formatVisitDate(shop.saved_at)}
                        <span className="mx-1">·</span>
                        <button
                            onClick={() => onWrite?.(shop.id)}
                            className="text-primary hover:underline font-medium inline-flex items-center"
                        >
                            기록 남기기
                        </button>
                    </span>
                </div>
            )}
        </div>
    );
};
