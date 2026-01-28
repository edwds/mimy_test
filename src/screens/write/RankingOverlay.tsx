import React, { useState, useEffect } from 'react';
import { useTranslation, Trans } from 'react-i18next';
import { Smile, Meh, Frown, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { API_BASE_URL } from '@/lib/api';
import { ContentService } from '@/services/ContentService';
import { SatisfactionRating } from '@/components/SatisfactionRating';
import { RankingBadge } from '@/components/RankingBadge';

interface Props {
    shop: any;
    userId: number;
    onClose: () => void;
    onComplete: (action: 'WRITE_REVIEW' | 'EVALUATE_ANOTHER' | 'QUIT', data?: any) => void;
}

interface Candidate {
    shop_id: number;
    rank: number;
    shop_name: string;
    food_kind: string;
}

export const RankingOverlay: React.FC<Props> = ({ shop, userId, onClose, onComplete }) => {
    const { t } = useTranslation();
    const [step, setStep] = useState<'SATISFACTION' | 'RANKING' | 'SUCCESS'>('SATISFACTION');
    const [satisfaction, setSatisfaction] = useState<'good' | 'ok' | 'bad' | null>(null);
    const [rankingMode, setRankingMode] = useState<'LOADING' | 'COMPARING' | 'DONE'>('LOADING');

    const [rankingResult, setRankingResult] = useState<{ rank: number, percentile?: number, total?: number } | null>(null);
    const [totalCount, setTotalCount] = useState(0);
    const [baseRank, setBaseRank] = useState(0);

    // Ranking Logic
    const [candidates, setCandidates] = useState<Candidate[]>([]);
    const [minIdx, setMinIdx] = useState(0);
    const [maxIdx, setMaxIdx] = useState(0);
    const [compareIdx, setCompareIdx] = useState(0);

    // Initial load for ranking candidates explicitly when satisfaction is chosen
    useEffect(() => {
        if (step === 'RANKING' && satisfaction) {
            fetchCandidates();
        }
    }, [step, satisfaction]);

    const fetchCandidates = async () => {
        setRankingMode('LOADING');
        try {
            const tier = mapSatisfactionToTier(satisfaction!);
            const res = await fetch(`${API_BASE_URL}/api/content/ranking/candidates?user_id=${userId}&satisfaction_tier=${tier}&exclude_shop_id=${shop.id}`);

            if (res.ok) {
                const json = await res.json();
                const data: Candidate[] = json.candidates || json;
                const total = json.total_count || 0;
                const higherCount = json.higher_tier_count || 0;

                setTotalCount(total);
                setBaseRank(higherCount);

                if (data.length === 0) {
                    await saveRank(0, total, higherCount);
                    setRankingMode('DONE');
                    setStep('SUCCESS');
                } else {
                    setCandidates(data);
                    setMinIdx(0);
                    setMaxIdx(data.length - 1);
                    setCompareIdx(Math.floor((0 + data.length - 1) / 2));
                    setRankingMode('COMPARING');
                }
            } else {
                // Fallback
                await saveRank(0, 0, 0);
                setStep('SUCCESS');
            }
        } catch (e) {
            console.error(e);
            setStep('SUCCESS'); // Fail safe
        }
    };

    const mapSatisfactionToTier = (s: string) => {
        switch (s) {
            case 'good': return 2; // Best/Good
            case 'ok': return 1;
            case 'bad': return 0;
            default: return 1;
        }
    };

    const saveRank = async (insertIndex: number, currentTotal?: number, currentBaseRank?: number) => {
        try {
            // Calculate Rank locally (Optimistic)
            const safeBase = currentBaseRank !== undefined ? currentBaseRank : baseRank;
            let myRank = safeBase + 1;

            if (candidates.length > 0) {
                if (insertIndex < candidates.length) {
                    myRank = candidates[insertIndex].rank;
                } else {
                    myRank = candidates[candidates.length - 1].rank + 1;
                }
            }

            const safeTotal = (currentTotal !== undefined ? currentTotal : totalCount) + 1;
            const percentile = Math.ceil((myRank / safeTotal) * 100);

            setRankingResult({ rank: myRank, total: safeTotal, percentile });

            // Send to server
            await ContentService.applyRanking({
                user_id: userId,
                shop_id: shop.id,
                insert_index: insertIndex,
                satisfaction: satisfaction!
            });
        } catch (error) {
            console.error("Failed to save rank", error);
            // Fallback
            setRankingResult({ rank: 0 });
        }
    };

    const handleChoice = async (winner: 'NEW' | 'EXISTING') => {
        let newMin = minIdx;
        let newMax = maxIdx;

        if (winner === 'NEW') {
            newMax = compareIdx - 1;
        } else {
            newMin = compareIdx + 1;
        }

        if (newMin > newMax) {
            await saveRank(newMin);
            setRankingMode('DONE');
            setStep('SUCCESS');
            return;
        }

        setMinIdx(newMin);
        setMaxIdx(newMax);
        setCompareIdx(Math.floor((newMin + newMax) / 2));
    };

    const handleSatisfactionSelect = (val: 'good' | 'ok' | 'bad') => {
        setSatisfaction(val);
        setStep('RANKING');
    };

    return (
        <div
            className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm sm:p-4 animate-in fade-in duration-200"
            onClick={onClose}
        >
            <div
                className="w-full sm:max-w-md bg-white sm:rounded-3xl rounded-t-3xl overflow-hidden shadow-2xl animate-in slide-in-from-bottom-10 duration-300 flex flex-col max-h-[90vh]"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header / Shop Info (POI Card style) - Hidden in Success Step */}
                {step !== 'SUCCESS' && (
                    <div className="relative p-6 border-b border-gray-100 bg-white shrinking-0">
                        <button onClick={onClose} className="absolute top-4 right-4 p-2 text-gray-400 hover:bg-gray-100 rounded-full">
                            <X size={20} />
                        </button>
                        <div className="flex gap-4 items-center pr-8">
                            {shop.thumbnail_img ? (
                                <img src={shop.thumbnail_img} alt={shop.name} className="w-16 h-16 rounded-xl object-cover bg-gray-100 border border-gray-100" />
                            ) : (
                                <div className="w-16 h-16 rounded-xl bg-gray-100 flex items-center justify-center text-2xl">🏪</div>
                            )}
                            <div>
                                <h3 className="font-bold text-xl text-gray-900 leading-tight">{shop.name}</h3>
                                <p className="text-sm text-gray-500 mt-1">{shop.category || shop.food_kind || 'Restaurant'}</p>
                                <p className="text-xs text-gray-400 mt-0.5">{shop.address?.split(' ').slice(0, 2).join(' ')}</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Body Content */}
                <div className="p-6 overflow-y-auto no-scrollbar">
                    {step === 'SATISFACTION' && (
                        <div className="py-2">
                            <h4 className="text-center font-bold text-lg mb-6 text-gray-900">
                                {t('write.basic.how_was_it', 'How was this place?')}
                            </h4>
                            <div className="flex flex-col gap-3">
                                {[
                                    { value: 'good', icon: Smile, label: t('write.basic.good'), color: 'text-orange-600', active: 'bg-orange-50 border-orange-200' },
                                    { value: 'ok', icon: Meh, label: t('write.basic.ok'), color: 'text-yellow-600', active: 'bg-yellow-50 border-yellow-200' },
                                    { value: 'bad', icon: Frown, label: t('write.basic.bad'), color: 'text-gray-600', active: 'bg-gray-50 border-gray-200' },
                                ].map((item) => (
                                    <button
                                        key={item.value}
                                        onClick={() => handleSatisfactionSelect(item.value as any)}
                                        className="flex items-center justify-between p-4 rounded-xl border border-gray-200 hover:bg-gray-50 active:scale-[0.98] transition-all bg-white"
                                    >
                                        <span className={cn("font-bold text-base", item.color)}>{item.label}</span>
                                        <item.icon className={cn("w-6 h-6", item.color)} strokeWidth={2} />
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {step === 'RANKING' && (
                        <div className="py-2 min-h-[300px] flex flex-col">
                            {rankingMode === 'LOADING' && (
                                <div className="flex-1 flex items-center justify-center">
                                    <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
                                </div>
                            )}

                            {rankingMode === 'COMPARING' && candidates[compareIdx] && (
                                <div className="flex-1 flex flex-col justify-center animate-in fade-in">
                                    <h4 className="text-center font-bold text-md mb-6 text-gray-500">
                                        {t('write.ranking.title', 'Which one was better?')}
                                    </h4>

                                    <div className="flex flex-col gap-4">
                                        <button
                                            onClick={() => handleChoice('NEW')}
                                            className="p-5 rounded-2xl border-2 border-primary bg-white shadow-sm active:scale-[0.98] transition-all relative overflow-hidden group hover:border-primary/80"
                                        >
                                            <div className="absolute top-0 left-0 bg-primary text-white text-xs px-2 py-1 rounded-br-lg font-bold">New</div>
                                            <div className="text-center">
                                                <div className="text-xl font-bold text-gray-900 mb-1">{shop.name}</div>
                                                <div className="text-sm text-gray-400">{t('write.ranking.this_place', 'This place')}</div>
                                            </div>
                                        </button>

                                        <div className="text-center text-xs font-bold text-gray-300 uppercase tracking-widest">VS</div>

                                        <button
                                            onClick={() => handleChoice('EXISTING')}
                                            className="p-5 rounded-2xl border border-gray-200 bg-white hover:bg-gray-50 active:scale-[0.98] transition-all"
                                        >
                                            <div className="text-center">
                                                <div className="text-lg font-bold text-gray-900 mb-1">{candidates[compareIdx].shop_name}</div>
                                                <div className="text-sm text-gray-400">Rank {candidates[compareIdx].rank}</div>
                                            </div>
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {step === 'SUCCESS' && (
                        <div className="py-4 text-center animate-in zoom-in-95 duration-300 flex flex-col items-center">
                            {/* Close Button specific for Success View since Header is hidden */}
                            <button
                                onClick={onClose}
                                className="absolute top-4 right-4 p-2 text-gray-400 hover:bg-gray-100 rounded-full z-10"
                            >
                                <X size={20} />
                            </button>

                            {/* POI + Ranking Bundle */}
                            <div className="w-full bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-6 flex flex-col items-center gap-4">
                                <div className="flex flex-col items-center text-center gap-2">
                                    {shop.thumbnail_img ? (
                                        <img src={shop.thumbnail_img} alt={shop.name} className="w-20 h-20 rounded-2xl object-cover bg-gray-100 border border-gray-100 shadow-sm" />
                                    ) : (
                                        <div className="w-20 h-20 rounded-2xl bg-gray-100 flex items-center justify-center text-3xl">🏪</div>
                                    )}
                                    <div>
                                        <h3 className="font-bold text-xl text-gray-900 leading-tight">{shop.name}</h3>
                                        <p className="text-sm text-gray-500 mt-1">{shop.category || shop.food_kind || 'Restaurant'}</p>
                                    </div>
                                </div>

                                {/* Divider with Dash? or just gap */}
                                <div className="w-full h-[1px] bg-gray-100 border-t border-dashed border-gray-200 my-1" />

                                {/* Ranking Result Badges */}
                                <div className="flex items-center justify-center flex-wrap gap-3 w-full">
                                    <SatisfactionRating
                                        satisfaction={satisfaction!}
                                        percentile={rankingResult?.percentile}
                                        showPercentile={true}
                                        size="lg"
                                        showIcon={false}
                                    />

                                    {rankingResult?.rank && rankingResult.rank > 0 && (
                                        <RankingBadge
                                            rank={rankingResult.rank}
                                            size="lg"
                                            variant="text"
                                        />
                                    )}
                                </div>
                            </div>

                            {/* Text Message */}
                            <h2 className="text-2xl font-bold text-gray-900 mb-2">
                                {t('write.ranking.success_title', 'Ranking Updated!')}
                            </h2>
                            <div className="text-gray-500 mb-8 max-w-[80%] mx-auto leading-relaxed text-sm whitespace-pre-wrap">
                                <Trans i18nKey="write.ranking.success_desc" values={{ name: shop.name }} components={{ 1: <strong className="text-gray-900 font-bold" /> }} />
                            </div>

                            {/* Action Buttons */}
                            <div className="flex flex-col gap-3 w-full">
                                <Button
                                    onClick={() => onComplete('WRITE_REVIEW', { satisfaction })}
                                    className="w-full py-6 text-lg rounded-2xl bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 text-white font-bold"
                                >
                                    {t('write.ranking.write_review', 'Write a Review')}
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => onComplete('EVALUATE_ANOTHER')}
                                    className="w-full py-6 text-lg rounded-2xl border-gray-200 text-gray-700 hover:bg-gray-50 font-bold bg-white"
                                >
                                    {t('write.ranking.evaluate_another', 'Evaluate Another')}
                                </Button>
                                <Button
                                    variant="ghost"
                                    onClick={() => onComplete('QUIT')}
                                    className="text-gray-400 hover:text-gray-600 font-medium"
                                >
                                    {t('write.ranking.quit', "Start Later")}
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
