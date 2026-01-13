
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Smile, Meh, Frown, Calendar, Users, ChevronLeft } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

interface Props {
    shopName: string;
    onNext: (info: { satisfaction: 'good' | 'okay' | 'bad'; visitDate: string; companions: any[] }) => void;
    onBack: () => void;
}

export const BasicInfoStep: React.FC<Props> = ({ shopName, onNext, onBack }) => {
    const [satisfaction, setSatisfaction] = useState<'good' | 'okay' | 'bad' | null>(null);
    const [visitDate, setVisitDate] = useState(new Date().toISOString().split('T')[0]);

    // Smooth transition simulation
    const [isLoaded, setIsLoaded] = useState(false);
    React.useEffect(() => {
        setIsLoaded(true);
    }, []);

    const handleNext = () => {
        if (!satisfaction) return;
        onNext({ satisfaction, visitDate, companions: [] });
    };

    return (
        <div className="flex flex-col h-full bg-[var(--color-background)]">
            {/* Header */}
            <div className="px-4 py-3 flex items-center bg-[var(--color-surface)] border-b border-[var(--color-border)] sticky top-0 z-10">
                <button
                    onClick={onBack}
                    className="p-2 -ml-2 text-[var(--color-text-primary)] hover:bg-[var(--color-gray-50)] rounded-full transition-colors"
                >
                    <ChevronLeft size={24} />
                </button>
            </div>

            <div className={cn("flex-1 overflow-y-auto pb-24 p-6 transition-opacity duration-500", isLoaded ? "opacity-100" : "opacity-0")}>
                <h1 className="text-2xl font-bold mb-8 text-[var(--color-text-primary)] leading-tight">
                    <span className="text-[var(--color-primary)]">{shopName}</span>에서의<br />
                    경험은 어떠셨나요?
                </h1>

                {/* Satisfaction */}
                <div className="space-y-3 mb-8">
                    <Label className="text-base">만족도</Label>
                    <div className="grid grid-cols-3 gap-3">
                        {[
                            { value: 'good', icon: Smile, label: '맛있어요', color: 'text-orange-600', activeBg: 'bg-orange-50 border-orange-200 ring-2 ring-orange-100' },
                            { value: 'okay', icon: Meh, label: '괜찮아요', color: 'text-yellow-600', activeBg: 'bg-yellow-50 border-yellow-200 ring-2 ring-yellow-100' },
                            { value: 'bad', icon: Frown, label: '별로예요', color: 'text-gray-600', activeBg: 'bg-gray-50 border-gray-200 ring-2 ring-gray-100' },
                        ].map((item) => (
                            <button
                                key={item.value}
                                onClick={() => setSatisfaction(item.value as any)}
                                className={cn(
                                    "flex flex-col items-center justify-center p-4 rounded-xl border transition-all duration-200 aspect-[4/3] group active:scale-95",
                                    satisfaction === item.value
                                        ? `${item.activeBg} shadow-sm`
                                        : "bg-[var(--color-surface)] border-[var(--color-border)] hover:border-[var(--color-gray-300)] text-[var(--color-text-secondary)] hover:bg-[var(--color-gray-50)]"
                                )}
                            >
                                <item.icon
                                    className={cn("w-8 h-8 mb-2 transition-transform duration-300 group-hover:-translate-y-1",
                                        satisfaction === item.value ? item.color : "text-gray-400"
                                    )}
                                    strokeWidth={satisfaction === item.value ? 2.5 : 2}
                                />
                                <span className={cn("font-bold text-sm", satisfaction === item.value ? item.color : "")}>{item.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Form Fields */}
                <div className="space-y-6">
                    <div className="space-y-2">
                        <Label>방문일</Label>
                        <div className="relative">
                            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-tertiary)] pointer-events-none" />
                            <Input
                                type="date"
                                value={visitDate}
                                onChange={(e) => setVisitDate(e.target.value)}
                                className="pl-10 text-[var(--color-text-primary)] font-medium"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>함께한 사람</Label>
                        <div className="relative">
                            <Users className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-tertiary)] pointer-events-none" />
                            <button className="w-full flex items-center h-12 rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] px-10 text-base text-[var(--color-text-tertiary)] hover:bg-[var(--color-gray-50)] transition-colors text-left">
                                친구 태그하기 (준비중)
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Floating Action */}
            <div className="p-4 bg-[var(--color-surface)] border-t border-[var(--color-border)] absolute bottom-0 left-0 right-0 safe-area-bottom pb-8">
                <Button
                    className={cn(
                        "w-full h-14 text-lg font-bold rounded-2xl shadow-lg transition-all duration-300",
                        satisfaction
                            ? "shadow-[var(--color-primary)]/20 hover:shadow-[var(--color-primary)]/30 translate-y-0 opacity-100"
                            : "bg-gray-200 text-gray-400 shadow-none cursor-not-allowed translate-y-2 opacity-50"
                    )}
                    disabled={!satisfaction}
                    onClick={handleNext}
                >
                    다음으로
                </Button>
            </div>
        </div>
    );
};
