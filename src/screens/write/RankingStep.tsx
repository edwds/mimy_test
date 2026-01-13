import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Trophy, Check } from 'lucide-react';
import { API_BASE_URL } from '@/lib/api';
import { ContentService } from '@/services/ContentService';

interface Props {
    userId: number;
    currentShop: any; // { id, name, food_kind }
    satisfaction: string;
    onFinish: () => void;
}

interface Candidate {
    shop_id: number;
    rank: number;
    shop_name: string;
    food_kind: string;
}

export const RankingStep: React.FC<Props> = ({ userId, currentShop, satisfaction, onFinish }) => {
    const [loading, setLoading] = useState(true);
    const [mode, setMode] = useState<'COMPARING' | 'SUCCESS'>('COMPARING');
    const [candidates, setCandidates] = useState<Candidate[]>([]);

    // Binary Search State
    const [minIdx, setMinIdx] = useState(0);
    const [maxIdx, setMaxIdx] = useState(0);
    const [compareIdx, setCompareIdx] = useState(0);

    useEffect(() => {
        const init = async () => {
            try {
                // Fetch candidates with same satisfaction
                const res = await fetch(`${API_BASE_URL}/api/content/ranking/candidates?user_id=${userId}&satisfaction=${satisfaction}`);
                if (res.ok) {
                    const data: Candidate[] = await res.json();

                    if (data.length === 0) {
                        // No existing items in this group -> Automatic Rank 1
                        await saveRank(1);
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

    const saveRank = async (rank: number) => {
        await ContentService.submitRanking({
            user_id: userId,
            shop_id: currentShop.id,
            sort_key: rank
        });
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
            const insertIndex = newMin;

            // Determine Rank Value:
            // If we insert at index i, we take rank of item at i?
            // If i is out of bounds (appended to end), we take last rank + 1.
            const calculatedRank = insertIndex < candidates.length
                ? candidates[insertIndex].rank
                : (candidates[candidates.length - 1].rank + 1);

            await saveRank(calculatedRank);
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
            <div className="flex flex-col h-full bg-[var(--color-surface)] p-6">
                <h2 className="text-xl font-bold text-center mb-8 mt-4">어떤 곳이 더 만족스러웠나요?</h2>

                <div className="flex-1 flex flex-col gap-4 justify-center">
                    {/* New Shop */}
                    <button
                        onClick={() => handleChoice('NEW')}
                        className="flex flex-col items-center p-6 bg-white border-2 border-[var(--color-primary)] rounded-2xl shadow-sm active:scale-95 transition-transform"
                    >
                        <span className="text-lg font-bold text-[var(--color-primary)] mb-1">New!</span>
                        <span className="text-2xl font-bold">{currentShop.name}</span>
                        <span className="text-sm text-gray-500 mt-2">{currentShop.food_kind}</span>
                    </button>

                    <div className="text-center font-bold text-gray-400">VS</div>

                    {/* Opponent */}
                    <button
                        onClick={() => handleChoice('EXISTING')}
                        className="flex flex-col items-center p-6 bg-white border border-gray-200 rounded-2xl shadow-sm active:scale-95 transition-transform hover:border-gray-400"
                    >
                        <span className="text-lg font-bold text-gray-700">Rank {opponent.rank}</span>
                        <span className="text-2xl font-bold text-gray-900">{opponent.shop_name}</span>
                        <span className="text-sm text-gray-500 mt-2">{opponent.food_kind}</span>
                    </button>

                    {/* Priority Hint */}
                    <p className="text-xs text-center text-gray-400 mt-4">
                        (Tip: 같은 종류의 음식점이거나, 더 인상 깊었던 곳을 선택해주세요)
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
                    랭킹 등록 완료!
                </h2>

                <p className="text-[var(--color-text-tertiary)] text-lg leading-relaxed mb-12">
                    <strong className="text-[var(--color-text-primary)]">{currentShop.name}</strong>에서의<br />
                    경험이 랭킹에 반영되었습니다.
                </p>
            </div>

            <div className="w-full max-w-xs">
                <Button
                    onClick={onFinish}
                    className="w-full h-14 text-lg font-bold rounded-2xl shadow-lg shadow-[var(--color-primary)]/20 hover:shadow-[var(--color-primary)]/30 transition-all active:scale-[0.98]"
                >
                    확인
                </Button>
            </div>
        </div>
    );
};
