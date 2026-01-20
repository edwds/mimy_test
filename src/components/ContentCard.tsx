import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Heart, Send, MessageCircle, Bookmark, Calendar, MoreHorizontal, Link as LinkIcon, Youtube, Instagram, Twitter } from 'lucide-react';
import { cn, appendJosa, formatVisitDate, formatFullDateTime, calculateTasteMatch, getTasteBadgeStyle } from '@/lib/utils';
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
        taste_result?: { scores: Record<string, number> };
        is_following?: boolean;
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
            companions?: string[]; // IDs
            companions_info?: Array<{ id: number; nickname: string; profile_image: string | null }>; // Enriched Data
            rank?: number;
            satisfaction?: Satisfaction;
            visit_count?: number;
        };

        // POI: move rank/satisfaction here (or keep under review_prop if you want, but per request: POI side)
        poi?: {
            shop_id?: number;
            shop_name?: string;
            shop_address?: string;
            thumbnail_img?: string;
            rank?: number;
            satisfaction?: Satisfaction;
            visit_count?: number;
            is_bookmarked?: boolean;
            catchtable_ref?: string;
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
        keyword?: string[]; // Add keyword prop
        link_json?: Array<{ title: string; url: string }>;
    };

    // Optional handlers (wire later)
    onShare?: (contentId: number) => void;

    onTogglePoiBookmark?: (contentId: number) => void;
    onReservePoi?: (contentId: number) => void;
    showActions?: boolean;
    hideShopInfo?: boolean;
}


