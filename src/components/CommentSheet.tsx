import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Send, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { API_BASE_URL } from '@/lib/api';
import { useUser } from '@/context/UserContext';
import { Capacitor } from '@capacitor/core';
import { Keyboard } from '@capacitor/keyboard';

interface Comment {
    id: number;
    text: string;
    created_at: string;
    user_id: number;
    user: {
        id: number;
        nickname: string | null;
        profile_image: string | null;
    };
}

interface CommentSheetProps {
    isOpen: boolean;
    onClose: () => void;
    contentId: number;
    onCommentSuccess?: (stats: { comments: number }, previewComments: any[]) => void;
}

export const CommentSheet = ({ isOpen, onClose, contentId, onCommentSuccess }: CommentSheetProps) => {
    const { user } = useUser();
    const [comments, setComments] = useState<Comment[]>([]);
    const [loading, setLoading] = useState(false);
    const [inputText, setInputText] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [keyboardHeight, setKeyboardHeight] = useState(0);
    const listRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Fetch comments when sheet opens and auto-focus input
    useEffect(() => {
        if (isOpen && contentId) {
            fetchComments();

            // Auto-focus input after sheet animation
            setTimeout(() => {
                if (inputRef.current && user) {
                    inputRef.current.focus();
                }
            }, 400); // Wait for sheet animation to complete
        }
    }, [isOpen, contentId, user]);

    // Handle Keyboard and Body Scroll
    useEffect(() => {
        if (!isOpen) {
            document.body.style.overflow = '';
            document.body.style.position = '';
            document.body.style.width = '';
            return;
        }

        // Lock scroll - more robust for mobile
        const originalOverflow = document.body.style.overflow;
        const originalPosition = document.body.style.position;
        const originalWidth = document.body.style.width;

        document.body.style.overflow = 'hidden';
        document.body.style.position = 'fixed';
        document.body.style.width = '100%';

        // iOS Capacitor: Use Keyboard API
        if (Capacitor.isNativePlatform()) {
            let keyboardWillShowListener: any;
            let keyboardWillHideListener: any;

            const setupListeners = async () => {
                keyboardWillShowListener = await Keyboard.addListener('keyboardWillShow', (info) => {
                    console.log('[CommentSheet] Keyboard will show:', info.keyboardHeight);
                    setKeyboardHeight(info.keyboardHeight);
                });

                keyboardWillHideListener = await Keyboard.addListener('keyboardWillHide', () => {
                    console.log('[CommentSheet] Keyboard will hide');
                    setKeyboardHeight(0);
                });
            };

            setupListeners();

            return () => {
                document.body.style.overflow = originalOverflow;
                document.body.style.position = originalPosition;
                document.body.style.width = originalWidth;
                keyboardWillShowListener?.remove();
                keyboardWillHideListener?.remove();
            };
        }

        // Web: Use Visual Viewport API
        const handleVisualViewportChange = () => {
            if (window.visualViewport) {
                const vh = window.visualViewport.height;
                const kh = window.innerHeight - vh;
                setKeyboardHeight(Math.max(0, kh));
            }
        };

        window.visualViewport?.addEventListener('resize', handleVisualViewportChange);
        window.visualViewport?.addEventListener('scroll', handleVisualViewportChange);
        handleVisualViewportChange();

        return () => {
            document.body.style.overflow = originalOverflow;
            document.body.style.position = originalPosition;
            document.body.style.width = originalWidth;
            window.visualViewport?.removeEventListener('resize', handleVisualViewportChange);
            window.visualViewport?.removeEventListener('scroll', handleVisualViewportChange);
        };
    }, [isOpen]);

    const scrollToBottom = () => {
        if (listRef.current) {
            listRef.current.scrollTo({
                top: listRef.current.scrollHeight,
                behavior: 'smooth'
            });
        }
    };

    const fetchComments = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/content/${contentId}/comments`);
            if (res.ok) {
                const data = await res.json();
                setComments(data);
            }
        } catch (error) {
            console.error("Failed to load comments", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputText.trim() || !user || submitting) return;

        setSubmitting(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/content/${contentId}/comments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: user.id,
                    text: inputText.trim()
                })
            });

            if (res.ok) {
                const data = await res.json();
                // Handle new response format { new_comment, stats, preview_comments }
                // Fallback for backward compatibility if backend returns just comment
                const newComment = data.new_comment || data;

                setComments(prev => [...prev, newComment]);
                setInputText('');
                setTimeout(scrollToBottom, 100);

                if (data.stats && data.preview_comments) {
                    onCommentSuccess?.(data.stats, data.preview_comments);
                }
            }
        } catch (error) {
            console.error("Failed to post comment", error);
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (commentId: number) => {
        if (!confirm("Delete this comment?")) return;

        try {
            const res = await fetch(`${API_BASE_URL}/api/content/comments/${commentId}`, {
                method: 'DELETE'
            });

            if (res.ok) {
                setComments(prev => prev.filter(c => c.id !== commentId));
            }
        } catch (error) {
            console.error("Failed to delete comment", error);
        }
    };

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-end justify-center pointer-events-none">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200 pointer-events-auto"
                onClick={onClose}
            />

            {/* Sheet */}
            <div
                style={{
                    transform: `translateY(-${keyboardHeight}px)`,
                    maxHeight: keyboardHeight > 0 ? `calc(100vh - ${keyboardHeight}px - 20px)` : '85%',
                    height: keyboardHeight > 0 ? `calc(100vh - ${keyboardHeight}px - 20px)` : '75%'
                }}
                className="relative w-full max-w-[430px] bg-white rounded-t-3xl shadow-2xl flex flex-col animate-in slide-in-from-bottom duration-300 pointer-events-auto transition-all duration-200 ease-out"
            >
                {/* Header */}
                <div className="p-4 border-b flex items-center justify-between bg-white/80 backdrop-blur-md rounded-t-3xl z-10 sticky top-0">
                    <div className="w-5" /> {/* Spacer */}
                    <div className="font-bold text-[15px]">
                        {comments.length} comments
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-muted rounded-full">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* List */}
                <div
                    ref={listRef}
                    className="flex-1 overflow-y-auto p-4 space-y-4"
                >
                    {loading ? (
                        <div className="flex justify-center py-10">
                            <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
                        </div>
                    ) : comments.length === 0 ? (
                        <div className="text-center py-10 text-muted-foreground">
                            No comments yet. Be the first!
                        </div>
                    ) : (
                        comments.map((comment) => (
                            <div key={comment.id} className="flex gap-3">
                                <div className="w-8 h-8 rounded-full overflow-hidden bg-muted flex-shrink-0">
                                    {comment.user.profile_image ? (
                                        <img src={comment.user.profile_image} alt={comment.user.nickname || "User"} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full bg-gray-200" />
                                    )}
                                </div>
                                <div className="flex-1 space-y-1">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-baseline gap-2">
                                            <span className="font-semibold text-sm">{comment.user.nickname || "User"}</span>
                                            <span className="text-xs text-muted-foreground">
                                                {new Date(comment.created_at).toLocaleDateString()}
                                            </span>
                                        </div>
                                        {user && user.id === comment.user_id && (
                                            <button
                                                onClick={() => handleDelete(comment.id)}
                                                className="text-muted-foreground hover:text-red-500 transition-colors"
                                            >
                                                <Trash2 className="w-3 h-3" />
                                            </button>
                                        )}
                                    </div>
                                    <p className="text-sm text-foreground/90 leading-relaxed font-base">
                                        {comment.text}
                                    </p>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Input */}
                <div
                    className="p-4 border-t bg-white z-20"
                    style={{
                        paddingBottom: Capacitor.isNativePlatform()
                            ? 'max(8px, env(safe-area-inset-bottom))'
                            : (keyboardHeight > 0 ? '80px' : '16px')
                    }}
                >
                    <form onSubmit={handleSubmit} className="flex gap-2">
                        <input
                            ref={inputRef}
                            type="text"
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            placeholder={user ? "Add a comment..." : "Login to comment"}
                            disabled={!user || submitting}
                            className="flex-1 bg-gray-100 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                        <button
                            type="submit"
                            disabled={!inputText.trim() || submitting}
                            className={cn(
                                "p-2 rounded-full bg-primary text-white transition-all",
                                (!inputText.trim() || submitting) ? "opacity-50 cursor-not-allowed" : "hover:scale-105"
                            )}
                        >
                            <Send className="w-4 h-4" />
                        </button>
                    </form>
                </div>
            </div>
        </div>,
        document.body
    );
};
