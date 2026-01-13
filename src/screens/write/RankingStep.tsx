
import React from 'react';
import { Button } from '@/components/ui/button';
import { Trophy, CheckCircle2 } from 'lucide-react';

interface Props {
    shopName: string;
    onFinish: () => void;
}

export const RankingStep: React.FC<Props> = ({ shopName, onFinish }) => {
    return (
        <div className="flex flex-col h-full bg-[var(--color-surface)] p-6 items-center justify-center text-center">

            <div className="mb-8 relative">
                <div className="absolute inset-0 bg-yellow-100 rounded-full animate-ping opacity-20" />
                <div className="w-24 h-24 bg-yellow-50 rounded-full flex items-center justify-center relative z-10 border-4 border-yellow-100">
                    <Trophy className="w-10 h-10 text-yellow-500" strokeWidth={1.5} />
                </div>
                <div className="absolute -bottom-2 -right-2 bg-green-500 rounded-full p-2 border-4 border-[var(--color-surface)]">
                    <CheckCircle2 className="w-5 h-5 text-white" />
                </div>
            </div>

            <h1 className="text-2xl font-bold mb-3 text-[var(--color-text-primary)]">
                기록이 완료되었습니다!
            </h1>

            <p className="text-[var(--color-text-secondary)] mb-12 leading-relaxed">
                <span className="font-bold text-[var(--color-primary)] text-lg">{shopName}</span>의<br />
                나만의 금쪽같은 랭킹이 저장되었습니다.
            </p>

            <div className="w-full max-w-xs space-y-3">
                <Button
                    className="w-full h-14 text-lg font-bold rounded-xl shadow-lg shadow-[var(--color-primary)]/20"
                    onClick={onFinish}
                >
                    확인
                </Button>
            </div>
        </div>
    );
};
