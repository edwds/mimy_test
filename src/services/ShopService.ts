
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
    }
};
