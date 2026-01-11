import { useState, useEffect } from 'react';
import { Settings, MapPin, Link as LinkIcon, Edit2, Grid, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

// Type definition (move to types/index.ts later)
interface User {
    id: number;
    nickname: string | null;
    account_id: string;
    profile_image: string | null;
    bio: string | null;
    link: string | null;
}

export const ProfileScreen = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Fetch user data
        const loadUser = async () => {
            const userId = localStorage.getItem("mimy_user_id");
            if (!userId) return;

            try {
                const response = await fetch(`http://localhost:3001/api/users/${userId}`);
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
            {/* Header */}
            <header className="px-6 py-4 flex justify-between items-center sticky top-0 bg-background/80 backdrop-blur-md z-10 border-b border-border/50">
                <span className="font-bold text-lg">@{user.account_id}</span>
                <button className="p-2 -mr-2 hover:bg-muted rounded-full transition-colors">
                    <Settings className="w-6 h-6" />
                </button>
            </header>

            <main className="flex-1 overflow-y-auto">
                <div className="p-6 space-y-6">
                    {/* Profile Header */}
                    <div className="flex items-start justify-between">
                        {/* Image */}
                        <div className="relative group cursor-pointer">
                            <div className="w-20 h-20 rounded-full bg-muted border-2 border-background shadow-sm overflow-hidden flex items-center justify-center">
                                {user.profile_image ? (
                                    <img src={user.profile_image} alt="Profile" className="w-full h-full object-cover" />
                                ) : (
                                    <span className="text-3xl">😊</span>
                                )}
                            </div>
                            <div className="absolute -bottom-1 -right-1 bg-background rounded-full p-1 border border-border shadow-sm">
                                <div className="bg-primary rounded-full p-1 text-primary-foreground">
                                    <Edit2 className="w-3 h-3" />
                                </div>
                            </div>
                        </div>

                        {/* Stats */}
                        <div className="flex-1 flex justify-around items-center ml-4">
                            <StatItem label="Posts" value="0" />
                            <StatItem label="Followers" value="0" />
                            <StatItem label="Following" value="0" />
                        </div>
                    </div>

                    {/* Info */}
                    <div className="space-y-1">
                        <h1 className="text-lg font-bold">{user.nickname || "No Name"}</h1>
                        {user.bio && <p className="text-sm text-muted-foreground whitespace-pre-wrap">{user.bio}</p>}
                        {user.link && (
                            <a href={user.link} target="_blank" rel="noreferrer" className="flex items-center text-sm text-primary hover:underline mt-1">
                                <LinkIcon className="w-3 h-3 mr-1" />
                                {user.link.replace(/^https?:\/\//, '')}
                            </a>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            className="flex-1 h-9 text-sm font-medium"
                            onClick={() => navigate('/register/profile')} // Re-use wizard for editing for now
                        >
                            Edit Profile
                        </Button>
                        <Button variant="outline" className="h-9 px-3">
                            <MapPin className="w-4 h-4" />
                        </Button>
                    </div>
                </div>

                {/* Content Tabs (Placeholder) */}
                <div className="border-t border-border mt-2">
                    <div className="flex">
                        <button className="flex-1 py-3 border-b-2 border-primary flex justify-center text-primary">
                            <Grid className="w-6 h-6" />
                        </button>
                        <button className="flex-1 py-3 border-b-2 border-transparent flex justify-center text-muted-foreground hover:text-foreground">
                            <List className="w-6 h-6" />
                        </button>
                    </div>
                    <div className="p-8 text-center text-muted-foreground text-sm">
                        No posts yet
                    </div>
                </div>
            </main>
        </div>
    );
};

const StatItem = ({ label, value }: { label: string, value: string }) => (
    <div className="flex flex-col items-center">
        <span className="font-bold text-lg">{value}</span>
        <span className="text-xs text-muted-foreground">{label}</span>
    </div>
);
