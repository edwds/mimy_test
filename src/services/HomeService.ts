import { API_BASE_URL } from '@/lib/api';
import { authFetch } from '@/lib/authFetch';

export const HomeService = {
    async getSimilarTasteReviews(limit: number = 10) {
        const res = await authFetch(`${API_BASE_URL}/api/content/feed?filter=similar_taste&limit=${limit}&dedup=1`);
        if (!res.ok) return [];
        return res.json();
    },

    async getSimilarTasteReviewsByRegion(lat: number, lon: number, radius: number = 5, limit: number = 10, excludeIds?: number[], foodKinds?: string[]) {
        let url = `${API_BASE_URL}/api/content/feed?filter=similar_taste_region&regionLat=${lat}&regionLon=${lon}&regionRadius=${radius}&limit=${limit}&dedup=1`;
        if (excludeIds && excludeIds.length > 0) {
            url += `&excludeIds=${excludeIds.join(',')}`;
        }
        if (foodKinds && foodKinds.length > 0) {
            url += `&foodKinds=${foodKinds.join(',')}`;
        }
        const res = await authFetch(url);
        if (!res.ok) return [];
        return res.json();
    },

    async getRecommendedShops(lat: number, lon: number, limit: number = 10) {
        const res = await authFetch(
            `${API_BASE_URL}/api/shops/discovery?lat=${lat}&lon=${lon}&highMatchOnly=true&excludeRanked=true&limit=${limit}`
        );
        if (!res.ok) return [];
        return res.json();
    },

    async getVsCandidates(userId: number) {
        const res = await authFetch(`${API_BASE_URL}/api/vs/candidates?user_id=${userId}`);
        if (!res.ok) return [];
        return res.json();
    },

    async getHateCandidates(userId: number) {
        const res = await authFetch(`${API_BASE_URL}/api/hate/candidates?user_id=${userId}`);
        if (!res.ok) return [];
        return res.json();
    },

    async getSimilarTasteUsers(limit: number = 5) {
        const res = await authFetch(`${API_BASE_URL}/api/users/recommendations?limit=${limit}`);
        if (!res.ok) return [];
        return res.json();
    },

    async getSimilarTasteLists(count: number = 5) {
        const res = await authFetch(`${API_BASE_URL}/api/users/similar-taste-lists?count=${count}&type=random`);
        if (!res.ok) return [];
        return res.json();
    },

    async getPopularPosts(limit: number = 10) {
        const res = await authFetch(`${API_BASE_URL}/api/content/feed?filter=popular_posts&limit=${limit}`);
        if (!res.ok) return [];
        return res.json();
    },

    async getFollowingFeed(limit: number = 10) {
        const res = await authFetch(`${API_BASE_URL}/api/content/feed?filter=follow&limit=${limit}`);
        if (!res.ok) return [];
        return res.json();
    },

    async getTopLists() {
        const res = await authFetch(`${API_BASE_URL}/api/shops/top-lists`);
        if (!res.ok) return { overall: [], byFoodKind: [] };
        return res.json();
    },

    async getLeaderboardTop(filter: string, key?: string | null, limit: number = 10) {
        let url = `${API_BASE_URL}/api/users/leaderboard?filter=${filter}&limit=${limit}`;
        if (key) {
            url += `&key=${encodeURIComponent(key)}`;
        }
        const res = await authFetch(url);
        if (!res.ok) return [];
        return res.json();
    },

    async getBanners() {
        const res = await authFetch(`${API_BASE_URL}/api/banners`);
        if (!res.ok) return [];
        return res.json();
    },
};
