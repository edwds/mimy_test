
import React, { useEffect, useState } from 'react';
import { MainHeader } from '@/components/MainHeader';
import { useTranslation } from 'react-i18next';
import { API_BASE_URL } from '@/lib/api';
import { useUser } from '@/context/UserContext';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Check, X } from 'lucide-react';

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

    useEffect(() => {
        if (user?.id) {
            setLoading(true);
            fetch(`${API_BASE_URL}/api/hate/history?user_id=${user.id}`)
                .then(res => res.json())
                .then(data => setHistory(Array.isArray(data) ? data : []))
                .catch(console.error)
                .finally(() => setLoading(false));
        }
    }, [user?.id]);

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
                        {history.map(item => (
                            <div key={item.id} className="bg-muted/10 rounded-xl p-4 border border-border/50 flex justify-between items-center">
                                <span className="text-lg font-bold">{item.item}</span>

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
                            </div>
                        ))}
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
