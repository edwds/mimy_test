import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

interface Props {
    rank: number;
    percentile?: number;
    className?: string;
    size?: 'sm' | 'md' | 'lg';
    variant?: 'badge' | 'text';
}

export const RankingBadge = ({ rank, percentile, className, size = 'md', variant = 'badge' }: Props) => {
    const { i18n } = useTranslation();

    const getSizeClasses = () => {
        switch (size) {
            case 'sm': return "text-[11px]";
            case 'lg': return "text-[15px]";
            default: return "text-sm";
        }
    };

    if (rank <= 0) return null;

    // Show trophy emoji if rank <= 10 OR percentile <= 5
    const showTrophy = rank <= 10 || (percentile && percentile <= 5);

    // Korean format: 트로피 + {rank}위
    // English format: 트로피 + #{rank} (or Rank #{rank})
    const isKorean = i18n.language.startsWith('ko');

    if (variant === 'text') {
        return (
            <span className={cn("font-bold text-gray-900 flex items-center gap-0.5", getSizeClasses(), className)}>
                {showTrophy && <span>🏆</span>}
                {isKorean ? `${rank}위` : `#${rank}`}
            </span>
        );
    }

    // Badge variant - compact style matching ShopCard
    return (
        <div className={cn(
            "font-bold flex items-center gap-0.5",
            getSizeClasses(),
            className
        )}>
            {showTrophy && <span>🏆</span>}
            <span>{isKorean ? `${rank}위` : `#${rank}`}</span>
        </div>
    );
};
