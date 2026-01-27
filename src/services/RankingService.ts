
import { API_BASE_URL } from '@/lib/api';

export interface RankingItem {
    id: number;
    user_id: number;
    shop_id: number;
    rank: number;
    satisfaction_tier: number;
    shop: {
        id: number;
        name: string;
        category: string;
        thumbnail_img: string | null;
        address_region: string | null;
    };
}

export const RankingService = {
    getAll: async (userId: number): Promise<RankingItem[]> => {
        const res = await fetch(`${API_BASE_URL}/api/ranking/all?user_id=${userId}`);
        if (!res.ok) throw new Error('Failed to fetch rankings');
        return res.json();
    },

    delete: async (shopId: number, userId: number) => {
        const res = await fetch(`${API_BASE_URL}/api/ranking/${shopId}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: userId })
        });
        if (!res.ok) throw new Error('Failed to delete ranking');
        return res.json();
    },

    reorder: async (userId: number, items: { shop_id: number; rank: number; satisfaction_tier: number }[]) => {
        const res = await fetch(`${API_BASE_URL}/api/ranking/reorder`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: userId, items })
        });
        if (!res.ok) throw new Error('Failed to reorder ranking');
        return res.json();
    }
};
