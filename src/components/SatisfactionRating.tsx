import { useTranslation } from 'react-i18next';
import { Smile, Meh, Frown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
    satisfaction: 'good' | 'ok' | 'bad';
    percentile?: number;
    showPercentile?: boolean;
    className?: string;
    size?: 'sm' | 'md' | 'lg';
}

export const SatisfactionRating = ({ satisfaction, percentile, showPercentile = true, className, size = 'md' }: Props) => {
    const { t } = useTranslation();

    const getSizeClasses = () => {
        switch (size) {
            case 'sm': return "px-2 py-1 text-xs gap-1";
            case 'lg': return "px-5 py-2.5 text-base gap-2";
            default: return "px-3 py-1.5 text-sm gap-1.5";
        }
    };

    const getIconSize = () => {
        switch (size) {
            case 'sm': return 12;
            case 'lg': return 18;
            default: return 14;
        }
    };

    return (
        <div className={cn("flex items-center gap-1.5", className)}>
            {/* Main Satisfaction Pill */}
            <div className={cn(
                "rounded-full font-bold border flex items-center shadow-sm",
                getSizeClasses(),
                satisfaction === 'good' ? "bg-orange-50 text-orange-600 border-orange-100" :
                    satisfaction === 'ok' ? "bg-yellow-50 text-yellow-600 border-yellow-100" :
                        "bg-gray-50 text-gray-600 border-gray-100"
            )}>
                {satisfaction === 'good' ? <Smile size={getIconSize()} /> : satisfaction === 'ok' ? <Meh size={getIconSize()} /> : <Frown size={getIconSize()} />}
                <span>{t(`write.basic.${satisfaction}`)}</span>
            </div>

            {/* Percentile Pill (Attached/Adjacent) */}
            {showPercentile && percentile !== undefined && satisfaction !== 'bad' && (
                <div className={cn(
                    "rounded-full font-bold bg-gray-100 text-gray-600 border border-gray-200 flex items-center justify-center",
                    getSizeClasses()
                )}>
                    <span>Top {percentile}%</span>
                </div>
            )}
        </div>
    );
};
