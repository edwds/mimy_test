import React, { useEffect, useRef, useState } from 'react';
import { MainHeader } from '@/components/MainHeader';
import { useSmartScroll } from '@/hooks/useSmartScroll';
import { Link as LinkIcon, Edit2, List, Settings, Loader2, ListOrdered, CloudDownload, Grid, Bookmark, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { API_BASE_URL } from '@/lib/api';
import { cn } from '@/lib/utils';
import { ContentCard } from '@/components/ContentCard';
import { ShopCard } from '@/components/ShopCard';
import { useUser } from '@/context/UserContext';
import { useRanking } from '@/context/RankingContext';
import { TasteProfileSheet } from '@/components/TasteProfileSheet';
import { ListCard } from '@/components/ListCard';
import { TimelineView } from '@/components/TimelineView';
import { useTranslation } from 'react-i18next';
import { authFetch } from '@/lib/authFetch';
import { ShopInfoCard } from '@/components/ShopInfoCard';
import { RankingBadge } from '@/components/RankingBadge';
import { getTasteType, getTasteTypeProfile } from '@/lib/tasteType';

type ProfileTabType = 'timeline' | 'content' | 'list' | 'saved';

interface ProfileScreenProps {
    refreshTrigger?: number;
    isEnabled?: boolean;
}

export const ProfileScreen = ({ refreshTrigger, isEnabled = true }: ProfileScreenProps) => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { user, loading, savedShops: contextSavedShops, refreshSavedShops, contentVersion } = useUser();
    const { registerCallback, unregisterCallback } = useRanking();
    const [rankingRefreshTrigger, setRankingRefreshTrigger] = useState(0);
    const lastUpdateDataRef = useRef<{ shopId: number; my_review_stats: any } | null>(null);
    const [searchParams] = useSearchParams();

    // Tabs
    const initialTab = (searchParams.get('tab') as ProfileTabType) || 'timeline';
    const [activeTab, setActiveTab] = useState<ProfileTabType>(initialTab);

    useEffect(() => {
        const tab = searchParams.get('tab') as ProfileTabType;
        if (tab) setActiveTab(tab);
    }, [searchParams]);

    // Menu & Sheets
    // Data
    const [contents, setContents] = useState<any[]>([]);
    const [loadingContent, setLoadingContent] = useState(false);
    const [contentPage, setContentPage] = useState(1);
    const [hasMoreContent, setHasMoreContent] = useState(true);
    const [isFetchingMore, setIsFetchingMore] = useState(false);
    const [isTasteSheetOpen, setIsTasteSheetOpen] = useState(false);

    const [lists, setLists] = useState<any[]>([]);
    const [loadingLists, setLoadingLists] = useState(false);
    const [currentRankings, setCurrentRankings] = useState<any[]>([]);
    const [loadingRankings, setLoadingRankings] = useState(false);

    const [savedShops, setSavedShops] = useState<any[]>(contextSavedShops);
    const [loadingSaved, setLoadingSaved] = useState(false);

    // Scroll + Header
    const containerRef = useRef<HTMLDivElement>(null);
    const { isVisible: isHeaderVisible, setIsVisible: setIsHeaderVisible, handleScroll: onSmartScroll } = useSmartScroll(containerRef);

    // Header height measurement
    const [headerHeight, setHeaderHeight] = useState(0);
    const measureHeader = (node: HTMLDivElement | null) => {
        if (node) {
            setHeaderHeight(node.offsetHeight);
        }
    };

    // Track if data has been loaded to avoid refetching on tab switch
    const contentLoadedRef = useRef(false);
    const listsLoadedRef = useRef(false);
    const rankingsLoadedRef = useRef(false);

    // Reset all caches when user changes or new content is created
    useEffect(() => {
        contentLoadedRef.current = false;
        listsLoadedRef.current = false;
        rankingsLoadedRef.current = false;
        setContentPage(1);
        setContents([]);
        setHasMoreContent(true);
        setLists([]);
        setCurrentRankings([]);
    }, [user?.id, contentVersion]);

    // Reset caches on explicit refresh (same-tab tap)
    const prevRefreshTrigger = useRef(refreshTrigger);
    useEffect(() => {
        if (refreshTrigger === prevRefreshTrigger.current) return;
        prevRefreshTrigger.current = refreshTrigger;
        contentLoadedRef.current = false;
        listsLoadedRef.current = false;
        rankingsLoadedRef.current = false;
        setContentPage(1);
        setContents([]);
        setHasMoreContent(true);
        setLists([]);
        setCurrentRankings([]);
    }, [refreshTrigger]);

    // Fetch content (lazy: only when tab is active, cached: skip if already loaded)
    useEffect(() => {
        if (!user?.id || (activeTab !== 'content' && activeTab !== 'timeline')) return;
        if (contentLoadedRef.current && contentPage === 1) return;
        if (!hasMoreContent && contentPage > 1) return;

        const fetchContent = async () => {
            if (contentPage === 1) setLoadingContent(true);
            else setIsFetchingMore(true);

            try {
                const response = await authFetch(`${API_BASE_URL}/api/content/user/${user.id}?user_id=${user.id}&page=${contentPage}&limit=20`);
                if (response.ok) {
                    const data = await response.json();
                    if (data.length < 20) setHasMoreContent(false);
                    setContents(prev => contentPage === 1 ? data : [...prev, ...data]);
                    if (contentPage === 1) contentLoadedRef.current = true;
                }
            } catch (e) {
                console.error('Failed to load content', e);
            } finally {
                setLoadingContent(false);
                setIsFetchingMore(false);
            }
        };

        fetchContent();
    }, [user?.id, activeTab, contentPage, contentVersion]);

    const loadMoreContent = () => {
        if (!loadingContent && !isFetchingMore && hasMoreContent) {
            setContentPage(prev => prev + 1);
        }
    };

    // Fetch lists (lazy + cached)
    useEffect(() => {
        if (!user?.id || activeTab !== 'list') return;
        if (listsLoadedRef.current) return;

        const fetchLists = async () => {
            setLoadingLists(true);
            try {
                const response = await authFetch(`${API_BASE_URL}/api/users/${user.id}/lists`);
                if (response.ok) {
                    setLists(await response.json());
                    listsLoadedRef.current = true;
                }
            } catch (e) {
                console.error('Failed to load lists', e);
            } finally {
                setLoadingLists(false);
            }
        };

        fetchLists();
    }, [user?.id, activeTab, contentVersion]);

    // Fetch current rankings when list tab is active and ranking_count < 30 (lazy + cached)
    useEffect(() => {
        if (!user?.id || activeTab !== 'list') return;
        if ((user.stats?.ranking_count || 0) >= 30) return;
        if (rankingsLoadedRef.current) return;

        const fetchCurrentRankings = async () => {
            setLoadingRankings(true);
            try {
                const response = await authFetch(`${API_BASE_URL}/api/ranking/all`);
                if (response.ok) {
                    const rankings = await response.json();
                    setCurrentRankings(rankings);
                    rankingsLoadedRef.current = true;
                }
            } catch (e) {
                console.error('Failed to load current rankings', e);
            } finally {
                setLoadingRankings(false);
            }
        };

        fetchCurrentRankings();
    }, [user?.id, activeTab, contentVersion, user?.stats?.ranking_count]);

    // Sync with context savedShops
    useEffect(() => {
        setSavedShops(contextSavedShops);
    }, [contextSavedShops]);

    // Fetch saved shops
    useEffect(() => {
        // Only fetch if activeTab is 'saved' and we don't have data yet
        if (activeTab === 'saved' && contextSavedShops.length === 0 && !loadingSaved) {
            setLoadingSaved(true);
            refreshSavedShops().finally(() => setLoadingSaved(false));
        }
    }, [user?.id, activeTab]);

    // Ranking Update Callback
    useEffect(() => {
        if (!isEnabled) return;

        const handleRankingUpdate = (data: { shopId: number; my_review_stats: any }) => {
            console.log('[ProfileScreen] Ranking updated:', data);
            lastUpdateDataRef.current = data;
            setRankingRefreshTrigger(prev => prev + 1);
        };

        registerCallback('ProfileScreen', handleRankingUpdate);

        return () => {
            unregisterCallback('ProfileScreen');
        };
    }, [isEnabled]);

    // Handle ranking refresh trigger - Optimistic update
    useEffect(() => {
        if (rankingRefreshTrigger > 0 && lastUpdateDataRef.current) {
            const { shopId, my_review_stats } = lastUpdateDataRef.current;
            console.log('[ProfileScreen] ⚡ Optimistic update for shop:', shopId);

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
                // Update savedShops array
                setSavedShops(prevShops => prevShops.map(shop =>
                    shop.id === shopId
                        ? { ...shop, my_review_stats }
                        : shop
                ));
            }
        }
    }, [rankingRefreshTrigger, activeTab]);



    const handleScroll = () => {
        onSmartScroll();
        if (containerRef.current) {
            const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
            if (scrollHeight - scrollTop <= clientHeight + 300) {
                if (activeTab === 'content' || activeTab === 'timeline') {
                    loadMoreContent();
                }
            }
        }
    };

    const handleTabChange = (newTab: ProfileTabType) => {
        setActiveTab(newTab);
        setIsHeaderVisible(true);
    };

    const handleUnsave = async (shopId: number) => {
        // Optimistic update
        setSavedShops((prev) => prev.filter((s) => s.id !== shopId));

        try {
            const res = await authFetch(`${API_BASE_URL}/api/shops/${shopId}/save`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({}),
            });
            if (!res.ok) throw new Error('Unsave failed');

            // Refresh context data to keep it in sync
            await refreshSavedShops();
        } catch (e) {
            console.error(e);
            alert(t('profile.unsave_fail'));
            // Revert optimistic update on error
            await refreshSavedShops();
        }
    };

    const handleMemoChange = (shopId: number, memo: string) => {
        setSavedShops((prev) =>
            prev.map((s) => (s.id === shopId ? { ...s, memo } : s))
        );
    };

    const handleFolderChange = (shopId: number, folder: string) => {
        setSavedShops((prev) =>
            prev.map((s) => (s.id === shopId ? { ...s, folder } : s))
        );
    };

    if (loading) {
        return (
            <div className="flex flex-col h-full bg-background relative">
                <main className="flex-1 overflow-y-auto">
                    <div className="p-6 pt-14 pb-2 relative">
                        <div className="flex justify-between items-start mb-6">
                            <div className="flex-1 pr-4 flex flex-col min-w-0">
                                <Skeleton className="h-8 w-40 mb-2" />
                                <Skeleton className="h-4 w-24 mb-4" />
                                <div className="flex gap-4 mb-4">
                                    <Skeleton className="h-4 w-16" />
                                    <Skeleton className="h-4 w-16" />
                                </div>
                                <div className="space-y-1 mb-2">
                                    <Skeleton className="h-4 w-full" />
                                    <Skeleton className="h-4 w-2/3" />
                                </div>
                            </div>
                            <Skeleton className="w-20 h-20 rounded-full flex-shrink-0 ml-4" />
                        </div>

                        <Skeleton className="w-full h-20 rounded-xl mb-2" />
                    </div>

                    <div className="p-6 py-2 bg-background">
                        <div className="flex gap-2">
                            <Skeleton className="h-9 w-20 rounded-full" />
                            <Skeleton className="h-9 w-16 rounded-full" />
                            <Skeleton className="h-9 w-24 rounded-full" />
                        </div>
                    </div>

                    <div className="min-h-[300px] bg-muted/5 p-4 space-y-4">
                        <Skeleton className="h-64 w-full rounded-xl" />
                        <Skeleton className="h-64 w-full rounded-xl" />
                    </div>
                </main>
            </div>
        );
    }

    if (!user) return <div className="flex-1 flex items-center justify-center">{t('profile.user_not_found')}</div>;

    return (
        <div className="flex flex-col h-full bg-background relative overflow-hidden">
            {/* Smart Header (overlay) */}
            <MainHeader
                ref={measureHeader}
                title={`@${user.account_id}`}
                isVisible={isHeaderVisible}
                rightAction={
                    <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-full hover:bg-muted"
                        onClick={() => navigate('/profile/settings')}
                    >
                        <Settings className="text-foreground" />
                    </Button>
                }
            />

            {/* Scroll container: push content by headerHeight (no hardcoding) */}
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
                        {/* Left */}
                        <div className="flex-1 pr-4 flex flex-col min-w-0">
                            <div className="flex items-baseline gap-2 mb-1 min-w-0">
                                <h1 className="text-2xl font-bold truncate">{user.nickname || 'No Name'}</h1>
                            </div>

                            <div className="flex gap-4 mb-4">
                                <div className="flex items-baseline gap-1">
                                    <span className="font-bold">{user.stats?.content_count || 0}</span>
                                    <span className="text-sm text-muted-foreground">{t('profile.stats.contents')}</span>
                                </div>

                                <div
                                    className="flex items-baseline gap-1 cursor-pointer active:opacity-70 transition-opacity"
                                    onClick={() => navigate(`/profile/connections?userId=${user.id}&tab=followers`)}
                                >
                                    <span className="font-bold">{user.stats?.follower_count || 0}</span>
                                    <span className="text-sm text-muted-foreground">{t('profile.stats.followers')}</span>
                                </div>
                            </div>

                            {user.bio && <p className="text-base whitespace-pre-wrap mb-2 line-clamp-3">{user.bio}</p>}

                            {user.link && (
                                <a
                                    href={user.link}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex items-center text-sm text-primary hover:underline"
                                >
                                    <LinkIcon className="w-3 h-3 mr-1 flex-shrink-0" />
                                    <span className="truncate max-w-[200px]">
                                        {user.link.replace(/^(https?:\/\/)?(www\.)?/, '')}
                                    </span>
                                </a>
                            )}
                        </div>

                        {/* Right */}
                        <div className="relative group cursor-pointer flex-shrink-0 ml-4" onClick={() => navigate('/profile/edit')}>
                            <div className="w-24 h-24 rounded-full bg-muted overflow-hidden flex items-center justify-center">
                                {user.profile_image ? (
                                    <img src={user.profile_image} alt="Profile" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-2xl">😊</div>
                                )}
                            </div>

                            <Button
                                variant="outline"
                                size="icon"
                                className="absolute bottom-0 right-0 h-7 w-7 rounded-full bg-background border-2 border-background shadow-md"
                            >
                                <Edit2 className="w-3 h-3" />
                            </Button>
                        </div>
                    </div>

                    {/* Taste card */}
                    {user.cluster_name && (() => {
                        const tasteType = getTasteType((user as any).taste_result);
                        const profile = tasteType ? getTasteTypeProfile(tasteType, 'ko') : null;
                        const displayName = profile?.name || user.cluster_name;
                        const displayTagline = profile?.tagline || user.cluster_tagline;

                        return (
                            <div
                                className="mt-2 mb-2 px-6 py-4 bg-[linear-gradient(135deg,_#FDFBF7_0%,_#F5F3FF_100%)] rounded-2xl flex items-center justify-between cursor-pointer"
                                onClick={() => setIsTasteSheetOpen(true)}
                            >
                                <div>
                                    {tasteType && (
                                        <div className="text-xs font-bold text-primary tracking-wider mb-1">
                                            {tasteType.fullType}
                                        </div>
                                    )}
                                    <div className="font-bold text-base text-foreground mb-1">{displayName}</div>
                                    <div className="text-sm text-muted-foreground line-clamp-2">{displayTagline}</div>
                                </div>
                            </div>
                        );
                    })()}
                </div>

                {/* Tabs */}
                <div className="bg-background border-b border-border/50 z-20">
                    <div className="flex w-full px-0">
                        <TabButton
                            active={activeTab === 'timeline'}
                            onClick={() => handleTabChange('timeline')}
                            icon={<Calendar className="w-5 h-5" />}
                            label={t('profile.tabs.timeline')}
                        />
                        <TabButton
                            active={activeTab === 'content'}
                            onClick={() => handleTabChange('content')}
                            icon={<Grid className="w-5 h-5" />}
                            label={t('profile.tabs.content')}
                        />
                        <TabButton
                            active={activeTab === 'list'}
                            onClick={() => handleTabChange('list')}
                            icon={<List className="w-5 h-5" />}
                            label={t('profile.tabs.list')}
                        />
                        <TabButton
                            active={activeTab === 'saved'}
                            onClick={() => handleTabChange('saved')}
                            icon={<Bookmark className="w-5 h-5" />}
                            label={t('profile.tabs.saved')}
                        />
                    </div>
                </div>

                {/* Content */}
                <div className="min-h-[300px] bg-muted/5">
                    {activeTab === 'timeline' && (
                        <div className="pb-20 pt-4">
                            {loadingContent ? (
                                <div className="flex justify-center py-20">
                                    <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                                </div>
                            ) : contents.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 px-6">
                                    <p className="text-sm text-center text-muted-foreground">
                                        {t('profile.empty.timeline', '타임라인에 표시할 콘텐츠가 없습니다')}
                                    </p>
                                </div>
                            ) : (
                                <TimelineView contents={contents} />
                            )}
                        </div>
                    )}

                    {activeTab === 'content' && (
                        <div className="pb-20">
                            {loadingContent ? (
                                <div className="flex justify-center py-20">
                                    <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                                </div>
                            ) : contents.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 px-6">
                                    <p className="text-sm text-center text-muted-foreground">
                                        {t('profile.empty.content', '게시물이 없습니다')}
                                    </p>
                                </div>
                            ) : (
                                <>
                                    {contents.map((content: any) => (
                                        <div key={content.id} className="mb-8">
                                            <ContentCard
                                                user={{
                                                    id: user.id,
                                                    nickname: user.nickname || 'User',
                                                    account_id: user.account_id,
                                                    profile_image: user.profile_image,
                                                }}
                                                content={content}
                                                showActions={true}
                                            />
                                        </div>
                                    ))}

                                    {isFetchingMore && (
                                        <div className="flex justify-center py-4">
                                            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    )}

                    {activeTab === 'list' && (
                        <div className="pb-20 px-5 pt-4">
                            {/* Always show button at the top right */}
                            <div className="mb-4 flex justify-end">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="gap-1.5 h-8 text-xs font-semibold rounded-full border-gray-300"
                                    onClick={() => navigate('/profile/manage/ranking')}
                                >
                                    <ListOrdered className="w-3.5 h-3.5" />
                                    {t('profile.menu.manage_ranking', 'Manage Ranking')}
                                </Button>
                            </div>

                            {loadingLists ? (
                                <div className="flex justify-center py-20">
                                    <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                                </div>
                            ) : lists.length === 0 ? (
                                <>
                                    {/* Progress Card */}
                                    <div className="bg-background rounded-2xl border border-border/50 p-6 mb-4 flex flex-col items-center">
                                        {/* Circular Progress */}
                                        <div className="relative w-24 h-24 mb-4">
                                            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                                                {/* Background circle */}
                                                <circle
                                                    cx="50"
                                                    cy="50"
                                                    r="42"
                                                    fill="none"
                                                    stroke="hsl(var(--border))"
                                                    strokeWidth="8"
                                                    opacity="0.6"
                                                />
                                                {/* Progress circle */}
                                                {(user.stats?.ranking_count || 0) > 0 && (
                                                    <circle
                                                        cx="50"
                                                        cy="50"
                                                        r="42"
                                                        fill="none"
                                                        stroke="currentColor"
                                                        strokeWidth="8"
                                                        strokeLinecap="round"
                                                        className="text-primary transition-all duration-500 ease-out"
                                                        style={{
                                                            strokeDasharray: `${2 * Math.PI * 42}`,
                                                            strokeDashoffset: `${2 * Math.PI * 42 * (1 - Math.min((user.stats?.ranking_count || 0) / 30, 1))}`
                                                        }}
                                                    />
                                                )}
                                            </svg>
                                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                                <span className="text-xl font-bold text-foreground">
                                                    {user.stats?.ranking_count || 0}
                                                </span>
                                                <span className="text-xs text-muted-foreground">/ 30</span>
                                            </div>
                                        </div>

                                        <p className="text-sm text-center text-muted-foreground leading-relaxed mb-3 max-w-sm whitespace-pre-line">
                                            {t('profile.empty.lists_requirement', '30개 이상의 기록을 완료하면\n나만의 맛집 랭킹 리스트가 만들어져요')}
                                        </p>

                                        <p className="text-xs text-center text-muted-foreground/70">
                                            {30 - (user.stats?.ranking_count || 0) > 0
                                                ? t('profile.empty.remaining', '{{count}}개 더 기록하면 리스트가 생성됩니다', { count: 30 - (user.stats?.ranking_count || 0) })
                                                : t('profile.empty.refresh', '새로고침하여 리스트를 확인하세요')
                                            }
                                        </p>
                                    </div>

                                    {/* Current Rankings */}
                                    {loadingRankings ? (
                                        <div className="flex justify-center py-8">
                                            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                                        </div>
                                    ) : currentRankings.length > 0 ? (
                                        <div className="-mx-5">
                                            {currentRankings.map((item: any) => (
                                                <RankingListItem
                                                    key={`${item.shop.id}-${item.rank}`}
                                                    item={item}
                                                />
                                            ))}
                                        </div>
                                    ) : null}
                                </>
                            ) : (
                                <div className="grid grid-cols-2 gap-3">
                                    {lists.map((list) => (
                                        <ListCard
                                            key={list.id}
                                            id={list.id}
                                            type={list.type}
                                            title={list.title}
                                            count={list.count}
                                            updatedAt={list.updated_at}
                                            author={list.author}
                                            preview_images={list.preview_images}
                                            center_lat={list.center_lat}
                                            center_lng={list.center_lng}
                                            onPress={() => {
                                                const query = new URLSearchParams(searchParams);
                                                query.set('viewListUser', String(user.id));

                                                // Set list params
                                                query.set('type', list.type);
                                                if (list.value) query.set('value', list.value);
                                                if (list.title) query.set('title', list.title);

                                                // Navigate while keeping current path (keeps activeTab='profile')
                                                navigate({ search: query.toString() });
                                            }}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'saved' && (
                        <div className="pb-4 px-5 pt-4">
                            {/* Always show button at the top right */}
                            <div className="mb-4 flex justify-end">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="gap-1.5 h-8 text-xs font-semibold rounded-full border-gray-300"
                                    onClick={() => navigate('/profile/import')}
                                >
                                    <CloudDownload className="w-3.5 h-3.5" />
                                    {t('profile.import_btn', '장소 가져오기')}
                                </Button>
                            </div>

                            {loadingSaved ? (
                                <div className="flex justify-center py-20">
                                    <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                                </div>
                            ) : savedShops.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-8 px-6">
                                    <p className="text-sm text-center text-muted-foreground">
                                        {t('profile.empty.saved', '저장된 장소가 없습니다.')}
                                    </p>
                                </div>
                            ) : (
                                savedShops.map((shop: any) => (
                                    <ShopCard
                                        key={shop.id}
                                        shop={shop}
                                        onSave={() => handleUnsave(shop.id)}
                                        displayContext="saved_list"
                                        onMemoChange={handleMemoChange}
                                        onFolderChange={handleFolderChange}
                                    />
                                ))
                            )}
                        </div>
                    )}
                </div>
            </main>



            <TasteProfileSheet
                isOpen={isTasteSheetOpen}
                onClose={() => setIsTasteSheetOpen(false)}
                data={user ? { cluster_name: user.cluster_name || '', cluster_tagline: user.cluster_tagline || '', scores: (user as any).taste_result?.scores } : null}
                userId={user?.id}
            />
        </div >
    );
};

const TabButton = ({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode | null; label: string }) => (
    <button
        onClick={onClick}
        aria-label={label}
        className={cn(
            'flex-1 py-3 text-sm font-medium transition-all relative flex items-center justify-center',
            active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground/80'
        )}
    >
        <div className="w-5 h-5">
            {icon}
        </div>
        {active && <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-black dark:bg-white rounded-t-full" />}
    </button>
);

// Ranking List Item Component for displaying current rankings
const RankingListItem = ({ item }: { item: any }) => {
    const { shop, rank, satisfaction_tier, latest_review_text, latest_review_images, my_review_stats } = item;
    const navigate = useNavigate();
    const { t } = useTranslation();

    // Derive satisfaction string
    const tierMap: Record<number, string> = { 0: 'bad', 1: 'ok', 2: 'good' };
    const satisfaction = tierMap[satisfaction_tier] || '';

    // Get display image from review images
    let displayImage = shop.thumbnail_img;
    if (latest_review_images) {
        if (Array.isArray(latest_review_images) && latest_review_images.length > 0) {
            displayImage = latest_review_images[0];
        } else if (typeof latest_review_images === 'string') {
            try {
                const parsed = JSON.parse(latest_review_images);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    displayImage = parsed[0];
                }
            } catch (e) {
                if (latest_review_images.startsWith('http')) {
                    displayImage = latest_review_images;
                }
            }
        }
    }

    // Update shop object with display image
    const shopWithImage = { ...shop, thumbnail_img: displayImage };

    // Construct my_review_stats if not provided (since these are ranked items)
    const reviewStats = my_review_stats || {
        rank,
        satisfaction_tier,
        latest_review_text,
        latest_review_images
    };

    return (
        <div className="flex flex-col py-4 px-5 border-b border-border/40 gap-3">
            {/* Shop Info Card */}
            <ShopInfoCard
                shop={shopWithImage}
                initialIsBookmarked={false}
                my_review_stats={reviewStats}
                showActions={true}
                onClick={() => {
                    const current = new URLSearchParams(window.location.search);
                    current.set('viewShop', String(shop.id));
                    navigate({ search: current.toString() });
                }}
                className="p-0 bg-transparent rounded-none active:bg-gray-50/50"
            />

            {/* Rank & Satisfaction Badge */}
            {(rank || satisfaction) && (
                <div className="flex items-center gap-2 pl-1">
                    {satisfaction && (
                        <span className={cn(
                            "font-bold px-2 py-0.5 rounded border text-[11px] whitespace-nowrap",
                            satisfaction === 'good'
                                ? "text-orange-600 border-orange-100 bg-orange-50/50"
                                : "text-gray-500 border-gray-100 bg-gray-50/50"
                        )}>
                            {t(`write.basic.${satisfaction}`)}
                        </span>
                    )}
                    {rank && rank > 0 && (
                        <RankingBadge
                            rank={rank}
                            percentile={reviewStats?.percentile}
                            size="sm"
                            variant="badge"
                        />
                    )}
                </div>
            )}

            {/* Review Text or Shop Description */}
            {latest_review_text ? (
                <div className="relative">
                    <p className="pl-1 text-xs text-foreground/80 leading-relaxed line-clamp-2">
                        {latest_review_text}
                    </p>
                </div>
            ) : shop.description ? (
                <div className="relative">
                    <p className="pl-1 text-xs text-muted-foreground leading-relaxed line-clamp-2">
                        {shop.description}
                    </p>
                </div>
            ) : null}
        </div>
    );
};