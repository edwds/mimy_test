import React, { useEffect, useState } from 'react';
import { MainHeader } from '@/components/MainHeader';
import { useTranslation } from 'react-i18next';
import { API_BASE_URL } from '@/lib/api';
import { useUser } from '@/context/UserContext';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

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

    useEffect(() => {
        if (user?.id) {
            setLoading(true);
            fetch(`${API_BASE_URL}/api/vs/history?user_id=${user.id}`)
                .then(res => res.json())
                .then(data => setHistory(Array.isArray(data) ? data : []))
                .catch(console.error)
                .finally(() => setLoading(false));
        }
    }, [user?.id]);

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
                        {history.map(item => (
                            <div key={item.id} className="bg-muted/10 rounded-xl p-4 border border-border/50">
                                <div className="flex items-center gap-3">
                                    <div className={cn(
                                        "flex-1 p-3 rounded-lg text-center font-medium transition-all relative overflow-hidden",
                                        item.selected_value === 'A'
                                            ? "bg-primary text-primary-foreground shadow-sm"
                                            : "bg-muted/50 text-muted-foreground opacity-70"
                                    )}>
                                        {item.item_a}
                                        {item.selected_value === 'A' && (
                                            <div className="absolute top-1 right-1">
                                                <Check size={12} strokeWidth={4} />
                                            </div>
                                        )}
                                    </div>

                                    <div className="text-xs font-black text-muted-foreground">VS</div>

                                    <div className={cn(
                                        "flex-1 p-3 rounded-lg text-center font-medium transition-all relative overflow-hidden",
                                        item.selected_value === 'B'
                                            ? "bg-primary text-primary-foreground shadow-sm"
                                            : "bg-muted/50 text-muted-foreground opacity-70"
                                    )}>
                                        {item.item_b}
                                        {item.selected_value === 'B' && (
                                            <div className="absolute top-1 right-1">
                                                <Check size={12} strokeWidth={4} />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
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
