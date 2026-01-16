
export const ShopService = {
    search: async (query: string) => {
        const response = await fetch(`/api/shops/search?q=${encodeURIComponent(query)}`);
        if (!response.ok) throw new Error('Failed to search shops');
        return response.json();
    },
    getById: async (id: number) => {
        const response = await fetch(`/api/shops/${id}`);
        if (!response.ok) throw new Error('Failed to fetch shop');
        return response.json();
    },
    getReviews: async (shopId: number, page: number = 1, sort: 'popular' | 'similar' = 'popular', userId?: number) => {
        let url = `/api/shops/${shopId}/reviews?page=${page}&limit=20&sort=${sort}`;
        if (userId) url += `&user_id=${userId}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error('Failed to fetch reviews');
        return response.json();
    }
};
