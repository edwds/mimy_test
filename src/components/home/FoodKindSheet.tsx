import React from 'react';
import { X, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface Props {
    open: boolean;
    onClose: () => void;
    onSelect: (foodKind: string | null) => void;
    currentFoodKind: string | null;
}

const FOOD_KINDS = [
    '일식', '고기/구이', '이탈리안', '한식', '오마카세', '바/주점',
    '양식', '중식', '해산물', '스시/회', '카페', '스테이크',
];

export const FoodKindSheet: React.FC<Props> = ({ open, onClose, onSelect, currentFoodKind }) => {
    const { t } = useTranslation();

    if (!open) return null;

    const handleSelect = (kind: string | null) => {
        onSelect(kind);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/50 animate-in fade-in duration-200" onClick={onClose} />

            {/* Sheet */}
            <div className="relative w-full max-w-lg bg-background rounded-t-2xl animate-in slide-in-from-bottom duration-300 max-h-[60vh] flex flex-col">
                {/* Handle */}
                <div className="flex justify-center pt-3 pb-2">
                    <div className="w-10 h-1 bg-muted-foreground/30 rounded-full" />
                </div>

                {/* Header */}
                <div className="flex items-center justify-between px-5 pb-3">
                    <h3 className="text-lg font-bold">{t('home.sections.select_food_kind')}</h3>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-muted">
                        <X size={20} />
                    </button>
                </div>

                {/* Food Kind List */}
                <div className="flex-1 overflow-y-auto px-5 pb-8">
                    <div className="space-y-1">
                        {/* "All" option */}
                        <button
                            onClick={() => handleSelect(null)}
                            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-left transition-colors ${
                                currentFoodKind === null
                                    ? 'bg-primary/10 text-primary'
                                    : 'hover:bg-muted'
                            }`}
                        >
                            <span className="text-sm font-medium">{t('home.sections.food_kind_all')}</span>
                            {currentFoodKind === null && <Check size={16} className="text-primary" />}
                        </button>

                        {FOOD_KINDS.map((kind) => (
                            <button
                                key={kind}
                                onClick={() => handleSelect(kind)}
                                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-left transition-colors ${
                                    currentFoodKind === kind
                                        ? 'bg-primary/10 text-primary'
                                        : 'hover:bg-muted'
                                }`}
                            >
                                <span className="text-sm font-medium">{kind}</span>
                                {currentFoodKind === kind && <Check size={16} className="text-primary" />}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};
