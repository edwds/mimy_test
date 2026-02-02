import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Link as LinkIcon, Grid, List, Loader2, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useNavigate, useSearchParams, useParams } from 'react-router-dom';
import { API_BASE_URL } from '@/lib/api';
import { cn } from '@/lib/utils';
import { ContentCard } from '@/components/ContentCard';
import { ShopCard } from '@/components/ShopCard';
import { ListCard } from '@/components/ListCard';
import { useUser } from '@/context/UserContext';
import { useRanking } from '@/context/RankingContext';
import { User } from '@/context/UserContext';
import { TasteProfileSheet } from '@/components/TasteProfileSheet';
import { useTranslation } from 'react-i18next';
import { authFetch } from '@/lib/authFetch';
import { ProfileHeader } from '@/components/ProfileHeader';

type ProfileTabType = "content" | "list" | "saved";

interface Props {
    userId?: string;
    refreshTrigger?: number;
}

export const UserProfileScreen = ({ userId: propUserId }: Props) => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const params = useParams();
    const userId = propUserId || params.userId;
    const { user: currentUser } = useUser(); // Me
    const { registerCallback, unregisterCallback } = useRanking();
    const [searchParams] = useSearchParams();
    const [rankingRefreshTrigger, setRankingRefreshTrigger] = useState(0);
    const lastUpdateDataRef = useRef<{ shopId: number; my_review_stats: any } | null>(null);

    // Target User State
    const [user, setUser] = useState<User | null>(null);
    const [loadingUser, setLoadingUser] = useState(true);

    // Tab State
    const initialTab = searchParams.get('tab') as ProfileTabType || "content";
    const [activeTab, setActiveTab] = useState<ProfileTabType>(initialTab);

    // Matching State
    const [matchingScore, setMatchingScore] = useState<number | null>(null);

    // Follow State
    const [isFollowing, setIsFollowing] = useState(false);
    const [followLoading, setFollowLoading] = useState(false);

    // Taste Sheet
    const [isTasteSheetOpen, setIsTasteSheetOpen] = useState(false);

    // Initial Fetch
    useEffect(() => {
        const fetchUser = async () => {
            if (!userId) return;
            // If viewing self, redirect to main profile
            // Check both numeric ID match and account_id match
            if (currentUser && (String(currentUser.id) === userId || currentUser.account_id === userId)) {
                // Preserve existing params (like viewListUser) when redirecting
                // except viewUser which we want to drop since we are going to native profile tab
                const newParams = new URLSearchParams(searchParams);
                newParams.delete('viewUser');
                navigate({ pathname: '/main/profile', search: newParams.toString() }, { replace: true });
                return;
            }

            setLoadingUser(true);
            try {
                const res = await authFetch(`${API_BASE_URL}/api/users/${userId}?viewerId=${currentUser?.id}`);
                if (res.ok) {
                    const data = await res.json();
                    setUser(data);
                    setIsFollowing(data.is_following);
                } else {
                    // Handle error (e.g. 404)
                    alert(t('profile.user_not_found'));
                    navigate(-1);
                }
            } catch (e) {
                console.error(e);
            } finally {
                setLoadingUser(false);
            }
        };
        fetchUser();
    }, [userId, currentUser, navigate]);

    // Calculate Matching Score
    useEffect(() => {
        if (!user || !currentUser || !user.taste_result || !currentUser.taste_result) {
            setMatchingScore(null);
            return;
        }

        try {
            // Formula from request:
            // Range -2 to +2 (width 4). 7 dimensions.
            // Max Dist = sqrt(4^2 * 7) = sqrt(16 * 7) = sqrt(112) ≈ 10.583

            // Assuming taste_result is stored as { scores: { umami: number, ... } }
            // need to cast to any because taste_result is jsonb
            const myScores = (currentUser as any).taste_result?.scores || {};
            const targetScores = (user as any).taste_result?.scores || {};

            const keys = ['umami', 'acidity', 'boldness', 'richness', 'spiciness', 'sweetness', 'experimental'];
            let sumSqDiff = 0;

            keys.forEach(key => {
                const v1 = Number(myScores[key] || 0);
                const v2 = Number(targetScores[key] || 0);
                sumSqDiff += Math.pow(v1 - v2, 2);
            });

            const distance = Math.sqrt(sumSqDiff);
            const maxDistance = Math.sqrt(16 * 7); // ~10.58

            let similarity = (1 - (distance / maxDistance)) * 100;
            similarity = Math.max(0, Math.min(100, similarity)); // Clamp 0-100

            setMatchingScore(Math.round(similarity));

        } catch (e) {
            console.error("Error calculating matching score", e);
            setMatchingScore(null);
        }

    }, [user, currentUser]);

    // Sync URL tab
    useEffect(() => {
        const tab = searchParams.get('tab') as ProfileTabType;
        if (tab) setActiveTab(tab);
    }, [searchParams]);


    // Follow Handler
    const handleFollow = async () => {
        if (!user || !currentUser || followLoading) return;
        setFollowLoading(true);

        // Optimistic Update
        const prevFollowing = isFollowing;
        const prevCount = user.stats?.follower_count || 0;

        setIsFollowing(!prevFollowing);
        setUser(prev => prev ? {
            ...prev,
            stats: {
                ...prev.stats!,
                follower_count: prevFollowing ? prevCount - 1 : prevCount + 1
            }
        } : null);

        try {
            const res = await authFetch(`${API_BASE_URL}/api/users/${user.id}/follow`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ followerId: currentUser.id })
            });
            const data = await res.json();
            if (data.following !== (!prevFollowing)) {
                // Revert if mismatch (shouldn't happen often)
                setIsFollowing(data.following);
            }
        } catch (error) {
            console.error(error);
            // Revert
            setIsFollowing(prevFollowing);
            setUser(prev => prev ? {
                ...prev,
                stats: {
                    ...prev.stats!,
                    follower_count: prevCount
                }
            } : null);
        } finally {
            setFollowLoading(false);
        }
    };


    // Content State
    const [contents, setContents] = useState<any[]>([]);
    const [loadingContent, setLoadingContent] = useState(false);
    const [contentPage, setContentPage] = useState(1);
    const [hasMoreContent, setHasMoreContent] = useState(true);
    const [isFetchingMore, setIsFetchingMore] = useState(false);

    // Lists State
    const [lists, setLists] = useState<any[]>([]);
    const [loadingLists, setLoadingLists] = useState(false);

    // Initial Fetch & Reset
    useEffect(() => {
        setContentPage(1);
        setContents([]);
        setHasMoreContent(true);
    }, [userId, activeTab]);

    useEffect(() => {
        const fetchContent = async () => {
            const targetId = user?.id || userId;
            if (!targetId || activeTab !== 'content') return;
            if (!hasMoreContent && contentPage > 1) return;

            // Prevent double fetch
            if (contentPage === 1) setLoadingContent(true);
            else setIsFetchingMore(true);

            try {
                const response = await authFetch(`${API_BASE_URL}/api/content/user/${targetId}?user_id=${currentUser?.id || ''}&page=${contentPage}&limit=20`);
                if (response.ok) {
                    const data = await response.json();
                    if (data.length < 20) setHasMoreContent(false);

                    setContents(prev => contentPage === 1 ? data : [...prev, ...data]);
                }
            } catch (error) {
                console.error("Failed to load content", error);
            } finally {
                setLoadingContent(false);
                setIsFetchingMore(false);
            }
        };
        fetchContent();
    }, [userId, activeTab, contentPage, user]); // currentUser dependency removed to avoid re-fetch flickers, tricky but safer for stability logic

    const loadMoreContent = () => {
        if (!loadingContent && !isFetchingMore && hasMoreContent) {
            setContentPage(prev => prev + 1);
        }
    };

    // Ranking Update Callback
    useEffect(() => {
        const handleRankingUpdate = (data: { shopId: number; my_review_stats: any }) => {
            console.log('[UserProfileScreen] Ranking updated:', data);
            lastUpdateDataRef.current = data;
            setRankingRefreshTrigger(prev => prev + 1);
        };

        registerCallback('UserProfileScreen', handleRankingUpdate);

        return () => {
            unregisterCallback('UserProfileScreen');
        };
    }, [registerCallback, unregisterCallback]);

    // Handle ranking refresh trigger - Optimistic update
    useEffect(() => {
        if (rankingRefreshTrigger > 0 && lastUpdateDataRef.current) {
            const { shopId, my_review_stats } = lastUpdateDataRef.current;
            console.log('[UserProfileScreen] ⚡ Optimistic update for shop:', shopId);

            if (activeTab === 'content') {
                // Update contents array - POI or review_prop
                setContents(prevContents => prevContents.map(item => {
                    if (item.poi?.shop_id === shopId) {
                        return {
                            ...item,
                            poi: {
                                ...item.poi,
                                my_review_stats
                            }
                        };
                    }
                    if (item.review_prop?.shop_id === shopId) {
                        return {
                            ...item,
                            review_prop: {
                                ...item.review_prop,
                                my_review_stats
                            }
                        };
                    }
                    return item;
                }));
            } else if (activeTab === 'saved') {
                // Update commonShops array
                setCommonShops(prevShops => prevShops.map(shop =>
                    shop.id === shopId
                        ? { ...shop, my_review_stats }
                        : shop
                ));
            }
        }
    }, [rankingRefreshTrigger, activeTab]);

    // Saved (Wants to go) - Overlap Logic
    const [commonShops, setCommonShops] = useState<any[]>([]);
    const [loadingSaved, setLoadingSaved] = useState(false);
    // Only show tab if there are overlapping items? 
    // Wait, we need to fetch them to know if there are overlapping items.
    // So we might always show the tab but content depends on overlap.
    // OR we fetch metadata early. For now, let's fetch when tab is active or just check counts?
    // User request: "wants to go만 나랑 겹치는게 있으면 노출해는거야" -> If there are overlapping items, show them.

    useEffect(() => {
        const fetchCommonSaved = async () => {
            if (!user?.id || !currentUser?.id || activeTab !== 'saved') return;

            setLoadingSaved(true);
            try {
                // Fetch target user's saved list
                const resTarget = await authFetch(`${API_BASE_URL}/api/users/${user.id}/saved_shops`);
                const targetSaved = await resTarget.json();

                // Fetch my saved list
                const resMe = await authFetch(`${API_BASE_URL}/api/users/${currentUser.id}/saved_shops`);
                const mySaved = await resMe.json();

                if (Array.isArray(targetSaved) && Array.isArray(mySaved)) {
                    const myIds = new Set(mySaved.map((s: any) => s.id));
                    const common = targetSaved.filter((s: any) => myIds.has(s.id));
                    setCommonShops(common);
                }
            } catch (error) {
                console.error("Failed to load common shops", error);
            } finally {
                setLoadingSaved(false);
            }
        };

        fetchCommonSaved();
    }, [user?.id, currentUser?.id, activeTab]);

    // Fetch Lists
    useEffect(() => {
        const fetchLists = async () => {
            const targetId = user?.id || userId;
            if (!targetId || activeTab !== 'list') return;

            setLoadingLists(true);
            try {
                const response = await authFetch(`${API_BASE_URL}/api/users/${targetId}/lists`);
                if (response.ok) {
                    const data = await response.json();
                    setLists(data);
                }
            } catch (error) {
                console.error("Failed to load lists", error);
            } finally {
                setLoadingLists(false);
            }
        };

        fetchLists();
    }, [userId, user?.id, activeTab]);

    // Header & Scroll Logic
    const [headerHeight, setHeaderHeight] = useState(0);
    const measureHeader = (node: HTMLDivElement | null) => {
        if (node) setHeaderHeight(node.offsetHeight);
    };

    const containerRef = useRef<HTMLDivElement>(null);
    const scrollPositions = useRef<{ [key: string]: number }>({});
    const [isHeaderVisible] = useState(true);

    const handleScroll = () => {
        if (containerRef.current) {
            const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
            if (scrollHeight - scrollTop <= clientHeight + 300) { // Load more when near bottom (300px buffer)
                if (activeTab === 'content') {
                    loadMoreContent();
                }
            }
        }
    };

    const handleTabChange = (newTab: ProfileTabType) => {
        if (containerRef.current) {
            scrollPositions.current[activeTab] = containerRef.current.scrollTop;
        }
        setActiveTab(newTab);
        requestAnimationFrame(() => {
            if (containerRef.current) {
                const savedPos = scrollPositions.current[newTab] || 0;
                containerRef.current.scrollTo({ top: savedPos, behavior: 'instant' });
            }
        });
    };

    if (!user && !loadingUser) return <div>{t('profile.user_not_found')}</div>;

    return (
        <div className="flex flex-col h-full bg-background relative max-w-[448px] mx-auto">

            {/* Header */}
            <ProfileHeader
                ref={measureHeader}
                title={
                    loadingUser ? (
                        <Skeleton className="h-4 w-24" />
                    ) : (
                        `@${user?.account_id}`
                    )
                }
                onBack={() => {
                    console.log('[UserProfileScreen] Back button clicked');
                    if (window.history.length > 1) {
                        navigate(-1);
                    } else {
                        navigate('/main/profile', { replace: true });
                    }
                }}
                rightAction={
                    <Button
                        size="sm"
                        variant={isFollowing ? "outline" : "default"}
                        className={cn(
                            "h-8 px-4 rounded-full text-xs font-semibold shadow-sm transition-all",
                            isFollowing
                                ? "border-gray-200 text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                                : "bg-gray-900 text-white hover:bg-gray-800"
                        )}
                        onClick={handleFollow}
                        disabled={followLoading}
                    >
                        {isFollowing ? t('profile.following') : t('profile.follow')}
                    </Button>
                }
                isVisible={isHeaderVisible}
            />

            <main
                ref={containerRef}
                className="flex-1 overflow-y-auto"
                data-scroll-container="true"
                onScroll={handleScroll}
                style={{ paddingTop: headerHeight }}
            >
                {/* Top Area */}
                <div
                    className={cn("p-5 pb-2 relative")}
                >
                    <div className="flex justify-between items-start mb-6">
                        {/* Info */}
                        <div className="flex-1 pr-4 flex flex-col min-w-0">
                            <div className="flex items-baseline gap-2 mb-1 min-w-0">
                                {loadingUser ? (
                                    <Skeleton className="h-8 w-32" />
                                ) : (
                                    <h1 className="text-2xl font-bold truncate">{user?.nickname || "No Name"}</h1>
                                )}
                            </div>

                            {/* Stats */}
                            <div className="flex gap-4 mb-4">
                                {loadingUser ? (
                                    <Skeleton className="h-4 w-32" />
                                ) : (
                                    <>
                                        <div className="flex items-baseline gap-1">
                                            <span className="font-bold">{user?.stats?.content_count || 0}</span>
                                            <span className="text-sm text-muted-foreground">{t('profile.stats.contents')}</span>
                                        </div>
                                        <div className="flex items-baseline gap-1">
                                            <span className="font-bold">{user?.stats?.follower_count || 0}</span>
                                            <span className="text-sm text-muted-foreground">{t('profile.stats.followers')}</span>
                                        </div>
                                    </>
                                )}
                            </div>

                            {loadingUser ? (
                                <div className="space-y-1">
                                    <Skeleton className="h-4 w-full" />
                                    <Skeleton className="h-4 w-2/3" />
                                </div>
                            ) : (
                                <>
                                    {user?.bio ? (
                                        <p className="text-base whitespace-pre-wrap mb-2 line-clamp-3">{user.bio}</p>
                                    ) : (
                                        <p className="text-base text-gray-400 mb-2">{t('profile.no_bio')}</p>
                                    )}
                                    {user?.link && (
                                        <a href={user.link} target="_blank" rel="noreferrer" className="flex items-center text-sm text-primary hover:underline">
                                            <LinkIcon className="w-3 h-3 mr-1 flex-shrink-0" />
                                            <span className="truncate max-w-[200px]">{user.link.replace(/^(https?:\/\/)?(www\.)?/, '')}</span>
                                        </a>
                                    )}
                                </>
                            )}
                        </div>

                        {/* Image */}
                        <div className="relative group flex-shrink-0 ml-4">
                            <div className="w-24 h-24 rounded-full bg-muted overflow-hidden flex items-center justify-center">
                                {loadingUser ? (
                                    <Skeleton className="w-full h-full" />
                                ) : (
                                    user?.profile_image ? (
                                        <img src={user.profile_image} alt="Profile" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-2xl">😊</div>
                                    )
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Taste Cluster & Matching Score */}
                    {user?.cluster_name && (
                        <div className="flex gap-2">
                            <div
                                className="flex-1 px-6 py-4 bg-[linear-gradient(135deg,_#FDFBF7_0%,_#F5F3FF_100%)] rounded-2xl flex items-center justify-between cursor-pointer"
                                onClick={() => setIsTasteSheetOpen(true)}
                            >
                                <div>
                                    <div className="font-bold text-base text-foreground mb-1">{user.cluster_name}</div>
                                    <div className="text-sm text-muted-foreground line-clamp-2">{user.cluster_tagline}</div>
                                </div>
                            </div>


                            {/* Matching Score Badge */}
                            {matchingScore !== null && (
                                <div className="flex flex-col items-center justify-center p-2 bg-pink-50 rounded-xl min-w-[80px]">
                                    <span className="text-xs text-pink-500 font-bold uppercase">{t('profile.match')}</span>
                                    <span className="text-xl font-black text-pink-600">{matchingScore}%</span>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Tabs */}
                <div className="bg-background sticky top-0 z-10 border-b border-border/50 mb-2">
                    <div className="flex w-full px-0">
                        <TabButton active={activeTab === "content"} onClick={() => handleTabChange("content")} icon={<Grid className="w-4 h-4" />} label={t('profile.tabs.content')} />
                        <TabButton active={activeTab === "list"} onClick={() => handleTabChange("list")} icon={<List className="w-4 h-4" />} label={t('profile.tabs.list')} />
                        <TabButton active={activeTab === "saved"} onClick={() => handleTabChange("saved")} icon={<Users className="w-4 h-4" />} label={t('profile.tabs.shared')} />
                    </div>
                </div>

                <div className="min-h-[300px] bg-muted/5">
                    {activeTab === "content" && (
                        <div className="pb-20">
                            {contents.map((content: any) => (
                                <div key={content.id} className="mb-8">
                                    <ContentCard
                                        user={{
                                            id: user?.id || 0,
                                            nickname: user?.nickname || "User",
                                            account_id: user?.account_id || "",
                                            profile_image: user?.profile_image || null
                                        }}
                                        content={content}
                                    />
                                </div>
                            ))}
                            {!loadingContent && contents.length === 0 && (
                                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                                    <Grid className="w-10 h-10 mb-2 opacity-20" />
                                    <p className="text-sm">{t('profile.empty.content')}</p>
                                </div>
                            )}
                            {isFetchingMore && (
                                <div className="flex justify-center py-4">
                                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === "list" && (
                        <div className="pb-20 px-5 pt-4">


                            {lists.map((list) => (
                                <ListCard
                                    key={list.id}
                                    id={list.id}
                                    type={list.type}
                                    title={list.title}
                                    count={list.count}
                                    updatedAt={list.updated_at}
                                    author={list.author}
                                    onPress={() => {
                                        // Navigate to details
                                        // Navigate to details via Overlay (query params)
                                        const newParams = new URLSearchParams(searchParams);
                                        const targetId = user?.id || userId;

                                        // Explicitly ensure viewUser is preserved/set
                                        // This prevents the background profile from unmounting if it was somehow lost
                                        if (targetId) {
                                            newParams.set('viewUser', String(targetId));
                                        }

                                        newParams.set('viewListUser', String(targetId));
                                        newParams.set('type', list.type);
                                        if (list.value) newParams.set('value', list.value);
                                        if (list.title) newParams.set('title', list.title);

                                        navigate({ search: newParams.toString() });
                                    }}
                                />
                            ))}
                            {!loadingLists && lists.length === 0 && (
                                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                                    <List className="w-10 h-10 mb-2 opacity-20" />
                                    <p className="text-sm">{t('profile.empty.lists')}</p>
                                </div>
                            )}
                            {loadingLists && (
                                <div className="flex justify-center py-20">
                                    <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === "saved" && (
                        <div className="pb-20 px-5 pt-4">
                            {loadingSaved ? (
                                <div className="flex justify-center py-20">
                                    <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                                </div>
                            ) : (
                                <>
                                    {commonShops.length > 0 ? (
                                        <>
                                            <div
                                                className="mb-4 text-sm text-muted-foreground"
                                                dangerouslySetInnerHTML={{
                                                    __html: t('profile.shared_count', { count: commonShops.length })
                                                }}
                                            />
                                            {commonShops.map((shop: any) => (
                                                <ShopCard
                                                    key={shop.id}
                                                    shop={shop}
                                                // Viewer cannot unsave from here, just view.
                                                />
                                            ))}
                                        </>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                                            <MapPin className="w-10 h-10 mb-2 opacity-20" />
                                            <p className="text-sm">{t('profile.empty.shared')}</p>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    )}

                </div>
            </main >

            <TasteProfileSheet
                isOpen={isTasteSheetOpen}
                onClose={() => setIsTasteSheetOpen(false)}
                data={user ? { cluster_name: user.cluster_name || "", cluster_tagline: user.cluster_tagline || "" } : null}
                userId={user?.id}
            />
        </div >
    );
};

const TabButton = ({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) => (
    <button
        onClick={onClick}
        className={`flex-1 py-3 text-sm font-medium transition-all relative flex items-center justify-center gap-1.5 ${active
            ? "text-foreground"
            : "text-muted-foreground hover:text-foreground/80"
            }`}
    >
        {icon}
        <span>{label}</span>
        {active && (
            <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-black dark:bg-white rounded-t-full" />
        )}
    </button>
);
