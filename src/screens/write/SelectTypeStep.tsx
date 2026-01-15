import React from 'react';
import { Utensils, PenLine, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (type: 'review' | 'post') => void;
}

export const SelectTypeStep: React.FC<Props> = ({ isOpen, onClose, onSelect }) => {
    const { t } = useTranslation();
    if (!isOpen) return null;

    return (
        <div className="absolute inset-0 z-50 flex items-end justify-center sm:items-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity animate-in fade-in duration-300"
                onClick={onClose}
            />

            {/* Panel */}
            <div
                className={cn(
                    "relative w-full max-w-[400px] bg-background text-foreground shadow-2xl overflow-hidden",
                    "animate-in slide-in-from-bottom duration-300 sm:zoom-in-95 sm:fade-in sm:slide-in-from-bottom-0",
                    "rounded-t-[32px] sm:rounded-[32px]", // Mobile: Top Rounded, PC: All Rounded
                    "p-6 pb-10 sm:p-8"
                )}
            >
                {/* Mobile Handle */}
                <div className="flex justify-center mb-6 sm:hidden pointer-events-none">
                    <div className="w-12 h-1.5 bg-[var(--color-border)] rounded-full" />
                </div>

                {/* Header */}
                <div className="flex items-center justify-between mb-8 px-1">
                    <h2 className="text-2xl font-bold tracking-tight">
                        {t('write.select.title')}
                    </h2>
                    {/* PC Close Button */}
                    <button
                        onClick={onClose}
                        className="hidden sm:flex p-2 rounded-full hover:bg-[var(--color-gray-50)] transition-colors text-[var(--color-text-tertiary)]"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* List Items */}
                <div className="space-y-3">
                    <button
                        onClick={() => onSelect('review')}
                        className="group w-full flex items-center p-4 rounded-[24px] hover:bg-[var(--color-gray-50)] active:scale-[0.98] transition-all cursor-pointer border border-transparent hover:border-[var(--color-border)]"
                    >
                        {/* Icon Circle */}
                        <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-primary mr-5 shrink-0 group-hover:scale-110 transition-transform">
                            <Utensils size={24} strokeWidth={2.5} />
                        </div>
                        {/* Text */}
                        <div className="flex-1 text-left">
                            <h3 className="text-[17px] font-bold mb-0.5 group-hover:text-primary transition-colors">
                                {t('write.select.review.title')}
                            </h3>
                            <p className="text-[15px] text-[var(--color-text-secondary)] font-medium">
                                {t('write.select.review.desc')}
                            </p>
                        </div>
                    </button>

                    <button
                        onClick={() => onSelect('post')}
                        className="group w-full flex items-center p-4 rounded-[24px] hover:bg-[var(--color-gray-50)] active:scale-[0.98] transition-all cursor-pointer border border-transparent hover:border-[var(--color-border)]"
                    >
                        {/* Icon Circle */}
                        <div className="w-14 h-14 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500 mr-5 shrink-0 group-hover:scale-110 transition-transform">
                            <PenLine size={24} strokeWidth={2.5} />
                        </div>
                        {/* Text */}
                        <div className="flex-1 text-left">
                            <h3 className="text-[17px] font-bold mb-0.5 group-hover:text-blue-500 transition-colors">
                                {t('write.select.post.title')}
                            </h3>
                            <p className="text-[15px] text-[var(--color-text-secondary)] font-medium">
                                {t('write.select.post.desc')}
                            </p>
                        </div>
                    </button>
                </div>
            </div>
        </div>
    );
};