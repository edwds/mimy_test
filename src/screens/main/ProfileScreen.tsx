import { useEffect, useRef, useState } from 'react';
import { MapPin, Link as LinkIcon, Edit2, Grid, List, Settings, X, Loader2 } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { API_BASE_URL } from '@/lib/api';
import { cn } from '@/lib/utils';
import { ContentCard } from '@/components/ContentCard';
import { ShopCard } from '@/components/ShopCard';
import { useUser } from '@/context/UserContext';
import { TasteProfileSheet } from '@/components/TasteProfileSheet';
import { ListCard } from '@/components/ListCard';
import { useTranslation } from 'react-i18next';

type ProfileTabType = 'content' | 'list' | 'saved';

interface ProfileScreenProps {
    refreshTrigger?: number;
    isEnabled?: boolean;
}

export const ProfileScreen = ({ refreshTrigger, isEnabled = true }: ProfileScreenProps) => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { user, loading, refreshUser, logout } = useUser();
    const [searchParams] = useSearchParams();

    // Tabs
    const initialTab = (searchParams.get('tab') as ProfileTabType) || 'content';
    const [activeTab, setActiveTab] = useState<ProfileTabType>(initialTab);

    useEffect(() => {
        const tab = searchParams.get('tab') as ProfileTabType;
        if (tab) setActiveTab(tab);
    }, [searchParams]);

    // Menu & Sheets
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isIdSheetOpen, setIsIdSheetOpen] = useState(false);
    const [isTasteSheetOpen, setIsTasteSheetOpen] = useState(false);

    const [newId, setNewId] = useState('');
    const [savingId, setSavingId] = useState(false);

    const menuRef = useRef<HTMLDivElement>(null);

    // Data
    const [contents, setContents] = useState<any[]>([]);
    const [loadingContent, setLoadingContent] = useState(false);

    const [lists, setLists] = useState<any[]>([]);
    const [loadingLists, setLoadingLists] = useState(false);

    const [savedShops, setSavedShops] = useState<any[]>([]);
    const [loadingSaved, setLoadingSaved] = useState(false);

    // Scroll + Header
    const containerRef = useRef<HTMLDivElement>(null);
    const scrollPositions = useRef<Record<string, number>>({});
    const lastScrollY = useRef(0);

    const [isHeaderVisible, setIsHeaderVisible] = useState(true);

    // Header height measurement (removed dynamic calculation)
    const headerRef = useRef<HTMLDivElement>(null);

    // Refresh listener
    useEffect(() => {
        if (!isEnabled) return;
        if (refreshTrigger) refreshUser();
    }, [refreshTrigger, isEnabled, refreshUser]);

    // Fetch content
    useEffect(() => {
        const fetchContent = async () => {
            if (!user?.id || activeTab !== 'content') return;

            setLoadingContent(true);
            try {
                const response = await fetch(`${API_BASE_URL}/api/content/user/${user.id}?user_id=${user.id}`);
                if (response.ok) setContents(await response.json());
            } catch (e) {
                console.error('Failed to load content', e);
            } finally {
                setLoadingContent(false);
            }
        };

        fetchContent();
    }, [user?.id, activeTab, refreshTrigger]);

    // Fetch lists
    useEffect(() => {
        const fetchLists = async () => {
            if (!user?.id || activeTab !== 'list') return;

            setLoadingLists(true);
            try {
                const response = await fetch(`${API_BASE_URL}/api/users/${user.id}/lists`);
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
    useEffect(() => {
        const fetchSaved = async () => {
            if (!user?.id || activeTab !== 'saved') return;

            setLoadingSaved(true);
            try {
                const response = await fetch(`${API_BASE_URL}/api/users/${user.id}/saved_shops`);
                if (response.ok) setSavedShops(await response.json());
            } catch (e) {
                console.error('Failed to load saved shops', e);
            } finally {
                setLoadingSaved(false);
            }
        };

        fetchSaved();
    }, [user?.id, activeTab]);

    // Close menu on outside click
    useEffect(() => {
        const onPointerDown = (event: PointerEvent) => {
            const target = event.target as Node;
            if (menuRef.current && !menuRef.current.contains(target)) setIsMenuOpen(false);
        };

        if (isMenuOpen) {
            window.addEventListener('pointerdown', onPointerDown, { capture: true });
        }
        return () => window.removeEventListener('pointerdown', onPointerDown, { capture: true } as any);
    }, [isMenuOpen]);

    const handleScroll = () => {
        const el = containerRef.current;
        if (!el) return;

        const y = el.scrollTop;
        const diff = y - lastScrollY.current;

        if (y < 10) {
            setIsHeaderVisible(true);
        } else if (Math.abs(diff) > 10) {
            if (diff > 0) {
                setIsHeaderVisible(false);
                setIsMenuOpen(false);
            } else {
                setIsHeaderVisible(true);
            }
        }

        lastScrollY.current = y;
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

    const handleLogout = () => {
        if (window.confirm(t('profile.menu.logout_confirm'))) {
            logout();
            navigate('/login');
        }
    };

    const handleRetakeQuiz = () => {
        if (window.confirm(t('profile.menu.quiz_confirm'))) {
            navigate('/quiz/intro');
        }
    };

    const handleReport = () => {
        alert(t('profile.menu.coming_soon'));
        setIsMenuOpen(false);
    };

    const openIdSheet = () => {
        setNewId(user?.account_id || '');
        setIsIdSheetOpen(true);
        setIsMenuOpen(false);
    };

    const handleSaveId = async () => {
        if (!user || !newId.trim()) return;

        setSavingId(true);
        try {
            const response = await fetch(`${API_BASE_URL}/api/users/${user.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ account_id: newId }),
            });

            if (response.ok) {
                await refreshUser();
                setIsIdSheetOpen(false);
                alert(t('profile.id_sheet.success'));
            } else {
                const err = await response.json();
                alert(err.error || t('profile.id_sheet.fail'));
            }
        } catch (e) {
            console.error(e);
            alert(t('profile.id_sheet.error'));
        } finally {
            setSavingId(false);
        }
    };

    const handleUnsave = async (shopId: number) => {
        setSavedShops((prev) => prev.filter((s) => s.id !== shopId));

        try {
            const res = await fetch(`${API_BASE_URL}/api/shops/${shopId}/save`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user?.id }),
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
            <div
                ref={headerRef}
                className={cn(
                    'absolute top-0 left-0 right-0 bg-background/95 backdrop-blur-sm z-50 transition-transform duration-300',
                    isHeaderVisible ? 'translate-y-0' : '-translate-y-full'
                )}
                style={{ paddingTop: 'calc(env(safe-area-inset-top) + 12px)' }}
            >
                <div className="px-5 pb-2">
                    <div className="flex items-center justify-between mb-2">
                        <h1 className="text-2xl font-bold">@{user.account_id}</h1>

                        <div className="relative">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="rounded-full hover:bg-muted"
                                onClick={() => setIsMenuOpen((v) => !v)}
                            >
                                <Settings className="w-6 h-6 text-foreground" />
                            </Button>

                            {isMenuOpen && (
                                <div
                                    ref={menuRef}
                                    className="absolute right-0 top-10 w-48 bg-popover border border-border rounded-lg shadow-lg py-1 z-[100] animate-in fade-in zoom-in-95 duration-200"
                                >
                                    <button
                                        className="w-full text-left px-4 py-2.5 text-sm hover:bg-muted transition-colors"
                                        onClick={openIdSheet}
                                    >
                                        {t('profile.menu.change_id')}
                                    </button>
                                    <button
                                        className="w-full text-left px-4 py-2.5 text-sm hover:bg-muted transition-colors"
                                        onClick={handleRetakeQuiz}
                                    >
                                        {t('profile.menu.retake_quiz')}
                                    </button>
                                    <button
                                        className="w-full text-left px-4 py-2.5 text-sm hover:bg-muted transition-colors"
                                        onClick={handleReport}
                                    >
                                        {t('profile.menu.report')}
                                    </button>
                                    <div className="h-px bg-border my-1" />
                                    <button
                                        className="w-full text-left px-4 py-2.5 text-sm text-red-500 hover:bg-destructive/10 transition-colors"
                                        onClick={handleLogout}
                                    >
                                        {t('profile.menu.logout')}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Scroll container: push content by headerHeight (no hardcoding) */}
            <main
                ref={containerRef}
                className="flex-1 overflow-y-auto"
                onScroll={handleScroll}
            >
                {/* Top Area */}
                <div
                    className={cn("p-5 pb-2 relative", !Capacitor.isNativePlatform() && "pt-20")}
                    style={Capacitor.isNativePlatform() ? { paddingTop: 'calc(env(safe-area-inset-top) + 6rem)' } : undefined}
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
                <div className="bg-background border-b border-border/50 sticky top-0 z-20">
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

                            {loadingContent && (
                                <div className="flex justify-center py-20">
                                    <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'list' && (
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
                                        const query = new URLSearchParams({
                                            type: list.type,
                                            value: list.value || '',
                                            title: list.title,
                                        });
                                        navigate(`/profile/lists/${user.id}?${query.toString()}`);
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
                                <ShopCard key={shop.id} shop={shop} onSave={() => handleUnsave(shop.id)} />
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

            {/* ID Sheet */}
            {isIdSheetOpen && (
                <>
                    <div
                        className="fixed inset-0 bg-black/50 z-50 animate-in fade-in duration-200"
                        onClick={() => setIsIdSheetOpen(false)}
                    />

                    <div className="fixed bottom-0 left-0 right-0 bg-background rounded-t-xl z-50 p-6 animate-in slide-in-from-bottom duration-300 shadow-lg">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-bold">{t('profile.id_sheet.title')}</h3>
                            <button onClick={() => setIsIdSheetOpen(false)} className="p-2 -mr-2 text-muted-foreground">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-muted-foreground">{t('profile.id_sheet.label')}</label>
                                <input
                                    type="text"
                                    value={newId}
                                    onChange={(e) => setNewId(e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, ''))}
                                    className="w-full border-b border-border py-2 text-xl bg-transparent focus:outline-none focus:border-primary font-mono"
                                    autoFocus
                                    placeholder={t('profile.id_sheet.placeholder')}
                                />
                                <p className="text-xs text-muted-foreground">{t('profile.id_sheet.helper')}</p>
                            </div>

                            <Button
                                className="w-full h-12 text-lg mt-4"
                                onClick={handleSaveId}
                                disabled={savingId || !newId || newId === user.account_id}
                            >
                                {savingId ? <Loader2 className="animate-spin" /> : t('profile.id_sheet.save')}
                            </Button>
                        </div>
                    </div>
                </>
            )}

            <TasteProfileSheet
                isOpen={isTasteSheetOpen}
                onClose={() => setIsTasteSheetOpen(false)}
                data={user ? { cluster_name: user.cluster_name || '', cluster_tagline: user.cluster_tagline || '' } : null}
                userId={user?.id}
            />
        </div>
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