import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { UserService } from '@/services/UserService';
import { clearTokens } from '@/lib/tokenStorage';
import { authFetch } from '@/lib/authFetch';
import { Capacitor } from '@capacitor/core';
import { CapacitorCookies } from '@capacitor/core';
import { API_BASE_URL } from '@/lib/api';

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
        ranking_count: number;
    };
    taste_result?: any;
}

interface UserContextType {
    user: User | null;
    loading: boolean;
    refreshUser: (skipAuthFailedCheck?: boolean) => Promise<void>;
    login: (userId: string) => Promise<void>;
    logout: () => Promise<void>;
    optimisticLikes: Record<number, boolean>;
    toggleOptimisticLike: (contentId: number, isLiked: boolean) => void;
    coordinates: { lat: number; lon: number } | null;
    savedShops: any[];
    recommendedShops: any[];
    refreshSavedShops: () => Promise<void>;
    refreshRecommendedShops: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [coordinates, setCoordinates] = useState<{ lat: number; lon: number } | null>(null);
    const [authFailed, setAuthFailed] = useState<boolean>(false);
    const [savedShops, setSavedShops] = useState<any[]>([]);
    const [recommendedShops, setRecommendedShops] = useState<any[]>([]);

    const fetchUserData = useCallback(async (skipAuthFailedCheck = false) => {
        console.log('[UserContext] fetchUserData called, authFailed:', authFailed, 'skipCheck:', skipAuthFailedCheck);

        // Prevent infinite retries if auth fails (unless explicitly skipped)
        if (authFailed && !skipAuthFailedCheck) {
            console.log('[UserContext] Auth already failed, skipping fetch');
            setLoading(false);
            return;
        }

        try {
            console.log('[UserContext] Calling UserService.getCurrentUser()...');
            // Fetch current user from JWT cookie
            const userData = await UserService.getCurrentUser();
            console.log('[UserContext] getCurrentUser result:', userData ? 'User found (id: ' + userData.id + ')' : 'No user');

            if (userData) {
                setUser(userData);
                setAuthFailed(false); // Reset on success
                console.log('[UserContext] ✅ User set successfully');
            } else {
                setUser(null);
                setAuthFailed(true); // Mark as failed to prevent retries
                console.log('[UserContext] ❌ No user data, setting authFailed=true');
            }
        } catch (error) {
            console.error('[UserContext] ❌ Failed to fetch user in context', error);
            setUser(null);
            setAuthFailed(true); // Mark as failed to prevent retries
        }
        setLoading(false);
        console.log('[UserContext] fetchUserData completed, loading=false');
    }, [authFailed]);

    useEffect(() => {
        console.log('[UserContext] Initial mount, fetching user data');
        fetchUserData();

        // Initial Geolocation Fetch
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    const newCoords = {
                        lat: pos.coords.latitude,
                        lon: pos.coords.longitude
                    };
                    setCoordinates(newCoords);

                    // Fetch recommended shops when we get location
                    fetchRecommendedShops(newCoords.lat, newCoords.lon);
                },
                (err) => console.log('Geolocation init error:', err),
                { timeout: 5000, enableHighAccuracy: false }
            );
        }
    }, []);

    // Fetch saved shops when user logs in
    useEffect(() => {
        if (user?.id) {
            refreshSavedShops();
        } else {
            setSavedShops([]);
            setRecommendedShops([]);
        }
    }, [user?.id]);

    const fetchRecommendedShops = async (lat: number, lon: number) => {
        try {
            const url = `${API_BASE_URL}/api/shops/discovery?lat=${lat}&lon=${lon}&excludeRanked=true&limit=50`;
            const res = await authFetch(url);
            if (res.ok) {
                const data = await res.json();
                setRecommendedShops(data);
            }
        } catch (error) {
            console.error('[UserContext] Failed to fetch recommended shops:', error);
        }
    };

    const refreshSavedShops = useCallback(async () => {
        if (!user?.id) return;
        try {
            const saved = await UserService.getSavedShops(user.id);
            setSavedShops(saved || []);
        } catch (error) {
            console.error('[UserContext] Failed to fetch saved shops:', error);
        }
    }, [user?.id]);

    const refreshRecommendedShops = useCallback(async () => {
        if (!coordinates) return;
        await fetchRecommendedShops(coordinates.lat, coordinates.lon);
    }, [coordinates]);

    const refreshUser = useCallback(async (skipAuthFailedCheck = false) => {
        // Reset authFailed if explicitly skipping the check
        if (skipAuthFailedCheck) {
            setAuthFailed(false);
        }
        await fetchUserData(skipAuthFailedCheck);
    }, [fetchUserData]);

    const login = async (_userId: string) => {
        console.log('[UserContext] login called with userId:', _userId);
        // Server already set JWT cookies during login/register
        // Skip authFailed check since we're explicitly logging in
        setAuthFailed(false);
        console.log('[UserContext] authFailed reset to false, calling fetchUserData with skipCheck=true...');
        await fetchUserData(true); // Skip authFailed check due to React state timing
        console.log('[UserContext] login completed');
    };

    const logout = async () => {
        console.log('[UserContext] Logout initiated');

        try {
            // Call logout API to clear server-side session
            const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
            await authFetch(`${API_BASE_URL}/api/auth/logout`, {
                method: 'POST'
            });
            console.log('[UserContext] Logout API call successful');
        } catch (error) {
            console.error('[UserContext] Logout API error:', error);
            // Continue with local cleanup even if API fails
        }

        // Clear localStorage items (IMPORTANT: prevents re-login on reload)
        console.log('[UserContext] Clearing localStorage...');
        localStorage.removeItem('mimy_user_id');
        localStorage.removeItem('mimy_reg_google_info');
        localStorage.removeItem('mimy_reg_phone');
        localStorage.removeItem('mimy_reg_birthyear');
        localStorage.removeItem('mimy_reg_nickname');
        console.log('[UserContext] ✅ localStorage cleared');

        // Clear tokens from native storage (Preferences)
        const tokensCleared = await clearTokens();
        if (!tokensCleared) {
            console.error('[UserContext] Failed to clear Preferences tokens');
        }

        // Clear WebView cookies (iOS/Android)
        if (Capacitor.isNativePlatform()) {
            try {
                console.log('[UserContext] Clearing WebView cookies...');
                await CapacitorCookies.clearAllCookies();
                console.log('[UserContext] ✅ WebView cookies cleared');
            } catch (error) {
                console.error('[UserContext] ❌ Failed to clear WebView cookies:', error);
            }
        }

        // Reset auth state
        setUser(null);
        setAuthFailed(false); // Reset auth failed flag for next login
        console.log('[UserContext] User state and auth flag cleared');

        // Redirect to start page
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
        <UserContext.Provider value={{
            user,
            loading,
            refreshUser,
            login,
            logout,
            optimisticLikes,
            toggleOptimisticLike,
            coordinates,
            savedShops,
            recommendedShops,
            refreshSavedShops,
            refreshRecommendedShops
        }}>
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
