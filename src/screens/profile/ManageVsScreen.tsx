import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { API_BASE_URL } from '@/lib/api';
import { authFetch } from '@/lib/authFetch';
import { useUser } from '@/context/UserContext';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Trash2, AlertCircle } from 'lucide-react';

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
    const [loading, setLoading] = useState(true);
    const [deletingId, setDeletingId] = useState<number | null>(null);

    useEffect(() => {
        if (user?.id) {
            loadHistory();
        }
    }, [user?.id]);

    const loadHistory = async () => {
        if (!user?.id) return;

        try {
            const res = await authFetch(`${API_BASE_URL}/api/vs/history`);
            const data = await res.json();
            setHistory(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Failed to load history:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: number, itemA: string, itemB: string) => {
        if (!user?.id || deletingId) return;

        if (!confirm(t('manage.vs.delete_confirm', `'{{itemA}} vs {{itemB}}' 투표를 삭제할까요?`, { itemA, itemB }))) {
            return;
        }

        setDeletingId(id);
        try {
            const response = await authFetch(`${API_BASE_URL}/api/vs/${id}/vote`, {
                method: 'DELETE'
            });

            if (response.ok) {
                setHistory(prev => prev.filter(item => item.id !== id));
            }
        } catch (error) {
            console.error('Failed to delete:', error);
        } finally {
            setDeletingId(null);
        }
    };

    return (
        <div className="flex flex-col h-full bg-background">
            {/* Header with iOS safe area */}
            <div
                className="flex items-center h-14 px-4 border-b border-border/50 bg-background"
                style={{ paddingTop: 'env(safe-area-inset-top)' }}
            >
                <button
                    onClick={() => navigate(-1)}
                    className="w-10 h-10 flex items-center justify-center -ml-2"
                >
                    <ChevronLeft size={24} />
                </button>
                <h1 className="flex-1 text-center font-bold text-lg pr-8">
                    {t('manage.vs.title', 'VS 투표 이력')}
                </h1>
            </div>

            {/* Content with iOS safe area */}
            <div
                className="flex-1 overflow-y-auto"
                style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
            >
                {loading ? (
                    <div className="flex justify-center items-center h-64">
                        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : history.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                        <AlertCircle size={48} className="mb-4 opacity-50" />
                        <p className="text-lg font-medium">{t('manage.vs.empty', '아직 투표한 항목이 없어요')}</p>
                        <p className="text-sm mt-1">{t('manage.vs.empty_hint', '홈에서 VS 카드를 만나보세요')}</p>
                    </div>
                ) : (
                    <div className="p-4 space-y-3">
                        <p className="text-sm text-muted-foreground mb-4">
                            {t('manage.vs.total_count', '총 {{count}}개의 투표', { count: history.length })}
                        </p>
                        {history.map(item => {
                            const isDeleting = deletingId === item.id;
                            const selectedItem = item.selected_value === 'A' ? item.item_a : item.item_b;
                            const notSelectedItem = item.selected_value === 'A' ? item.item_b : item.item_a;

                            return (
                                <div
                                    key={item.id}
                                    className="bg-muted/30 rounded-xl p-4"
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2 flex-1 min-w-0">
                                            <span className="font-bold text-primary truncate">{selectedItem}</span>
                                            <span className="text-xs text-muted-foreground flex-shrink-0">vs</span>
                                            <span className="text-muted-foreground truncate">{notSelectedItem}</span>
                                        </div>
                                        <button
                                            onClick={() => handleDelete(item.id, item.item_a, item.item_b)}
                                            disabled={isDeleting}
                                            className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-red-500 transition-colors disabled:opacity-50 flex-shrink-0 ml-2"
                                        >
                                            {isDeleting ? (
                                                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                            ) : (
                                                <Trash2 size={18} />
                                            )}
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};
