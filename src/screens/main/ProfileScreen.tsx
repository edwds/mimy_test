
import { useState, useEffect, useRef } from 'react';
import { MapPin, Link as LinkIcon, Edit2, Grid, List, Settings, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '@/lib/api';

// Type definition (move to types/index.ts later)
interface User {
    id: number;
    nickname: string | null;
    account_id: string;
    profile_image: string | null;
    bio: string | null;
    link: string | null;
    // New fields from backend join
    cluster_name?: string;
    cluster_tagline?: string;
}

type ProfileTabType = "content" | "list" | "saved";

export const ProfileScreen = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<ProfileTabType>("content");

    // Menu & Sheet State
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isIdSheetOpen, setIsIdSheetOpen] = useState(false);
    const [newId, setNewId] = useState("");
    const [savingId, setSavingId] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const loadUser = async () => {
            const userId = localStorage.getItem("mimy_user_id");
            if (!userId) return;
            try {
                const response = await fetch(`${API_BASE_URL}/api/users/${userId}`);
                if (response.ok) {
                    const data = await response.json();
                    setUser(data);
                }
            } catch (error) {
                console.error("Failed to load user", error);
            } finally {
                setLoading(false);
            }
        };
        loadUser();
    }, []);

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
                setUser({ ...user, account_id: newId });
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

    if (loading) return <div className="flex-1 flex items-center justify-center">Loading...</div>;
    if (!user) return <div className="flex-1 flex items-center justify-center">User not found</div>;

    return (
        <div className="flex flex-col h-full bg-background animate-in fade-in duration-500 relative">
            <main className="flex-1 overflow-y-auto">
                <div className="p-6 pt-10 pb-2 relative">

                    {/* Menu Button (Absolute Top Right) */}
                    <div className="absolute top-2 right-4 z-20">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="rounded-full"
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                        >
                            <Settings className="w-5 h-5 text-muted-foreground" />
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
                                    Report / Feedback
                                </button>
                                <div className="h-px bg-border my-1" />
                                <button
                                    className="w-full text-left px-4 py-2.5 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                                    onClick={handleLogout}
                                >
                                    Logout
                                </button>
                            </div>
                        )}
                    </div>


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
                                    <span className="font-bold">0</span>
                                    <span className="text-xs text-muted-foreground">Contents</span>
                                </div>
                                <div className="flex items-baseline gap-1">
                                    <span className="font-bold">0</span>
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

                    {/* Taste Card Area */}
                    {user.cluster_name ? (
                        <div className="bg-surface border border-border rounded-xl p-4 mb-2 shadow-sm relative overflow-hidden">
                            <div className="text-xl font-bold mb-1">{user.cluster_name}</div>
                            <p className="text-sm text-muted-foreground">{user.cluster_tagline}</p>
                        </div>
                    ) : (
                        <div className="bg-muted/30 border border-dashed border-border rounded-xl p-4 mb-6 text-center cursor-pointer" onClick={() => navigate('/quiz/intro')}>
                            <p className="text-sm text-muted-foreground">Discover your taste profile +</p>
                        </div>
                    )}
                </div>

                {/* Tabs Sticky Header - Chip Style */}
                <div className="sticky top-0 p-6 bg-background z-10 py-2">
                    <div className="flex gap-2 overflow-x-auto no-scrollbar">
                        <TabButton
                            active={activeTab === "content"}
                            onClick={() => setActiveTab("content")}
                            label="Content"
                        />
                        <TabButton
                            active={activeTab === "list"}
                            onClick={() => setActiveTab("list")}
                            label="List"
                        />
                        <TabButton
                            active={activeTab === "saved"}
                            onClick={() => setActiveTab("saved")}
                            label="Want to go"
                        />
                    </div>
                </div>

                {/* Tab Content */}
                <div className="min-h-[300px] bg-muted/5">
                    {activeTab === "content" && (
                        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                            <Grid className="w-10 h-10 mb-2 opacity-20" />
                            <p className="text-sm">No contents yet</p>
                        </div>
                    )}
                    {activeTab === "list" && (
                        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                            <List className="w-10 h-10 mb-2 opacity-20" />
                            <p className="text-sm">No lists created</p>
                        </div>
                    )}
                    {activeTab === "saved" && (
                        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                            <MapPin className="w-10 h-10 mb-2 opacity-20" />
                            <p className="text-sm">No saved places</p>
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
