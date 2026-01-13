import { useState, useEffect, useRef } from 'react';
import { MapPin, Link as LinkIcon, Edit2, Grid, List, Settings, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '@/lib/api';
import { cn } from '@/lib/utils';
import { ContentCard } from '@/components/ContentCard';
import { ShopCard } from '@/components/ShopCard';
import { useUser } from '@/context/UserContext';

type ProfileTabType = "content" | "list" | "saved";

interface Props {
    refreshTrigger?: number;
}

export const ProfileScreen = ({ refreshTrigger }: Props) => {
    const navigate = useNavigate();
    const { user, loading, refreshUser } = useUser();
    const [activeTab, setActiveTab] = useState<ProfileTabType>("content");

    // Menu & Sheet State
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isIdSheetOpen, setIsIdSheetOpen] = useState(false);
    const [newId, setNewId] = useState("");
    const [savingId, setSavingId] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);


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
                const response = await fetch(`${API_BASE_URL}/api/content/user/${user.id}`);
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
            localStorage.removeItem("mimy_user_id");
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
    const headerRef = useRef<HTMLDivElement>(null);
    const scrollPositions = useRef<{ [key: string]: number }>({});
    const lastScrollY = useRef(0);

    // Smart Header State
    const [isHeaderVisible, setIsHeaderVisible] = useState(true);
    const [headerHeight, setHeaderHeight] = useState(0);

    // Measure Header Height
    useEffect(() => {
        if (headerRef.current) {
            setHeaderHeight(headerRef.current.offsetHeight);
        }
    }, [user, activeTab]);

    const handleScroll = () => {
        if (!containerRef.current) return;
        const currentScrollY = containerRef.current.scrollTop;
        const diff = currentScrollY - lastScrollY.current;

        if (currentScrollY < 10) {
            setIsHeaderVisible(true);
        } else if (Math.abs(diff) > 10) {
            if (diff > 0) {
                setIsHeaderVisible(false);
                setIsMenuOpen(false);
            } else {
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

        requestAnimationFrame(() => {
            if (containerRef.current) {
                const savedPos = scrollPositions.current[newTab] || 0;
                containerRef.current.scrollTo({ top: savedPos, behavior: 'instant' });
                // Ensure header is visible on tab change
                setIsHeaderVisible(true);
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

            {/* Smart Header */}
            <div
                ref={headerRef}
                className={cn(
                    "absolute top-0 left-0 right-0 bg-background/95 backdrop-blur-sm z-50 px-5 pt-6 pb-2 transition-transform duration-300 border-b border-border/50",
                    isHeaderVisible ? 'translate-y-0' : '-translate-y-full'
                )}
            >
                <div className="flex items-center justify-between mb-4">
                    <h1 className="text-2xl font-bold">{user?.nickname || 'Profile'}</h1>
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
                                className="absolute right-0 top-10 w-48 bg-popover border border-border rounded-lg shadow-lg py-1 z-30 animate-in fade-in zoom-in-95 duration-200"
                            >
                                <button
                                    className="w-full text-left px-4 py-2.5 text-sm hover:bg-muted transition-colors"
                                    onClick={openIdSheet}
                                >
                                    Change ID
                                </button>
                                <button
                                    className="w-full text-left px-4 py-2.5 text-sm hover:bg-muted transition-colors"
                                    onClick={handleRetakeQuiz}
                                >
                                    Retake Taste Quiz
                                </button>
                                <button
                                    className="w-full text-left px-4 py-2.5 text-sm hover:bg-muted transition-colors"
                                    onClick={handleReport}
                                >
                                    Report Issue
                                </button>
                                <div className="h-px bg-border my-1" />
                                <button
                                    className="w-full text-left px-4 py-2.5 text-sm text-red-500 hover:bg-destructive/10 transition-colors"
                                    onClick={handleLogout}
                                >
                                    Logout
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Tabs as Chips */}
                <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                    <TabButton active={activeTab === "content"} onClick={() => handleTabChange("content")} label="Content" />
                    <TabButton active={activeTab === "list"} onClick={() => handleTabChange("list")} label="List" />
                    <TabButton active={activeTab === "saved"} onClick={() => handleTabChange("saved")} label="Want to go" />
                </div>
            </div>

            <main
                ref={containerRef}
                className="flex-1 overflow-y-auto"
                onScroll={handleScroll}
                style={{ paddingTop: headerHeight }}
            >
                {/* Top Area */}
                <div className="p-6 pb-2 relative">

                    {/* Top Area: 2 Columns */}
                    <div className="flex justify-between items-start mb-6">
                        {/* Left: Info */}
                        <div className="flex-1 pr-4 flex flex-col min-w-0">
                            {/* Name + Handle */}
                            <div className="flex items-baseline gap-2 mb-1 min-w-0">
                                <h1 className="text-2xl font-bold truncate">
                                    {user.nickname || "No Name"}
                                </h1>
                                <span className="text-muted-foreground text-sm shrink-0">
                                    @{user.account_id}
                                </span>
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

                    {/* Profile Stats */}
                    <div className="grid grid-cols-3 gap-4 mb-6">
                        <div className="text-center cursor-pointer" onClick={() => handleTabChange('content')}>
                            <div className="font-bold text-lg">{user.stats?.content_count || 0}</div>
                            <div className="text-xs text-muted-foreground">Content</div>
                        </div>
                        <div className="text-center cursor-pointer" onClick={() => setIsFollowersOpen(true)}>
                            <div className="font-bold text-lg">{user.stats?.follower_count || 0}</div>
                            <div className="text-xs text-muted-foreground">Followers</div>
                        </div>
                        <div className="text-center">
                            <div className="font-bold text-lg text-muted-foreground">{user.stats?.following_count || 0}</div>
                            <div className="text-xs text-muted-foreground">Following</div>
                        </div>
                    </div>

                    {/* Bio */}
                    {user.bio && (
                        <div className="mb-6">
                            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{user.bio}</p>
                            {user.links && user.links.length > 0 && (
                                <div className="mt-2 flex flex-col gap-1">
                                    {user.links.map((link: string, idx: number) => (
                                        <a
                                            key={idx}
                                            href={link.startsWith('http') ? link : `https://${link}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-xs text-blue-500 hover:underline flex items-center gap-1"
                                        >
                                            <LinkIcon size={10} />
                                            {link.replace(/^https?:\/\//, '').length > 30
                                                ? `${link.replace(/^https?:\/\//, '').substring(0, 30)}...`
                                                : link.replace(/^https?:\/\//, '')}
                                        </a>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>* Tab Content */}
                <div className="min-h-[300px] bg-muted/5">
                    {activeTab === "content" && (
                        <div className="pb-20">
                            {/* Real Data Render */}
                            {contents.map((content: any) => (
                                <ContentCard
                                    key={content.id}
                                    user={{
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
        </div>
    );
};

const TabButton = ({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) => (
    <button
        onClick={onClick}
        className={`px-4 py-2 text-sm font-medium rounded-full transition-colors whitespace-nowrap ${active
            ? "bg-primary text-primary-foreground shadow-sm"
            : "bg-muted/50 text-muted-foreground hover:bg-muted"
            }`}
    >
        {label}
    </button>
);
