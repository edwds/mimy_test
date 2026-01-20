import React from 'react';
import { cn } from '@/lib/utils';
import { Capacitor } from '@capacitor/core';

interface MainHeaderProps {
    title: React.ReactNode;
    rightAction?: React.ReactNode;
    isVisible: boolean;
    className?: string;
    style?: React.CSSProperties;
    children?: React.ReactNode;
}

export const MainHeader = React.forwardRef<HTMLDivElement, MainHeaderProps>(
    ({ title, rightAction, isVisible, className, style, children }, ref) => {
        return (
            <div
                ref={ref}
                className={cn(
                    "absolute top-0 left-0 right-0 bg-background/95 backdrop-blur-sm z-50 px-5 pb-2 transition-transform duration-300",
                    !Capacitor.isNativePlatform() && "pt-6",
                    isVisible ? 'translate-y-0' : '-translate-y-full',
                    className
                )}
                style={{
                    ...(Capacitor.isNativePlatform() ? { paddingTop: 'calc(env(safe-area-inset-top) + 10px)' } : {}),
                    ...style
                }}
            >
                <div className="relative flex items-center mb-4">
                    <h1 className="text-2xl font-bold">{title}</h1>
                    {rightAction && (
                        <div className="absolute right-0 top-1/2 -translate-y-1/2 [&_svg]:w-6 [&_svg]:h-6">
                            {rightAction}
                        </div>
                    )}
                </div>
                {children}
            </div>
        );
    }
);

MainHeader.displayName = "MainHeader";
