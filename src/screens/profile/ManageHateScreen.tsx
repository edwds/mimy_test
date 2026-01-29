
import { useEffect, useState } from 'react';
import { MainHeader } from '@/components/MainHeader';
import { useTranslation } from 'react-i18next';
import { API_BASE_URL } from '@/lib/api';
import { useUser } from '@/context/UserContext';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Check, X, Pencil, Trash2 } from 'lucide-react';

interface HateHistoryItem {
    id: number;
    item: string;
    selection: 'EAT' | 'NOT_EAT';
    voted_at: string;
}

export const ManageHateScreen = () => {
    const { t } = useTranslation();
    const { user } = useUser();
    const navigate = useNavigate();
    const [history, setHistory] = useState<HateHistoryItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [updatingId, setUpdatingId] = useState<number | null>(null);

    useEffect(() => {
        if (user?.id) {
            loadHistory();
        }
    }, [user?.id]);

    const loadHistory = () => {
        if (!user?.id) return;

        setLoading(true);
        fetch(`${API_BASE_URL}/api/hate/history`, {
            headers: {
                'x-user-id': String(user.id)
            }
        })
            .then(res => res.json())
            .then(data => setHistory(Array.isArray(data) ? data : []))
            .catch(console.error)
            .finally(() => setLoading(false));
    };

    const handleUpdate = async (id: number, newSelection: 'EAT' | 'NOT_EAT') => {
        if (!user?.id || updatingId) return;

        setUpdatingId(id);
        try {
            const response = await fetch(`${API_BASE_URL}/api/hate/${id}/vote`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-user-id': String(user.id)
                },
                body: JSON.stringify({ selection: newSelection })
            });

            if (response.ok) {
                setHistory(prev => prev.map(item =>
                    item.id === id ? { ...item, selection: newSelection } : item
                ));
                setEditingId(null);
            }
        } catch (error) {
            console.error('Failed to update selection:', error);
        } finally {
            setUpdatingId(null);
        }
    };

    const handleDelete = async (id: number) => {
        if (!user?.id || updatingId) return;

        if (!confirm(t('manage.hate.delete_confirm', 'Delete this selection?'))) {
            return;
        }

        setUpdatingId(id);
        try {
            const response = await fetch(`${API_BASE_URL}/api/hate/${id}/vote`, {
                method: 'DELETE',
                headers: {
                    'x-user-id': String(user.id)
                }
            });

            if (response.ok) {
                setHistory(prev => prev.filter(item => item.id !== id));
            }
        } catch (error) {
            console.error('Failed to delete selection:', error);
        } finally {
            setUpdatingId(null);
        }
    };

    return (
        <div className="flex flex-col h-full bg-background relative">
            <MainHeader
                title={t('manage.hate.title')}
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
                        <p>{t('manage.hate.empty')}</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {history.map(item => {
                            const isEditing = editingId === item.id;
                            const isUpdating = updatingId === item.id;

                            return (
                                <div key={item.id} className="bg-muted/10 rounded-xl p-4 border border-border/50">
                                    <div className="flex justify-between items-center mb-3">
                                        <span className="text-lg font-bold">{item.item}</span>

                                        {!isEditing && (
                                            <div className={cn(
                                                "px-3 py-1.5 rounded-full text-sm font-bold flex items-center gap-1.5",
                                                item.selection === 'EAT'
                                                    ? "bg-green-100 text-green-700"
                                                    : "bg-red-100 text-red-700"
                                            )}>
                                                {item.selection === 'EAT' ? (
                                                    <>
                                                        <Check size={14} />
                                                        {t('manage.hate.eat')}
                                                    </>
                                                ) : (
                                                    <>
                                                        <X size={14} />
                                                        {t('manage.hate.not_eat')}
                                                    </>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {isEditing && (
                                        <>
                                            <div className="flex gap-2 mb-3">
                                                <button
                                                    onClick={() => !isUpdating && handleUpdate(item.id, 'EAT')}
                                                    disabled={isUpdating}
                                                    className={cn(
                                                        "flex-1 px-4 py-3 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50",
                                                        "bg-green-100 text-green-700 hover:bg-green-200"
                                                    )}
                                                >
                                                    <Check size={16} />
                                                    {t('manage.hate.eat')}
                                                </button>
                                                <button
                                                    onClick={() => !isUpdating && handleUpdate(item.id, 'NOT_EAT')}
                                                    disabled={isUpdating}
                                                    className={cn(
                                                        "flex-1 px-4 py-3 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50",
                                                        "bg-red-100 text-red-700 hover:bg-red-200"
                                                    )}
                                                >
                                                    <X size={16} />
                                                    {t('manage.hate.not_eat')}
                                                </button>
                                            </div>
                                            <p className="text-xs text-muted-foreground mb-3 text-center">
                                                {t('manage.hate.edit_hint', 'Click on a button to change your choice')}
                                            </p>
                                        </>
                                    )}

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
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            <div className="fixed bottom-0 left-0 right-0 p-5 bg-background border-t border-border/10">
                <button
                    onClick={() => navigate('/main')}
                    className="w-full bg-foreground text-background font-bold py-3.5 rounded-full hover:opacity-90 transition-opacity"
                >
                    {t('manage.hate.vote_more')}
                </button>
            </div>
        </div>
    );
};
