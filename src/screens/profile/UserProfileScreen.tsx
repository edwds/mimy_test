import { useState, useEffect, useRef } from 'react';
import { MapPin, Link as LinkIcon, Grid, List, Loader2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useNavigate, useSearchParams, useParams } from 'react-router-dom';
import { API_BASE_URL } from '@/lib/api';
import { cn } from '@/lib/utils';
import { ContentCard } from '@/components/ContentCard';
import { ShopCard } from '@/components/ShopCard';
import { useUser } from '@/context/UserContext';
import { User } from '@/context/UserContext';
import { TasteProfileSheet } from '@/components/TasteProfileSheet';

type ProfileTabType = "content" | "list" | "saved";

export const UserProfileScreen = () => {
    const navigate = useNavigate();
    const { userId } = useParams();
    const { user: currentUser } = useUser(); // Me
    const [searchParams] = useSearchParams();

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
                navigate('/main/profile', { replace: true });
                return;
            }

            setLoadingUser(true);
            try {
                const res = await fetch(`${API_BASE_URL}/api/users/${userId}?viewerId=${currentUser?.id}`);
                if (res.ok) {
                    const data = await res.json();
                    setUser(data);
                    setIsFollowing(data.is_following);
                } else {
                    // Handle error (e.g. 404)
                    alert("User not found");
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
            const res = await fetch(`${API_BASE_URL}/api/users/${user.id}/follow`, {
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

    useEffect(() => {
        const fetchContent = async () => {
            if (!user?.id || activeTab !== 'content') return;
            setLoadingContent(true);
            try {
                const response = await fetch(`${API_BASE_URL}/api/content/user/${user.id}?user_id=${currentUser?.id || ''}`);
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
    }, [user?.id, activeTab, currentUser?.id]);

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
                const resTarget = await fetch(`${API_BASE_URL}/api/users/${user.id}/saved_shops`);
                const targetSaved = await resTarget.json();

                // Fetch my saved list
                const resMe = await fetch(`${API_BASE_URL}/api/users/${currentUser.id}/saved_shops`);
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


    // Scroll & Header Logic
    const containerRef = useRef<HTMLDivElement>(null);
    const scrollPositions = useRef<{ [key: string]: number }>({});
    const lastScrollY = useRef(0);
    const [isHeaderVisible, setIsHeaderVisible] = useState(true);

    const handleScroll = () => {
        if (!containerRef.current) return;
        const currentScrollY = containerRef.current.scrollTop;
        const diff = currentScrollY - lastScrollY.current;

        if (currentScrollY < 10) {
            setIsHeaderVisible(true);
        } else if (Math.abs(diff) > 10) {
            if (diff > 0) setIsHeaderVisible(false); // Down
            else setIsHeaderVisible(true); // Up
        }
        lastScrollY.current = currentScrollY;
    };

    const handleTabChange = (newTab: ProfileTabType) => {
        if (containerRef.current) {
            scrollPositions.current[activeTab] = containerRef.current.scrollTop;
        }
        setActiveTab(newTab);
        setIsHeaderVisible(true);
        requestAnimationFrame(() => {
            if (containerRef.current) {
                const savedPos = scrollPositions.current[newTab] || 0;
                containerRef.current.scrollTo({ top: savedPos, behavior: 'instant' });
            }
        });
    };

    if (loadingUser) {
        return (
            <div className="flex flex-col h-full bg-background relative">
                <div className="p-4 flex items-center">
                    <Skeleton className="w-8 h-8 rounded-full" />
                </div>
                <div className="p-6">
                    <Skeleton className="h-8 w-40 mb-4" />
                    <Skeleton className="h-64 w-full rounded-xl" />
                </div>
            </div>
        );
    }

    if (!user) return <div>User not found</div>;

    return (
        <div className="flex flex-col h-full bg-background relative overflow-hidden">

            {/* Header */}
            <div
                className={cn(
                    "absolute top-0 left-0 right-0 bg-background/95 backdrop-blur-sm z-50 px-4 pt-6 pb-2 transition-transform duration-300 flex items-center gap-2",
                    isHeaderVisible ? 'translate-y-0' : '-translate-y-full'
                )}
            >
                <Button variant="ghost" size="icon" className="-ml-2" onClick={() => navigate(-1)}>
                    <ArrowLeft className="w-6 h-6" />
                </Button>
                <h1 className="text-lg font-bold truncate">@{user.account_id}</h1>
                <div className="ml-auto">
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
                        {isFollowing ? "Following" : "Follow"}
                    </Button>
                </div>
            </div>

            <main
                ref={containerRef}
                className="flex-1 overflow-y-auto"
                onScroll={handleScroll}
            >
                {/* Top Area */}
                <div className="p-5 pt-20 pb-2 relative">
                    <div className="flex justify-between items-start mb-6">
                        {/* Info */}
                        <div className="flex-1 pr-4 flex flex-col min-w-0">
                            <div className="flex items-baseline gap-2 mb-1 min-w-0">
                                <h1 className="text-2xl font-bold truncate">{user.nickname || "No Name"}</h1>
                            </div>

                            {/* Stats */}
                            <div className="flex gap-4 mb-4">
                                <div className="flex items-baseline gap-1">
                                    <span className="font-bold">{user.stats?.content_count || 0}</span>
                                    <span className="text-xs text-muted-foreground">Contents</span>
                                </div>
                                <div className="flex items-baseline gap-1">
                                    <span className="font-bold">{user.stats?.follower_count || 0}</span>
                                    <span className="text-xs text-muted-foreground">Followers</span>
                                </div>
                            </div>

                            {user.bio ? (
                                <p className="text-sm whitespace-pre-wrap mb-2 line-clamp-3">{user.bio}</p>
                            ) : (
                                <p className="text-sm text-gray-400 mb-2">No bio to show.</p>
                            )}
                            {user.link && (
                                <a href={user.link} target="_blank" rel="noreferrer" className="flex items-center text-xs text-primary hover:underline">
                                    <LinkIcon className="w-3 h-3 mr-1 flex-shrink-0" />
                                    <span className="truncate max-w-[200px]">{user.link.replace(/^(https?:\/\/)?(www\.)?/, '')}</span>
                                </a>
                            )}
                        </div>

                        {/* Image */}
                        <div className="relative group flex-shrink-0 ml-4">
                            <div className="w-20 h-20 rounded-full bg-muted border-2 border-background shadow-sm overflow-hidden flex items-center justify-center">
                                {user.profile_image ? (
                                    <img src={user.profile_image} alt="Profile" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-2xl">😊</div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Taste Cluster & Matching Score */}
                    {user.cluster_name && (
                        <div className="flex gap-2">
                            <div
                                className="flex-1 p-4 bg-[linear-gradient(135deg,_#FDFBF7_0%,_#F5F3FF_100%)] rounded-xl flex items-center justify-between cursor-pointer active:scale-[0.98] transition-transform"
                                onClick={() => setIsTasteSheetOpen(true)}
                            >
                                <div>
                                    <div className="font-bold text-base text-foreground mb-1">{user.cluster_name}</div>
                                    <div className="text-xs text-muted-foreground line-clamp-2">{user.cluster_tagline}</div>
                                </div>
                            </div>


                            {/* Matching Score Badge */}
                            {matchingScore !== null && (
                                <div className="flex flex-col items-center justify-center p-2 bg-pink-50 rounded-xl min-w-[80px]">
                                    <span className="text-[10px] text-pink-500 font-bold uppercase">Match</span>
                                    <span className="text-xl font-black text-pink-600">{matchingScore}%</span>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Tabs */}
                <div className="bg-background sticky top-0 z-10 border-b border-border/50 mb-2">
                    <div className="flex w-full px-0">
                        <TabButton active={activeTab === "content"} onClick={() => handleTabChange("content")} label="Content" />
                        <TabButton active={activeTab === "list"} onClick={() => handleTabChange("list")} label="List" />
                        <TabButton active={activeTab === "saved"} onClick={() => handleTabChange("saved")} label="Shared Picks" />
                    </div>
                </div>

                <div className="min-h-[300px] bg-muted/5">
                    {activeTab === "content" && (
                        <div className="pb-20">
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
                            {!loadingContent && contents.length === 0 && (
                                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                                    <Grid className="w-10 h-10 mb-2 opacity-20" />
                                    <p className="text-sm">No contents yet</p>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === "list" && (
                        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                            <List className="w-10 h-10 mb-2 opacity-20" />
                            <p className="text-sm">No public lists</p>
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
                                            <div className="mb-4 text-sm text-muted-foreground">
                                                You both saved <strong>{commonShops.length}</strong> places!
                                            </div>
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
                                            <p className="text-sm">No shared saved places found.</p>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    )}

                </div>
            </main>

            <TasteProfileSheet
                isOpen={isTasteSheetOpen}
                onClose={() => setIsTasteSheetOpen(false)}
                data={user ? { cluster_name: user.cluster_name || "", cluster_tagline: user.cluster_tagline || "" } : null}
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
