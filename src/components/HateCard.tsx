import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface Props {
    id: number;
    item: string;
    index?: number;
    onVote?: (id: number, selection: 'EAT' | 'NOT_EAT') => void;
    onClose?: () => void;
    onNext?: () => void;
}

export const HateCard: React.FC<Props> = ({ id, item, index = 0, onVote, onClose, onNext }) => {
    const { t } = useTranslation();
    const [selected, setSelected] = useState<'EAT' | 'NOT_EAT' | null>(null);
    const [countdown, setCountdown] = useState<number>(0);

    // Countdown effect
    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (selected) {
            setCountdown(3);
            timer = setInterval(() => {
                setCountdown(prev => {
                    if (prev <= 1) {
                        clearInterval(timer);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        } else {
            setCountdown(0);
        }
        return () => clearInterval(timer);
    }, [selected]);

    const handleSelect = (selection: 'EAT' | 'NOT_EAT') => {
        if (selected === selection) return; // Same selection, do nothing

        setSelected(selection);
        if (onVote) onVote(id, selection);
    };

    const handleRetry = (e: React.MouseEvent) => {
        e.stopPropagation();
        setSelected(null);
    };

    const handleNext = (e: React.MouseEvent) => {
        e.stopPropagation();
        setSelected(null); // Reset internal state
        if (onNext) onNext();
    };

    // Dynamic gradient backgrounds based on index to add variety
    const gradients = [
        'from-purple-50 to-pink-50',
        'from-blue-50 to-cyan-50',
        'from-green-50 to-emerald-50'
    ];
    const bgGradient = gradients[index % gradients.length];

    return (
        <div className="w-full px-5 py-2 mb-2">
            <div className={`
                relative w-full rounded-3xl overflow-hidden shadow-sm border border-border/50
                bg-gradient-to-br ${bgGradient}
            `}>
                <div className="p-5">
                    <div className="flex items-center justify-between mb-4">
                        {/* Close Button */}
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                if (onClose) onClose();
                            }}
                            className="text-muted-foreground hover:bg-black/5 p-1 rounded-full transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    <div className="mb-6 text-center">
                        <span className="text-3xl font-black text-foreground drop-shadow-sm">{item}</span>
                    </div>

                    <div className="flex gap-4 relative min-h-[140px]">
                        {/* EAT */}
                        <button
                            onClick={() => handleSelect('EAT')}
                            className={`
                                rounded-2xl transition-all duration-500 relative overflow-hidden group flex items-center justify-center
                                ${selected === 'EAT'
                                    ? 'w-[85%] z-10 shadow-xl'
                                    : selected === 'NOT_EAT'
                                        ? 'w-[40%] opacity-50 translate-x-[-20%] scale-90 blur-[1px]'
                                        : 'w-1/2 hover:bg-white/80 bg-white'
                                }
                                ${selected === 'EAT'
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-white text-foreground'
                                }
                            `}
                            disabled={!!selected}
                            style={{
                                transform: selected === 'NOT_EAT' ? 'translateX(-30%)' : 'none'
                            }}
                        >
                            <span className={`relative z-10 font-bold transition-all duration-300 ${selected === 'EAT' ? 'text-2xl' : 'text-lg'}`}>
                                {t('hate_card.eat')}
                            </span>
                            {selected === 'EAT' && (
                                <div className="absolute inset-0 bg-white/20 animate-pulse" />
                            )}
                        </button>

                        {/* Divide Badge */}
                        <div className={`
                            absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none transition-opacity duration-300
                            ${selected ? 'opacity-0' : 'opacity-100'}
                        `}>
                            <div className="bg-foreground text-background font-black text-sm px-2 py-1 rounded-full shadow-lg border-2 border-white transform -rotate-12">
                                ?
                            </div>
                        </div>

                        {/* NOT EAT */}
                        <button
                            onClick={() => handleSelect('NOT_EAT')}
                            className={`
                                rounded-2xl transition-all duration-500 relative overflow-hidden group flex items-center justify-center
                                ${selected === 'NOT_EAT'
                                    ? 'w-[85%] z-10 shadow-xl'
                                    : selected === 'EAT'
                                        ? 'w-[40%] opacity-50 translate-x-[20%] scale-90 blur-[1px]'
                                        : 'w-1/2 hover:bg-white/80 bg-white'
                                }
                                ${selected === 'NOT_EAT'
                                    ? 'bg-red-500 text-white' // Hate color
                                    : 'bg-white text-foreground'
                                }
                            `}
                            disabled={!!selected}
                            style={{
                                transform: selected === 'EAT' ? 'translateX(30%)' : 'none'
                            }}
                        >
                            <span className={`relative z-10 font-bold transition-all duration-300 ${selected === 'NOT_EAT' ? 'text-2xl' : 'text-lg'}`}>
                                {t('hate_card.not_eat')}
                            </span>
                            {selected === 'NOT_EAT' && (
                                <div className="absolute inset-0 bg-white/20 animate-pulse" />
                            )}
                        </button>
                    </div>

                    {/* Action Button (Retry or Next) */}
                    {selected && (
                        <div className="mt-4 flex justify-center animate-in fade-in slide-in-from-bottom-2 duration-500">
                            {countdown > 0 ? (
                                <button
                                    onClick={handleRetry}
                                    className="text-sm font-medium text-muted-foreground hover:text-foreground flex items-center gap-2 bg-white/50 px-4 py-2 rounded-full hover:bg-white/80 transition-colors"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 12" /><path d="M3 3v9h9" /></svg>
                                    {t('hate_card.retry', { count: countdown })}
                                </button>
                            ) : (
                                <button
                                    onClick={handleNext}
                                    className="text-sm font-bold text-primary hover:text-primary/80 flex items-center gap-2 bg-white px-6 py-3 rounded-full shadow-sm hover:shadow-md transition-all"
                                >
                                    {t('hate_card.next_question')}
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
