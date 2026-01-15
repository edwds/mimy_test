import { useState, useEffect, useRef } from 'react';
import { MapPin, Link as LinkIcon, Edit2, Grid, List, Settings, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { API_BASE_URL } from '@/lib/api';
import { cn } from '@/lib/utils';
import { ContentCard } from '@/components/ContentCard';
import { ShopCard } from '@/components/ShopCard';
import { useUser } from '@/context/UserContext';
import { TasteProfileSheet } from '@/components/TasteProfileSheet';

type ProfileTabType = "content" | "list" | "saved";

interface Props {
    refreshTrigger?: number;
}

export const ProfileScreen = ({ refreshTrigger }: Props) => {
    const navigate = useNavigate();
    const { user, loading, refreshUser, logout } = useUser();
    const [searchParams] = useSearchParams();
    const initialTab = searchParams.get('tab') as ProfileTabType || "content";
    const [activeTab, setActiveTab] = useState<ProfileTabType>(initialTab);

    // Sync state if url changes 
    useEffect(() => {
        const tab = searchParams.get('tab') as ProfileTabType;
        if (tab) setActiveTab(tab);
    }, [searchParams]);

    // Menu & Sheet State
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isIdSheetOpen, setIsIdSheetOpen] = useState(false);
    // const [isFollowersOpen, setIsFollowersOpen] = useState(false); // Unused
    const [newId, setNewId] = useState("");
    const [savingId, setSavingId] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const [isTasteSheetOpen, setIsTasteSheetOpen] = useState(false);


    // Content State
    const [contents, setContents] = useState<any[]>([]);
    const [loadingContent, setLoadingContent] = useState(false);

    // Refresh listener
    useEffect(() => {
        if (refreshTrigger && refreshTrigger > 0) {
            refreshUser();
            // Content fetch will be handled by the dependency below if we include it, 
            // OR we can explicitly fetch here. 
            // Let's modify the dependency array of the content fetcher to include refreshTrigger
        }
    }, [refreshTrigger]);

    useEffect(() => {
        const fetchContent = async () => {
            if (!user?.id || activeTab !== 'content') return;

            setLoadingContent(true);
            try {
                const response = await fetch(`${API_BASE_URL}/api/content/user/${user.id}?user_id=${user.id}`);
                if (response.ok) {
                    const data = await response.json();
                    setContents(data);
                }
            } catch (error) {
                console.error("Failed to load content", error);
            } finally {
                setLoadingContent(false);
            }
        };

        fetchContent();
    }, [user?.id, activeTab, refreshTrigger]); // Added refreshTrigger here

    // Close menu on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsMenuOpen(false);
            }
        };
        if (isMenuOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        }
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [isMenuOpen]);

    const handleLogout = () => {
        if (window.confirm("Are you sure you want to logout?")) {
            logout();
            navigate('/login');
        }
    };

    const handleRetakeQuiz = () => {
        if (window.confirm("Retaking the quiz will update your taste profile. Continue?")) {
            navigate('/quiz/intro');
        }
    };

    const handleReport = () => {
        alert("Coming soon!");
        setIsMenuOpen(false);
    };

    const openIdSheet = () => {
        setNewId(user?.account_id || "");
        setIsIdSheetOpen(true);
        setIsMenuOpen(false);
    };

    const handleSaveId = async () => {
        if (!user || !newId.trim()) return;
        setSavingId(true);
        try {
            const response = await fetch(`${API_BASE_URL}/api/users/${user.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ account_id: newId })
            });

            if (response.ok) {
                await refreshUser();
                setIsIdSheetOpen(false);
                alert("ID updated successfully");
            } else {
                const err = await response.json();
                alert(err.error || "Failed to update ID");
            }
        } catch (e) {
            console.error(e);
            alert("Error updating ID");
        } finally {
            setSavingId(false);
        }
    };

    // Scroll & Header Logic
    const containerRef = useRef<HTMLDivElement>(null);
    // const staticTabsRef = useRef<HTMLDivElement>(null); // Unused
    const scrollPositions = useRef<{ [key: string]: number }>({});
    const lastScrollY = useRef(0);

    // Header State
    const [isHeaderVisible, setIsHeaderVisible] = useState(true);

    const handleScroll = () => {
        if (!containerRef.current) return;
        const currentScrollY = containerRef.current.scrollTop;
        const diff = currentScrollY - lastScrollY.current;

        // Smart Header Logic
        if (currentScrollY < 10) {
            setIsHeaderVisible(true);
        } else if (Math.abs(diff) > 10) {
            if (diff > 0) { // Down
                setIsHeaderVisible(false);
                setIsMenuOpen(false);
            } else { // Up
                setIsHeaderVisible(true);
            }
        }
        lastScrollY.current = currentScrollY;
    };

    const handleTabChange = (newTab: ProfileTabType) => {
        if (containerRef.current) {
            scrollPositions.current[activeTab] = containerRef.current.scrollTop;
        }
        setActiveTab(newTab);
        setIsHeaderVisible(true);

        // Simple scroll restore
        requestAnimationFrame(() => {
            if (containerRef.current) {
                const savedPos = scrollPositions.current[newTab] || 0;
                containerRef.current.scrollTo({ top: savedPos, behavior: 'instant' });
            }
        });
    };

    // Saved State
    const [savedShops, setSavedShops] = useState<any[]>([]);
    const [loadingSaved, setLoadingSaved] = useState(false);

    useEffect(() => {
        const fetchSaved = async () => {
            if (!user?.id || activeTab !== 'saved') return;

            setLoadingSaved(true);
            try {
                const response = await fetch(`${API_BASE_URL}/api/users/${user.id}/saved_shops`);
                if (response.ok) {
                    const data = await response.json();
                    setSavedShops(data);
                }
            } catch (error) {
                console.error("Failed to load saved shops", error);
            } finally {
                setLoadingSaved(false);
            }
        };

        fetchSaved();
    }, [user?.id, activeTab]);

    const handleUnsave = async (shopId: number) => {
        // Optimistic remove from list
        setSavedShops(prev => prev.filter(s => s.id !== shopId));

        try {
            // We can reuse the toggle endpoint
            const res = await fetch(`${API_BASE_URL}/api/shops/${shopId}/save`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user?.id })
            });
            if (!res.ok) throw new Error("Unsave failed");
        } catch (e) {
            console.error(e);
            alert("저장 취소 실패");
            // Revert logic would need to re-fetch or keep deleted item in memory hidden
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col h-full bg-background relative">
                <main className="flex-1 overflow-y-auto">
                    <div className="p-6 pt-14 pb-2 relative">
                        {/* Top Area Skeleton */}
                        <div className="flex justify-between items-start mb-6">
                            <div className="flex-1 pr-4 flex flex-col min-w-0">
                                <Skeleton className="h-8 w-40 mb-2" />
                                <Skeleton className="h-4 w-24 mb-4" />

                                {/* Stats Skeleton */}
                                <div className="flex gap-4 mb-4">
                                    <Skeleton className="h-4 w-16" />
                                    <Skeleton className="h-4 w-16" />
                                </div>

                                {/* Bio Skeleton */}
                                <div className="space-y-1 mb-2">
                                    <Skeleton className="h-4 w-full" />
                                    <Skeleton className="h-4 w-2/3" />
                                </div>
                            </div>

                            {/* Image Skeleton */}
                            <Skeleton className="w-20 h-20 rounded-full flex-shrink-0 ml-4" />
                        </div>

                        {/* Taste Card Skeleton */}
                        <Skeleton className="w-full h-20 rounded-xl mb-2" />
                    </div>

                    {/* Tabs Skeleton */}
                    <div className="p-6 py-2 bg-background">
                        <div className="flex gap-2">
                            <Skeleton className="h-9 w-20 rounded-full" />
                            <Skeleton className="h-9 w-16 rounded-full" />
                            <Skeleton className="h-9 w-24 rounded-full" />
                        </div>
                    </div>

                    {/* Content Grid Skeleton */}
                    <div className="min-h-[300px] bg-muted/5 p-4 space-y-4">
                        <Skeleton className="h-64 w-full rounded-xl" />
                        <Skeleton className="h-64 w-full rounded-xl" />
                    </div>
                </main>
            </div>
        );
    }

    if (!user) return <div className="flex-1 flex items-center justify-center">User not found</div>;

    return (
        <div className="flex flex-col h-full bg-background relative overflow-hidden">

            {/* Smart Header (Title + Settings) */}
            <div
                className={cn(
                    "absolute top-0 left-0 right-0 bg-background/95 backdrop-blur-sm z-50 px-5 pt-6 pb-2 transition-transform duration-300",
                    isHeaderVisible ? 'translate-y-0' : '-translate-y-full'
                )}
            >
                <div className="flex items-center justify-between mb-2">
                    <h1 className="text-2xl font-bold">@{user.account_id}</h1>
                    <div className="relative">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="rounded-full hover:bg-muted"
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                        >
                            <Settings className="w-6 h-6 text-foreground" />
                        </Button>

                        {/* Dropdown Menu */}
                        {isMenuOpen && (
                            <div
                                ref={menuRef}
                                className="absolute right-0 top-10 w-48 bg-popover border border-border rounded-lg shadow-lg py-1 z-[100] animate-in fade-in zoom-in-95 duration-200"
                            >
                                <button
                                    className="w-full text-left px-4 py-2.5 text-sm hover:bg-muted transition-colors"
                                    onClick={openIdSheet}
                                >
                                    ID 변경하기
                                </button>
                                <button
                                    className="w-full text-left px-4 py-2.5 text-sm hover:bg-muted transition-colors"
                                    onClick={handleRetakeQuiz}
                                >
                                    입맛 퀴즈 다시하기
                                </button>
                                <button
                                    className="w-full text-left px-4 py-2.5 text-sm hover:bg-muted transition-colors"
                                    onClick={handleReport}
                                >
                                    오류 제보하기
                                </button>
                                <div className="h-px bg-border my-1" />
                                <button
                                    className="w-full text-left px-4 py-2.5 text-sm text-red-500 hover:bg-destructive/10 transition-colors"
                                    onClick={handleLogout}
                                >
                                    로그아웃하기
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <main
                ref={containerRef}
                className="flex-1 overflow-y-auto"
                onScroll={handleScroll}
            >
                {/* Top Area */}
                <div className="p-5 pt-20 pb-2 relative">

                    {/* Top Area: 2 Columns */}
                    <div className="flex justify-between items-start mb-6">
                        {/* Left: Info */}
                        <div className="flex-1 pr-4 flex flex-col min-w-0">
                            {/* Name */}
                            <div className="flex items-baseline gap-2 mb-1 min-w-0">
                                <h1 className="text-2xl font-bold truncate">
                                    {user.nickname || "No Name"}
                                </h1>
                            </div>

                            {/* Stats */}
                            <div className="flex gap-4 mb-4">
                                <div className="flex items-baseline gap-1">
                                    <span className="font-bold">{user.stats?.content_count || 0}</span>
                                    <span className="text-xs text-muted-foreground">Contents</span>
                                </div>
                                <div
                                    className="flex items-baseline gap-1 cursor-pointer active:opacity-70 transition-opacity"
                                    onClick={() => navigate('/profile/connections?tab=followers')}
                                >
                                    <span className="font-bold">{user.stats?.follower_count || 0}</span>
                                    <span className="text-xs text-muted-foreground">Followers</span>
                                </div>
                            </div>

                            {/* Bio & Link */}
                            {user.bio && <p className="text-sm whitespace-pre-wrap mb-2 line-clamp-3">{user.bio}</p>}
                            {user.link && (
                                <a href={user.link} target="_blank" rel="noreferrer" className="flex items-center text-xs text-primary hover:underline">
                                    <LinkIcon className="w-3 h-3 mr-1 flex-shrink-0" />
                                    <span className="truncate max-w-[200px]">
                                        {user.link.replace(/^(https?:\/\/)?(www\.)?/, '')}
                                    </span>
                                </a>
                            )}
                        </div>

                        {/* Right: Image & Edit from previous step */}
                        <div
                            className="relative group cursor-pointer flex-shrink-0 ml-4"
                            onClick={() => navigate('/profile/edit')}
                        >
                            <div className="w-20 h-20 rounded-full bg-muted border-2 border-background shadow-sm overflow-hidden flex items-center justify-center">
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

                    {/* Taste Cluster Card */}
                    {user.cluster_name && (
                        <div
                            className="mt-2 mb-2 p-4 bg-[linear-gradient(135deg,_#FDFBF7_0%,_#F5F3FF_100%)] rounded-xl flex items-center justify-between cursor-pointer active:scale-[0.98] transition-transform"
                            onClick={() => setIsTasteSheetOpen(true)}
                        >
                            <div className="flex items-center gap-4">
                                <div>
                                    <div className="font-bold text-base text-foreground mb-1">{user.cluster_name}</div>
                                    <div className="text-xs text-muted-foreground line-clamp-2">{user.cluster_tagline}</div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Tabs Static Header (In Flow) */}
                <div className="bg-background border-b border-border/50 sticky top-0 z-10 mb-2">
                    <div className="flex w-full px-0">
                        <TabButton active={activeTab === "content"} onClick={() => handleTabChange("content")} label="Content" />
                        <TabButton active={activeTab === "list"} onClick={() => handleTabChange("list")} label="List" />
                        <TabButton active={activeTab === "saved"} onClick={() => handleTabChange("saved")} label="Want to go" />
                    </div>
                </div>

                {/* Tab Content */}
                <div className="min-h-[300px] bg-muted/5">
                    {activeTab === "content" && (
                        <div className="pb-20">
                            {/* Real Data Render */}
                            {contents.map((content: any) => (
                                <ContentCard
                                    key={content.id}
                                    user={{
                                        id: user.id,
                                        nickname: user.nickname || "User",
                                        account_id: user.account_id,
                                        profile_image: user.profile_image
                                    }}
                                    content={content}
                                />
                            ))}

                            {/* If empty */}
                            {!loadingContent && contents.length === 0 && (
                                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                                    <Grid className="w-10 h-10 mb-2 opacity-20" />
                                    <p className="text-sm">No contents yet</p>
                                </div>
                            )}

                            {loadingContent && (
                                <div className="flex justify-center py-20">
                                    <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === "list" && (
                        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                            <List className="w-10 h-10 mb-2 opacity-20" />
                            <p className="text-sm">No lists created</p>
                        </div>
                    )}

                    {activeTab === "saved" && (
                        <div className="pb-20 px-5 pt-4">
                            <div className="mb-4">
                                <button
                                    className="w-full py-3 px-4 bg-primary/5 border border-primary/20 rounded-xl flex items-center justify-center gap-2 text-primary hover:bg-primary/10 transition-colors"
                                    onClick={() => navigate('/profile/import')}
                                >
                                    <span className="font-semibold text-sm">다른 플랫폼에 저장한 장소도 가져올 수 있어요!</span>
                                </button>
                            </div>
                            {savedShops.map((shop: any) => (
                                <ShopCard
                                    key={shop.id}
                                    shop={shop}
                                    onSave={() => handleUnsave(shop.id)}
                                // onWrite, onReserve handled by generic alert or nav if needed
                                />
                            ))}

                            {!loadingSaved && savedShops.length === 0 && (
                                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                                    <MapPin className="w-10 h-10 mb-2 opacity-20" />
                                    <p className="text-sm">No saved places</p>
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

            {/* Bottom Sheet for ID Change */}
            {isIdSheetOpen && (
                <>
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 bg-black/50 z-50 animate-in fade-in duration-200"
                        onClick={() => setIsIdSheetOpen(false)}
                    />

                    {/* Sheet */}
                    <div className="fixed bottom-0 left-0 right-0 bg-background rounded-t-xl z-50 p-6 animate-in slide-in-from-bottom duration-300 shadow-lg">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-bold">Change ID</h3>
                            <button onClick={() => setIsIdSheetOpen(false)} className="p-2 -mr-2 text-muted-foreground">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-muted-foreground">New ID</label>
                                <input
                                    type="text"
                                    value={newId}
                                    onChange={(e) => setNewId(e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, ''))}
                                    className="w-full border-b border-border py-2 text-xl bg-transparent focus:outline-none focus:border-primary font-mono"
                                    autoFocus
                                    placeholder="your_id"
                                />
                                <p className="text-xs text-muted-foreground">Only lowercase letters, numbers, dots, and underscores.</p>
                            </div>

                            <Button
                                className="w-full h-12 text-lg mt-4"
                                onClick={handleSaveId}
                                disabled={savingId || !newId || newId === user.account_id}
                            >
                                {savingId ? <Loader2 className="animate-spin" /> : "Save Changes"}
                            </Button>
                        </div>
                    </div>
                </>
            )}

            <TasteProfileSheet
                isOpen={isTasteSheetOpen}
                onClose={() => setIsTasteSheetOpen(false)}
                data={user ? { cluster_name: user.cluster_name || "", cluster_tagline: user.cluster_tagline || "" } : null}
                userId={user?.id}
            />
        </div>
    );
};

const TabButton = ({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) => (
    <button
        onClick={onClick}
        className={`flex-1 py-3 text-sm font-medium transition-all relative ${active
            ? "text-foreground"
            : "text-muted-foreground hover:text-foreground/80"
            }`}
    >
        {label}
        {active && (
            <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-black dark:bg-white rounded-t-full" />
        )}
    </button>
);
