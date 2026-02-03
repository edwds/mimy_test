import { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useUser } from '@/context/UserContext';
import { API_BASE_URL } from '@/lib/api';
import { X, Heart, Send, MessageCircle, ChevronLeft } from 'lucide-react';
import { formatFullDateTime } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { authFetch } from '@/lib/authFetch';

export const ContentDetailScreen = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const contentId = searchParams.get('contentId');
    const { user: currentUser } = useUser();
    const { i18n } = useTranslation();

    const [content, setContent] = useState<any>(null);
    const [comments, setComments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [commentText, setCommentText] = useState('');
    const [showCommentInput, setShowCommentInput] = useState(false);
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
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: currentUser.id })
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
        if (!commentText.trim() || !currentUser) return;

        try {
            const res = await authFetch(`${API_BASE_URL}/api/content/${contentId}/comments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: currentUser.id,
                    text: commentText,
                })
            });

            const data = await res.json();
            if (data.new_comment) {
                setComments([data.new_comment, ...comments]);
                setCommentCount(data.stats.comments);
                setCommentText('');
                setShowCommentInput(false);
            }
        } catch (error) {
            console.error('Failed to post comment:', error);
        }
    };

    const handleClose = () => {
        navigate(-1);
    };

    if (loading) {
        return (
            <div className="fixed inset-0 bg-background flex items-center justify-center z-50">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!content) {
        return (
            <div className="fixed inset-0 bg-background flex items-center justify-center z-50">
                <div className="text-center">
                    <p className="text-muted-foreground mb-4">콘텐츠를 찾을 수 없습니다</p>
                    <button onClick={handleClose} className="text-primary font-medium">
                        돌아가기
                    </button>
                </div>
            </div>
        );
    }

    const shopName = content.poi?.shop_name ?? content.review_prop?.shop_name;

    return (
        <div className="fixed inset-0 bg-background z-50 overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b border-border z-10">
                <div className="flex items-center justify-between px-4 h-14">
                    <button onClick={handleClose} className="p-2 -ml-2 rounded-full hover:bg-muted">
                        <ChevronLeft size={24} />
                    </button>
                    <h1 className="text-lg font-semibold">게시물</h1>
                    <div className="w-10" />
                </div>
            </div>

            {/* Content */}
            <div className="bg-white mb-8">
                {/* User Header */}
                <div className="flex px-5 py-4 gap-3 items-start">
                    <div className="w-10 h-10 rounded-full bg-gray-100 overflow-hidden border border-gray-100 flex-shrink-0">
                        {content.user.profile_image ? (
                            <img src={content.user.profile_image} alt={content.user.nickname} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gray-200 text-lg">😊</div>
                        )}
                    </div>

                    <div className="flex flex-col min-w-0 flex-1">
                        <span className="font-bold text-base text-gray-900">{content.user.nickname}</span>
                        {shopName && (
                            <span className="text-[13px] text-gray-500">{shopName}</span>
                        )}
                    </div>
                </div>

                {/* Images */}
                {content.images && content.images.length > 0 && (
                    <div className="px-5 mb-4">
                        {content.images.map((img: string, idx: number) => (
                            <div key={idx} className="mb-2 rounded-lg overflow-hidden">
                                <img src={img} alt={`content-${idx}`} className="w-full" />
                            </div>
                        ))}
                    </div>
                )}

                {/* Text - 전체 노출 (접기 없음) */}
                {content.text && (
                    <div className="px-5 mb-4">
                        <div className="text-base text-gray-800 whitespace-pre-wrap break-words leading-relaxed">
                            {content.text}
                        </div>
                    </div>
                )}

                {/* Footer */}
                <div className="px-5 mb-2">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-[12px] text-gray-400">{formatFullDateTime(content.created_at, i18n.language)}</span>
                    </div>

                    <div className="flex items-center gap-1">
                        <motion.button
                            type="button"
                            whileTap={{ scale: 0.8 }}
                            onClick={handleToggleLike}
                            className="flex items-center gap-1.5 h-9 px-2 -ml-2 rounded-full text-gray-600 active:text-red-500 active:bg-red-50 transition-colors"
                        >
                            <Heart size={20} className={cn(isLiked && 'fill-red-500 text-red-500')} />
                            {likeCount > 0 && <span className="text-base font-medium">{likeCount}</span>}
                        </motion.button>

                        <button
                            type="button"
                            onClick={() => {
                                setShowCommentInput(true);
                                setTimeout(() => inputRef.current?.focus(), 100);
                            }}
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

                {/* Comments Section - 전체 댓글 노출 */}
                <div className="border-t border-gray-100 pt-4 px-5">
                    <h3 className="font-bold text-base mb-4">댓글 {commentCount}개</h3>

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
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="font-bold text-sm">{comment.user?.nickname || 'User'}</span>
                                            <span className="text-[11px] text-gray-400">
                                                {formatFullDateTime(comment.created_at, i18n.language)}
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-700 break-words">{comment.text}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-center text-gray-400 text-sm py-8">첫 댓글을 남겨보세요</p>
                    )}
                </div>
            </div>

            {/* Comment Input - 버튼 누르면 올라오는 인풋 */}
            {showCommentInput && (
                <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 safe-area-bottom z-20">
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
                            className="flex-1 px-4 py-2 border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                        <button
                            onClick={handleCommentSubmit}
                            disabled={!commentText.trim()}
                            className="px-4 py-2 bg-primary text-white rounded-full font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            전송
                        </button>
                        <button
                            onClick={() => {
                                setShowCommentInput(false);
                                setCommentText('');
                            }}
                            className="p-2 text-gray-400 hover:text-gray-600"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
