
import React from 'react';
import { Button } from '@/components/ui/button';
import { Trophy } from 'lucide-react';

interface Props {
    shopName: string;
    onFinish: () => void;
}

export const RankingStep: React.FC<Props> = ({ shopName, onFinish }) => {
    return (
        <div className="flex flex-col h-full bg-[var(--color-surface)] p-6 items-center justify-center text-center">

            <div className="w-24 h-24 bg-yellow-100 rounded-full flex items-center justify-center mb-8 animate-bounce">
                <Trophy className="w-12 h-12 text-yellow-600" />
            </div>

            <h1 className="text-2xl font-bold mb-4 text-[var(--color-text-primary)]">
                기록이 완료되었습니다!
            </h1>

            <p className="text-[var(--color-text-secondary)] mb-8">
                <span className="font-bold text-[var(--color-primary)]">{shopName}</span>의<br />
                나만의 랭킹이 저장되었습니다.
            </p>

            <div className="w-full">
                <Button
                    className="w-full h-12 text-lg"
                    onClick={onFinish}
                >
                    확인
                </Button>
            </div>
        </div>
    );
};
