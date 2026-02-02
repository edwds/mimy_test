import React, { useEffect, useRef, useState } from 'react';
import { MainHeader } from '@/components/MainHeader';
import { useSmartScroll } from '@/hooks/useSmartScroll';
import { Link as LinkIcon, Edit2, List, Settings, Loader2, ListOrdered, CloudDownload, Grid, Bookmark } from 'lucide-react';
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
import { useTranslation } from 'react-i18next';
import { authFetch } from '@/lib/authFetch';

type ProfileTabType = 'content' | 'list' | 'saved';

interface ProfileScreenProps {
    refreshTrigger?: number;
    isEnabled?: boolean;
}

export const ProfileScreen = ({ refreshTrigger, isEnabled = true }: ProfileScreenProps) => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { user, loading, refreshUser } = useUser();
    const { registerCallback, unregisterCallback } = useRanking();
    const [rankingRefreshTrigger, setRankingRefreshTrigger] = useState(0);
    const lastUpdateDataRef = useRef<{ shopId: number; my_review_stats: any } | null>(null);
    const [searchParams] = useSearchParams();

    // Tabs
    const initialTab = (searchParams.get('tab') as ProfileTabType) || 'content';
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

    const [savedShops, setSavedShops] = useState<any[]>([]);
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

    // Refresh listener
    useEffect(() => {
        if (!isEnabled) return;
        if (refreshTrigger) refreshUser();
    }, [refreshTrigger, isEnabled, refreshUser]);

    // Fetch content
    useEffect(() => {
        setContentPage(1);
        setContents([]);
        setHasMoreContent(true);
    }, [user?.id, activeTab, refreshTrigger]);

    useEffect(() => {
        const fetchContent = async () => {
            if (!user?.id || activeTab !== 'content') return;
            if (!hasMoreContent && contentPage > 1) return;

            if (contentPage === 1) setLoadingContent(true);
            else setIsFetchingMore(true);

            try {
                const response = await authFetch(`${API_BASE_URL}/api/content/user/${user.id}?user_id=${user.id}&page=${contentPage}&limit=20`);
                if (response.ok) {
                    const data = await response.json();
                    if (data.length < 20) setHasMoreContent(false);
                    setContents(prev => contentPage === 1 ? data : [...prev, ...data]);
                }
            } catch (e) {
                console.error('Failed to load content', e);
            } finally {
                setLoadingContent(false);
                setIsFetchingMore(false);
            }
        };

        fetchContent();
    }, [user?.id, activeTab, refreshTrigger, contentPage]);

    const loadMoreContent = () => {
        if (!loadingContent && !isFetchingMore && hasMoreContent) {
            setContentPage(prev => prev + 1);
        }
    };

    // Fetch lists
    useEffect(() => {
        const fetchLists = async () => {
            if (!user?.id || activeTab !== 'list') return;

            setLoadingLists(true);
            try {
                const response = await authFetch(`${API_BASE_URL}/api/users/${user.id}/lists`);
                if (response.ok) setLists(await response.json());
            } catch (e) {
                console.error('Failed to load lists', e);
            } finally {
                setLoadingLists(false);
            }
        };

        fetchLists();
    }, [user?.id, activeTab, refreshTrigger]);

    // Fetch saved shops
    const fetchSaved = async () => {
        if (!user?.id || activeTab !== 'saved') return;

        setLoadingSaved(true);
        try {
            const response = await authFetch(`${API_BASE_URL}/api/users/${user.id}/saved_shops`);
            if (response.ok) setSavedShops(await response.json());
        } catch (e) {
            console.error('Failed to load saved shops', e);
        } finally {
            setLoadingSaved(false);
        }
    };

    useEffect(() => {
        fetchSaved();
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
                if (activeTab === 'content') {
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
        setSavedShops((prev) => prev.filter((s) => s.id !== shopId));

        try {
            const res = await authFetch(`${API_BASE_URL}/api/shops/${shopId}/save`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({}),
            });
            if (!res.ok) throw new Error('Unsave failed');
        } catch (e) {
            console.error(e);
            alert(t('profile.unsave_fail'));
        }
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
        <div className="flex flex-col h-full bg-background relative">
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
                className="flex-1 overflow-y-auto overflow-x-hidden"
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
                                    onClick={() => navigate('/profile/connections?tab=followers')}
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
                    {user.cluster_name ? (
                        <div
                            className="mt-2 mb-2 px-6 py-4 bg-[linear-gradient(135deg,_#FDFBF7_0%,_#F5F3FF_100%)] rounded-2xl flex items-center justify-between cursor-pointer"
                            onClick={() => setIsTasteSheetOpen(true)}
                        >
                            <div>
                                <div className="font-bold text-base text-foreground mb-1">{user.cluster_name}</div>
                                <div className="text-sm text-muted-foreground line-clamp-2">{user.cluster_tagline}</div>
                            </div>
                        </div>
                    ) : (
                        <div
                            className="mt-2 mb-2 px-6 py-4 bg-muted/30 rounded-2xl flex items-center justify-between cursor-pointer border-2 border-dashed border-primary/30 hover:border-primary/50 transition-colors"
                            onClick={() => navigate('/quiz/intro')}
                        >
                            <div className="flex-1">
                                <div className="font-bold text-base text-foreground mb-1">
                                    {t('profile.taste.discover', { defaultValue: '나의 입맛 찾기' })}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                    {t('profile.taste.discover_desc', { defaultValue: '3분 퀴즈로 취향을 분석해보세요' })}
                                </div>
                            </div>
                            <div className="ml-4 text-primary font-bold">
                                →
                            </div>
                        </div>
                    )}
                </div>

                {/* Tabs */}
                <div className="bg-background border-b border-border/50 z-20">
                    <div className="flex w-full px-0">
                        <TabButton
                            active={activeTab === 'content'}
                            onClick={() => handleTabChange('content')}
                            icon={<Grid className="w-4 h-4" />}
                            label={t('profile.tabs.content')}
                        />
                        <TabButton
                            active={activeTab === 'list'}
                            onClick={() => handleTabChange('list')}
                            icon={<List className="w-4 h-4" />}
                            label={t('profile.tabs.list')}
                        />
                        <TabButton
                            active={activeTab === 'saved'}
                            onClick={() => handleTabChange('saved')}
                            icon={<Bookmark className="w-4 h-4" />}
                            label={t('profile.tabs.saved')}
                        />
                    </div>
                </div>

                {/* Content */}
                <div className="min-h-[300px] bg-muted/5">
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
                                <div className="flex flex-col items-center justify-center py-8 px-6">
                                    {/* Circular Progress */}
                                    <div className="relative w-24 h-24 mb-4">
                                        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                                            {/* Background circle */}
                                            <circle
                                                cx="50"
                                                cy="50"
                                                r="42"
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth="8"
                                                className="text-muted/50"
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
                            ) : (
                                lists.map((list) => (
                                    <ListCard
                                        key={list.id}
                                        id={list.id}
                                        type={list.type}
                                        title={list.title}
                                        count={list.count}
                                        updatedAt={list.updated_at}
                                        author={list.author}
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
                                ))
                            )}
                        </div>
                    )}

                    {activeTab === 'saved' && (
                        <div className="pb-20 px-5 pt-4">
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
                                    <ShopCard key={shop.id} shop={shop} onSave={() => handleUnsave(shop.id)} displayContext="saved_list" />
                                ))
                            )}
                        </div>
                    )}
                </div>
            </main>



            <TasteProfileSheet
                isOpen={isTasteSheetOpen}
                onClose={() => setIsTasteSheetOpen(false)}
                data={user ? { cluster_name: user.cluster_name || '', cluster_tagline: user.cluster_tagline || '' } : null}
                userId={user?.id}
            />
        </div >
    );
};

const TabButton = ({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode | null; label: string }) => (
    <button
        onClick={onClick}
        className={cn(
            'flex-1 py-3 text-sm font-medium transition-all relative flex items-center justify-center gap-1.5',
            active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground/80'
        )}
    >
        {icon}
        <span>{label}</span>
        {active && <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-black dark:bg-white rounded-t-full" />}
    </button>
);