import { useState, useRef, useEffect } from 'react';
import { MainHeader } from '@/components/MainHeader';
import { FilterChip } from '@/components/FilterChip';
import { useSmartScroll } from '@/hooks/useSmartScroll';
import { User as UserIcon, ChevronRight } from 'lucide-react';
import { cn, calculateTasteMatch, getTasteBadgeStyle } from '@/lib/utils';
import { API_BASE_URL } from '@/lib/api';
import { useNavigate } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { useTranslation } from 'react-i18next';
import { authFetch } from '@/lib/authFetch';
import { useUser } from '@/context/UserContext';


interface LeaderboardItem {
    rank: number;
    user: {
        id: number;
        nickname: string | null;
        account_id: string;
        profile_image: string | null;
        cluster_name?: string;
        taste_result?: { scores: Record<string, number> };
        group_id?: number;
        neighborhood_id?: number;
        neighborhood?: {
            localName: string;
            englishName: string | null;
            countryCode: string;
        } | null;
    };
    score: number;
    key?: string;
}


export const LeaderboardTab = ({ isEnabled }: { isEnabled?: boolean }) => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { user: currentUser } = useUser();

    // Smart Header State
    const containerRef = useRef<HTMLDivElement>(null);
    const { isVisible: isHeaderVisible, handleScroll: onSmartScroll } = useSmartScroll(containerRef);
    // Header height measurement
    const [headerHeight, setHeaderHeight] = useState(0);
    const measureHeader = (node: HTMLDivElement | null) => {
        if (node) {
            setHeaderHeight(node.offsetHeight);
        }
    };

    // Filter State
    const [filter, setFilter] = useState<'company' | 'neighborhood' | 'overall'>('company');

    // Data State
    const [items, setItems] = useState<LeaderboardItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [showSimilarOnly, setShowSimilarOnly] = useState(false);

    // Get user's group/neighborhood info (cached in UserContext)
    const userGroupName = currentUser?.group_name;
    const userNeighborhood = currentUser?.neighborhood;
    const hasGroup = !!userGroupName;
    const hasNeighborhood = !!userNeighborhood;

    // Determine selectedKey based on user's registration
    // For neighborhood, use the full key format "KR:경기도 성남시" for API query
    const selectedKey = filter === 'overall' ? null : (filter === 'company' ? userGroupName : userNeighborhood?.value);

    // Fetch leaderboard when filter or user changes
    useEffect(() => {
        // For overall, we don't need a key
        // For company/neighborhood, we need the user's group/neighborhood
        if (!isEnabled) {
            setLoading(false);
            setItems([]);
            return;
        }

        if (filter !== 'overall' && !selectedKey) {
            setLoading(false);
            setItems([]);
            return;
        }

        const fetchData = async () => {
            setLoading(true);
            try {
                let url = `${API_BASE_URL}/api/users/leaderboard?filter=${filter}`;
                if (selectedKey) {
                    url += `&key=${encodeURIComponent(selectedKey)}`;
                }
                const res = await authFetch(url);

                if (res.ok) {
                    const data = await res.json();
                    setItems(data);
                }
            } catch (error) {
                console.error("Failed to load data", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [isEnabled, filter, selectedKey]);

    const handleScroll = () => {
        onSmartScroll();
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
            return match >= 70;
        })
        : items;

    return (
        <div className="flex flex-col h-full bg-background relative overflow-hidden">
            {/* Smart Header */}
            <MainHeader
                ref={measureHeader}
                title={t('leaderboard.title')}
                isVisible={isHeaderVisible}
            />

            {/* Content */}
            <main
                ref={containerRef}
                className="flex-1 overflow-y-auto pb-20"
                data-scroll-container="true"
                onScroll={handleScroll}
                style={{ paddingTop: headerHeight }}
            >
                <div
                    className={cn("px-5 mb-4 pb-20")}
                >


                    {/* Filter Chips */}
                    <div className="flex flex-col gap-4 mb-6">
                        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                            <FilterChip
                                label={userGroupName || t('leaderboard.my_group')}
                                isActive={filter === 'company'}
                                onClick={() => setFilter('company')}
                            />
                            <FilterChip
                                label={userNeighborhood?.localName || t('leaderboard.my_neighborhood')}
                                isActive={filter === 'neighborhood'}
                                onClick={() => setFilter('neighborhood')}
                            />
                            <FilterChip
                                label={t('leaderboard.filter_overall')}
                                isActive={filter === 'overall'}
                                onClick={() => setFilter('overall')}
                            />
                        </div>

                        {/* Registration Prompt */}
                        {!loading && filter === 'company' && !hasGroup && (
                            <button
                                onClick={() => navigate('/profile/group')}
                                className="flex items-center justify-between p-4 bg-muted/30 rounded-lg text-left hover:bg-muted/50 transition-colors"
                            >
                                <div>
                                    <p className="text-sm text-muted-foreground">
                                        {t('leaderboard.no_company_registered')}
                                    </p>
                                    <p className="text-sm text-primary font-medium mt-1">
                                        {t('leaderboard.register_company')}
                                    </p>
                                </div>
                                <ChevronRight className="w-5 h-5 text-muted-foreground" />
                            </button>
                        )}

                        {!loading && filter === 'neighborhood' && !hasNeighborhood && (
                            <button
                                onClick={() => navigate('/profile/neighborhood')}
                                className="flex items-center justify-between p-4 bg-muted/30 rounded-lg text-left hover:bg-muted/50 transition-colors"
                            >
                                <div>
                                    <p className="text-sm text-muted-foreground">
                                        {t('leaderboard.no_neighborhood_registered')}
                                    </p>
                                    <p className="text-sm text-primary font-medium mt-1">
                                        {t('leaderboard.register_neighborhood')}
                                    </p>
                                </div>
                                <ChevronRight className="w-5 h-5 text-muted-foreground" />
                            </button>
                        )}

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
                                {t('leaderboard.show_similar_only')}
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
                                            "flex items-center gap-4 p-4 rounded-xl transition-all cursor-pointer hover:bg-muted/50",
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
            </main>
        </div>
    );
};
