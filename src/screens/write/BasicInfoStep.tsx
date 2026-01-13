
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Smile, Meh, Frown, Calendar, Users, ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

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
        <div className="flex flex-col h-full bg-[var(--color-background)]">
            {/* Header */}
            <div className="px-4 py-3 flex items-center bg-[var(--color-surface)] border-b border-[var(--color-border)] sticky top-0 z-10">
                <button onClick={onBack} className="p-2 -ml-2 text-[var(--color-text-primary)]">
                    <ChevronLeft size={24} />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto pb-24">
                <div className="p-6">
                    <h1 className="text-2xl font-bold mb-8 text-[var(--color-text-primary)] leading-tight">
                        <span className="text-[var(--color-primary)]">{shopName}</span>에서의<br />
                        경험은 어떠셨나요?
                    </h1>

                    {/* Satisfaction */}
                    <div className="grid grid-cols-3 gap-3 mb-8">
                        {[
                            { value: 'good', icon: Smile, label: '맛있어요', color: 'text-orange-500', bg: 'bg-orange-50', border: 'border-orange-200' },
                            { value: 'okay', icon: Meh, label: '괜찮아요', color: 'text-yellow-500', bg: 'bg-yellow-50', border: 'border-yellow-200' },
                            { value: 'bad', icon: Frown, label: '별로예요', color: 'text-gray-500', bg: 'bg-gray-50', border: 'border-gray-200' },
                        ].map((item) => (
                            <button
                                key={item.value}
                                onClick={() => setSatisfaction(item.value as any)}
                                className={cn(
                                    "flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all duration-200 aspect-square",
                                    satisfaction === item.value
                                        ? `${item.border} ${item.bg} ${item.color} shadow-sm scale-[1.02]`
                                        : "border-transparent bg-[var(--color-surface)] text-[var(--color-gray-400)] hover:bg-[var(--color-gray-50)]"
                                )}
                            >
                                <item.icon className="w-8 h-8 mb-2" strokeWidth={2} />
                                <span className="font-bold text-sm">{item.label}</span>
                            </button>
                        ))}
                    </div>

                    {/* Form Fields */}
                    <div className="space-y-6 bg-[var(--color-surface)] p-5 rounded-2xl shadow-sm">
                        <div>
                            <label className="block text-sm font-semibold text-[var(--color-text-primary)] mb-3 flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-[var(--color-primary)]" /> 방문일
                            </label>
                            <input
                                type="date"
                                value={visitDate}
                                onChange={(e) => setVisitDate(e.target.value)}
                                className="w-full bg-[var(--color-background)] p-4 rounded-xl text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 transition-all font-medium"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-[var(--color-text-primary)] mb-3 flex items-center gap-2">
                                <Users className="w-4 h-4 text-[var(--color-primary)]" /> 함께한 사람
                            </label>
                            <button className="w-full bg-[var(--color-background)] p-4 rounded-xl text-[var(--color-text-secondary)] text-left hover:bg-[var(--color-gray-50)] transition-colors text-sm font-medium">
                                친구 태그하기 (준비중)
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Action */}
            <div className="p-4 bg-[var(--color-surface)] border-t border-[var(--color-border)] absolute bottom-0 left-0 right-0 safe-area-bottom">
                <Button
                    className="w-full h-14 text-lg font-bold rounded-xl shadow-lg shadow-[var(--color-primary)]/20"
                    disabled={!satisfaction}
                    onClick={handleNext}
                >
                    다음으로
                </Button>
            </div>
        </div>
    );
};
