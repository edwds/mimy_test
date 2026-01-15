
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Smile, Meh, Frown, Calendar, Users, ChevronLeft } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useTranslation, Trans } from 'react-i18next';


interface Props {
    shopName: string;
    onNext: (info: { satisfaction: 'good' | 'ok' | 'bad'; visitDate: string; companions: any[] }) => void;
    onBack: () => void;
}

export const BasicInfoStep: React.FC<Props> = ({ shopName, onNext, onBack }) => {
    const { t } = useTranslation();
    const [satisfaction, setSatisfaction] = useState<'good' | 'ok' | 'bad' | null>(null);
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
            <div className="px-4 py-3 flex items-center bg-background/80 backdrop-blur-md sticky top-0 z-10 border-b">
                <button
                    onClick={onBack}
                    className="p-2 -ml-2 text-foreground hover:bg-muted rounded-full transition-colors"
                >
                    <ChevronLeft size={24} />
                </button>
            </div>

            <div className={cn("flex-1 overflow-y-auto pb-24 p-6 transition-opacity duration-500", isLoaded ? "opacity-100" : "opacity-0")}>
                <h1 className="text-2xl font-bold mb-8 text-foreground leading-tight">
                    <Trans
                        i18nKey="write.basic.title"
                        values={{ name: shopName }}
                        components={{ 1: <span className="text-primary" />, br: <br /> }}
                    />
                </h1>

                {/* Satisfaction */}
                <div className="space-y-3 mb-8">
                    <Label className="text-base">{t('write.basic.satisfaction')}</Label>
                    <div className="grid grid-cols-3 gap-3">
                        {[
                            { value: 'good', icon: Smile, label: t('write.basic.good'), color: 'text-orange-600', activeBg: 'bg-orange-50 border-orange-200 ring-2 ring-orange-100' },
                            { value: 'ok', icon: Meh, label: t('write.basic.ok'), color: 'text-yellow-600', activeBg: 'bg-yellow-50 border-yellow-200 ring-2 ring-yellow-100' },
                            { value: 'bad', icon: Frown, label: t('write.basic.bad'), color: 'text-gray-600', activeBg: 'bg-gray-50 border-gray-200 ring-2 ring-gray-100' },
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
                                <span className={cn("font-bold text-sm mt-1", satisfaction === item.value ? item.color : "text-muted-foreground font-medium")}>{item.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Form Fields */}
                <div className="space-y-6">
                    <div className="space-y-2">
                        <Label>{t('write.basic.date')}</Label>
                        <div className="relative">
                            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                            <Input
                                type="date"
                                value={visitDate}
                                onChange={(e) => setVisitDate(e.target.value)}
                                className="pl-10 text-foreground font-medium bg-muted/30 border-transparent focus:bg-background transition-all"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>{t('write.basic.companions')}</Label>
                        <div className="relative">
                            <Users className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                            <button className="w-full flex items-center h-10 rounded-md border border-input bg-muted/30 px-10 text-base text-muted-foreground hover:bg-muted transition-colors text-left text-sm">
                                {t('write.basic.tag_placeholder')}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Floating Action */}
            <div className="p-4 bg-background/95 backdrop-blur-sm border-t absolute bottom-0 left-0 right-0 safe-area-bottom pb-8">
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
                    {t('write.basic.next')}
                </Button>
            </div>
        </div>
    );
};
