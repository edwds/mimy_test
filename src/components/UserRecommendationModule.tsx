import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User as UserIcon, UserPlus, UserCheck, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { API_BASE_URL } from '@/lib/api';
import { authFetch } from '@/lib/authFetch';
import { useUser } from '@/context/UserContext';

interface RecommendedUser {
    id: number;
    nickname: string;
    account_id: string;
    profile_image: string | null;
    taste_match: number;
    cluster_name: string | null;
    is_following: boolean;
}

interface Props {
    onClose?: () => void;
}

export const UserRecommendationModule: React.FC<Props> = ({ onClose }) => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { user: currentUser } = useUser();
    const [users, setUsers] = useState<RecommendedUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [followingStates, setFollowingStates] = useState<Record<number, boolean>>({});

    useEffect(() => {
        const fetchRecommendations = async () => {
            if (!currentUser?.id) return;

            try {
                console.log('[UserRecommendation] Fetching recommendations...');
                const res = await authFetch(`${API_BASE_URL}/api/users/recommendations?limit=5`);
                if (res.ok) {
                    const data = await res.json();
                    console.log('[UserRecommendation] Received:', data.length, 'users', data);
                    setUsers(data);
                    // Initialize following states
                    const states: Record<number, boolean> = {};
                    data.forEach((u: RecommendedUser) => {
                        states[u.id] = u.is_following;
                    });
                    setFollowingStates(states);
                } else {
                    console.error('[UserRecommendation] API error:', res.status);
                }
            } catch (error) {
                console.error('[UserRecommendation] Failed to fetch:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchRecommendations();
    }, [currentUser?.id]);

    const handleFollow = async (userId: number, e: React.MouseEvent) => {
        e.stopPropagation();

        try {
            const res = await authFetch(`${API_BASE_URL}/api/users/${userId}/follow`, {
                method: 'POST'
            });

            if (res.ok) {
                const data = await res.json();
                setFollowingStates(prev => ({
                    ...prev,
                    [userId]: data.following
                }));
            }
        } catch (error) {
            console.error('Failed to toggle follow:', error);
        }
    };

    const handleUserClick = (userId: number) => {
        navigate(`/main/profile?viewUser=${userId}`);
    };

    if (loading) {
        return (
            <div className="px-5 py-4">
                <div className="animate-pulse">
                    <div className="h-5 bg-muted rounded w-32 mb-4" />
                    <div className="flex gap-3 overflow-hidden">
                        {[1, 2, 3, 4, 5].map(i => (
                            <div key={i} className="flex-shrink-0 w-28">
                                <div className="bg-muted rounded-2xl h-40" />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    if (users.length === 0) {
        return null;
    }

    return (
        <div className="py-4">
            {/* Header */}
            <div className="flex items-center justify-between px-5 mb-3">
                <h3 className="text-base font-semibold text-foreground">
                    {t('home.user_recommendation.title')}
                </h3>
                {onClose && (
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-muted rounded-full transition-colors"
                    >
                        <X size={18} className="text-muted-foreground" />
                    </button>
                )}
            </div>

            {/* User Cards - Horizontal Scroll */}
            <div className="flex gap-3 overflow-x-auto no-scrollbar px-5">
                {users.map(user => (
                    <div
                        key={user.id}
                        onClick={() => handleUserClick(user.id)}
                        className="flex-shrink-0 w-28 bg-card border border-border rounded-2xl p-3 cursor-pointer hover:shadow-md transition-shadow"
                    >
                        {/* Profile Image */}
                        <div className="w-16 h-16 mx-auto mb-2 rounded-full overflow-hidden bg-muted">
                            {user.profile_image ? (
                                <img
                                    src={user.profile_image}
                                    alt={user.nickname || ''}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                                    <UserIcon size={24} />
                                </div>
                            )}
                        </div>

                        {/* Nickname */}
                        <p className="text-sm font-medium text-foreground text-center truncate mb-1">
                            {user.nickname || user.account_id}
                        </p>

                        {/* Taste Match */}
                        <p className="text-xs text-primary text-center font-medium mb-2">
                            {t('home.user_recommendation.match', { percent: user.taste_match })}
                        </p>

                        {/* Follow Button */}
                        <button
                            onClick={(e) => handleFollow(user.id, e)}
                            className={`w-full py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1 ${
                                followingStates[user.id]
                                    ? 'bg-muted text-muted-foreground'
                                    : 'bg-primary text-primary-foreground'
                            }`}
                        >
                            {followingStates[user.id] ? (
                                <>
                                    <UserCheck size={12} />
                                    {t('profile.following')}
                                </>
                            ) : (
                                <>
                                    <UserPlus size={12} />
                                    {t('profile.follow')}
                                </>
                            )}
                        </button>
                    </div>
                ))}
            </div>

            {/* Subtitle */}
            <p className="text-xs text-muted-foreground text-center mt-3 px-5">
                {t('home.user_recommendation.subtitle')}
            </p>
        </div>
    );
};
