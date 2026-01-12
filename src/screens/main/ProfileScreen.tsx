import { useState, useEffect } from 'react';
import { MapPin, Link as LinkIcon, Edit2, Grid, List } from 'lucide-react';
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

    if (loading) return <div className="flex-1 flex items-center justify-center">Loading...</div>;
    if (!user) return <div className="flex-1 flex items-center justify-center">User not found</div>;

    return (
        <div className="flex flex-col h-full bg-background animate-in fade-in duration-500">
            {/* Header / Nav Area could go here if global header not used */}

            <main className="flex-1 overflow-y-auto">
                <div className="p-6 pb-2">
                    {/* Top Area: 2 Columns */}
                    <div className="flex justify-between items-start mb-6">
                        {/* Left: Info */}
                        <div className="flex-1 pr-4">
                            <h1 className="text-2xl font-bold mb-1">{user.nickname || "No Name"}</h1>
                            <p className="text-muted-foreground text-sm mb-3">@{user.account_id}</p>

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
                                    <LinkIcon className="w-3 h-3 mr-1" />
                                    {user.link.replace(/^https?:\/\//, '')}
                                </a>
                            )}
                        </div>

                        {/* Right: Image & Edit */}
                        <div className="flex flex-col items-end gap-3">
                            <div className="w-20 h-20 rounded-full bg-muted border border-border shadow-sm overflow-hidden">
                                {user.profile_image ? (
                                    <img src={user.profile_image} alt="Profile" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-2xl">😊</div>
                                )}
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-8 px-3 text-xs"
                                onClick={() => navigate('/register/profile')}
                            >
                                <Edit2 className="w-3 h-3 mr-1" />
                                Edit
                            </Button>
                        </div>
                    </div>

                    {/* Taste Card Area */}
                    {user.cluster_name ? (
                        <div className="bg-surface border border-border rounded-xl p-4 mb-6 shadow-sm relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-16 h-16 bg-primary/10 rounded-bl-full -mr-4 -mt-4" />
                            <h3 className="text-xs font-bold text-primary mb-1 uppercase tracking-wider">My Taste</h3>
                            <div className="text-xl font-bold mb-1">{user.cluster_name}</div>
                            <p className="text-sm text-muted-foreground">{user.cluster_tagline}</p>
                        </div>
                    ) : (
                        <div className="bg-muted/30 border border-dashed border-border rounded-xl p-4 mb-6 text-center cursor-pointer" onClick={() => navigate('/quiz/intro')}>
                            <p className="text-sm text-muted-foreground">Discover your taste profile +</p>
                        </div>
                    )}
                </div>

                {/* Tabs Sticky Header */}
                <div className="sticky top-0 bg-background z-10 border-b border-border">
                    <div className="flex px-4">
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
        </div>
    );
};

const TabButton = ({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) => (
    <button
        onClick={onClick}
        className={`flex-1 py-3 text-sm font-medium transition-colors relative ${active ? "text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
    >
        {label}
        {active && (
            <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary mx-4 rounded-t-full" />
        )}
    </button>
);


