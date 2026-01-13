import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Heart, MessageCircle, Share, MessageSquare, Bookmark } from 'lucide-react';
import { cn } from '@/lib/utils';

type Satisfaction = 'best' | 'good' | 'ok' | string;

type ContentBodyProps = {
    text: string;
    maxLines?: number;
    className?: string;
};

export const ContentBody = ({ text, maxLines = 10, className }: ContentBodyProps) => {
    const ref = useRef<HTMLDivElement>(null);
    const [expanded, setExpanded] = useState(false);
    const [canExpand, setCanExpand] = useState(false);
    const [lineHeightPx, setLineHeightPx] = useState<number | null>(null);

    const measure = () => {
        const el = ref.current;
        if (!el) return;

        const cs = window.getComputedStyle(el);
        const lh = parseFloat(cs.lineHeight);
        if (!Number.isFinite(lh)) return;

        setLineHeightPx(lh);

        const maxH = lh * maxLines;
        const isOverflow = el.scrollHeight > Math.ceil(maxH + 1);
        setCanExpand(isOverflow);
    };

    useLayoutEffect(() => {
        setExpanded(false);
    }, [text]);

    useEffect(() => {
        measure();
        const onResize = () => measure();
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [text, maxLines]);

    const maxHeight = useMemo(() => {
        if (!lineHeightPx) return undefined;
        return `${lineHeightPx * maxLines}px`;
    }, [lineHeightPx, maxLines]);

    return (
        <div className={cn('px-5 mb-3', className)}>
            <div
                ref={ref}
                className={cn(
                    'text-lg leading-relaxed text-gray-800 whitespace-pre-wrap break-words',
                    !expanded && canExpand && 'overflow-hidden'
                )}
                style={!expanded && canExpand ? { maxHeight } : undefined}
            >
                {text}
            </div>

            {canExpand && (
                <button
                    type="button"
                    onClick={() => setExpanded(v => !v)}
                    className="mt-2 text-[13px] font-semibold text-gray-600 hover:text-gray-900"
                >
                    {expanded ? '접기' : '더보기'}
                </button>
            )}
        </div>
    );
};

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

        // REVIEW: visit metadata only
        review_prop?: {
            shop_name: string;
            shop_address?: string;
            thumbnail_img?: string;
            visit_date?: string;
            companions?: string[];
            rank?: number;
            satisfaction?: Satisfaction;
        };

        // POI: move rank/satisfaction here (or keep under review_prop if you want, but per request: POI side)
        poi?: {
            shop_name?: string;
            shop_address?: string;
            thumbnail_img?: string;
            rank?: number;
            satisfaction?: Satisfaction;
            is_bookmarked?: boolean;
        };

        stats: {
            likes: number;
            comments: number;
            is_liked?: boolean;
        };
    };

    // Optional handlers (wire later)
    onToggleLike?: (contentId: number) => void;
    onOpenComments?: (contentId: number) => void;
    onShare?: (contentId: number) => void;

    onTogglePoiBookmark?: (contentId: number) => void;
    onReservePoi?: (contentId: number) => void;
}

const satisfactionBadgeClass = (s: Satisfaction) => {
    if (s === 'best') return 'bg-orange-100 text-orange-600';
    if (s === 'good') return 'bg-green-100 text-green-600';
    if (s === 'ok') return 'bg-gray-100 text-gray-600';
    return 'bg-gray-100 text-gray-600';
};

