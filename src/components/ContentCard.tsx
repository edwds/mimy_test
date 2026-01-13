import { Heart, MessageCircle, Share, MessageSquare, Bookmark } from 'lucide-react';
import { cn } from '@/lib/utils';
// import { Button } from '@/components/ui/button'; // Unused


export interface ContentCardProps {
    user: {
        nickname: string;
        account_id: string;
        profile_image: string | null;
    };
    content: {
        id: number;
        text: string;
        images: string[];
        created_at: string;
        review_prop?: {
            shop_name: string;
            shop_address?: string; // region + full
            thumbnail_img?: string;
            visit_date?: string;
            companions?: string[]; // e.g. ["UserA", "UserB"] or count
            satisfaction?: string;
            rank?: number;
        };
        stats: {
            likes: number;
            comments: number;
            is_liked?: boolean;
            is_saved?: boolean;
        }
    };
}

export const ContentCard = ({ user, content }: ContentCardProps) => {
    // Generate context string
    const contextText = content.review_prop
        ? `Visited ${content.review_prop.shop_name} ${content.review_prop.visit_date ? `on ${new Date(content.review_prop.visit_date).toLocaleDateString()}` : ''}`
        : null;

    return (
        <div className="bg-white border-b border-gray-100 pb-6 mb-2">
            {/* Header */}
            <div className="flex items-center px-5 py-4 gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-100 overflow-hidden border border-gray-100 flex-shrink-0">
                    {user.profile_image ? (
                        <img src={user.profile_image} alt={user.nickname} className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-200 text-lg">😊</div>
                    )}
                </div>
                <div className="flex flex-col">
                    <div className="flex items-center gap-1">
                        <span className="font-bold text-[15px] text-gray-900 leading-tight">{user.nickname}</span>
                        <span className="text-[13px] text-gray-400 font-normal leading-tight">@{user.account_id}</span>
                    </div>
                    {contextText && (
                        <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[13px] text-gray-500 leading-tight">
                                {contextText}
                            </span>
                            {content.review_prop?.satisfaction && (
                                <span className={cn(
                                    "text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide",
                                    content.review_prop.satisfaction === 'best' ? "bg-orange-100 text-orange-600" :
                                        content.review_prop.satisfaction === 'good' ? "bg-green-100 text-green-600" :
                                            "bg-gray-100 text-gray-500"
                                )}>
                                    {content.review_prop.satisfaction}
                                </span>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Text Body */}
            {content.text && (
                <div className="px-5 mb-3 text-[15px] leading-relaxed text-gray-800 whitespace-pre-wrap break-words">
                    {content.text}
                </div>
            )}

            {/* Image Scroll (Square) */}
            {content.images && content.images.length > 0 && (
                <div className="flex overflow-x-auto px-5 gap-2 no-scrollbar mb-4 snap-x snap-mandatory">
                    {content.images.map((img, idx) => (
                        <div key={idx} className="flex-shrink-0 w-[240px] h-[240px] rounded-lg overflow-hidden bg-gray-100 border border-gray-100 snap-center relative">
                            {/* Placeholder / Error handling could go here */}
                            <img src={img} alt={`content-${idx}`} className="w-full h-full object-cover" />
                        </div>
                    ))}
                </div>
            )}

            {/* Shop Info Card */}
            {content.review_prop && (
                <div className="mx-5 mb-4 p-3 bg-gray-50 rounded-xl flex items-center gap-3 active:bg-gray-100 transition-colors relative">
                    {/* Rank Badge */}
                    {content.review_prop.rank && (
                        <div className="absolute -top-2 -left-2 bg-yellow-400 text-white min-w-[24px] h-6 flex items-center justify-center rounded-full text-xs font-bold border-2 border-white shadow-sm z-10 px-1">
                            {content.review_prop.rank}
                        </div>
                    )}

                    <div className="w-12 h-12 rounded-lg bg-gray-200 overflow-hidden flex-shrink-0">
                        {content.review_prop.thumbnail_img ? (
                            <img src={content.review_prop.thumbnail_img} alt="Shop" className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400">🏢</div>
                        )}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="font-bold text-[14px] text-gray-900 truncate">
                            {content.review_prop.shop_name}
                        </div>
                        <div className="text-[12px] text-gray-500 truncate mt-0.5">
                            {content.review_prop.shop_address || "Location Info"}
                        </div>
                    </div>
                    <div className="flex gap-2">
                        {/* Simple Actions */}
                        <button className="text-[11px] font-bold text-orange-600 bg-orange-50 px-2.5 py-1.5 rounded-md hover:bg-orange-100 transition-colors">
                            Book
                        </button>
                    </div>
                </div>
            )}

            {/* Footer Stats & Actions */}
            <div className="px-5 pt-1">
                {/* Time & Preview */}
                <div className="flex items-center justify-between mb-3">
                    <span className="text-[12px] text-gray-400">
                        {new Date(content.created_at).toLocaleString()}
                    </span>
                    {content.stats.comments > 0 && (
                        <span className="text-[12px] text-gray-400 flex items-center gap-1">
                            <MessageCircle size={12} />
                            {content.stats.comments} comments
                        </span>
                    )}
                </div>

                {/* Function Buttons */}
                <div className="flex items-center gap-4 border-t border-gray-50 pt-3">
                    <button className="flex items-center gap-1.5 p-1 -ml-1 text-gray-600 hover:text-red-500 transition-colors">
                        <Heart size={20} className={cn(content.stats.is_liked && "fill-red-500 text-red-500")} />
                        {content.stats.likes > 0 && <span className="text-[13px] font-medium">{content.stats.likes}</span>}
                    </button>
                    <button className="flex items-center gap-1.5 p-1 text-gray-600 hover:text-blue-500 transition-colors">
                        <MessageSquare size={20} />
                    </button>
                    <div className="flex-1" /> {/* Spacer */}
                    <button className="flex items-center gap-1.5 p-1 text-gray-600 hover:text-gray-900 transition-colors">
                        <Bookmark size={20} className={cn(content.stats.is_saved && "fill-gray-900 text-gray-900")} />
                    </button>
                    <button className="flex items-center gap-1.5 p-1 text-gray-600 hover:text-gray-900 transition-colors">
                        <Share size={20} />
                    </button>
                </div>
            </div>
        </div>
    );
};
