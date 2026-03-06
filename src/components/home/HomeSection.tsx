import React from 'react';
interface Props {
    title: React.ReactNode;
    subtitle?: React.ReactNode;
    onSeeAll?: () => void;
    seeAllLabel?: string;
    children: React.ReactNode;
    loading?: boolean;
    empty?: boolean;
    fullWidth?: boolean; // For VS section (no horizontal scroll)
}

export const HomeSection: React.FC<Props> = ({
    title,
    subtitle,
    onSeeAll,
    seeAllLabel,
    children,
    loading,
    empty,
    fullWidth,
}) => {
    if (empty && !loading) return null;

    return (
        <div className="py-5">
            {/* Header */}
            <div className="flex items-center justify-between px-5 mb-4">
                <div>
                    <h3 className="text-lg font-bold text-foreground">{title}</h3>
                    {subtitle && (
                        <div className="text-xs text-muted-foreground mt-0.5">{subtitle}</div>
                    )}
                </div>
                {onSeeAll && (
                    <button
                        onClick={onSeeAll}
                        className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                        {seeAllLabel}
                    </button>
                )}
            </div>

            {/* Content */}
            {loading ? (
                <div className="flex gap-4 overflow-hidden px-5">
                    {[1, 2].map(i => (
                        <div key={i} className="flex-shrink-0 w-[75vw] max-w-[300px]">
                            <div className="bg-muted rounded-2xl h-[260px] animate-pulse mb-3" />
                            <div className="bg-muted rounded-lg h-4 w-3/4 animate-pulse mb-2" />
                            <div className="bg-muted rounded-lg h-3 w-1/2 animate-pulse" />
                        </div>
                    ))}
                </div>
            ) : fullWidth ? (
                <div>{children}</div>
            ) : (
                <div className="flex gap-4 overflow-x-auto no-scrollbar px-5">
                    {children}
                </div>
            )}
        </div>
    );
};
