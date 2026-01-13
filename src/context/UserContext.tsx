import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { UserService } from '@/services/UserService';

export interface User {
    id: number;
    nickname: string | null;
    account_id: string;
    profile_image: string | null;
    bio: string | null;
    link: string | null;
    cluster_name?: string;
    cluster_tagline?: string;
    stats?: {
        content_count: number;
        follower_count: number;
        following_count: number;
    };
}

interface UserContextType {
    user: User | null;
    loading: boolean;
    refreshUser: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState<boolean>(true);

    const fetchUserData = async () => {
        const userId = UserService.getUserId();
        if (userId) {
            try {
                const userData = await UserService.fetchUser(userId);
                setUser(userData);
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
    }, []);

    const refreshUser = async () => {
        await fetchUserData();
    };

    return (
        <UserContext.Provider value={{ user, loading, refreshUser }}>
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
