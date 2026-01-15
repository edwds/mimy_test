import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, Share, MessageSquare, Bookmark, Calendar, MoreHorizontal } from 'lucide-react';
import { cn, appendJosa, formatVisitDate, formatFullDateTime } from '@/lib/utils';
import { API_BASE_URL } from '@/lib/api';
import { useUser } from '@/context/UserContext';
import { CommentSheet } from './CommentSheet';

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
        id?: number;
        nickname: string;
        account_id: string;
        profile_image: string | null;
        cluster_name?: string;
    };
    content: {
        id: number;
        text: string;
        images: string[];
        created_at: string;
        type?: string;

        // REVIEW: visit metadata only
        review_prop?: {
            shop_name: string;
            shop_address?: string;
            thumbnail_img?: string;
            visit_date?: string;
            companions?: string[];
            rank?: number;
            satisfaction?: Satisfaction;
            visit_count?: number;
        };

        // POI: move rank/satisfaction here (or keep under review_prop if you want, but per request: POI side)
        poi?: {
            shop_name?: string;
            shop_address?: string;
            thumbnail_img?: string;
            rank?: number;
            satisfaction?: Satisfaction;
            visit_count?: number;
            is_bookmarked?: boolean;
        };

        stats: {
            likes: number;
            comments: number;
            is_liked?: boolean;
        };
        preview_comments?: Array<{
            id: number;
            text: string;
            user: {
                nickname: string | null;
            };
        }>;
    };

    // Optional handlers (wire later)
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
    onShare,
    onTogglePoiBookmark,
    onReservePoi
}: ContentCardProps) => {
    const navigate = useNavigate();
    const { user: currentUser } = useUser();

    // Local State for Optimistic Updates
    const [isLiked, setIsLiked] = useState(content.stats.is_liked);
    const [likeCount, setLikeCount] = useState(content.stats.likes);
    const [commentCount, setCommentCount] = useState(content.stats.comments);
    const [showComments, setShowComments] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const [isDeleted, setIsDeleted] = useState(false);

    // Sync if prop changes (e.g. refetch)
    useEffect(() => {
        setIsLiked(content.stats.is_liked);
        setLikeCount(content.stats.likes);
        setCommentCount(content.stats.comments);
    }, [content.stats]);

    const handleLike = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!currentUser) return; // or show login

        // Optimistic Update
        const prevLiked = isLiked;
        const prevCount = likeCount;

        setIsLiked(!prevLiked);
        setLikeCount(prev => prevLiked ? prev - 1 : prev + 1);

        try {
            const method = prevLiked ? 'DELETE' : 'POST';
            await fetch(`${API_BASE_URL}/api/content/${content.id}/like`, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: currentUser.id })
            });
        } catch (error) {
            // Revert
            setIsLiked(prevLiked);
            setLikeCount(prevCount);
            console.error("Like failed", error);
        }
    };

    const handleOpenComments = (e: React.MouseEvent) => {
        e.stopPropagation();
        setShowComments(true);
    };

    const handleUserClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        const targetId = user.account_id || (user as any).id;
        if (targetId) {
            navigate(`/user/${targetId}`);
        } else {
            console.warn("User ID/Account ID missing in ContentCard");
        }
    };

    const handleDelete = async () => {
        if (!currentUser || !window.confirm("정말 삭제하시겠습니까? (복구할 수 없습니다)")) return;

        try {
            const response = await fetch(`${API_BASE_URL}/api/content/${content.id}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: currentUser.id })
            });

            if (response.ok) {
                setIsDeleted(true);
            } else {
                alert("삭제 실패");
            }
        } catch (e) {
            console.error(e);
            alert("오류 발생");
        }
    };

    if (isDeleted) return null;

    // Display shop info (prefer POI, fallback to review_prop)
    const shopName = content.poi?.shop_name ?? content.review_prop?.shop_name;
    const shopAddress = content.poi?.shop_address ?? content.review_prop?.shop_address;
    const shopThumbnail = content.poi?.thumbnail_img ?? content.review_prop?.thumbnail_img;
    const rank = content.poi?.rank ?? content.review_prop?.rank;
    const satisfaction = content.poi?.satisfaction ?? (content.review_prop?.satisfaction as Satisfaction | undefined);
    const visitCount = content.poi?.visit_count ?? content.review_prop?.visit_count;
    const isPoiBookmarked = !!content.poi?.is_bookmarked;

    const contextText = shopName
        ? `${appendJosa(shopName, '을/를')} ${content.review_prop?.visit_date ? formatVisitDate(content.review_prop.visit_date) : ''} ${typeof visitCount === 'number' && visitCount >= 2 ? `${visitCount}번째 ` : ''}방문`
        : (content.type === 'post' ? '자유 형식 게시물입니다.' : null);

    return (
        <div className="bg-white pb-6 mb-6">
            {/* Header */}
            <div className="flex items-center px-5 py-4 gap-3">
                <div
                    className="w-10 h-10 rounded-full bg-gray-100 overflow-hidden border border-gray-100 flex-shrink-0 cursor-pointer active:opacity-80"
                    onClick={handleUserClick}
                >
                    {user.profile_image ? (
                        <img src={user.profile_image} alt={user.nickname} className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-200 text-lg">😊</div>
                    )}
                </div>

                <div className="flex flex-col min-w-0 cursor-pointer active:opacity-80" onClick={handleUserClick}>
                    <div className="flex items-center gap-2 min-w-0">
                        <span className="font-bold text-base text-gray-900 leading-tight truncate">
                            {user.nickname}
                        </span>
                        {user.cluster_name && (
                            <span className="px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-600 text-[10px] font-bold">
                                {user.cluster_name}
                            </span>
                        )}
                    </div>

                    {contextText && (
                        <div className="flex items-center gap-2 mt-0.5 min-w-0">
                            <span className="text-[13px] text-gray-500 leading-tight truncate">{contextText}</span>
                        </div>
                    )}
                </div>

                {/* More / Menu Button */}
                {currentUser?.id === user.id && (
                    <div className="relative ml-auto">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setShowMenu(!showMenu);
                            }}
                            className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
                        >
                            <MoreHorizontal size={20} />
                        </button>

                        {showMenu && (
                            <div className="absolute right-0 top-full mt-1 w-24 bg-white rounded-lg shadow-lg border border-gray-100 z-10 py-1 overflow-hidden">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleDelete();
                                    }}
                                    className="w-full text-left px-3 py-2 text-[13px] text-red-500 hover:bg-gray-50 flex items-center gap-2"
                                >
                                    삭제하기
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Text Body */}
            {content.text && <ContentBody text={content.text} maxLines={10} />}

            {/* Image Display */}
            {content.images && content.images.length > 0 && (
                content.images.length === 1 ? (
                    <div className="px-5 mb-4">
                        <div className="w-full aspect-[4/3] rounded-lg overflow-hidden bg-gray-100 border border-gray-100 relative">
                            <img src={content.images[0]} alt="content-0" className="w-full h-full object-cover" />
                        </div>
                    </div>
                ) : (
                    <div className="flex overflow-x-auto px-5 gap-2 no-scrollbar mb-4 snap-x snap-mandatory">
                        {content.images.map((img, idx) => (
                            <div
                                key={idx}
                                className="flex-shrink-0 w-[300px] h-[300px] rounded-lg overflow-hidden bg-gray-100 border border-gray-100 snap-center relative"
                            >
                                <img src={img} alt={`content-${idx}`} className="w-full h-full object-cover" />
                            </div>
                        ))}
                    </div>
                )
            )}

            {/* Shop Info Card */}
            {
                shopName && (
                    <div className="mx-5 mb-4 p-3 bg-gray-50 rounded-xl flex items-center gap-3 active:bg-gray-100 transition-colors relative">
                        {/* Image Wrapper with Badge */}
                        <div className="relative flex-shrink-0">
                            {typeof rank === 'number' && (
                                <div className={cn(
                                    "absolute -top-1.5 -left-1.5 min-w-[20px] h-5 flex items-center justify-center rounded-full text-[10px] font-bold border-2 border-white shadow-sm z-10 px-1",
                                    rank <= 3 ? "bg-yellow-400 text-white" : "bg-gray-400 text-white"
                                )}>
                                    {rank}
                                </div>
                            )}
                            <div className="w-12 h-12 rounded-lg bg-gray-200 overflow-hidden">
                                {shopThumbnail ? (
                                    <img src={shopThumbnail} alt="Shop" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-400">🏢</div>
                                )}
                            </div>
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
                                    'h-8 w-8 rounded-full flex items-center justify-center transition-colors',
                                    isPoiBookmarked
                                        ? 'bg-gray-900 text-white hover:bg-gray-800'
                                        : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                                )}
                                aria-label="Bookmark shop"
                            >
                                <Bookmark size={16} className={cn(isPoiBookmarked && 'fill-white text-white')} />
                            </button>

                            <button
                                type="button"
                                onClick={() => onReservePoi?.(content.id)}
                                className={cn(
                                    'h-8 w-8 rounded-full flex items-center justify-center transition-colors',
                                    'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                                )}
                                aria-label="Reserve"
                            >
                                <Calendar size={16} />
                            </button>
                        </div>
                    </div>
                )
            }

            {/* Free Post Badge (if no shop info) */}


            {/* Footer Stats & Actions (content scrap removed) */}
            <div className="px-5 pt-1">
                <div className="flex items-center justify-between mb-3">
                    <span className="text-[12px] text-gray-400">{formatFullDateTime(content.created_at)}</span>
                </div>

                <div className="flex items-center gap-4">
                    <button
                        type="button"
                        onClick={handleLike}
                        className="flex items-center gap-1.5 p-1 -ml-1 text-gray-600 hover:text-red-500 transition-colors"
                    >
                        <Heart size={24} className={cn(isLiked && 'fill-red-500 text-red-500')} />
                        {likeCount > 0 && <span className="text-sm font-medium">{likeCount}</span>}
                    </button>

                    <button
                        type="button"
                        onClick={handleOpenComments}
                        className="flex items-center gap-1.5 p-1 text-gray-600 hover:text-blue-500 transition-colors"
                        aria-label="Open comments"
                    >
                        <MessageSquare size={24} />
                        {commentCount > 0 && <span className="text-sm font-medium">{commentCount}</span>}
                    </button>

                    <button
                        type="button"
                        onClick={() => onShare?.(content.id)}
                        className="flex items-center gap-1.5 p-1 text-gray-600 hover:text-gray-900 transition-colors"
                        aria-label="Share"
                    >
                        <Share size={24} />
                    </button>
                </div>
            </div>

            {/* Comment Preview */}
            {
                content.preview_comments && content.preview_comments.length > 0 && (
                    <div className="px-5 pb-2 mt-2 space-y-2">
                        {content.stats.comments > content.preview_comments.length && (
                            <button
                                onClick={handleOpenComments}
                                className="text-gray-500 text-sm font-medium mb-1 hover:text-gray-800"
                            >
                                View all {content.stats.comments} comments
                            </button>
                        )}

                        {content.preview_comments.map(comment => (
                            <div key={comment.id} className="flex gap-2 text-sm leading-tight">
                                <span className="font-bold text-gray-900 flex-shrink-0">
                                    {comment.user?.nickname || 'User'}
                                </span>
                                <span className="text-gray-700 line-clamp-1 break-all">
                                    {comment.text}
                                </span>
                            </div>
                        ))}
                    </div>
                )
            }

            {/* Comment Sheet */}
            <CommentSheet
                isOpen={showComments}
                onClose={() => setShowComments(false)}
                contentId={content.id}
            />
        </div >
    );
};