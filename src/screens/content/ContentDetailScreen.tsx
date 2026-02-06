import { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useUser } from '@/context/UserContext';
import { API_BASE_URL } from '@/lib/api';
import { Heart, Send, MessageCircle } from 'lucide-react';
import { formatFullDateTime, formatVisitDate } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { authFetch } from '@/lib/authFetch';
import { ShopInfoCard } from '@/components/ShopInfoCard';
import { ProfileHeader } from '@/components/ProfileHeader';

export const ContentDetailScreen = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const contentId = searchParams.get('contentId');
    const { user: currentUser } = useUser();
    const { i18n, t } = useTranslation();

    const [content, setContent] = useState<any>(null);
    const [comments, setComments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [commentText, setCommentText] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const [isLiked, setIsLiked] = useState(false);
    const [likeCount, setLikeCount] = useState(0);
    const [commentCount, setCommentCount] = useState(0);

    useEffect(() => {
        if (!contentId) return;
        fetchContent();
        fetchComments();
    }, [contentId]);

    const fetchContent = async () => {
        try {
            const res = await authFetch(`${API_BASE_URL}/api/content/${contentId}`);
            const data = await res.json();
            setContent(data);
            setIsLiked(!!data.stats.is_liked);
            setLikeCount(data.stats.likes);
            setCommentCount(data.stats.comments);
        } catch (error) {
            console.error('Failed to fetch content:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchComments = async () => {
        try {
            const res = await authFetch(`${API_BASE_URL}/api/content/${contentId}/comments`);
            const data = await res.json();
            setComments(data);
        } catch (error) {
            console.error('Failed to fetch comments:', error);
        }
    };

    const handleToggleLike = async () => {
        if (!currentUser) return;

        const prevLiked = isLiked;
        const prevCount = likeCount;

        setIsLiked(!prevLiked);
        setLikeCount(!prevLiked ? prevCount + 1 : prevCount - 1);

        try {
            const method = prevLiked ? 'DELETE' : 'POST';
            const res = await authFetch(`${API_BASE_URL}/api/content/${contentId}/like`, {
                method,
                headers: { 'Content-Type': 'application/json' }
            });
            const data = await res.json();
            if (data.success && data.stats) {
                setIsLiked(data.stats.is_liked);
                setLikeCount(data.stats.likes);
            }
        } catch (e) {
            setIsLiked(prevLiked);
            setLikeCount(prevCount);
            console.error('Like failed', e);
        }
    };

    const handleCommentSubmit = async () => {
        if (!commentText.trim() || !currentUser || isSubmitting) return;

        setIsSubmitting(true);

        try {
            const res = await authFetch(`${API_BASE_URL}/api/content/${contentId}/comments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: commentText,
                })
            });

            const data = await res.json();
            if (data.new_comment) {
                setComments([data.new_comment, ...comments]);
                setCommentCount(data.stats.comments);
                setCommentText('');
            }
        } catch (error) {
            console.error('Failed to post comment:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        navigate(-1);
    };

    if (loading) {
        return (
            <div className="absolute inset-0 bg-background flex items-center justify-center z-50">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!content) {
        return (
            <div className="absolute inset-0 bg-background flex items-center justify-center z-50">
                <div className="text-center">
                    <p className="text-muted-foreground mb-4">콘텐츠를 찾을 수 없습니다</p>
                    <button onClick={handleClose} className="text-primary font-medium">
                        돌아가기
                    </button>
                </div>
            </div>
        );
    }

    const shopName = (content.poi?.name || content.poi?.shop_name) ?? content.review_prop?.shop_name;
    const shopAddress = (content.poi?.address_full || content.poi?.shop_address) ?? content.review_prop?.shop_address;
    const shopThumbnail = content.poi?.thumbnail_img ?? content.review_prop?.thumbnail_img;
    const satisfaction = content.poi?.satisfaction || content.review_prop?.satisfaction;
    const rank = content.poi?.rank ?? content.review_prop?.rank;
    const visitCount = content.review_prop?.visit_count;
    const companionUsers = content.review_prop?.companions_info;

    return (
        <div className="absolute inset-0 bg-background flex flex-col">
            {/* Header */}
            <ProfileHeader
                title="게시물"
                onBack={handleClose}
                isVisible={true}
            />

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto pb-20">
                <div className="bg-white">
                    {/* User Header */}
                    <div className="flex px-5 py-4 gap-3 items-start">
                        <div className="w-10 h-10 rounded-full bg-gray-100 overflow-hidden border border-gray-100 flex-shrink-0">
                            {content.user?.profile_image ? (
                                <img src={content.user.profile_image} alt={content.user.nickname} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-gray-200 text-lg">😊</div>
                            )}
                        </div>

                        <div className="flex flex-col min-w-0 flex-1">
                            <div className="flex items-baseline gap-2 mb-0.5">
                                <span className="font-bold text-base text-gray-900">{content.user?.nickname}</span>
                                {content.user?.cluster_name && (
                                    <span className="text-[11px] text-gray-400 font-medium">{content.user.cluster_name}</span>
                                )}
                            </div>

                            {/* Visit Info */}
                            {(shopName || content.review_prop?.visit_date || companionUsers) && (
                                <div className="text-[13px] text-gray-500 flex flex-wrap gap-x-1 leading-tight">
                                    {i18n.language === 'ko' ? (
                                        <>
                                            {companionUsers && companionUsers.length > 0 && (
                                                <span className="shrink-0">
                                                    {companionUsers.map((u: any, i: number) => (
                                                        <span key={i}>
                                                            {u.nickname}{i < companionUsers.length - 1 ? ', ' : ''}
                                                        </span>
                                                    ))}
                                                    {t('content.visit_info.with_postposition')}
                                                </span>
                                            )}

                                            {shopName && <span className="shrink-0">{shopName}</span>}

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
                                                    {t('content.visit_info.with')} {companionUsers.map((u: any, i: number) => (
                                                        <span key={i}>
                                                            {u.nickname}{i < companionUsers.length - 1 ? ', ' : ''}
                                                        </span>
                                                    ))}
                                                </span>
                                            )}
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Images */}
                    {content.images && content.images.length > 0 && (
                        <>
                            {content.images.length === 1 ? (
                                <div className="px-5 mb-4">
                                    <div className="w-full aspect-[4/3] rounded-lg overflow-hidden bg-gray-100 border border-gray-100">
                                        <img src={content.images[0]} alt="content-0" className="w-full h-full object-cover" />
                                    </div>
                                </div>
                            ) : (
                                <div className="flex overflow-x-auto px-5 gap-2 no-scrollbar mb-4 snap-x snap-mandatory">
                                    {content.images.map((img: string, idx: number) => (
                                        <div
                                            key={idx}
                                            className="flex-shrink-0 w-[310px] h-[310px] rounded-lg overflow-hidden bg-gray-100 border border-gray-100 snap-center"
                                        >
                                            <img src={img} alt={`content-${idx}`} className="w-full h-full object-cover" />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    )}

                    {/* Satisfaction & Ranking Badge */}
                    {(satisfaction || (typeof rank === 'number' && rank > 0)) && (
                        <div className="px-4 mb-2 mt-2 flex items-center gap-2 text-[13px]">
                            {(satisfaction || (content.user?.ranking_count && content.user.ranking_count >= 50)) && (
                                <span className={cn(
                                    "font-bold px-2 py-0.5 rounded-full border border-current text-xs flex items-center gap-1",
                                    satisfaction === 'good' ? "text-orange-600 border-orange-200 bg-orange-50" : "text-gray-500 border-gray-200 bg-gray-50"
                                )}>
                                    {satisfaction && t(`write.basic.${satisfaction}`)}

                                    {satisfaction && typeof rank === 'number' && rank > 0 && content.user?.ranking_count && content.user.ranking_count >= 50 && (
                                        <span className="opacity-30 mx-0.5">|</span>
                                    )}

                                    {typeof rank === 'number' && rank > 0 && content.user?.ranking_count && content.user.ranking_count >= 50 && (() => {
                                        const percent = Math.ceil((rank / content.user.ranking_count) * 100);
                                        return <span>{t('common.top')} {percent}%</span>;
                                    })()}
                                </span>
                            )}

                            {typeof rank === 'number' && rank > 0 && (() => {
                                const isTop5Percent = content.user?.ranking_count && content.user.ranking_count >= 50 && ((rank / content.user.ranking_count) * 100 <= 5);
                                const showTrophy = isTop5Percent || rank <= 10;
                                return (
                                    <span className="font-medium text-xs text-gray-800 flex items-center gap-1">
                                        {showTrophy && <span className="font-light">🏆</span>}
                                        {rank}{i18n.language === 'ko' ? '위' : (rank === 1 ? 'st' : rank === 2 ? 'nd' : rank === 3 ? 'rd' : 'th')}
                                    </span>
                                );
                            })()}
                        </div>
                    )}

                    {/* Text - Full Display (No Collapse) */}
                    {content.text && (
                        <div className="px-5 mb-4">
                            <div className="text-base text-gray-800 whitespace-pre-wrap break-words" style={{ lineHeight: '1.6' }}>
                                {content.text}
                            </div>
                        </div>
                    )}

                    {/* Shop Info Card */}
                    {shopName && (
                        <ShopInfoCard
                            shop={{
                                id: content.poi?.shop_id || content.review_prop?.shop_id,
                                name: shopName,
                                address: shopAddress,
                                thumbnail_img: shopThumbnail
                            }}
                            my_review_stats={content.poi?.my_review_stats || content.review_prop?.my_review_stats}
                            showActions={true}
                            className="mx-5 mb-4"
                        />
                    )}

                    {/* Footer Stats & Actions */}
                    <div className="px-5 mb-2">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-[12px] text-gray-400">{formatFullDateTime(content.created_at, i18n.language)}</span>
                        </div>

                        <div className="flex items-center gap-1">
                            <motion.button
                                type="button"
                                initial={false}
                                animate={{ scale: isLiked ? [1, 1.2, 1] : 1 }}
                                transition={{ duration: 0.3 }}
                                onClick={handleToggleLike}
                                className="flex items-center gap-1.5 h-9 px-2 -ml-2 rounded-full text-gray-600 active:text-red-500 active:bg-red-50 transition-colors"
                            >
                                <Heart size={20} className={cn(isLiked && 'fill-red-500 text-red-500')} />
                                {likeCount > 0 && <span className="text-base font-medium">{likeCount}</span>}
                            </motion.button>

                            <button
                                type="button"
                                onClick={() => inputRef.current?.focus()}
                                className="flex items-center gap-1.5 h-9 px-2 rounded-full text-gray-600 active:text-blue-500 active:bg-blue-50 transition-colors"
                            >
                                <MessageCircle size={20} />
                                {commentCount > 0 && <span className="text-base font-medium">{commentCount}</span>}
                            </button>

                            <button
                                type="button"
                                className="flex items-center justify-center gap-1.5 h-9 w-9 rounded-full text-gray-600 active:text-gray-900 active:bg-gray-100 transition-colors"
                            >
                                <Send size={20} />
                            </button>
                        </div>
                    </div>

                    {/* All Comments Section */}
                    <div className="border-t border-gray-100 pt-4 px-5 pb-6">
                        {comments.length > 0 ? (
                            <div className="space-y-4">
                                {comments.map((comment) => (
                                    <div key={comment.id} className="flex gap-3">
                                        <div className="w-8 h-8 rounded-full bg-gray-100 overflow-hidden flex-shrink-0">
                                            {comment.user?.profile_image ? (
                                                <img src={comment.user.profile_image} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center bg-gray-200 text-sm">😊</div>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="font-bold text-sm text-gray-900">{comment.user?.nickname || 'User'}</span>
                                                <span className="text-[11px] text-gray-400">
                                                    {formatFullDateTime(comment.created_at, i18n.language)}
                                                </span>
                                            </div>
                                            <p className="text-sm text-gray-700 break-words leading-tight">{comment.text}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-center text-gray-400 text-sm py-8">첫 댓글을 남겨보세요</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Sticky Comment Input */}
            <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4 flex-shrink-0 z-20">
                <div className="flex gap-2 items-center">
                    <input
                        ref={inputRef}
                        type="text"
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleCommentSubmit();
                            }
                        }}
                        placeholder="댓글을 입력하세요..."
                        className="flex-1 px-4 py-2 border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                    />
                    <button
                        onClick={handleCommentSubmit}
                        disabled={!commentText.trim() || isSubmitting}
                        className="px-4 py-2 bg-primary text-white rounded-full font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
                    >
                        {isSubmitting ? '전송 중...' : '전송'}
                    </button>
                </div>
            </div>
        </div>
    );
};
