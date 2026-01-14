import { useState, useEffect } from 'react';
import { X, Send, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { API_BASE_URL } from '@/lib/api';
import { useUser } from '@/context/UserContext';

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
}

export const CommentSheet = ({ isOpen, onClose, contentId }: CommentSheetProps) => {
    const { user } = useUser();
    const [comments, setComments] = useState<Comment[]>([]);
    const [loading, setLoading] = useState(false);
    const [inputText, setInputText] = useState('');
    const [submitting, setSubmitting] = useState(false);

    // Fetch comments when sheet opens
    useEffect(() => {
        if (isOpen && contentId) {
            fetchComments();
        }
    }, [isOpen, contentId]);

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
                const newComment = await res.json();
                setComments(prev => [...prev, newComment]);
                setInputText('');
                // Scroll to bottom logic could be added here
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

    return (
        <div className="fixed inset-0 z-[9999] flex items-end justify-center pointer-events-auto">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200"
                onClick={onClose}
            />

            {/* Sheet */}
            <div className="relative w-full max-w-[430px] h-[75%] bg-white rounded-t-3xl shadow-2xl flex flex-col animate-in slide-in-from-bottom duration-300">
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
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
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
                <div className="p-4 border-t bg-white safe-area-pb z-20">
                    <form onSubmit={handleSubmit} className="flex gap-2">
                        <input
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
        </div>
    );
};
