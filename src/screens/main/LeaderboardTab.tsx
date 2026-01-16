
import { useState, useRef, useEffect } from 'react';
import { User as UserIcon } from 'lucide-react';
import { cn, calculateTasteMatch, getTasteBadgeStyle } from '@/lib/utils';
import { API_BASE_URL } from '@/lib/api';
import { useNavigate } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { useTranslation } from 'react-i18next';

interface LeaderboardItem {
    rank: number;
    user: {
        id: number;
        nickname: string | null;
        account_id: string;
        profile_image: string | null;
        cluster_name?: string;
        taste_result?: { scores: Record<string, number> };
    };
    score: number;
}

import { UserService } from '@/services/UserService';

export const LeaderboardTab = ({ isEnabled }: { isEnabled?: boolean }) => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    // Smart Header State
    const [isHeaderVisible, setIsHeaderVisible] = useState(true);
    const lastScrollY = useRef(0);
    const containerRef = useRef<HTMLDivElement>(null);
    const headerRef = useRef<HTMLDivElement>(null);


    // Filter State (Mock)
    const [filter, setFilter] = useState<'company' | 'neighborhood'>('company');

    // Data State
    const [items, setItems] = useState<LeaderboardItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [showSimilarOnly, setShowSimilarOnly] = useState(false);

    useEffect(() => {
        if (!isEnabled) return;

        const fetchData = async () => {
            setLoading(true);
            try {
                const [leaderboardRes, user] = await Promise.all([
                    fetch(`${API_BASE_URL}/api/users/leaderboard?filter=${filter}`),
                    UserService.getCurrentUser()
                ]);

                if (leaderboardRes.ok) {
                    const data = await leaderboardRes.json();
                    setItems(data);
                }
                setCurrentUser(user);
            } catch (error) {
                console.error("Failed to load data", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [isEnabled, filter]);

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

    const getRankStyle = (index: number) => {
        switch (index) {
            case 0: return "text-yellow-600 font-black text-xl";
            case 1: return "text-gray-500 font-black text-xl";
            case 2: return "text-amber-800 font-black text-xl";
            default: return "text-muted-foreground font-bold text-lg";
        }
    };

    // Filter Items Client-side for Similarity
    const displayedItems = showSimilarOnly && currentUser?.taste_result?.scores
        ? items.filter(item => {
            if (!item.user.taste_result?.scores) return false;
            const match = calculateTasteMatch(currentUser.taste_result.scores, item.user.taste_result.scores);
            return match >= 60;
        })
        : items;

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
                    <h1 className="text-2xl font-bold">{t('leaderboard.title')}</h1>
                    <div className="flex gap-4">
                        {/* Icons */}
                    </div>
                </div>
            </div>

            {/* Content */}
            <div
                ref={containerRef}
                className="flex-1 overflow-y-auto"
                onScroll={handleScroll}
            // style={{ paddingTop: headerHeight }} // Removed unreliable JS padding
            >
                <div className="p-4 pt-20 mb-4 pb-20"> {/* Adjusted pt-28 -> pt-20 */}

                    {/* Filter Chips & Similarity Toggle */}
                    <div className="flex flex-col gap-4 mb-6">
                        <div className="flex gap-2">
                            <button
                                onClick={() => setFilter('company')}
                                className={cn(
                                    "px-4 py-1.5 rounded-full text-sm font-bold transition-colors border",
                                    filter === 'company'
                                        ? "bg-primary text-secondary border-primary"
                                        : "bg-background text-muted-foreground border-border hover:bg-muted"
                                )}
                            >
                                회사
                            </button>
                            <button
                                onClick={() => setFilter('neighborhood')}
                                className={cn(
                                    "px-4 py-1.5 rounded-full text-sm font-bold transition-colors border",
                                    filter === 'neighborhood'
                                        ? "bg-primary text-secondary border-primary"
                                        : "bg-background text-muted-foreground border-border hover:bg-muted"
                                )}
                            >
                                지역
                            </button>
                        </div>

                        <label className="flex items-center gap-2 cursor-pointer group">
                            <div
                                onClick={() => setShowSimilarOnly(!showSimilarOnly)}
                                className={cn(
                                    "w-5 h-5 rounded border flex items-center justify-center transition-all",
                                    showSimilarOnly ? "bg-primary border-primary" : "border-gray-300 bg-white"
                                )}
                            >
                                {showSimilarOnly && <div className="w-2.5 h-2.5 bg-white rounded-sm" />}
                            </div>
                            <span className="text-sm font-bold text-gray-700 group-hover:text-gray-900 transition-colors">
                                내 입맛과 비슷한 사람만 보기
                            </span>
                        </label>
                    </div>

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
                            {displayedItems.map((item) => {
                                // Find actual global rank (since items is ordered by score)
                                const globalIndex = items.findIndex(it => it.user.id === item.user.id);

                                return (
                                    <div
                                        key={item.user.id}
                                        className={cn(
                                            "flex items-center gap-4 p-4 rounded-xl transition-all cursor-pointer hover:bg-muted/50 border border-transparent shadow-sm",
                                            globalIndex === 0 ? "bg-[#FFFBEB] border-yellow-100" :
                                                globalIndex === 1 ? "bg-[#F9FAFB] border-gray-100" :
                                                    globalIndex === 2 ? "bg-[#FFF7ED] border-orange-100" : "bg-white"
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
                                            <span className={getRankStyle(globalIndex)}>{globalIndex + 1}</span>
                                        </div>

                                        {/* Profile Image */}
                                        <div className="relative flex-shrink-0">
                                            <div className={cn(
                                                "w-12 h-12 rounded-full overflow-hidden border-2 shadow-sm",
                                                globalIndex === 0 ? "border-yellow-400" :
                                                    globalIndex === 1 ? "border-gray-300" :
                                                        globalIndex === 2 ? "border-orange-300" : "border-transparent bg-muted"
                                            )}>
                                                {item.user.profile_image ? (
                                                    <img src={item.user.profile_image} alt={item.user.nickname || "User"} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center bg-muted text-muted-foreground">
                                                        <UserIcon className="w-6 h-6 opacity-30" />
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Info */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <h3 className="font-bold text-base truncate">
                                                    {item.user.nickname || "User"}
                                                </h3>
                                                {item.user.cluster_name && (
                                                    (() => {
                                                        const matchScore = (currentUser?.taste_result?.scores && item.user.taste_result?.scores)
                                                            ? calculateTasteMatch(currentUser.taste_result.scores, item.user.taste_result.scores)
                                                            : null;

                                                        return (
                                                            <span className={cn(
                                                                "text-[10px] truncate flex-shrink-0 transition-colors px-1.5 py-0.5 rounded-md",
                                                                getTasteBadgeStyle(matchScore)
                                                            )}>
                                                                {item.user.cluster_name}
                                                            </span>
                                                        );
                                                    })()
                                                )}
                                            </div>
                                            <p className="text-xs text-muted-foreground truncate">
                                                @{item.user.account_id}
                                            </p>
                                        </div>

                                        {/* Score */}
                                        <div className="flex flex-col items-end flex-shrink-0">
                                            <span className={cn(
                                                "text-lg font-black",
                                                globalIndex === 0 ? "text-yellow-600" :
                                                    globalIndex === 1 ? "text-gray-600" :
                                                        globalIndex === 2 ? "text-orange-600" : "text-primary"
                                            )}>
                                                {item.score}
                                            </span>
                                            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                                                {t('leaderboard.points')}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}

                            {/* Empty State */}
                            {displayedItems.length === 0 && (
                                <div className="text-center py-20 text-muted-foreground">
                                    <p>{t('leaderboard.empty_title')}</p>
                                    <p className="text-sm opacity-70">{t('leaderboard.empty_desc')}</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
