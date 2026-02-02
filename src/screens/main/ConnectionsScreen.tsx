import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { User as UserIcon } from 'lucide-react';
import { API_BASE_URL } from '@/lib/api';
import { authFetch } from '@/lib/authFetch';
import { ProfileHeader } from '@/components/ProfileHeader';
import { UserProfileScreen } from '@/screens/profile/UserProfileScreen';

interface ConnectionsScreenProps {
    userId?: string;
}

export const ConnectionsScreen = ({ userId: propUserId }: ConnectionsScreenProps) => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const initialTab = searchParams.get('connectionsTab') === 'following' ? 'following' : 'followers';
    const userId = propUserId || searchParams.get('viewConnections');

    console.log('[ConnectionsScreen] Initialized with userId:', userId, 'tab:', initialTab);

    const [activeTab, setActiveTab] = useState<'followers' | 'following'>(initialTab);
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    // Overlay Logic
    const viewUserId = searchParams.get('viewUser');

    useEffect(() => {
        if (!userId) return;
        const fetchUsers = async () => {
            setLoading(true);
            try {
                const endpoint = activeTab === 'followers'
                    ? `${API_BASE_URL}/api/users/${userId}/followers`
                    : `${API_BASE_URL}/api/users/${userId}/following`;

                console.log('[ConnectionsScreen] Fetching:', endpoint);
                const res = await authFetch(endpoint);
                if (res.ok) {
                    const data = await res.json();
                    console.log('[ConnectionsScreen] Data received:', data);
                    setUsers(data);
                } else {
                    console.error('[ConnectionsScreen] Failed to fetch:', res.status);
                }
            } catch (error) {
                console.error('[ConnectionsScreen] Error:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchUsers();
    }, [userId, activeTab]);

    return (
        <div className="flex flex-col h-full bg-background animate-in fade-in duration-300 relative max-w-[448px] mx-auto">
            {/* Overlay */}
            {viewUserId && (
                <div className="absolute inset-0 z-50 bg-background animate-in slide-in-from-right duration-200">
                    <UserProfileScreen userId={viewUserId} />
                </div>
            )}

            {/* Header */}
            <ProfileHeader
                title="Connections"
                onBack={() => {
                    const current = new URLSearchParams(searchParams);
                    current.delete('viewConnections');
                    current.delete('connectionsTab');
                    navigate({ search: current.toString() });
                }}
                isVisible={true}
            />

            {/* Tabs */}
            <div className="flex border-b border-border">
                <button
                    className={`flex-1 py-3 text-sm font-medium transition-colors relative ${activeTab === 'followers' ? 'text-foreground' : 'text-muted-foreground'}`}
                    onClick={() => setActiveTab('followers')}
                >
                    Followers
                    {activeTab === 'followers' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-foreground" />}
                </button>
                <button
                    className={`flex-1 py-3 text-sm font-medium transition-colors relative ${activeTab === 'following' ? 'text-foreground' : 'text-muted-foreground'}`}
                    onClick={() => setActiveTab('following')}
                >
                    Following
                    {activeTab === 'following' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-foreground" />}
                </button>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-4" data-scroll-container="true">
                {loading ? (
                    <div className="flex justify-center py-10">Loading...</div>
                ) : (
                    <div className="space-y-4">
                        {users.map(u => (
                            <div
                                key={u.id}
                                className="flex items-center gap-3 p-2 hover:bg-muted/50 rounded-lg cursor-pointer transition-colors"
                                onClick={() => {
                                    // Use search params for overlay
                                    const current = new URLSearchParams(window.location.search);
                                    current.set('viewUser', String(u.id));
                                    // Keep existing params (like tab)
                                    navigate(`${window.location.pathname}?${current.toString()}`);
                                }}
                            >
                                <div className="w-10 h-10 rounded-full bg-muted overflow-hidden border border-border">
                                    {u.profile_image ? (
                                        <img src={u.profile_image} alt={u.nickname} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-gray-500">
                                            <UserIcon className="w-5 h-5" />
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="font-semibold text-sm truncate">{u.nickname || 'User'}</div>
                                    <div className="text-xs text-muted-foreground truncate">@{u.account_id}</div>
                                </div>
                                {/* Follow toggle button could go here later */}
                            </div>
                        ))}
                        {users.length === 0 && (
                            <div className="text-center text-muted-foreground py-10 text-sm">
                                No users found.
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
