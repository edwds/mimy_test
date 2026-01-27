import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Trophy, Check } from 'lucide-react';
import { API_BASE_URL } from '@/lib/api';
import { ContentService } from '@/services/ContentService';
import { useTranslation, Trans } from 'react-i18next';

interface Props {
    userId: number;
    currentShop: any; // { id, name, food_kind }
    satisfaction: string;
    onWriteReview: () => void;
    onEvaluateAnother: () => void;
    onComplete: () => void;
}

interface Candidate {
    shop_id: number;
    rank: number;
    shop_name: string;
    food_kind: string;
}

export const RankingStep: React.FC<Props> = ({ userId, currentShop, satisfaction, onWriteReview, onEvaluateAnother, onComplete }) => {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(true);
    const [mode, setMode] = useState<'COMPARING' | 'SUCCESS'>('COMPARING');
    const [candidates, setCandidates] = useState<Candidate[]>([]);

    // Binary Search State
    const [minIdx, setMinIdx] = useState(0);
    const [maxIdx, setMaxIdx] = useState(0);
    const [compareIdx, setCompareIdx] = useState(0);

    // Helper to map satisfaction to tier
    function mapSatisfactionToTier(satisfaction: string): number {
        switch (satisfaction) {
            case 'best': return 3;
            case 'good': return 2;
            case 'ok': return 1;
            case 'bad': return 0;
            default: return 2;
        }
    }

    useEffect(() => {
        const init = async () => {
            try {
                // Fetch candidates with same satisfaction tier, excluding current shop
                const tier = mapSatisfactionToTier(satisfaction);
                const res = await fetch(`${API_BASE_URL}/api/content/ranking/candidates?user_id=${userId}&satisfaction_tier=${tier}&exclude_shop_id=${currentShop.id}`);

                if (res.ok) {
                    const data: Candidate[] = await res.json();

                    if (data.length === 0) {
                        // No existing items in this group -> Automatic Rank 1 (Insert Index 0)
                        await saveRank(0);
                        setMode('SUCCESS');
                    } else {
                        // Start Binary Search
                        setCandidates(data);
                        setMinIdx(0);
                        setMaxIdx(data.length - 1);
                        setCompareIdx(Math.floor((0 + data.length - 1) / 2));
                        setMode('COMPARING');
                    }
                }
            } catch (e) {
                console.error(e);
                setMode('SUCCESS'); // Fallback
            } finally {
                setLoading(false);
            }
        };
        init();
    }, []);

    const saveRank = async (insertIndex: number) => {
        try {
            await ContentService.applyRanking({
                user_id: userId,
                shop_id: currentShop.id,
                insert_index: insertIndex,
                satisfaction: satisfaction // Explicitly pass satisfaction
            });
        } catch (error) {
            console.error(error);
            alert(t('discovery.alerts.save_failed')); // Reuse or create ranking-specific error
            // We still set SUCCESS to avoid trapping the user, or we could keep them here.
            // But usually safe to proceed.
        }
    };

    const handleChoice = async (winner: 'NEW' | 'EXISTING') => {
        let newMin = minIdx;
        let newMax = maxIdx;

        if (winner === 'NEW') {
            // New is better => search in left half (better ranks)
            newMax = compareIdx - 1;
        } else {
            // New is worse => search in right half (worse ranks)
            newMin = compareIdx + 1;
        }

        if (newMin > newMax) {
            // Comparison done!
            await saveRank(newMin);
            setMode('SUCCESS');
            return;
        }

        setMinIdx(newMin);
        setMaxIdx(newMax);
        setCompareIdx(Math.floor((newMin + newMax) / 2));
    };

    if (loading) return <div className="h-full flex items-center justify-center">Loading...</div>;

    if (mode === 'COMPARING' && candidates[compareIdx]) {
        const opponent = candidates[compareIdx];
        return (
            <div
                className="flex flex-col h-full bg-[var(--color-surface)] px-6 pb-6"
                style={{ paddingTop: 'calc(env(safe-area-inset-top) + 1.5rem)' }}
            >
                <h2 className="text-xl font-bold text-center mb-8 mt-4 text-[var(--color-text-primary)]">{t('write.ranking.title')}</h2>

                <div className="flex-1 flex flex-col gap-4 justify-center">
                    {/* New Shop */}
                    <button
                        onClick={() => handleChoice('NEW')}
                        className="flex flex-col items-center p-6 bg-[var(--color-surface)] border-2 border-[var(--color-primary)] rounded-2xl shadow-sm active:scale-95 transition-transform"
                    >
                        <span className="text-lg font-bold text-[var(--color-primary)] mb-1">{t('write.ranking.new_label')}</span>
                        <span className="text-2xl font-bold text-[var(--color-text-primary)]">{currentShop.name}</span>
                        <span className="text-sm text-[var(--color-text-secondary)] mt-2">{currentShop.food_kind}</span>
                    </button>

                    <div className="text-center font-bold text-[var(--color-text-tertiary)]">{t('write.ranking.vs')}</div>

                    {/* Opponent */}
                    <button
                        onClick={() => handleChoice('EXISTING')}
                        className="flex flex-col items-center p-6 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl shadow-sm active:scale-95 transition-transform hover:border-[var(--color-text-tertiary)]"
                    >
                        <span className="text-lg font-bold text-[var(--color-text-secondary)]">Rank {opponent.rank}</span>
                        <span className="text-2xl font-bold text-[var(--color-text-primary)]">{opponent.shop_name}</span>
                        <span className="text-sm text-[var(--color-text-secondary)] mt-2">{opponent.food_kind}</span>
                    </button>

                    {/* Priority Hint */}
                    <p className="text-xs text-center text-[var(--color-text-tertiary)] mt-4">
                        {t('write.ranking.tip')}
                    </p>
                </div>
            </div>
        );
    }

    // Success View
    return (
        <div className="flex flex-col h-full bg-[var(--color-surface)] items-center justify-center p-8 text-center animate-in fade-in">
            <div className="transition-all duration-700 transform scale-100 opacity-100">
                <div className="w-32 h-32 bg-yellow-50 rounded-full flex items-center justify-center mx-auto mb-8 relative">
                    <div className="absolute inset-0 bg-yellow-100 rounded-full animate-ping opacity-20" />
                    <Trophy className="w-16 h-16 text-yellow-500" strokeWidth={1.5} />
                    <div className="absolute -bottom-2 -right-2 bg-green-500 text-white p-2 rounded-full border-4 border-[var(--color-surface)] shadow-lg">
                        <Check className="w-5 h-5" strokeWidth={3} />
                    </div>
                </div>

                <h2 className="text-3xl font-bold mb-4 text-[var(--color-text-primary)]">
                    {t('write.ranking.success_title')}
                </h2>

                <p className="text-[var(--color-text-tertiary)] text-lg leading-relaxed mb-12">
                    <Trans
                        i18nKey="write.ranking.success_desc"
                        values={{ name: currentShop.name }}
                        components={{ 1: <strong className="text-[var(--color-text-primary)]" />, br: <br /> }}
                    />
                </p>
            </div>

            <div className="w-full max-w-xs">
                <div className="w-full max-w-sm flex flex-col gap-3">
                    <Button
                        onClick={onWriteReview}
                        className="w-full h-14 text-lg font-bold rounded-2xl shadow-lg bg-[var(--color-primary)] text-white hover:opacity-90 transition-all active:scale-[0.98]"
                    >
                        {t('write.ranking.write_review', 'Write a Review')}
                    </Button>

                    <Button
                        onClick={onEvaluateAnother}
                        variant="outline"
                        className="w-full h-14 text-lg font-bold rounded-2xl border-2 border-[var(--color-primary)] text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10 transition-all active:scale-[0.98]"
                    >
                        {t('write.ranking.evaluate_another', 'Evaluate Another')}
                    </Button>

                    <Button
                        onClick={onComplete}
                        variant="ghost"
                        className="w-full h-12 text-base font-medium text-gray-400 hover:text-gray-600 hover:bg-transparent transition-all"
                    >
                        {t('write.ranking.complete', 'Complete')}
                    </Button>
                </div>
            </div>
        </div>
    );
};
