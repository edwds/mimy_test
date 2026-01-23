import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { UserService } from '@/services/UserService';

export interface User {
    id: number;
    nickname: string | null;
    account_id: string;
    profile_image: string | null;
    email: string | null;
    bio: string | null;
    link: string | null;
    links?: string[];
    cluster_name?: string;
    cluster_tagline?: string;
    stats?: {
        content_count: number;
        follower_count: number;
        following_count: number;
    };
    taste_result?: any;
}

interface UserContextType {
    user: User | null;
    loading: boolean;
    refreshUser: () => Promise<void>;
    login: (userId: string) => Promise<void>;
    logout: () => void;
    optimisticLikes: Record<number, boolean>;
    toggleOptimisticLike: (contentId: number, isLiked: boolean) => void;
    coordinates: { lat: number; lon: number } | null;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [coordinates, setCoordinates] = useState<{ lat: number; lon: number } | null>(null);

    const fetchUserData = async () => {
        const userId = UserService.getUserId();
        if (userId) {
            try {
                const userData = await UserService.fetchUser(userId);
                if (userData) {
                    setUser(userData);
                } else {
                    console.warn("Failed to load user data, logging out.");
                    localStorage.removeItem("mimy_user_id");
                    setUser(null);
                    window.location.href = '/start';
                }
            } catch (error) {
                console.error("Failed to fetch user in context", error);
            }
        } else {
            setUser(null);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchUserData();

        // Initial Geolocation Fetch
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    setCoordinates({
                        lat: pos.coords.latitude,
                        lon: pos.coords.longitude
                    });
                },
                (err) => console.log('Geolocation init error:', err),
                { timeout: 5000, enableHighAccuracy: false }
            );
        }
    }, []);

    const refreshUser = async () => {
        await fetchUserData();
    };

    const login = async (userId: string) => {
        localStorage.setItem("mimy_user_id", userId);
        await fetchUserData();
    };

    const logout = () => {
        localStorage.removeItem("mimy_user_id");
        setUser(null);
    };

    const [optimisticLikes, setOptimisticLikes] = useState<Record<number, boolean>>({});

    const toggleOptimisticLike = (contentId: number, isLiked: boolean) => {
        setOptimisticLikes(prev => ({
            ...prev,
            [contentId]: isLiked
        }));
    };

    return (
        <UserContext.Provider value={{ user, loading, refreshUser, login, logout, optimisticLikes, toggleOptimisticLike, coordinates }}>
            {children}
        </UserContext.Provider>
    );
};

export const useUser = () => {
    const context = useContext(UserContext);
    if (context === undefined) {
        throw new Error('useUser must be used within a UserProvider');
    }
    return context;
};