export const ContentCard = ({
    user,
    content,
    onToggleLike,
    onOpenComments,
    onShare,
    onTogglePoiBookmark,
    onReservePoi
}: ContentCardProps) => {
    // Display shop info (prefer POI, fallback to review_prop)
    const shopName = content.poi?.shop_name ?? content.review_prop?.shop_name;
    const shopAddress = content.poi?.shop_address ?? content.review_prop?.shop_address;
    const shopThumbnail = content.poi?.thumbnail_img ?? content.review_prop?.thumbnail_img;
    const rank = content.poi?.rank ?? content.review_prop?.rank;
    const satisfaction = content.poi?.satisfaction ?? (content.review_prop?.satisfaction as Satisfaction | undefined);
    const isPoiBookmarked = !!content.poi?.is_bookmarked;

    const contextText = shopName
        ? `Visited ${shopName} ${content.review_prop?.visit_date
            ? `on ${new Date(content.review_prop.visit_date).toLocaleDateString()}`
            : ''
        }`
        : null;

    return (
        <div className="bg-white pb-6 mb-6">
            {/* Header */}
            <div className="flex items-center px-5 py-4 gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-100 overflow-hidden border border-gray-100 flex-shrink-0">
                    {user.profile_image ? (
                        <img src={user.profile_image} alt={user.nickname} className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-200 text-lg">😊</div>
                    )}
                </div>

                <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-1 min-w-0">
                        <span className="font-bold text-[15px] text-gray-900 leading-tight truncate">
                            {user.nickname}
                        </span>
                        <span className="text-[13px] text-gray-400 font-normal leading-tight truncate">
                            @{user.account_id}
                        </span>
                    </div>

                    {contextText && (
                        <div className="flex items-center gap-2 mt-0.5 min-w-0">
                            <span className="text-[13px] text-gray-500 leading-tight truncate">{contextText}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Text Body */}
            {content.text && <ContentBody text={content.text} maxLines={10} />}

            {/* Image Scroll (Square) */}
            {content.images && content.images.length > 0 && (
                <div className="flex overflow-x-auto px-5 gap-2 no-scrollbar mb-4 snap-x snap-mandatory">
                    {content.images.map((img, idx) => (
                        <div
                            key={idx}
                            className="flex-shrink-0 w-[240px] h-[240px] rounded-lg overflow-hidden bg-gray-100 border border-gray-100 snap-center relative"
                        >
                            <img src={img} alt={`content-${idx}`} className="w-full h-full object-cover" />
                        </div>
                    ))}
                </div>
            )}

            {/* Shop Info Card */}
            {shopName && (
                <div className="mx-5 mb-4 p-3 bg-gray-50 rounded-xl flex items-center gap-3 active:bg-gray-100 transition-colors relative">
                    <div className="relative w-12 h-12 rounded-lg bg-gray-200 overflow-hidden flex-shrink-0">
                        {/* Rank Badge on thumbnail */}
                        {typeof rank === 'number' && (
                            <div className="absolute -top-2 -left-2 bg-yellow-400 text-white min-w-[24px] h-6 flex items-center justify-center rounded-full text-xs font-bold border-2 border-white shadow-sm z-10 px-1">
                                {rank}
                            </div>
                        )}

                        {shopThumbnail ? (
                            <img src={shopThumbnail} alt="Shop" className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400">🏢</div>
                        )}
                    </div>

                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 min-w-0">
                            <div className="font-bold text-[14px] text-gray-900 truncate">{shopName}</div>

                            {/* Satisfaction after shop name */}
                            {satisfaction && (
                                <span
                                    className={cn(
                                        'text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide flex-shrink-0',
                                        satisfactionBadgeClass(satisfaction)
                                    )}
                                >
                                    {satisfaction}
                                </span>
                            )}
                        </div>

                        <div className="text-[12px] text-gray-500 truncate mt-0.5">
                            {shopAddress || 'Location Info'}
                        </div>
                    </div>

                    {/* Shop actions: Bookmark + Reserve */}
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => onTogglePoiBookmark?.(content.id)}
                            className={cn(
                                'h-9 w-9 rounded-md flex items-center justify-center transition-colors',
                                isPoiBookmarked
                                    ? 'bg-gray-900 text-white hover:bg-gray-800'
                                    : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                            )}
                            aria-label="Bookmark shop"
                        >
                            <Bookmark size={18} className={cn(isPoiBookmarked && 'fill-white text-white')} />
                        </button>

                        <button
                            type="button"
                            onClick={() => onReservePoi?.(content.id)}
                            className="text-[11px] font-bold text-orange-600 bg-orange-50 px-2.5 py-1.5 rounded-md hover:bg-orange-100 transition-colors h-9"
                        >
                            예약
                        </button>
                    </div>
                </div>
            )}

            {/* Footer Stats & Actions (content scrap removed) */}
            <div className="px-5 pt-1">
                <div className="flex items-center justify-between mb-3">
                    <span className="text-[12px] text-gray-400">{new Date(content.created_at).toLocaleString()}</span>
                    {content.stats.comments > 0 && (
                        <span className="text-[12px] text-gray-400 flex items-center gap-1">
                            <MessageCircle size={12} />
                            {content.stats.comments} comments
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-4 border-t border-gray-50 pt-3">
                    <button
                        type="button"
                        onClick={() => onToggleLike?.(content.id)}
                        className="flex items-center gap-1.5 p-1 -ml-1 text-gray-600 hover:text-red-500 transition-colors"
                    >
                        <Heart size={20} className={cn(content.stats.is_liked && 'fill-red-500 text-red-500')} />
                        {content.stats.likes > 0 && <span className="text-[13px] font-medium">{content.stats.likes}</span>}
                    </button>

                    <button
                        type="button"
                        onClick={() => onOpenComments?.(content.id)}
                        className="flex items-center gap-1.5 p-1 text-gray-600 hover:text-blue-500 transition-colors"
                        aria-label="Open comments"
                    >
                        <MessageSquare size={20} />
                    </button>

                    <div className="flex-1" />

                    <button
                        type="button"
                        onClick={() => onShare?.(content.id)}
                        className="flex items-center gap-1.5 p-1 text-gray-600 hover:text-gray-900 transition-colors"
                        aria-label="Share"
                    >
                        <Share size={20} />
                    </button>
                </div>
            </div>
        </div>
    );
};