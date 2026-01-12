
import React from 'react';
import { Button } from '@/components/ui/button';
import { Utensils, PenLine } from 'lucide-react';

interface Props {
    onSelect: (type: 'review' | 'post') => void;
}

export const SelectTypeStep: React.FC<Props> = ({ onSelect }) => {
    return (
        <div className="flex flex-col h-full bg-[var(--color-surface)] p-6">
            <h1 className="text-2xl font-bold mb-8 text-[var(--color-text-primary)]">
                어떤 이야기를<br />기록하시겠어요?
            </h1>

            <div className="flex flex-col gap-4">
                <button
                    onClick={() => onSelect('review')}
                    className="flex items-center p-6 rounded-2xl bg-[var(--color-background)] border border-[var(--color-border)] hover:border-[var(--color-primary)] transition-colors text-left"
                >
                    <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center mr-4">
                        <Utensils className="w-6 h-6 text-orange-600" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-[var(--color-text-primary)]">방문 후기 쓰기</h3>
                        <p className="text-sm text-[var(--color-text-secondary)]">다녀온 맛집을 기록하고 랭킹을 매겨보세요</p>
                    </div>
                </button>

                <button
                    onClick={() => onSelect('post')}
                    className="flex items-center p-6 rounded-2xl bg-[var(--color-background)] border border-[var(--color-border)] hover:border-[var(--color-primary)] transition-colors text-left"
                >
                    <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mr-4">
                        <PenLine className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-[var(--color-text-primary)]">자유 글쓰기</h3>
                        <p className="text-sm text-[var(--color-text-secondary)]">맛집 이야기나 미식 경험을 자유롭게 나눠요</p>
                    </div>
                </button>
            </div>
        </div>
    );
};
