import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Send, MessageCircle, MoreHorizontal, Link as LinkIcon, Youtube, Instagram, Twitter } from 'lucide-react';
import { cn, appendJosa, formatVisitDate, formatFullDateTime, calculateTasteMatch, getTasteBadgeStyle } from '@/lib/utils';
import { getTasteType, getTasteTypeProfile } from '@/lib/tasteType';
import { API_BASE_URL } from '@/lib/api';
import { authFetch } from '@/lib/authFetch';
import { useUser } from '@/context/UserContext';
import { CommentSheet } from './CommentSheet';
import { ShopInfoCard } from './ShopInfoCard';

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
    const [collapsedHeight, setCollapsedHeight] = useState<number | undefined>(undefined);
    const [fullHeight, setFullHeight] = useState<number | undefined>(undefined);

    const measure = useCallback(() => {
        const el = ref.current;
        if (!el) return;

        // Measure full height (unclamped)
        el.style.display = '';
        el.style.webkitLineClamp = '';
        el.style.webkitBoxOrient = '';
        el.style.overflow = '';
        const full = el.scrollHeight;

        // Measure clamped height using -webkit-line-clamp (accounts for paragraph spacing)
        el.style.display = '-webkit-box';
        el.style.webkitLineClamp = String(maxLines);
        el.style.webkitBoxOrient = 'vertical';
        el.style.overflow = 'hidden';
        const clamped = el.clientHeight;

        // Reset inline styles
        el.style.display = '';
        el.style.webkitLineClamp = '';
        el.style.webkitBoxOrient = '';
        el.style.overflow = '';

        const isOverflow = full > clamped + 2;
        setCanExpand(isOverflow);
        setCollapsedHeight(clamped);
        setFullHeight(full);
    }, [maxLines]);

    useLayoutEffect(() => {
        setExpanded(false);
    }, [text]);

    useEffect(() => {
        measure();
        const onResize = () => measure();
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, [text, maxLines, measure]);

    // Split text into paragraphs (consecutive newlines separate paragraphs)
    const paragraphs = useMemo(() => {
        const lines = text.split('\n');
        const result: string[][] = [];
        let currentParagraph: string[] = [];

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            if (line === '') {
                if (currentParagraph.length > 0) {
                    result.push(currentParagraph);
                    currentParagraph = [];
                }
            } else {
                currentParagraph.push(line);
            }
        }

        if (currentParagraph.length > 0) {
            result.push(currentParagraph);
        }

        return result;
    }, [text]);

    return (
        <div className={cn('px-5 mb-4', className)}>
            <div className="relative">
                <motion.div
                    ref={ref}
                    className="text-gray-800 whitespace-pre-wrap break-words overflow-hidden"
                    style={{ fontSize: '15px', lineHeight: '1.6' }}
                    initial={false}
                    animate={{ height: canExpand ? (expanded ? fullHeight : collapsedHeight) : 'auto' }}
                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                >
                    {paragraphs.map((paragraph, pIdx) => (
                        <span key={pIdx} style={{ display: 'block' }}>
                            {pIdx > 0 && (
                                <span style={{ display: 'block', height: '0.8em' }} />
                            )}
                            {paragraph.map((line, lIdx) => (
                                <span key={lIdx}>
                                    {line}
                                    {lIdx < paragraph.length - 1 && <br />}
                                </span>
                            ))}
                        </span>
                    ))}
                </motion.div>

                {/* Inline "...더보기" at bottom-right of last visible line */}
                {canExpand && !expanded && (
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            measure();
                            setExpanded(true);
                        }}
                        className="absolute bottom-0 right-0 text-[15px] text-gray-400 bg-white pl-6"
                        style={{
                            lineHeight: '1.6',
                            background: 'linear-gradient(to right, transparent, white 30%)',
                        }}
                    >
                        ...더보기
                    </button>
                )}
            </div>

            {canExpand && expanded && (
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        setExpanded(false);
                    }}
                    className="text-[13px] font-semibold text-gray-400 mt-1"
                >
                    접기
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
        ranking_count?: number;
        is_following?: boolean;
    };
    content: {
        id: number;
        text: string;
        images: string[];
        img_texts?: string[]; // Add caption support
        created_at: string;
        type?: string;

        // REVIEW: visit metadata only
        review_prop?: {
            shop_id?: number; // Added to fix lint error
            shop_name: string;
            shop_address?: string;
            thumbnail_img?: string;
            visit_date?: string;
            companions?: string[]; // IDs
            companions_info?: Array<{ id: number; nickname: string; profile_image: string | null }>; // Enriched Data
            rank?: number;
            satisfaction?: Satisfaction;
            visit_count?: number;
            my_review_stats?: {
                satisfaction: Satisfaction | number;
                rank: number;
                percentile: number;
                total_reviews: number;
            } | null;
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
            lat?: number;
            lon?: number;
            shop_user_match_score?: number | null;
            my_review_stats?: {
                satisfaction: Satisfaction | number;
                rank: number;
                percentile: number;
                total_reviews: number;
            } | null;
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
    onEvaluatePoi?: (contentId: number) => void;
    showActions?: boolean;
    hideShopInfo?: boolean;
}


import { ImageViewer } from './ImageViewer';

const getDistanceText = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c;

    if (d < 1) {
        return `${Math.round((d * 1000) / 100) * 100}m`;
    }
    return `${d.toFixed(1)}km`;
};

