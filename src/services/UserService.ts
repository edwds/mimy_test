
import { API_BASE_URL } from '@/lib/api';

export const UserService = {
    getUserId: () => localStorage.getItem("mimy_user_id"),

    // Fetch full user details
    fetchUser: async (userId: string | number) => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/users/${userId}`);
            if (response.ok) {
                return await response.json();
            }
            return null;
        } catch (error) {
            console.error("Failed to fetch user", error);
            return null;
        }
    },

    // Helper to get current user info (async)
    getCurrentUser: async () => {
        const id = localStorage.getItem("mimy_user_id");
        if (!id) return null;
        return await UserService.fetchUser(id);
    },

    // For compatibility with previous assumption (synchronous get if stored in local - but effectively just ID for now)
    getUser: () => {
        // Since we don't store full user in local storage, this requires async fetching.
        // We'll return null here to force usage of getCurrentUser async, 
        // OR we can return a partial object if we stored it. 
        // For now, let's keep it simple: return ID wrapped or null.
        const id = localStorage.getItem("mimy_user_id");
        return id ? { id } : null;
    },

    getSavedShops: async (userId: number | string) => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/users/${userId}/saved_shops`);
            if (response.ok) {
                return await response.json();
            }
            return [];
        } catch (error) {
            console.error("Failed to fetch saved shops", error);
            return [];
        }
    }
}
