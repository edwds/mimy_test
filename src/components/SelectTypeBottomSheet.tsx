import React from 'react';
import { Utensils, PenLine } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (type: 'review' | 'post') => void;
}

export const SelectTypeBottomSheet: React.FC<Props> = ({ isOpen, onClose, onSelect }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity animate-in fade-in duration-300"
                onClick={onClose}
            />

            {/* Sheet */}
            <div className={cn(
                "relative w-full max-w-sm bg-[var(--color-surface)] sm:rounded-2xl rounded-t-[28px] p-6 pb-12 shadow-2xl animate-in slide-in-from-bottom duration-300 sm:zoom-in-95 data-[state=closed]:slide-out-to-bottom data-[state=closed]:fade-out",
                "border-t border-[var(--color-border)] sm:border"
            )}>
                <div className="flex justify-center mb-8 sm:hidden">
                    <div className="w-12 h-1.5 bg-gray-200 rounded-full" />
                </div>

                <div className="text-center sm:text-left mb-8 px-1">
                    <h2 className="text-2xl font-bold mb-2 text-[var(--color-text-primary)] tracking-tight">
                        새로운 기록 남기기
                    </h2>
                    <p className="text-[var(--color-text-tertiary)] text-base">
                        어떤 경험을 공유하고 싶으신가요?
                    </p>
                </div>

                <div className="space-y-4">
                    <button
                        onClick={() => onSelect('review')}
                        className="group w-full flex items-center gap-5 p-5 rounded-2xl bg-[var(--color-background)] hover:bg-[var(--color-gray-50)] border border-[var(--color-border)] hover:border-[var(--color-primary)] transition-all text-left shadow-sm active:scale-[0.98]"
                    >
                        <div className="w-14 h-14 rounded-2xl bg-orange-50 flex items-center justify-center text-orange-500 shadow-inner group-hover:scale-110 transition-transform duration-300">
                            <Utensils size={26} strokeWidth={2.5} />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-bold text-lg text-[var(--color-text-primary)] mb-1 group-hover:text-[var(--color-primary)] transition-colors">맛집 다녀왔어요</h3>
                            <p className="text-sm text-[var(--color-text-secondary)] font-medium">상세한 방문 후기 기록</p>
                        </div>
                    </button>

                    <button
                        onClick={() => onSelect('post')}
                        className="group w-full flex items-center gap-5 p-5 rounded-2xl bg-[var(--color-background)] hover:bg-[var(--color-gray-50)] border border-[var(--color-border)] hover:border-[var(--color-primary)] transition-all text-left shadow-sm active:scale-[0.98]"
                    >
                        <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-500 shadow-inner group-hover:scale-110 transition-transform duration-300">
                            <PenLine size={26} strokeWidth={2.5} />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-bold text-lg text-[var(--color-text-primary)] mb-1 group-hover:text-[var(--color-primary)] transition-colors">자유롭게 말할래요</h3>
                            <p className="text-sm text-[var(--color-text-secondary)] font-medium">일상 이야기 및 질문</p>
                        </div>
                    </button>
                </div>
            </div>
        </div>
    );
};
