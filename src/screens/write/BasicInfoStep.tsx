
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
                <div className="flex flex-col gap-3 w-full max-w-[320px] mx-auto">
                    {[
                        { value: 'good', icon: Smile, label: t('write.basic.good') },
                        { value: 'ok', icon: Meh, label: t('write.basic.ok') },
                        { value: 'bad', icon: Frown, label: t('write.basic.bad') },
                    ].map((item) => (
                        <button
                            key={item.value}
                            onClick={() => handleSelect(item.value as any)}
                            className="flex items-center justify-between p-5 rounded-2xl bg-white border border-border hover:border-orange-500/50 hover:bg-orange-50/50 transition-all active:scale-95 group shadow-sm"
                        >
                            <span className={cn(
                                "font-bold text-lg",
                                item.value === 'good' ? "text-orange-600" : "text-gray-600"
                            )}>{item.label}</span>
                            <item.icon
                                className={cn(
                                    "w-8 h-8",
                                    item.value === 'good' ? "text-orange-600" : "text-gray-400"
                                )}
                                strokeWidth={2}
                            />
                        </button>
                    ))}
                </div>
            </div>


        </div>
    );
};
