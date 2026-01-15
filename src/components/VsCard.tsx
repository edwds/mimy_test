import { useState } from 'react';

interface Props {
    id: number;
    itemA: string;
    itemB: string;
    index?: number;
    onVote?: (id: number, selection: 'A' | 'B') => void;
}

export const VsCard: React.FC<Props> = ({ id, itemA, itemB, index = 0, onVote }) => {
    const [selected, setSelected] = useState<'A' | 'B' | null>(null);

    const handleSelect = (selection: 'A' | 'B') => {
        if (selected === selection) return; // Same selection, do nothing

        setSelected(selection);
        if (onVote) onVote(id, selection);
    };

    const handleRetry = (e: React.MouseEvent) => {
        e.stopPropagation();
        setSelected(null);
    };

    // Dynamic gradient backgrounds based on index to add variety
    const gradients = [
        'from-orange-50 to-red-50',
        'from-blue-50 to-purple-50',
        'from-emerald-50 to-teal-50'
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
                        <h3 className="font-bold text-lg text-foreground">
                            더 선호하는 맛은?
                        </h3>
                        <span className="text-xs font-medium text-muted-foreground bg-white/50 px-2 py-1 rounded-full">
                            VS 밸런스 게임
                        </span>
                    </div>

                    <div className="flex gap-4 relative min-h-[140px]">
                        {/* Option A */}
                        <button
                            onClick={() => handleSelect('A')}
                            className={`
                                rounded-2xl transition-all duration-500 relative overflow-hidden group flex items-center justify-center
                                ${selected === 'A'
                                    ? 'w-[85%] z-10 shadow-xl'
                                    : selected === 'B'
                                        ? 'w-[40%] opacity-50 translate-x-[-20%] scale-90 blur-[1px]'
                                        : 'w-1/2 hover:bg-white/80 bg-white'
                                }
                                ${selected === 'A'
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-white text-foreground'
                                }
                            `}
                            disabled={selected === 'B'}
                            style={{
                                transform: selected === 'B' ? 'translateX(-30%)' : 'none'
                            }}
                        >
                            <span className={`relative z-10 font-bold transition-all duration-300 ${selected === 'A' ? 'text-2xl' : 'text-lg'}`}>
                                {itemA}
                            </span>
                            {selected === 'A' && (
                                <div className="absolute inset-0 bg-white/20 animate-pulse" />
                            )}
                        </button>

                        {/* VS Badge */}
                        <div className={`
                            absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none transition-opacity duration-300
                            ${selected ? 'opacity-0' : 'opacity-100'}
                        `}>
                            <div className="bg-foreground text-background font-black text-xs px-2 py-1 rounded-full shadow-lg border-2 border-white transform rotate-12">
                                VS
                            </div>
                        </div>

                        {/* Option B */}
                        <button
                            onClick={() => handleSelect('B')}
                            className={`
                                rounded-2xl transition-all duration-500 relative overflow-hidden group flex items-center justify-center
                                ${selected === 'B'
                                    ? 'w-[85%] z-10 shadow-xl'
                                    : selected === 'A'
                                        ? 'w-[40%] opacity-50 translate-x-[20%] scale-90 blur-[1px]'
                                        : 'w-1/2 hover:bg-white/80 bg-white'
                                }
                                ${selected === 'B'
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-white text-foreground'
                                }
                            `}
                            disabled={selected === 'A'}
                            style={{
                                transform: selected === 'A' ? 'translateX(30%)' : 'none'
                            }}
                        >
                            <span className={`relative z-10 font-bold transition-all duration-300 ${selected === 'B' ? 'text-2xl' : 'text-lg'}`}>
                                {itemB}
                            </span>
                            {selected === 'B' && (
                                <div className="absolute inset-0 bg-white/20 animate-pulse" />
                            )}
                        </button>
                    </div>

                    {/* Retry Button (Replaces Progress Bar) */}
                    {selected && (
                        <div className="mt-4 flex justify-center animate-in fade-in slide-in-from-bottom-2 duration-500">
                            <button
                                onClick={handleRetry}
                                className="text-sm font-medium text-muted-foreground hover:text-foreground flex items-center gap-2 bg-white/50 px-4 py-2 rounded-full hover:bg-white/80 transition-colors"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 12" /><path d="M3 3v9h9" /></svg>
                                다시하기
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
