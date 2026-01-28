import { useTranslation } from 'react-i18next';
import { Smile, Meh, Frown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
    satisfaction: 'good' | 'ok' | 'bad';
    percentile?: number;
    showPercentile?: boolean;
    className?: string;
    size?: 'sm' | 'md' | 'lg';
    showIcon?: boolean;
}

export const SatisfactionRating = ({
    satisfaction,
    percentile,
    showPercentile = true,
    className,
    size = 'md',
    showIcon = false
}: Props) => {
    const { t } = useTranslation();

    const getSizeClasses = () => {
        switch (size) {
            case 'sm': return "px-2 py-1 text-xs";
            case 'lg': return "px-5 py-2.5 text-base";
            default: return "px-4 py-1.5 text-sm";
        }
    };

    const getIconSize = () => {
        switch (size) {
            case 'sm': return 12;
            case 'lg': return 18;
            default: return 14;
        }
    };

    const isGood = satisfaction === 'good';
    const isOk = satisfaction === 'ok';

    return (
        <div className={cn(
            "rounded-full font-bold border flex items-center justify-center shadow-sm whitespace-nowrap",
            getSizeClasses(),
            isGood ? "bg-orange-50 text-orange-600 border-orange-200" :
                isOk ? "bg-yellow-50 text-yellow-600 border-yellow-200" :
                    "bg-gray-50 text-gray-600 border-gray-200",
            className
        )}>
            {/* Satisfaction Part */}
            <div className="flex items-center gap-1.5">
                {showIcon && (
                    satisfaction === 'good' ? <Smile size={getIconSize()} /> :
                        satisfaction === 'ok' ? <Meh size={getIconSize()} /> :
                            <Frown size={getIconSize()} />
                )}
                <span>{t(`write.basic.${satisfaction}`)}</span>
            </div>

            {/* Separator & Percentile */}
            {showPercentile && percentile !== undefined && satisfaction !== 'bad' && (
                <>
                    <div className={cn(
                        "mx-2 h-3 w-[1px]",
                        isGood ? "bg-orange-200" :
                            isOk ? "bg-yellow-200" :
                                "bg-gray-300"
                    )} />
                    {/* Explicitly use the format '상위 35%' (Top 35%) */}
                    <span>
                        {t('common.top_percent', { percent: percentile, defaultValue: `Top ${percentile}%` }).replace('Top', '상위')}
                    </span>
                </>
            )}
        </div>
    );
};
