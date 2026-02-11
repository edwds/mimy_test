import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { API_BASE_URL } from '@/lib/api';
import { authFetch } from '@/lib/authFetch';
import { useUser } from '@/context/UserContext';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Check, X, Trash2, AlertCircle } from 'lucide-react';

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
            const res = await authFetch(`${API_BASE_URL}/api/hate/history`);
            const data = await res.json();
            setHistory(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Failed to load history:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: number, itemName: string) => {
        if (!user?.id || deletingId) return;

        if (!confirm(t('manage.hate.delete_confirm', `'{{item}}' 선택을 삭제할까요?`, { item: itemName }))) {
            return;
        }

        setDeletingId(id);
        try {
            const response = await authFetch(`${API_BASE_URL}/api/hate/${id}/vote`, {
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

    const eatItems = history.filter(item => item.selection === 'EAT');
    const notEatItems = history.filter(item => item.selection === 'NOT_EAT');

    return (
        <div className="flex flex-col h-full bg-background">
            {/* iOS Safe Area Spacer */}
            <div className="bg-background" style={{ paddingTop: 'env(safe-area-inset-top)' }} />

            {/* Header */}
            <div className="flex items-center h-14 px-4 border-b border-border/50 bg-background">
                <button
                    onClick={() => navigate(-1)}
                    className="w-10 h-10 flex items-center justify-center -ml-2"
                >
                    <ChevronLeft size={24} />
                </button>
                <h1 className="flex-1 text-center font-bold text-lg pr-8">
                    {t('manage.hate.title', '호불호 이력')}
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
                        <p className="text-lg font-medium">{t('manage.hate.empty', '아직 선택한 항목이 없어요')}</p>
                        <p className="text-sm mt-1">{t('manage.hate.empty_hint', '홈에서 호불호 카드를 만나보세요')}</p>
                    </div>
                ) : (
                    <div className="p-4 space-y-6">
                        {/* NOT_EAT Section */}
                        {notEatItems.length > 0 && (
                            <div>
                                <div className="flex items-center gap-2 mb-3">
                                    <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center">
                                        <X size={14} className="text-red-600" />
                                    </div>
                                    <span className="font-bold text-red-600">
                                        {t('manage.hate.not_eat', '못 먹어요')}
                                    </span>
                                    <span className="text-sm text-muted-foreground">
                                        {notEatItems.length}
                                    </span>
                                </div>
                                <div className="space-y-2">
                                    {notEatItems.map(item => (
                                        <div
                                            key={item.id}
                                            className="flex items-center justify-between bg-red-50 rounded-xl px-4 py-3"
                                        >
                                            <span className="font-medium">{item.item}</span>
                                            <button
                                                onClick={() => handleDelete(item.id, item.item)}
                                                disabled={deletingId === item.id}
                                                className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-red-500 transition-colors disabled:opacity-50"
                                            >
                                                {deletingId === item.id ? (
                                                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                                ) : (
                                                    <Trash2 size={18} />
                                                )}
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* EAT Section */}
                        {eatItems.length > 0 && (
                            <div>
                                <div className="flex items-center gap-2 mb-3">
                                    <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center">
                                        <Check size={14} className="text-green-600" />
                                    </div>
                                    <span className="font-bold text-green-600">
                                        {t('manage.hate.eat', '먹을 수 있어요')}
                                    </span>
                                    <span className="text-sm text-muted-foreground">
                                        {eatItems.length}
                                    </span>
                                </div>
                                <div className="space-y-2">
                                    {eatItems.map(item => (
                                        <div
                                            key={item.id}
                                            className="flex items-center justify-between bg-green-50 rounded-xl px-4 py-3"
                                        >
                                            <span className="font-medium">{item.item}</span>
                                            <button
                                                onClick={() => handleDelete(item.id, item.item)}
                                                disabled={deletingId === item.id}
                                                className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-red-500 transition-colors disabled:opacity-50"
                                            >
                                                {deletingId === item.id ? (
                                                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                                ) : (
                                                    <Trash2 size={18} />
                                                )}
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
