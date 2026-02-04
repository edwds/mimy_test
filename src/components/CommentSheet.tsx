import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Send, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { API_BASE_URL } from '@/lib/api';
import { authFetch } from '@/lib/authFetch';
import { useUser } from '@/context/UserContext';
import { Capacitor } from '@capacitor/core';

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
    const listRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Fetch comments when sheet opens and auto-focus input
    useEffect(() => {
        if (isOpen && contentId) {
            fetchComments();

            // Auto-focus input after sheet animation - only on native
            if (Capacitor.isNativePlatform()) {
                setTimeout(() => {
                    if (inputRef.current && user) {
                        inputRef.current.focus();
                    }
                }, 500); // Wait for sheet animation to complete
            }
        }
    }, [isOpen, contentId, user]);

    // Handle Body Scroll Lock
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

        return () => {
            document.body.style.overflow = originalOverflow;
            document.body.style.position = originalPosition;
            document.body.style.width = originalWidth;
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
            const res = await authFetch(`${API_BASE_URL}/api/content/${contentId}/comments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
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

            {/* Sheet - Fixed 90% height, top stays in place */}
            <div
                className="relative w-full max-w-[430px] bg-white rounded-t-3xl shadow-2xl flex flex-col animate-in slide-in-from-bottom duration-300 pointer-events-auto"
                style={{
                    height: '90vh',
                    maxHeight: '90vh'
                }}
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
                        paddingBottom: 'max(16px, env(safe-area-inset-bottom))'
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