export const ContentCard = ({
    user,
    content,
    onShare,
    showActions = false,
    hideShopInfo = false
}: ContentCardProps) => {
    const navigate = useNavigate();
    const { t, i18n } = useTranslation();
    const { user: currentUser } = useUser();

    const rank = content.poi?.rank ?? content.review_prop?.rank;
    const satisfaction = content.poi?.satisfaction ?? (content.review_prop?.satisfaction as Satisfaction | undefined);

    // Local State for Optimistic Updates
    const [isLiked, setIsLiked] = useState(content.stats.is_liked);
    const [likeCount, setLikeCount] = useState(content.stats.likes);
    const [commentCount, setCommentCount] = useState(content.stats.comments);
    const [isPoiBookmarked, setIsPoiBookmarked] = useState(!!content.poi?.is_bookmarked); // Add local state
    const [showComments, setShowComments] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const [showActionsMenu, setShowActionsMenu] = useState(false);
    const [isDeleted, setIsDeleted] = useState(false);

    const [isFollowing, setIsFollowing] = useState(!!user.is_following);
    const [followLoading, setFollowLoading] = useState(false);

    // Sync if prop changes (e.g. refetch)
    useEffect(() => {
        setIsLiked(content.stats.is_liked);
        setLikeCount(content.stats.likes);
        setCommentCount(content.stats.comments);
        setIsPoiBookmarked(!!content.poi?.is_bookmarked); // Sync prop
        setIsFollowing(!!user.is_following);
    }, [content.stats, content.poi?.is_bookmarked, user.is_following]);

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

    const handleFollow = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!currentUser || !user.id || followLoading) return;

        setFollowLoading(true);
        const prevFollowing = isFollowing;
        setIsFollowing(!prevFollowing);

        try {
            const res = await fetch(`${API_BASE_URL}/api/users/${user.id}/follow`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ followerId: currentUser.id })
            });
            const data = await res.json();
            if (data.following !== (!prevFollowing)) {
                setIsFollowing(data.following);
            }
        } catch (error) {
            console.error(error);
            setIsFollowing(prevFollowing);
        } finally {
            setFollowLoading(false);
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
            const current = new URLSearchParams(window.location.search);
            current.set('viewUser', String(targetId));

            // If we are not in main tab (e.g. ShopDetail), navigate to main
            if (!window.location.pathname.startsWith('/main')) {
                navigate(`/main?${current.toString()}`);
            } else {
                navigate(`${window.location.pathname}?${current.toString()}`);
            }
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
    const visitCount = content.poi?.visit_count ?? content.review_prop?.visit_count;
    // const isPoiBookmarked used state above

    // Logic for context text (Shop visit info OR Keywords OR Default Post text)
    let contextText: string | null = null;

    if (shopName) {
        // Final review text components are handled in JSX
        contextText = null;
    } else if (content.type === 'post') {
        if (content.keyword && content.keyword.length > 0) {
            contextText = content.keyword.join(' ');
        } else {
            contextText = '자유 형식 게시물입니다.';
        }
    }

    const companionUsers = content.review_prop?.companions_info; // Enriched companions

    return (
        <div className="bg-white">
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
                    <span className="font-bold text-base text-gray-900 leading-tight truncate">
                        {user.nickname}
                    </span>
                    {user.cluster_name && (
                        (() => {
                            const matchScore = (currentUser && (currentUser as any).taste_result?.scores && user.taste_result?.scores)
                                ? calculateTasteMatch((currentUser as any).taste_result.scores, user.taste_result.scores)
                                : null;

                            return (
                                <span className={cn(
                                    "text-xs font-medium transition-colors mt-0.5",
                                    getTasteBadgeStyle(matchScore)
                                )}>
                                    {user.cluster_name}
                                </span>
                            );
                        })()
                    )}
                </div>

                {/* More / Menu Button */}
                <div className="relative ml-auto flex items-center gap-2">
                    {showActions && currentUser?.id !== user.id && (
                        <button
                            type="button"
                            className={cn(
                                "px-3 py-1.5 rounded-full text-[12px] font-bold active:scale-95 transition-all",
                                isFollowing
                                    ? "bg-white border border-gray-200 text-gray-700"
                                    : "bg-orange-600 text-white"
                            )}
                            onClick={handleFollow}
                            disabled={followLoading}
                        >
                            {isFollowing ? "팔로잉" : "팔로우"}
                        </button>
                    )}

                    {currentUser?.id === user.id ? (
                        <div className="relative">
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
                                <div className="absolute right-0 top-full mt-1 w-24 bg-white rounded-lg shadow-lg border border-gray-100 z-10 py-1 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDelete();
                                            setShowMenu(false);
                                        }}
                                        className="w-full text-left px-3 py-2 text-[13px] text-red-500 hover:bg-gray-50 flex items-center gap-2"
                                    >
                                        삭제하기
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        showActions && (
                            <div className="relative">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setShowActionsMenu(!showActionsMenu);
                                    }}
                                    className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
                                >
                                    <MoreHorizontal size={20} />
                                </button>

                                {showActionsMenu && (
                                    <div className="absolute right-0 top-full mt-1 w-24 bg-white rounded-lg shadow-lg border border-gray-100 z-10 py-1 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                alert("준비 중인 기능입니다.");
                                                setShowActionsMenu(false);
                                            }}
                                            className="w-full text-left px-3 py-2 text-[13px] text-red-500 hover:bg-gray-50 flex items-center gap-2 font-medium"
                                        >
                                            차단하기
                                        </button>
                                    </div>
                                )}
                            </div>
                        )
                    )}
                </div>
            </div>

            {/* Visit Info & Companions Block */}
            {(shopName || contextText || (companionUsers && companionUsers.length > 0)) && (
                <div className="px-5 mb-3">
                    <div className="flex flex-wrap items-center gap-x-1 gap-y-1 text-sm text-black font-medium leading-tight">
                        {i18n.language === 'ko' ? (
                            <>
                                {/* Korean: [Companions]와/과 함께 [Shop]을/를 [Date] [N번째] 방문 */}
                                {companionUsers && companionUsers.length > 0 && (
                                    <span>
                                        {(() => {
                                            const MAX = 3;
                                            const overflow = companionUsers.length - MAX;
                                            if (overflow > 0) {
                                                const display = companionUsers.slice(0, MAX);
                                                const others = t('write.content.and_others', { count: overflow });
                                                return (
                                                    <>
                                                        {display.map((u, i) => (
                                                            <span key={i}>{u.nickname}, </span>
                                                        ))}
                                                        {appendJosa(others, '와/과')}
                                                        {' '}{t('content.visit_info.with')}
                                                    </>
                                                );
                                            }
                                            return (
                                                <>
                                                    {companionUsers.map((u, i) => (
                                                        <span key={i}>
                                                            {i < companionUsers.length - 1
                                                                ? `${u.nickname}, `
                                                                : appendJosa(u.nickname, '와/과')}
                                                        </span>
                                                    ))}
                                                    {' '}{t('content.visit_info.with')}
                                                </>
                                            );
                                        })()}
                                    </span>
                                )}

                                {shopName && (
                                    <span className="shrink-0">
                                        {appendJosa(shopName, '을/를')}
                                    </span>
                                )}

                                {content.review_prop?.visit_date && (
                                    <span className="shrink-0">{formatVisitDate(content.review_prop.visit_date, t)}</span>
                                )}

                                {typeof visitCount === 'number' && visitCount >= 2 && (
                                    <span className="shrink-0">{visitCount}{t('content.visit_info.nth')}</span>
                                )}

                                {shopName && <span className="shrink-0">{t('content.visit_info.visited')}</span>}
                            </>
                        ) : (
                            <>
                                {/* English: Visited [Shop Name] [Date] ([Nth] visit) with [Companions] */}
                                {shopName && <span className="shrink-0">{t('content.visit_info.visited')}</span>}
                                {shopName && <span className="shrink-0">{shopName}</span>}
                                {content.review_prop?.visit_date && (
                                    <span className="shrink-0">{formatVisitDate(content.review_prop.visit_date, t)}</span>
                                )}
                                {typeof visitCount === 'number' && visitCount >= 2 && (
                                    <span className="shrink-0">
                                        ({visitCount}{visitCount === 2 ? '2nd' : visitCount === 3 ? '3rd' : 'th'} {t('content.visit_info.nth')})
                                    </span>
                                )}
                                {companionUsers && companionUsers.length > 0 && (
                                    <span className="shrink-0">
                                        {t('content.visit_info.with')}{' '}
                                        {companionUsers.map((u, i) => (
                                            <span key={i}>
                                                {u.nickname}{i < companionUsers.length - 1 ? ', ' : ''}
                                            </span>
                                        ))}
                                    </span>
                                )}
                            </>
                        )}

                        {/* Post Keywords (if not review) */}
                        {!shopName && contextText && (
                            <span>{contextText}</span>
                        )}

                        {/* Satisfaction & Ranking */}
                        {(satisfaction || (typeof rank === 'number' && rank > 0)) && (
                            <>
                                <span className="text-gray-300">·</span>
                                {satisfaction && (
                                    <span className={cn(
                                        "font-bold",
                                        satisfaction === 'good' ? "text-orange-600" : "text-gray-500"
                                    )}>
                                        {t(`write.basic.${satisfaction}`)}
                                    </span>
                                )}
                                {typeof rank === 'number' && rank > 0 && (
                                    <>
                                        {satisfaction && <span className="text-gray-300">·</span>}
                                        <span className="font-bold text-sm text-black inline-flex items-center gap-0.5">
                                            <span className="text-[7pt]">🏆</span>
                                            {rank}{i18n.language === 'ko' ? '위' : (rank === 1 ? 'st' : rank === 2 ? 'nd' : rank === 3 ? 'rd' : 'th')}
                                        </span>
                                    </>
                                )}
                            </>
                        )}
                    </div>
                </div>
            )}



            {/* Text Body */}
            {content.text && <ContentBody text={content.text} maxLines={10} />}



            {/* Link Display */}
            {content.link_json && content.link_json.length > 0 && (
                <div className="px-5 mb-3 space-y-1">
                    {content.link_json.map((link: any, idx: number) => {
                        const url = link.url.toLowerCase();
                        let Icon = LinkIcon;
                        let label: React.ReactNode = null;

                        if (url.includes('youtube.com') || url.includes('youtu.be')) {
                            Icon = Youtube;
                        } else if (url.includes('instagram.com')) {
                            Icon = Instagram;
                        } else if (url.includes('twitter.com') || url.includes('x.com')) {
                            Icon = Twitter;
                        } else if (url.includes('tiktok.com')) {
                            // TikTok custom text badge
                            label = <span className="text-[10px] font-bold bg-orange-600 text-white px-1.5 py-0.5 rounded-full leading-none">TikTok</span>;
                        } else if (url.includes('naver.com')) {
                            // Naver custom text badge
                            label = <span className="text-[10px] font-bold bg-orange-600 text-white px-1.5 py-0.5 rounded-full leading-none">N</span>;
                        }

                        // Fallback title logic:
                        // If specific platform, maybe just show title? 
                        // User said: "Show as text". 

                        return (
                            <a
                                key={idx}
                                href={link.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 py-0.5 hover:underline decoration-orange-300 underline-offset-2 transition-all group"
                            >
                                <div className="flex-shrink-0 flex items-center justify-center w-5">
                                    {label ? label : <Icon size={18} className="text-orange-600 transition-transform group-hover:scale-110" />}
                                </div>
                                <span className="text-sm text-orange-600 leading-normal truncate font-medium">
                                    {link.title || link.url}
                                </span>
                            </a>
                        );
                    })}
                </div>
            )}

            {/* Image Display */}
            {
                content.images && content.images.length > 0 && (
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
                )
            }

            {/* Shop Info Card */}
            {
                shopName && !hideShopInfo && (
                    <div
                        className="mx-5 mb-4 p-3 bg-gray-50 rounded-xl flex items-center gap-3 active:bg-gray-100 transition-colors relative cursor-pointer"
                        onClick={(e) => {
                            e.stopPropagation();
                            const sid = content.poi?.shop_id || (content.review_prop as any)?.shop_id;
                            if (sid) {
                                navigate(`/shop/${sid}`);
                            }
                        }}
                    >
                        {/* Image Wrapper with Badge */}
                        <div className="relative flex-shrink-0">

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

                            </div>

                            <div className="text-[12px] text-gray-500 truncate mt-0.5">
                                {shopAddress || 'Location Info'}
                            </div>
                        </div>

                        {/* Shop actions: Reserve + Bookmark */}
                        <div className="flex items-center gap-4 mr-2">
                            {/* Reserve Button */}
                            <motion.button
                                type="button"
                                whileTap={{ scale: 0.9 }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    const ref = content.poi?.catchtable_ref;
                                    if (ref) {
                                        window.open(`https://app.catchtable.co.kr/ct/shop/${ref}`, '_blank');
                                    } else {
                                        // Fallback or alert
                                        alert("예약 링크가 없습니다.");
                                    }
                                }}
                                className="text-gray-400 hover:text-gray-600 transition-colors p-1"
                                aria-label="Reserve"
                            >
                                <Calendar size={22} />
                            </motion.button>

                            {/* Bookmark Button */}
                            <motion.button
                                type="button"
                                whileTap={{ scale: 0.8 }}
                                onClick={async (e) => {
                                    e.stopPropagation();
                                    if (!currentUser) return;

                                    // Optimistic Update
                                    const prevBookmarked = isPoiBookmarked;
                                    setIsPoiBookmarked(!prevBookmarked);

                                    try {
                                        // Use standardized endpoint: POST /api/shops/:id/save
                                        const shopId = content.poi?.shop_id || (content.review_prop as any)?.shop_id;
                                        const res = await fetch(`${API_BASE_URL}/api/shops/${shopId}/save`, {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ userId: currentUser.id })
                                        });

                                        if (res.ok) {
                                            const data = await res.json();
                                            // Sync with true server state to avoid 'opposite' issues
                                            if (typeof data.is_saved === 'boolean') {
                                                setIsPoiBookmarked(data.is_saved);
                                            }
                                        } else {
                                            // Revert if request failed
                                            setIsPoiBookmarked(prevBookmarked);
                                        }
                                    } catch (e) {
                                        console.error(e);
                                        // Revert on error
                                        setIsPoiBookmarked(prevBookmarked);
                                    }
                                }}
                                className={cn(
                                    'transition-colors p-1',
                                    isPoiBookmarked ? 'text-orange-600' : 'text-gray-400 hover:text-gray-600'
                                )}
                                aria-label="Bookmark shop"
                            >
                                <motion.div
                                    initial={false}
                                    animate={{ scale: isPoiBookmarked ? [1, 1.4, 1] : 1 }}
                                    transition={{ duration: 0.3 }}
                                >
                                    <Bookmark size={22} className={cn(isPoiBookmarked && 'fill-orange-600')} />
                                </motion.div>
                            </motion.button>
                        </div>
                    </div>
                )
            }

            {/* Free Post Badge (if no shop info) */}


            {/* Footer Stats & Actions (content scrap removed) */}
            <div className="px-5 mb-2">
                <div className="flex justify-between items-center mb-2">
                    <span className="text-[12px] text-gray-400">{formatFullDateTime(content.created_at, i18n.language)}</span>
                </div>

                <div className="flex items-center gap-1">
                    <motion.button
                        type="button"
                        whileTap={{ scale: 0.8 }}
                        onClick={handleLike}
                        className="flex items-center gap-1.5 h-9 px-2 -ml-2 rounded-full text-gray-600 active:text-red-500 active:bg-red-50 transition-colors"
                    >
                        <motion.div
                            initial={false}
                            animate={{ scale: isLiked ? [1, 1.4, 1] : 1 }}
                            transition={{ duration: 0.3 }}
                        >
                            <Heart size={20} className={cn(isLiked && 'fill-red-500 text-red-500')} />
                        </motion.div>
                        {likeCount > 0 && <span className="text-sm font-medium">{likeCount}</span>}
                    </motion.button>

                    <button
                        type="button"
                        onClick={handleOpenComments}
                        className="flex items-center gap-1.5 h-9 px-2 rounded-full text-gray-600 active:text-blue-500 active:bg-blue-50 transition-colors"
                        aria-label="Open comments"
                    >
                        <MessageCircle size={20} />
                        {commentCount > 0 && <span className="text-sm font-medium">{commentCount}</span>}
                    </button>

                    <button
                        type="button"
                        onClick={() => onShare?.(content.id)}
                        className="flex items-center justify-center gap-1.5 h-9 w-9 rounded-full text-gray-600 active:text-gray-900 active:bg-gray-100 transition-colors"
                        aria-label="Share"
                    >
                        <Send size={20} />
                    </button>
                </div>
            </div>

            {/* Comment Preview */}
            {
                content.preview_comments && content.preview_comments.length > 0 && (
                    <div className="px-5 pb-2 mb-4 space-y-2">
                        {content.stats.comments > content.preview_comments.length && (
                            <button
                                onClick={handleOpenComments}
                                className="text-gray-500 text-xs font-medium mb-1 hover:text-gray-800"
                            >
                                {t('content.view_all_comments', { count: content.stats.comments })}
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