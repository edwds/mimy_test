import { API_BASE_URL } from '@/lib/api';
import { authFetch } from '@/lib/authFetch';

// --- 5-Tier System Constants ---
export type Satisfaction = 'goat' | 'best' | 'good' | 'ok' | 'bad';

export const TIER_NUM: Record<Satisfaction, number> = {
    goat: 4, best: 3, good: 2, ok: 1, bad: 0,
};

export const TIER_FROM_NUM: Record<number, Satisfaction> = {
    4: 'goat', 3: 'best', 2: 'good', 1: 'ok', 0: 'bad',
};

export const TIER_ORDER: Satisfaction[] = ['goat', 'best', 'good', 'ok', 'bad'];

// GOAT/BEST are ranked tiers (binary comparison)
// GOOD/OK/BAD are bucket tiers (no comparison)
export const RANKED_TIERS: Satisfaction[] = ['goat', 'best'];
export const BUCKET_TIERS: Satisfaction[] = ['good', 'ok', 'bad'];

export const TIER_LABEL: Record<Satisfaction, string> = {
    goat: 'GOAT', best: 'BEST', good: 'GOOD', ok: 'OK', bad: 'BAD',
};

export const TIER_COLOR: Record<Satisfaction, string> = {
    goat: 'text-purple-500',
    best: 'text-orange-500',
    good: 'text-blue-500',
    ok: 'text-yellow-500',
    bad: 'text-gray-400',
};

export const TIER_BG: Record<Satisfaction, string> = {
    goat: 'bg-purple-50',
    best: 'bg-orange-50',
    good: 'bg-blue-50',
    ok: 'bg-yellow-50',
    bad: 'bg-gray-50',
};

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

export interface TierLimits {
    total: number;
    limits: { goatMax: number; bestMax: number };
    counts: Record<Satisfaction, number>;
}

export const RankingService = {
    getAll: async (): Promise<RankingItem[]> => {
        const res = await authFetch(`${API_BASE_URL}/api/ranking/all`);
        if (!res.ok) throw new Error('Failed to fetch rankings');
        return res.json();
    },

    getTierLimits: async (): Promise<TierLimits> => {
        const res = await authFetch(`${API_BASE_URL}/api/ranking/tier-limits`);
        if (!res.ok) throw new Error('Failed to fetch tier limits');
        return res.json();
    },

    deleteAll: async () => {
        const res = await authFetch(`${API_BASE_URL}/api/ranking/all`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' }
        });
        if (!res.ok) throw new Error('Failed to delete all rankings');
        return res.json();
    },

    delete: async (shopId: number) => {
        const res = await authFetch(`${API_BASE_URL}/api/ranking/${shopId}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' }
        });
        if (!res.ok) throw new Error('Failed to delete ranking');
        return res.json();
    },

    reorder: async (items: { shop_id: number; rank: number; satisfaction_tier: number }[]) => {
        const res = await authFetch(`${API_BASE_URL}/api/ranking/reorder`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ items })
        });
        if (!res.ok) throw new Error('Failed to reorder ranking');
        return res.json();
    },

    batchCreate: async (items: { shop_id: number; satisfaction: Satisfaction }[]) => {
        const res = await authFetch(`${API_BASE_URL}/api/ranking/batch`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ items })
        });
        if (!res.ok) throw new Error('Failed to batch create rankings');
        return res.json();
    }
};
