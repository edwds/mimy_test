import { API_BASE_URL } from '@/lib/api';
import { authFetch } from '@/lib/authFetch';

export interface RelayShop {
    id: number;
    name: string;
    description: string | null;
    thumbnail_img: string | null;
    food_kind: string | null;
    address_full: string | null;
    address_region: string | null;
    shop_user_match_score: number | null;
    distance_km: number;
    source?: 'nearby' | 'saved' | 'global';
}

export interface RelayShopsResponse {
    shops: RelayShop[];
    has_more: boolean;
}

export const RelayService = {
    fetchShops: async (
        lat: number,
        lon: number,
        offset: number = 0,
        batchSize: number = 20
    ): Promise<RelayShopsResponse> => {
        const params = new URLSearchParams({
            lat: lat.toString(),
            lon: lon.toString(),
            offset: offset.toString(),
            batch_size: batchSize.toString()
        });

        const response = await authFetch(
            `${API_BASE_URL}/api/relay/shops?${params.toString()}`
        );

        if (!response.ok) {
            throw new Error('Failed to fetch relay shops');
        }

        return response.json();
    }
};
