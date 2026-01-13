import React from 'react';
import { Utensils, PenLine } from 'lucide-react';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (type: 'review' | 'post') => void;
}

export const SelectTypeBottomSheet: React.FC<Props> = ({ isOpen, onClose, onSelect }) => {
    if (!isOpen) return null;

    return (
        <div className="absolute inset-0 z-50 flex items-end justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
                onClick={onClose}
            />

            {/* Sheet */}
            <div className="relative w-full max-w-md bg-[var(--color-surface)] rounded-t-[28px] p-6 pb-12 animate-in slide-in-from-bottom duration-300 shadow-2xl">
                <div className="flex justify-center mb-8">
                    <div className="w-12 h-1.5 bg-gray-200 rounded-full" />
                </div>

                <h2 className="text-xl font-bold mb-6 text-[var(--color-text-primary)] px-2">
                    어떤 기록을 남기시겠어요?
                </h2>

                <div className="space-y-4">
                    <button
                        onClick={() => onSelect('review')}
                        className="w-full flex items-center gap-5 p-5 rounded-2xl bg-[var(--color-background)] hover:bg-[var(--color-gray-50)] border border-transparent hover:border-[var(--color-border)] transition-all text-left shadow-sm active:scale-[0.99]"
                    >
                        <div className="w-14 h-14 rounded-full bg-orange-50 flex items-center justify-center text-orange-500 shadow-inner">
                            <Utensils size={26} strokeWidth={2.5} />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-bold text-lg text-[var(--color-text-primary)] mb-1">맛집 다녀왔어요</h3>
                            <p className="text-sm text-[var(--color-text-secondary)]">방문한 맛집의 경험을 기록하고 공유해요</p>
                        </div>
                    </button>

                    <button
                        onClick={() => onSelect('post')}
                        className="w-full flex items-center gap-5 p-5 rounded-2xl bg-[var(--color-background)] hover:bg-[var(--color-gray-50)] border border-transparent hover:border-[var(--color-border)] transition-all text-left shadow-sm active:scale-[0.99]"
                    >
                        <div className="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center text-blue-500 shadow-inner">
                            <PenLine size={26} strokeWidth={2.5} />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-bold text-lg text-[var(--color-text-primary)] mb-1">자유롭게 이야기할래요</h3>
                            <p className="text-sm text-[var(--color-text-secondary)]">맛집 이야기나 궁금한 점을 나눠보세요</p>
                        </div>
                    </button>
                </div>
            </div>
        </div>
    );
};
