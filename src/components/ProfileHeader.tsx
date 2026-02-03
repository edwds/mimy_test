import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Capacitor } from '@capacitor/core';

interface ProfileHeaderProps {
    title: React.ReactNode;
    onBack: () => void;
    rightAction?: React.ReactNode;
    isVisible: boolean;
    className?: string;
}

export const ProfileHeader = React.forwardRef<HTMLDivElement, ProfileHeaderProps>(
    ({ title, onBack, rightAction, isVisible, className }, ref) => {
        return (
            <div
                ref={ref}
                className={cn(
                    "absolute top-0 left-0 right-0 bg-background/95 backdrop-blur-sm z-50 px-4 pb-2 transition-transform duration-300 flex items-center gap-2",
                    isVisible ? 'translate-y-0' : '-translate-y-full',
                    className
                )}
                style={{
                    paddingTop: Capacitor.isNativePlatform()
                        ? 'calc(env(safe-area-inset-top) + 12px)'
                        : '1.5rem'
                }}
            >
                <Button
                    variant="ghost"
                    size="icon"
                    className="-ml-2 min-w-[44px] min-h-[44px]"
                    onClick={onBack}
                >
                    <ArrowLeft className="w-6 h-6" />
                </Button>

                <h1 className="text-lg font-bold truncate flex-1">
                    {title}
                </h1>

                {rightAction && (
                    <div className="ml-auto">
                        {rightAction}
                    </div>
                )}
            </div>
        );
    }
);

ProfileHeader.displayName = "ProfileHeader";
