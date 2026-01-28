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
    logout: () => Promise<void>;
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
        try {
            // Fetch current user from JWT cookie
            const userData = await UserService.getCurrentUser();
            if (userData) {
                setUser(userData);
            } else {
                setUser(null);
            }
        } catch (error) {
            console.error("Failed to fetch user in context", error);
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
        // Server already set JWT cookies during login/register
        // Just fetch user data
        await fetchUserData();
    };

    const logout = async () => {
        try {
            // Call logout API to clear cookies
            const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
            await fetch(`${API_BASE_URL}/api/auth/logout`, {
                method: 'POST',
                credentials: 'include' // Include cookies
            });
        } catch (error) {
            console.error('Logout error:', error);
        }
        setUser(null);
        window.location.href = '/start';
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
