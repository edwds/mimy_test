
import { API_BASE_URL } from '@/lib/api';
import { authFetch } from '@/lib/authFetch';

export const UserService = {
    // Fetch full user details by ID
    fetchUser: async (userId: string | number) => {
        try {
            const response = await authFetch(`${API_BASE_URL}/api/users/${userId}`);
            if (response.ok) {
                return await response.json();
            }
            return null;
        } catch (error) {
            console.error("Failed to fetch user", error);
            return null;
        }
    },

    // Get current authenticated user from JWT
    getCurrentUser: async () => {
        try {
            const response = await authFetch(`${API_BASE_URL}/api/auth/me`);
            if (response.ok) {
                return await response.json();
            }
            return null;
        } catch (error) {
            console.error("Failed to fetch current user", error);
            return null;
        }
    },

    // Get saved shops for a user
    getSavedShops: async (userId: number | string) => {
        try {
            const response = await authFetch(`${API_BASE_URL}/api/users/${userId}/saved_shops`);
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
