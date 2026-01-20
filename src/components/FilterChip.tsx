import React from 'react';
import { cn } from '@/lib/utils';

interface FilterChipProps {
    label: string;
    isActive: boolean;
    onClick: () => void;
    className?: string;
}

export const FilterChip: React.FC<FilterChipProps> = ({ label, isActive, onClick, className }) => {
    return (
        <button
            onClick={onClick}
            className={cn(
                "px-4 py-2 text-sm font-medium rounded-full transition-colors whitespace-nowrap",
                isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted/50 text-muted-foreground hover:bg-muted",
                className
            )}
        >
            {label}
        </button>
    );
};
