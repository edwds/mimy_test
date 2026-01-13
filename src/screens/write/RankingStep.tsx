import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Trophy, Check, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
    shopName: string;
    onFinish: () => void;
}

export const RankingStep: React.FC<Props> = ({ shopName, onFinish }) => {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        setTimeout(() => setVisible(true), 100);
    }, []);

    return (
        <div className="flex flex-col h-full bg-[var(--color-surface)] items-center justify-center p-8 text-center">
            <div className={cn("transition-all duration-700 transform", visible ? "scale-100 opacity-100" : "scale-50 opacity-0")}>
                <div className="w-32 h-32 bg-yellow-50 rounded-full flex items-center justify-center mx-auto mb-8 relative">
                    <div className="absolute inset-0 bg-yellow-100 rounded-full animate-ping opacity-20" />
                    <Trophy className="w-16 h-16 text-yellow-500" strokeWidth={1.5} />
                    <div className="absolute -bottom-2 -right-2 bg-green-500 text-white p-2 rounded-full border-4 border-[var(--color-surface)] shadow-lg">
                        <Check className="w-5 h-5" strokeWidth={3} />
                    </div>
                </div>

                <h2 className="text-3xl font-bold mb-4 text-[var(--color-text-primary)]">
                    기록 완료!
                </h2>

                <p className="text-[var(--color-text-tertiary)] text-lg leading-relaxed mb-12">
                    <strong className="text-[var(--color-text-primary)]">{shopName}</strong>에서의<br />
                    소중한 경험이 저장되었습니다.
                </p>
            </div>

            <div className={cn("w-full max-w-xs transition-all duration-700 delay-300 transform", visible ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0")}>
                <Button
                    onClick={onFinish}
                    className="w-full h-14 text-lg font-bold rounded-2xl shadow-lg shadow-[var(--color-primary)]/20 hover:shadow-[var(--color-primary)]/30 transition-all active:scale-[0.98]"
                >
                    확인
                </Button>
                <div className="mt-4">
                    <button onClick={onFinish} className="text-[var(--color-text-tertiary)] text-sm hover:text-[var(--color-text-primary)] transition-colors flex items-center gap-1 mx-auto">
                        내 랭킹 확인하러 가기 <ArrowRight className="w-3 h-3" />
                    </button>
                </div>
            </div>
        </div>
    );
};