export const ContentCard = ({
    user,
    content,
    onShare,
    showActions = false,
    hideShopInfo = false,

}: ContentCardProps) => {
    const navigate = useNavigate();
    const { t, i18n } = useTranslation();
    const { user: currentUser, optimisticLikes, toggleOptimisticLike, coordinates } = useUser();

    const rank = content.poi?.rank ?? content.review_prop?.rank;
    const satisfaction = content.poi?.satisfaction ?? (content.review_prop?.satisfaction as Satisfaction | undefined);

    // Determine initial state: favour optimistic state if present, otherwise server state
    const serverIsLiked = content.stats.is_liked;
    const hasOptimistic = typeof optimisticLikes[content.id] === 'boolean';
    const effectiveIsLiked = hasOptimistic ? optimisticLikes[content.id] : serverIsLiked;

    // We still use local state for immediate animation, syncing with effective state
    const [isLiked, setIsLiked] = useState(effectiveIsLiked);
    const [likeCount, setLikeCount] = useState(content.stats.likes);
    const [commentCount, setCommentCount] = useState(content.stats.comments);
    const [previewComments, setPreviewComments] = useState(content.preview_comments || []);
    const [isPoiBookmarked, setIsPoiBookmarked] = useState(!!content.poi?.is_bookmarked); // Add local state
    const [showComments, setShowComments] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const [showActionsMenu, setShowActionsMenu] = useState(false);
    const [isDeleted, setIsDeleted] = useState(false);

    const [isFollowing, setIsFollowing] = useState(!!user.is_following);
    const [followLoading, setFollowLoading] = useState(false);



    // Image Viewer State
    const [showViewer, setShowViewer] = useState(false);
    const [viewerIndex, setViewerIndex] = useState(0);

    // Sync if prop changes (e.g. refetch) or optimistic state changes
    useEffect(() => {
        const currentOptimistic = optimisticLikes[content.id];
        const currentEffective = typeof currentOptimistic === 'boolean' ? currentOptimistic : content.stats.is_liked;

        setIsLiked(!!currentEffective);

        // Adjust count based on the difference between server state and effective state
        let adjustment = 0;
        if (typeof currentOptimistic === 'boolean' && currentOptimistic !== content.stats.is_liked) {
            adjustment = currentOptimistic ? 1 : -1;
        }
        setLikeCount(content.stats.likes + adjustment);

        setCommentCount(content.stats.comments);
        setPreviewComments(content.preview_comments || []);
        setIsPoiBookmarked(!!content.poi?.is_bookmarked); // Sync prop
        setIsFollowing(!!user.is_following);
    }, [content.stats, content.preview_comments, content.poi?.is_bookmarked, user.is_following, optimisticLikes, content.id]);



    // Double Tap Like Logic
    const lastTapRef = useRef<number>(0);
    const [showHeart, setShowHeart] = useState(false);
    const [heartIndex, setHeartIndex] = useState<number | null>(null);
    const [heartPos, setHeartPos] = useState<{ x: number, y: number } | null>(null);
    const [heartTarget, setHeartTarget] = useState<'image' | 'text'>('image');
    const blurTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const onSmartTap = (e: React.MouseEvent, idx: number, type: 'image' | 'text' = 'image') => {
        const now = Date.now();
        const DOUBLE_TAP_DELAY = 300;

        if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
            // Double Tap Detected
            if (blurTimeoutRef.current) {
                clearTimeout(blurTimeoutRef.current);
                blurTimeoutRef.current = null;
            }

            // Calculate Position
            const rect = e.currentTarget.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            setHeartPos({ x, y });
            setHeartTarget(type);
            const targetIdx = idx;

            setHeartIndex(targetIdx);
            setShowHeart(true);
            setTimeout(() => setShowHeart(false), 1000);

            if (!isLiked) {
                handleToggleLike();
            }
        } else {
            // Single Tap Candidate
            if (type === 'image') {
                blurTimeoutRef.current = setTimeout(() => {
                    setViewerIndex(idx);
                    setShowViewer(true);
                    blurTimeoutRef.current = null;
                }, DOUBLE_TAP_DELAY);
            }
        }
        lastTapRef.current = now;
    };

    const handleToggleLike = async () => {
        if (!currentUser) return;

        // Optimistic Update
        const prevLiked = isLiked;
        const prevCount = likeCount;

        const newLiked = !prevLiked;
        setIsLiked(newLiked);
        setLikeCount(newLiked ? prevCount + 1 : prevCount - 1);

        // Update global optimistic stores
        toggleOptimisticLike(content.id, newLiked);


        try {
            const method = prevLiked ? 'DELETE' : 'POST';
            const res = await authFetch(`${API_BASE_URL}/api/content/${content.id}/like`, {
                method,
                headers: { 'Content-Type': 'application/json' }
            });
            const data = await res.json();
            if (data.success && data.stats) {
                // Sync with server truth
                setIsLiked(data.stats.is_liked);
                setLikeCount(data.stats.likes);
                setCommentCount(data.stats.comments); // In case comments changed differently? Unlikely for like toggle but safe.
                toggleOptimisticLike(content.id, data.stats.is_liked);
            }
        } catch (e) {
            // Rollback
            setIsLiked(prevLiked);
            setLikeCount(prevCount);
            toggleOptimisticLike(content.id, !!prevLiked); // Revert optimistic
            console.error("Like failed", e);
        }
    };

    // Wire up existing handleLike to use new logic
    const handleLike = (e: React.MouseEvent) => {
        e.stopPropagation();
        handleToggleLike();
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
            // Clear conflicting overlays (List/Shop) since UserProfile is lower in hierarchy
            // and we want it to be visible (or rather, we treat this as a context switch).
            current.delete('viewShop');
            current.delete('viewListUser');
            current.delete('type');
            current.delete('value');
            current.delete('title');

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
            <div className="flex px-5 py-4 gap-3 items-center">
                <div
                    className="w-11 h-11 rounded-full bg-gray-100 overflow-hidden border border-gray-100 flex-shrink-0 cursor-pointer active:opacity-80"
                    onClick={handleUserClick}
                >
                    {user.profile_image ? (
                        <img src={user.profile_image} alt={user.nickname} className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-200 text-lg">😊</div>
                    )}
                </div>

                <div className="flex flex-col min-w-0 flex-1 cursor-pointer active:opacity-80 text-left" onClick={handleUserClick}>
                    {/* Row 1: Nickname */}
                    <span className="font-bold text-base text-gray-900 leading-tight truncate">
                        {user.nickname}
                    </span>

                    {/* Row 2: Taste Cluster */}
                    {user.taste_result?.scores && (
                        (() => {
                            const tasteType = getTasteType(user.taste_result);
                            if (!tasteType) return null;

                            const profile = getTasteTypeProfile(tasteType, 'ko');
                            const matchScore = (currentUser && (currentUser as any).taste_result?.scores && user.taste_result?.scores)
                                ? calculateTasteMatch((currentUser as any).taste_result.scores, user.taste_result.scores)
                                : null;

                            return (
                                <span className={cn(
                                    "text-[13px] font-medium mt-0.5",
                                    getTasteBadgeStyle(matchScore)
                                )}>
                                    {profile?.name || tasteType.fullType}
                                </span>
                            );
                        })()
                    )}

                    {/* Row 3 (formerly): Post Keywords only */}
                    {!shopName && contextText && (
                        <div className="text-[13px] text-gray-500 font-normal leading-snug mt-1 line-clamp-2">
                            <span>{contextText}</span>
                        </div>
                    )}
                </div>

                {/* More / Menu Button */}
                <div className="relative ml-auto flex items-center gap-2 flex-shrink-0">
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

            {/* Image Display */}
            {
                content.images && content.images.length > 0 && (
                    <>
                        {content.images.length === 1 ? (
                            <div className="px-5 mb-4">
                                <div
                                    className="w-full aspect-[4/3] rounded-lg overflow-hidden bg-gray-100 border border-gray-100 relative cursor-pointer active:opacity-95 transition-opacity"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onSmartTap(e, 0, 'image');
                                    }}
                                >
                                    <img src={content.images[0]} alt="content-0" className="w-full h-full object-cover" />

                                    {/* Double Tap Heart Overlay */}
                                    <AnimatePresence>
                                        {showHeart && heartTarget === 'image' && heartIndex === 0 && heartPos && (
                                            <motion.div
                                                initial={{ scale: 0, opacity: 0 }}
                                                animate={{ scale: 1.2, opacity: 1 }}
                                                exit={{ scale: 0, opacity: 0 }}
                                                transition={{ type: "spring", stiffness: 400, damping: 20 }}
                                                style={{ left: heartPos.x, top: heartPos.y, marginLeft: -48, marginTop: -48 }}
                                                className="absolute z-20 pointer-events-none"
                                            >
                                                <Heart className="w-24 h-24 text-white fill-white drop-shadow-xl" strokeWidth={1} />
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                    {content.img_texts?.[0] && (
                                        <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/50 to-transparent pt-8">
                                            <span className="text-white text-sm font-medium drop-shadow-md">{content.img_texts[0]}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="flex overflow-x-auto px-5 gap-2 no-scrollbar mb-4 snap-x snap-mandatory">
                                {content.images.map((img, idx) => (
                                    <div
                                        key={idx}
                                        className="flex-shrink-0 w-[310px] h-[310px] rounded-lg overflow-hidden bg-gray-100 border border-gray-100 snap-center relative cursor-pointer active:opacity-95 transition-opacity"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onSmartTap(e, idx, 'image');
                                        }}
                                    >
                                        <img src={img} alt={`content-${idx}`} className="w-full h-full object-cover" />

                                        {/* Double Tap Heart Overlay */}
                                        <AnimatePresence>
                                            {showHeart && heartTarget === 'image' && heartIndex === idx && heartPos && (
                                                <motion.div
                                                    initial={{ scale: 0, opacity: 0 }}
                                                    animate={{ scale: 1.2, opacity: 1 }}
                                                    exit={{ scale: 0, opacity: 0 }}
                                                    transition={{ type: "spring", stiffness: 400, damping: 20 }}
                                                    style={{ left: heartPos.x, top: heartPos.y, marginLeft: -48, marginTop: -48 }}
                                                    className="absolute z-20 pointer-events-none"
                                                >
                                                    <Heart className="w-24 h-24 text-white fill-white drop-shadow-xl" strokeWidth={1} />
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                        {content.img_texts?.[idx] && (
                                            <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/30 to-transparent pt-6">
                                                <span className="text-white text-sm font-medium drop-shadow-md">{content.img_texts[idx]}</span>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}

                        <ImageViewer
                            images={content.images}
                            initialIndex={viewerIndex}
                            isOpen={showViewer}
                            onClose={() => setShowViewer(false)}
                        />
                    </>
                )
            }

            {/* Satisfaction + Visit Info */}
            {(satisfaction || shopName || content.review_prop?.visit_date) && (
                <div className="px-5 mb-2 mt-2 flex items-center gap-1.5 text-[13px]">
                    {satisfaction && (
                        <span className={cn(
                            "font-bold text-[13px]",
                            satisfaction === 'good' ? "text-orange-600" : satisfaction === 'bad' ? "text-gray-400" : "text-gray-500"
                        )}>
                            {t(`write.basic.${satisfaction}`)}
                        </span>
                    )}
                    {(shopName || content.review_prop?.visit_date) && (
                        <span className="text-gray-600">
                            {i18n.language === 'ko' ? (
                                <>
                                    {shopName && <span>{appendJosa(shopName, '을/를')}</span>}
                                    {content.review_prop?.visit_date && (
                                        <span>{shopName ? ' ' : ''}{formatVisitDate(content.review_prop.visit_date, t)}</span>
                                    )}
                                    {shopName && <span> {t('content.visit_info.visited')}</span>}
                                </>
                            ) : (
                                <>
                                    {shopName && <span>{t('content.visit_info.visited')} {shopName}</span>}
                                    {content.review_prop?.visit_date && (
                                        <span>{shopName ? ' ' : ''}{formatVisitDate(content.review_prop.visit_date, t)}</span>
                                    )}
                                </>
                            )}
                        </span>
                    )}
                </div>
            )}

            {/* Text Body */}
            {content.text && (
                <div
                    onClick={(e) => { e.stopPropagation(); onSmartTap(e, 0, 'text'); }}
                    className="relative"
                >
                    <ContentBody text={content.text} maxLines={5} />
                    <AnimatePresence>
                        {showHeart && heartTarget === 'text' && heartPos && (
                            <motion.div
                                initial={{ scale: 0, opacity: 0 }}
                                animate={{ scale: 1.2, opacity: 1 }}
                                exit={{ scale: 0, opacity: 0 }}
                                transition={{ type: "spring", stiffness: 400, damping: 20 }}
                                style={{ left: heartPos.x, top: heartPos.y, marginLeft: -48, marginTop: -48 }}
                                className="absolute z-20 pointer-events-none"
                            >
                                <Heart className="w-24 h-24 text-red-500 fill-red-500 drop-shadow-xl opacity-80" strokeWidth={1} />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            )}

            {/* Link Display */}
            {content.link_json && content.link_json.length > 0 && (
                <div className="px-5 mb-4 space-y-1">
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
                                className="flex items-center gap-1 py-0.5 hover:underline decoration-orange-300 underline-offset-2 transition-all group"
                            >
                                <div className="flex-shrink-0 flex items-center justify-center">
                                    {label ? label : <Icon size={14} className="text-orange-600" />}
                                </div>
                                <span className="text-sm text-orange-600 leading-normal truncate font-medium">
                                    {link.title || link.url}
                                </span>
                            </a>
                        );
                    })}
                </div>
            )}



            {/* Shop Info Card */}
            {shopName && !hideShopInfo && (
                <ShopInfoCard
                    shop={{
                        id: content.poi?.shop_id || (content.review_prop as any)?.shop_id,
                        name: shopName,
                        address: shopAddress,
                        thumbnail_img: shopThumbnail
                    }}
                    distance={
                        coordinates && content.poi?.lat && content.poi?.lon
                            ? getDistanceText(coordinates.lat, coordinates.lon, content.poi.lat, content.poi.lon)
                            : undefined
                    }
                    initialIsBookmarked={isPoiBookmarked}
                    my_review_stats={content.poi?.my_review_stats || content.review_prop?.my_review_stats}
                    matchScore={content.poi?.shop_user_match_score}
                    showActions={showActions}
                    sourceUserId={user.id}
                    className="mx-5 mb-4"
                />
            )}

            {/* Free Post Badge (if no shop info) */}


            {/* Footer Stats & Actions (content scrap removed) */}
            <div className="px-5 mb-2">
                <div className="flex justify-between items-center mb-2">
                    <span className="text-[12px] text-gray-400">{formatFullDateTime(content.created_at, i18n.language)}</span>
                </div>

                <div className="flex items-center gap-1">
                    <button
                        type="button"
                        onPointerDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                        }}
                        onClick={handleLike}
                        className="flex items-center gap-1.5 h-9 px-2 -ml-2 rounded-full text-gray-600 active:text-red-500 active:bg-red-50 transition-colors active:scale-95"
                        style={{ WebkitTapHighlightColor: 'transparent' }}
                    >
                        <motion.div
                            initial={false}
                            animate={{ scale: isLiked ? [1, 1.4, 1] : 1 }}
                            transition={{ duration: 0.3 }}
                        >
                            <Heart size={20} className={cn(isLiked && 'fill-red-500 text-red-500')} />
                        </motion.div>
                        {likeCount > 0 && <span className="text-base font-medium">{likeCount}</span>}
                    </button>

                    <button
                        type="button"
                        onClick={handleOpenComments}
                        className="flex items-center gap-1.5 h-9 px-2 rounded-full text-gray-600 active:text-blue-500 active:bg-blue-50 transition-colors"
                        aria-label="Open comments"
                    >
                        <MessageCircle size={20} />
                        {commentCount > 0 && <span className="text-base font-medium">{commentCount}</span>}
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
                previewComments && previewComments.length > 0 && (
                    <div className="px-5 pb-2 mb-4 space-y-2">
                        {commentCount > previewComments.length && (
                            <button
                                onClick={handleOpenComments}
                                className="text-gray-500 text-sm font-medium hover:text-gray-800"
                            >
                                {t('content.view_all_comments', { count: commentCount })}
                            </button>
                        )}

                        {previewComments.map(comment => (
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
                onCommentSuccess={(stats, previews) => {
                    setCommentCount(stats.comments);
                    setPreviewComments(previews);
                }}
            />

            <ImageViewer
                images={content.images}
                initialIndex={viewerIndex}
                isOpen={showViewer}
                onClose={() => setShowViewer(false)}
                imgTexts={content.img_texts}
            />
        </div >
    );
};