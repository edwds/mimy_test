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
                className="absolute inset-0 bg-black/50 transition-opacity"
                onClick={onClose}
            />

            {/* Sheet */}
            <div className="relative w-full max-w-md bg-[var(--color-surface)] rounded-t-[20px] p-6 animate-in slide-in-from-bottom duration-300">
                <div className="flex justify-center mb-6">
                    <div className="w-12 h-1.5 bg-[var(--color-gray-200)] rounded-full" />
                </div>

                <div className="space-y-4">
                    <button
                        onClick={() => onSelect('review')}
                        className="w-full flex items-center gap-4 p-4 rounded-xl bg-[var(--color-gray-50)] hover:bg-[var(--color-gray-100)] transition-colors text-left"
                    >
                        <div className="w-12 h-12 rounded-full bg-[var(--color-primary)]/10 flex items-center justify-center text-[var(--color-primary)]">
                            <Utensils size={24} />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-bold text-[var(--text-lg)]">맛집 기록하기</h3>
                            <p className="text-[var(--text-sm)] text-[var(--color-gray-500)]">방문한 맛집의 경험을 남겨보세요</p>
                        </div>
                    </button>

                    <button
                        onClick={() => onSelect('post')}
                        className="w-full flex items-center gap-4 p-4 rounded-xl bg-[var(--color-gray-50)] hover:bg-[var(--color-gray-100)] transition-colors text-left"
                    >
                        <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-500">
                            <PenLine size={24} />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-bold text-[var(--text-lg)]">자유 글쓰기</h3>
                            <p className="text-[var(--text-sm)] text-[var(--color-gray-500)]">맛집 이야기나 질문을 자유롭게 올려보세요</p>
                        </div>
                    </button>
                </div>

                <div className="h-8" />
            </div>
        </div>
    );
};
