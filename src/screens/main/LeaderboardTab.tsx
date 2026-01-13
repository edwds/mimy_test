import { useState, useRef, useEffect } from 'react';
import { Bell, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

export const LeaderboardTab = () => {
    // Smart Header State
    const [isHeaderVisible, setIsHeaderVisible] = useState(true);
    const lastScrollY = useRef(0);
    const containerRef = useRef<HTMLDivElement>(null);
    const headerRef = useRef<HTMLDivElement>(null);
    const [headerHeight, setHeaderHeight] = useState(0);

    useEffect(() => {
        if (headerRef.current) {
            setHeaderHeight(headerRef.current.offsetHeight);
        }
    }, []);

    const handleScroll = () => {
        if (!containerRef.current) return;
        const currentScrollY = containerRef.current.scrollTop;
        const diff = currentScrollY - lastScrollY.current;

        if (currentScrollY < 10) {
            setIsHeaderVisible(true);
        } else if (Math.abs(diff) > 10) {
            if (diff > 0) {
                setIsHeaderVisible(false);
            } else {
                setIsHeaderVisible(true);
            }
        }
        lastScrollY.current = currentScrollY;
    };

    return (
        <div className="flex flex-col h-full bg-background relative overflow-hidden">
            {/* Smart Header */}
            <div
                ref={headerRef}
                className={cn(
                    "absolute top-0 left-0 right-0 bg-background/95 backdrop-blur-sm z-50 px-5 pt-6 pb-2 transition-transform duration-300 border-b border-border/50",
                    isHeaderVisible ? 'translate-y-0' : '-translate-y-full'
                )}
            >
                <div className="flex items-center justify-between mb-4">
                    <h1 className="text-2xl font-bold">Ranking</h1>
                    <div className="flex gap-4">
                        <button className="p-2 rounded-full hover:bg-muted transition-colors relative">
                            <Bell className="w-6 h-6 text-foreground" />
                        </button>
                        <button className="p-2 rounded-full hover:bg-muted transition-colors">
                            <Search className="w-6 h-6 text-foreground" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div
                ref={containerRef}
                className="flex-1 overflow-y-auto"
                onScroll={handleScroll}
                style={{ paddingTop: headerHeight }}
            >
                <div className="flex flex-col items-center justify-center min-h-[50vh] text-muted-foreground animate-in slide-in-from-right-2 duration-200">
                    <p>Coming Soon</p>
                </div>
            </div>
        </div>
    );
};
