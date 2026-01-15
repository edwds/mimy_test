
import React, { useState } from 'react';
import { Smile, Meh, Frown, ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation, Trans } from 'react-i18next';


interface Props {
    shopName: string;
    onNext: (info: { satisfaction: 'good' | 'ok' | 'bad'; visitDate: string; companions: any[] }) => void;
    onBack: () => void;
}

export const BasicInfoStep: React.FC<Props> = ({ shopName, onNext, onBack }) => {
    const { t } = useTranslation();
    const [isLoaded, setIsLoaded] = useState(false);

    React.useEffect(() => {
        setIsLoaded(true);
    }, []);

    const handleSelect = (value: 'good' | 'ok' | 'bad') => {
        // Pass default values for date/companions as they are removed from UI
        onNext({
            satisfaction: value,
            visitDate: new Date().toISOString().split('T')[0],
            companions: []
        });
    };

    return (
        <div className="flex flex-col h-full bg-[var(--color-background)]">
            {/* Header */}
            <div className="pl-4 pr-8 py-3 flex items-center bg-background/80 backdrop-blur-md sticky top-0 z-10 transition-colors">
                <button
                    onClick={onBack}
                    className="p-2 -ml-2 text-foreground hover:bg-muted rounded-full transition-colors"
                >
                    <ChevronLeft size={24} />
                </button>
            </div>

            <div className={cn("flex-1 px-6 pb-24 flex flex-col justify-center transition-opacity duration-500", isLoaded ? "opacity-100" : "opacity-0")}>
                <h1 className="text-2xl font-bold mb-12 text-foreground leading-tight text-center">
                    <Trans
                        i18nKey="write.basic.title"
                        values={{ name: shopName }}
                        components={{ 1: <span className="text-primary" />, br: <br /> }}
                    />
                </h1>

                {/* Satisfaction */}
                <div className="flex flex-col gap-4 w-full max-w-[320px] mx-auto">
                    {[
                        {
                            value: 'good',
                            icon: Smile,
                            label: t('write.basic.good'),
                            gradient: 'bg-gradient-to-br from-teal-400 to-emerald-500',
                            activeScale: 'scale-[1.02]',
                            shadow: 'shadow-teal-500/30'
                        },
                        {
                            value: 'ok',
                            icon: Meh,
                            label: t('write.basic.ok'),
                            gradient: 'bg-gradient-to-br from-amber-400 to-orange-500',
                            activeScale: 'scale-[1.02]',
                            shadow: 'shadow-orange-500/30'
                        },
                        {
                            value: 'bad',
                            icon: Frown,
                            label: t('write.basic.bad'),
                            gradient: 'bg-gradient-to-br from-rose-400 to-pink-500',
                            activeScale: 'scale-[1.02]',
                            shadow: 'shadow-rose-500/30'
                        },
                    ].map((item) => (
                        <button
                            key={item.value}
                            onClick={() => handleSelect(item.value as any)}
                            className="flex items-center justify-between p-6 rounded-[28px] transition-all duration-300 w-full relative overflow-hidden group border-2 border-transparent hover:scale-[1.02] active:scale-95"
                        >
                            {/* Background */}
                            <div className={cn(
                                "absolute inset-0 transition-opacity duration-300 opacity-90 group-hover:opacity-100",
                                item.gradient
                            )} />

                            <span className="relative z-10 text-white font-bold text-xl drop-shadow-sm">{item.label}</span>
                            <div className="relative z-10 w-12 h-12 rounded-full flex items-center justify-center">
                                <item.icon className="w-7 h-7 text-white" strokeWidth={2.5} />
                            </div>
                        </button>
                    ))}
                </div>
            </div>


        </div>
    );
};
