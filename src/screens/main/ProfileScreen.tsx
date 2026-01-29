import { useEffect, useRef, useState } from 'react';
import { MainHeader } from '@/components/MainHeader';
import { useSmartScroll } from '@/hooks/useSmartScroll';
import { MapPin, Link as LinkIcon, Edit2, Grid, List, Settings, Loader2, ListOrdered } from 'lucide-react';
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
    const scrollPositions = useRef<Record<string, number>>({});
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
        const el = containerRef.current;
        if (el) scrollPositions.current[activeTab] = el.scrollTop;

        setActiveTab(newTab);
        setIsHeaderVisible(true);

        requestAnimationFrame(() => {
            const el2 = containerRef.current;
            if (!el2) return;
            const savedPos = scrollPositions.current[newTab] ?? 0;
            el2.scrollTo({ top: savedPos, behavior: 'auto' });
        });
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
                    {user.cluster_name && (
                        <div
                            className="mt-2 mb-2 px-6 py-4 bg-[linear-gradient(135deg,_#FDFBF7_0%,_#F5F3FF_100%)] rounded-2xl flex items-center justify-between cursor-pointer"
                            onClick={() => setIsTasteSheetOpen(true)}
                        >
                            <div>
                                <div className="font-bold text-base text-foreground mb-1">{user.cluster_name}</div>
                                <div className="text-sm text-muted-foreground line-clamp-2">{user.cluster_tagline}</div>
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
                            label={t('profile.tabs.content')}
                        />
                        <TabButton
                            active={activeTab === 'list'}
                            onClick={() => handleTabChange('list')}
                            label={t('profile.tabs.list')}
                        />
                        <TabButton
                            active={activeTab === 'saved'}
                            onClick={() => handleTabChange('saved')}
                            label={t('profile.tabs.saved')}
                        />
                    </div>
                </div>

                {/* Content */}
                <div className="min-h-[300px] bg-muted/5">
                    {activeTab === 'content' && (
                        <div className="pb-20">
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
                            {loadingContent && (
                                <div className="flex justify-center py-20">
                                    <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'list' && (
                        <div className="pb-20 px-5 pt-4">
                            <div className="mb-4 flex justify-end">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="gap-1.5 h-8 text-xs font-semibold rounded-full border-gray-300"
                                    onClick={() => navigate('/profile/manage/ranking')}
                                >
                                    <ListOrdered className="w-3.5 h-3.5" />
                                    {t('profile.manage_ranking', 'Manage Ranking')}
                                </Button>
                            </div>

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

                    {activeTab === 'saved' && (
                        <div className="pb-20 px-5 pt-4">
                            <div className="mb-4">
                                <button
                                    className="w-full py-3 px-4 bg-primary/5 border border-primary/20 rounded-xl flex items-center justify-center gap-2 text-primary hover:bg-primary/10 transition-colors"
                                    onClick={() => navigate('/profile/import')}
                                >
                                    <span className="font-semibold text-sm">{t('profile.import_btn')}</span>
                                </button>
                            </div>

                            {savedShops.map((shop: any) => (
                                <ShopCard key={shop.id} shop={shop} onSave={() => handleUnsave(shop.id)} displayContext="saved_list" />
                            ))}

                            {!loadingSaved && savedShops.length === 0 && (
                                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                                    <MapPin className="w-10 h-10 mb-2 opacity-20" />
                                    <p className="text-sm">{t('profile.empty.saved')}</p>
                                </div>
                            )}

                            {loadingSaved && (
                                <div className="flex justify-center py-20">
                                    <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                                </div>
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

const TabButton = ({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) => (
    <button
        onClick={onClick}
        className={cn(
            'flex-1 py-3 text-sm font-medium transition-all relative',
            active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground/80'
        )}
    >
        {label}
        {active && <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-black dark:bg-white rounded-t-full" />}
    </button>
);