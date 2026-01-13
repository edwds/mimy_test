import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Trophy, Check, ArrowRight, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
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
    const [maxIdx, setMaxIdx] = useState(0); // will be candidates.length - 1
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
        // Logic: 
        // Candidates are sorted by Rank (1 is Best, 2 is worse, etc.)
        // If NEW is better than EXISTING (at compareIdx), NEW should have a LOWER rank (move towards 0)
        // If NEW is worse, NEW should have a HIGHER rank (move towards max)

        let newMin = minIdx;
        let newMax = maxIdx;

        if (winner === 'NEW') {
            // New is better => New rank < Existing rank
            // Search in left half (better ranks)
            newMax = compareIdx - 1;
        } else {
            // New is worse => New rank > Existing rank
            // Search in right half (worse ranks)
            newMin = compareIdx + 1;
        }

        if (newMin > newMax) {
            // Comparison done!
            // Calculate final insertion index
            // If we ended because newMax < newMin, it means we found the spot.
            // The insert index effectively becomes newMin (which equals compareIdx if we moved right, or compareIdx if we moved left... wait)

            // Example: [A(1), B(2), C(3)]. New vs B(2).
            // Winner NEW -> range [0, 0] -> compare A(1).
            // Winner NEW -> range [0, -1] -> End. Insert at 0. Rank becomes 1. Others shift?
            // Actually, backend might need to handle shifting or we just store a fractional rank or raw integer.
            // MVP: We assume we just give a rank. If we use integers, we might collide.
            // Let's assume we allow collision or just calculate intended rank.
            // If we return rank X, backend should probably handle re-ranking, but for now let's just send the "Rank Value".

            // To be precise:
            // If winner was NEW (better), we insert AT compareIdx.
            // If winner was EXISTING (worse), we insert AFTER compareIdx.

            let finalRank = 0;
            if (winner === 'NEW') {
                // Better than current comparison
                // candidates[compareIdx].rank is the rank we beat. So we take that rank? 
                // Wait, if we beat Rank 2, we want to be Rank 2 (and push old Rank 2 down).
                // But if we lost to Rank 1, we want to be Rank 2.
                // The loop ensures we narrowed it down.
                finalRank = candidates[compareIdx].rank; // Placeholder logic
                // Proper index calculation:
                // We want to insert at `newMin`.
                // The rank should be:
                // If newMin < candidates.length, take candidates[newMin].rank?
                // If newMin >= candidates.length, take last rank + 1.
            }

            // Correct Logic with Array Index:
            const insertIndex = newMin;

            // Determine Rank Value:
            // If valid index, use that item's rank. If out of bounds, use last item's rank + 1.
            // NOTE: This assumes dense ranking 1,2,3... 
            // If there are gaps, we simply take the calculated position.

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

    // Success View (Original Code)
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
