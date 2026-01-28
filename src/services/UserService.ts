
import { API_BASE_URL } from '@/lib/api';

export const UserService = {
    // Fetch full user details by ID
    fetchUser: async (userId: string | number) => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/users/${userId}`, {
                credentials: 'include' // Include cookies
            });
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
            const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
                credentials: 'include' // Include cookies
            });
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
            const response = await fetch(`${API_BASE_URL}/api/users/${userId}/saved_shops`, {
                credentials: 'include' // Include cookies
            });
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
