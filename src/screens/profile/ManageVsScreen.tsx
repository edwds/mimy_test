import { useEffect, useState } from 'react';
import { MainHeader } from '@/components/MainHeader';
import { useTranslation } from 'react-i18next';
import { API_BASE_URL } from '@/lib/api';
import { useUser } from '@/context/UserContext';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Check, Pencil, Trash2 } from 'lucide-react';

interface VsHistoryItem {
    id: number;
    item_a: string;
    item_b: string;
    selected_value: 'A' | 'B';
    voted_at: string;
}

export const ManageVsScreen = () => {
    const { t } = useTranslation();
    const { user } = useUser();
    const navigate = useNavigate();
    const [history, setHistory] = useState<VsHistoryItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [updatingId, setUpdatingId] = useState<number | null>(null);

    useEffect(() => {
        if (user?.id) {
            loadHistory();
        }
    }, [user?.id]);

    const loadHistory = () => {
        setLoading(true);
        fetch(`${API_BASE_URL}/api/vs/history?user_id=${user?.id}`)
            .then(res => res.json())
            .then(data => setHistory(Array.isArray(data) ? data : []))
            .catch(console.error)
            .finally(() => setLoading(false));
    };

    const handleUpdate = async (id: number, newSelection: 'A' | 'B') => {
        if (!user?.id || updatingId) return;

        setUpdatingId(id);
        try {
            const response = await fetch(`${API_BASE_URL}/api/vs/${id}/vote`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-user-id': String(user.id)
                },
                body: JSON.stringify({ selection: newSelection })
            });

            if (response.ok) {
                setHistory(prev => prev.map(item =>
                    item.id === id ? { ...item, selected_value: newSelection } : item
                ));
                setEditingId(null);
            }
        } catch (error) {
            console.error('Failed to update vote:', error);
        } finally {
            setUpdatingId(null);
        }
    };

    const handleDelete = async (id: number) => {
        if (!user?.id || updatingId) return;

        if (!confirm(t('manage.vs.delete_confirm', 'Delete this vote?'))) {
            return;
        }

        setUpdatingId(id);
        try {
            const response = await fetch(`${API_BASE_URL}/api/vs/${id}/vote`, {
                method: 'DELETE',
                headers: {
                    'x-user-id': String(user.id)
                }
            });

            if (response.ok) {
                setHistory(prev => prev.filter(item => item.id !== id));
            }
        } catch (error) {
            console.error('Failed to delete vote:', error);
        } finally {
            setUpdatingId(null);
        }
    };

    return (
        <div className="flex flex-col h-full bg-background relative">
            <MainHeader
                title={t('manage.vs.title')}
                isVisible={true}
                rightAction={
                    <button onClick={() => navigate(-1)} className="text-sm font-medium pr-4">
                        {t('common.close', 'Close')}
                    </button>
                }
            />

            <div className="flex-1 overflow-y-auto px-5 py-20 pb-24">
                {loading ? (
                    <div className="flex justify-center py-10">
                        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : history.length === 0 ? (
                    <div className="text-center py-20 text-muted-foreground">
                        <p>{t('manage.vs.empty')}</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {history.map(item => {
                            const isEditing = editingId === item.id;
                            const isUpdating = updatingId === item.id;

                            return (
                                <div key={item.id} className="bg-muted/10 rounded-xl p-4 border border-border/50">
                                    <div className="flex items-center gap-3 mb-3">
                                        <div
                                            className={cn(
                                                "flex-1 p-3 rounded-lg text-center font-medium transition-all relative overflow-hidden",
                                                isEditing
                                                    ? "cursor-pointer hover:bg-primary/10 border-2 border-border"
                                                    : item.selected_value === 'A'
                                                        ? "bg-primary text-primary-foreground shadow-sm"
                                                        : "bg-muted/50 text-muted-foreground opacity-70"
                                            )}
                                            onClick={() => isEditing && !isUpdating && handleUpdate(item.id, 'A')}
                                        >
                                            {item.item_a}
                                            {!isEditing && item.selected_value === 'A' && (
                                                <div className="absolute top-1 right-1">
                                                    <Check size={12} strokeWidth={4} />
                                                </div>
                                            )}
                                        </div>

                                        <div className="text-xs font-black text-muted-foreground">VS</div>

                                        <div
                                            className={cn(
                                                "flex-1 p-3 rounded-lg text-center font-medium transition-all relative overflow-hidden",
                                                isEditing
                                                    ? "cursor-pointer hover:bg-primary/10 border-2 border-border"
                                                    : item.selected_value === 'B'
                                                        ? "bg-primary text-primary-foreground shadow-sm"
                                                        : "bg-muted/50 text-muted-foreground opacity-70"
                                            )}
                                            onClick={() => isEditing && !isUpdating && handleUpdate(item.id, 'B')}
                                        >
                                            {item.item_b}
                                            {!isEditing && item.selected_value === 'B' && (
                                                <div className="absolute top-1 right-1">
                                                    <Check size={12} strokeWidth={4} />
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex gap-2">
                                        {isEditing ? (
                                            <button
                                                onClick={() => setEditingId(null)}
                                                disabled={isUpdating}
                                                className="flex-1 px-3 py-2 text-sm font-medium rounded-lg bg-muted hover:bg-muted/80 transition-colors disabled:opacity-50"
                                            >
                                                {t('common.cancel', 'Cancel')}
                                            </button>
                                        ) : (
                                            <>
                                                <button
                                                    onClick={() => setEditingId(item.id)}
                                                    disabled={isUpdating}
                                                    className="flex-1 px-3 py-2 text-sm font-medium rounded-lg bg-muted hover:bg-muted/80 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                                                >
                                                    <Pencil size={14} />
                                                    {t('common.edit', 'Edit')}
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(item.id)}
                                                    disabled={isUpdating}
                                                    className="flex-1 px-3 py-2 text-sm font-medium rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                                                >
                                                    <Trash2 size={14} />
                                                    {t('common.delete', 'Delete')}
                                                </button>
                                            </>
                                        )}
                                    </div>

                                    {isEditing && (
                                        <p className="text-xs text-muted-foreground mt-2 text-center">
                                            {t('manage.vs.edit_hint', 'Click on an option to change your choice')}
                                        </p>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            <div className="fixed bottom-0 left-0 right-0 p-5 bg-background border-t border-border/10">
                <button
                    onClick={() => navigate('/main')} // Go to home to see more cards? Or maybe we need a dedicated voting page later.
                    // For now, let user know they can vote in feed.
                    className="w-full bg-foreground text-background font-bold py-3.5 rounded-full hover:opacity-90 transition-opacity"
                >
                    {t('manage.vs.vote_more')}
                </button>
            </div>
        </div>
    );
};
