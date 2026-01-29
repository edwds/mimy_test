import { useTranslation } from 'react-i18next';
import { Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
    rank: number;
    className?: string;
    size?: 'sm' | 'md' | 'lg';
    variant?: 'badge' | 'text';
}

export const RankingBadge = ({ rank, className, size = 'md', variant = 'badge' }: Props) => {
    const { t } = useTranslation();

    const getSizeClasses = () => {
        switch (size) {
            case 'sm': return "text-xs";
            case 'lg': return "text-lg";
            default: return "text-sm";
        }
    };

    const getBadgeSizeClasses = () => {
        switch (size) {
            case 'sm': return "px-2 py-1 gap-1";
            case 'lg': return "px-5 py-2.5 gap-2";
            default: return "px-3 py-1.5 gap-1.5";
        }
    };

    const getIconSize = () => {
        switch (size) {
            case 'sm': return 12;
            case 'lg': return 18;
            default: return 14;
        }
    };

    if (rank <= 0) return null;

    if (variant === 'text') {
        return (
            <span className={cn("font-bold text-gray-900", getSizeClasses(), className)}>
                {rank}{t('common.rank_suffix', { defaultValue: '위' })}
            </span>
        );
    }

    return (
        <div className={cn(
            "rounded-full font-bold bg-gray-900 text-white border border-gray-900 flex items-center shadow-sm",
            getSizeClasses(),
            getBadgeSizeClasses(),
            className
        )}>
            <Trophy size={getIconSize()} className="text-yellow-400 fill-current" />
            <span>
                #{rank}
            </span>
        </div>
    );
};
