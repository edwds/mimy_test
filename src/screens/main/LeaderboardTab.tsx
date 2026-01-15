
import { useState, useRef, useEffect } from 'react';
import { Trophy, Medal, User as UserIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { API_BASE_URL } from '@/lib/api';
import { useNavigate } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';

interface LeaderboardItem {
    rank: number;
    user: {
        id: number;
        nickname: string | null;
        account_id: string;
        profile_image: string | null;
    };
    score: number;
}

export const LeaderboardTab = () => {
    const navigate = useNavigate();
    // Smart Header State
    const [isHeaderVisible, setIsHeaderVisible] = useState(true);
    const lastScrollY = useRef(0);
    const containerRef = useRef<HTMLDivElement>(null);
    const headerRef = useRef<HTMLDivElement>(null);
    const [headerHeight, setHeaderHeight] = useState(0);

    // Data State
    const [items, setItems] = useState<LeaderboardItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (headerRef.current) {
            setHeaderHeight(headerRef.current.offsetHeight);
        }
    }, []);

    useEffect(() => {
        const fetchLeaderboard = async () => {
            setLoading(true);
            try {
                const res = await fetch(`${API_BASE_URL}/api/users/leaderboard`);
                if (res.ok) {
                    const data = await res.json();
                    setItems(data);
                }
            } catch (error) {
                console.error("Failed to load leaderboard", error);
            } finally {
                setLoading(false);
            }
        };

        fetchLeaderboard();
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

    const getRankIcon = (index: number) => {
        switch (index) {
            case 0: return <Trophy className="w-6 h-6 text-yellow-500 fill-yellow-500" />;
            case 1: return <Medal className="w-6 h-6 text-gray-400 fill-gray-400" />;
            case 2: return <Medal className="w-6 h-6 text-amber-700 fill-amber-700" />;
            default: return <span className="text-lg font-bold text-muted-foreground w-6 text-center">{index + 1}</span>;
        }
    };

    return (
        <div className="flex flex-col h-full bg-background relative overflow-hidden">
            {/* Smart Header */}
            <div
                ref={headerRef}
                className={cn(
                    "absolute top-0 left-0 right-0 bg-background/95 backdrop-blur-sm z-50 px-5 pt-7 pb-2 transition-transform duration-300",
                    isHeaderVisible ? 'translate-y-0' : '-translate-y-full'
                )}
            >
                <div className="flex items-center justify-between mb-2">
                    <h1 className="text-2xl font-bold">Leaderboard</h1>
                    <div className="flex gap-4">
                        {/* 
                        <button className="p-2 rounded-full hover:bg-muted transition-colors relative">
                            <Bell className="w-6 h-6 text-foreground" />
                        </button>
                        <button className="p-2 rounded-full hover:bg-muted transition-colors">
                            <Search className="w-6 h-6 text-foreground" />
                        </button>
                         */}
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
                <div className="p-4 pt-24 pb-20">
                    {loading ? (
                        <div className="space-y-4">
                            {[...Array(5)].map((_, i) => (
                                <div key={i} className="flex items-center gap-4 p-4 rounded-xl bg-muted/30">
                                    <Skeleton className="w-8 h-8 rounded-full" />
                                    <Skeleton className="w-12 h-12 rounded-full" />
                                    <div className="flex-1">
                                        <Skeleton className="h-4 w-24 mb-2" />
                                        <Skeleton className="h-3 w-16" />
                                    </div>
                                    <Skeleton className="h-6 w-10" />
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {items.map((item, index) => (
                                <div
                                    key={item.user.id}
                                    className={cn(
                                        "flex items-center gap-4 p-4 rounded-xl transition-all cursor-pointer hover:bg-muted/50 border border-transparent",
                                        index < 3 ? "bg-gradient-to-r from-muted/50 to-transparent border-border/30" : "bg-card"
                                    )}
                                    onClick={() => {
                                        const current = new URLSearchParams(window.location.search);
                                        const targetId = item.user.account_id || item.user.id;
                                        current.set('viewUser', String(targetId));
                                        navigate(`${window.location.pathname}?${current.toString()}`);
                                    }}
                                >
                                    {/* Rank */}
                                    <div className="flex-shrink-0 w-8 flex justify-center">
                                        {getRankIcon(index)}
                                    </div>

                                    {/* Profile Image */}
                                    <div className="relative flex-shrink-0">
                                        <div className={cn(
                                            "w-12 h-12 rounded-full overflow-hidden border-2",
                                            index === 0 ? "border-yellow-500" :
                                                index === 1 ? "border-gray-400" :
                                                    index === 2 ? "border-amber-700" : "border-transparent bg-muted"
                                        )}>
                                            {item.user.profile_image ? (
                                                <img src={item.user.profile_image} alt={item.user.nickname || "User"} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center bg-muted text-muted-foreground">
                                                    <UserIcon className="w-6 h-6 opacity-50" />
                                                </div>
                                            )}
                                        </div>
                                        {index < 3 && (
                                            <div className="absolute -bottom-1 -right-1 bg-background rounded-full p-[2px]">
                                                {getRankIcon(index)}
                                            </div>
                                        )}
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-bold text-base truncate">
                                            {item.user.nickname || "User"}
                                        </h3>
                                        <p className="text-xs text-muted-foreground truncate">
                                            @{item.user.account_id}
                                        </p>
                                    </div>

                                    {/* Score */}
                                    <div className="flex flex-col items-end">
                                        <span className={cn(
                                            "text-lg font-black",
                                            index === 0 ? "text-yellow-600" :
                                                index === 1 ? "text-gray-500" :
                                                    index === 2 ? "text-amber-700" : "text-primary"
                                        )}>
                                            {item.score}
                                        </span>
                                        <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                                            Points
                                        </span>
                                    </div>
                                </div>
                            ))}

                            {/* Empty State */}
                            {items.length === 0 && (
                                <div className="text-center py-20 text-muted-foreground">
                                    <p>No rankings yet.</p>
                                    <p className="text-sm opacity-70">Be the first to post!</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
