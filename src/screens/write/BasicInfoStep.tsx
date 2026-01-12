
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Smile, Meh, Frown, Calendar, Users } from 'lucide-react';

interface Props {
    shopName: string;
    onNext: (info: { satisfaction: 'good' | 'okay' | 'bad'; visitDate: string; companions: any[] }) => void;
    onBack: () => void;
}

export const BasicInfoStep: React.FC<Props> = ({ shopName, onNext, onBack }) => {
    const [satisfaction, setSatisfaction] = useState<'good' | 'okay' | 'bad' | null>(null);
    const [visitDate, setVisitDate] = useState(new Date().toISOString().split('T')[0]);

    const handleNext = () => {
        if (!satisfaction) return;
        onNext({ satisfaction, visitDate, companions: [] });
    };

    return (
        <div className="flex flex-col h-full bg-[var(--color-surface)] p-6">
            <button onClick={onBack} className="text-[var(--color-text-secondary)] mb-6">
                &lt; 뒤로
            </button>

            <h1 className="text-2xl font-bold mb-2 text-[var(--color-text-primary)]">
                {shopName},<br />어떠셨나요?
            </h1>

            <div className="flex gap-4 mt-8 mb-8">
                <button
                    onClick={() => setSatisfaction('good')}
                    className={`flex-1 flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all ${satisfaction === 'good'
                            ? 'border-orange-500 bg-orange-50 text-orange-600'
                            : 'border-[var(--color-border)] text-gray-400'
                        }`}
                >
                    <Smile className="w-8 h-8 mb-2" />
                    <span className="font-bold">맛있어요</span>
                </button>
                <button
                    onClick={() => setSatisfaction('okay')}
                    className={`flex-1 flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all ${satisfaction === 'okay'
                            ? 'border-yellow-500 bg-yellow-50 text-yellow-600'
                            : 'border-[var(--color-border)] text-gray-400'
                        }`}
                >
                    <Meh className="w-8 h-8 mb-2" />
                    <span className="font-bold">괜찮아요</span>
                </button>
                <button
                    onClick={() => setSatisfaction('bad')}
                    className={`flex-1 flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all ${satisfaction === 'bad'
                            ? 'border-gray-500 bg-gray-50 text-gray-600'
                            : 'border-[var(--color-border)] text-gray-400'
                        }`}
                >
                    <Frown className="w-8 h-8 mb-2" />
                    <span className="font-bold">별로예요</span>
                </button>
            </div>

            <div className="space-y-6">
                <div>
                    <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2 flex items-center gap-2">
                        <Calendar className="w-4 h-4" /> 방문일
                    </label>
                    <input
                        type="date"
                        value={visitDate}
                        onChange={(e) => setVisitDate(e.target.value)}
                        className="w-full bg-[var(--color-background)] p-3 rounded-lg text-[var(--color-text-primary)]"
                    />
                </div>

                {/* Companions - Placeholder */}
                <div>
                    <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2 flex items-center gap-2">
                        <Users className="w-4 h-4" /> 함께한 사람
                    </label>
                    <div className="w-full bg-[var(--color-background)] p-3 rounded-lg text-gray-400 text-sm">
                        친구 태그하기 (준비중)
                    </div>
                </div>
            </div>

            <div className="mt-auto pt-6">
                <Button
                    className="w-full h-12 text-lg"
                    disabled={!satisfaction}
                    onClick={handleNext}
                >
                    다음
                </Button>
            </div>
        </div>
    );
};
