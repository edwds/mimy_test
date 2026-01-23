import { API_BASE_URL } from '@/lib/api';

export const ShopService = {
    search: async (query: string) => {
        const userId = localStorage.getItem("mimy_user_id");
        const headers: HeadersInit = userId ? { 'x-user-id': userId } : {};
        const response = await fetch(`${API_BASE_URL}/api/shops/search?q=${encodeURIComponent(query)}`, { headers });
        if (!response.ok) throw new Error('Failed to search shops');
        return response.json();
    },
    getById: async (id: number) => {
        const userId = localStorage.getItem("mimy_user_id");
        const headers: HeadersInit = userId ? { 'x-user-id': userId } : {};
        const response = await fetch(`${API_BASE_URL}/api/shops/${id}`, { headers });
        if (!response.ok) throw new Error('Failed to fetch shop');
        return response.json();
    },
    getReviews: async (shopId: number, page: number = 1, sort: 'popular' | 'similar' = 'popular', userId?: number) => {
        let url = `${API_BASE_URL}/api/shops/${shopId}/reviews?page=${page}&limit=20&sort=${sort}`;
        if (userId) url += `&user_id=${userId}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error('Failed to fetch reviews');
        return response.json();
    },
    searchGoogle: async (query: string, region?: string) => {
        let url = `${API_BASE_URL}/api/shops/search/google?q=${encodeURIComponent(query)}`;
        if (region) url += `&region=${encodeURIComponent(region)}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error('Failed to search Google Places');
        return response.json();
    },
    importGoogleShop: async (placeData: any) => {
        const response = await fetch(`${API_BASE_URL}/api/shops/import-google`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(placeData)
        });
        if (!response.ok) throw new Error('Failed to import shop');
        return response.json();
    },
    toggleSave: async (shopId: number) => {
        const userId = localStorage.getItem("mimy_user_id");
        if (!userId) throw new Error("User not logged in");

        const response = await fetch(`${API_BASE_URL}/api/shops/${shopId}/save`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-user-id': userId
            }
        });

        if (!response.ok) throw new Error('Failed to toggle save');
        return response.json();
    }
};
