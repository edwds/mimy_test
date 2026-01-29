import { API_BASE_URL } from '@/lib/api';
import { authFetch } from '@/lib/authFetch';

export const ContentService = {
    create: async (data: any) => {
        console.log('[ContentService] Creating content...');
        console.log('[ContentService] Payload:', JSON.stringify(data, null, 2));

        try {
            const response = await authFetch(`${API_BASE_URL}/api/content`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            console.log('[ContentService] Response status:', response.status);

            if (!response.ok) {
                let errorText = '';
                try {
                    errorText = await response.text();
                    console.error('[ContentService] Error response body:', errorText);
                } catch (e) {
                    console.error('[ContentService] Could not read error response');
                }

                if (response.status === 401) {
                    throw new Error('로그인이 필요합니다. 다시 로그인해주세요.');
                }
                throw new Error(`글 등록 실패 (${response.status}): ${errorText || response.statusText}`);
            }

            const result = await response.json();
            console.log('[ContentService] ✅ Content created successfully:', result);
            return result;
        } catch (error: any) {
            console.error('[ContentService] ❌ Exception during create:', error);
            throw error;
        }
    },
    submitRanking: async (data: { shop_id: number; sort_key: number }) => {
        // Deprecated: use applyRanking
        const response = await authFetch(`${API_BASE_URL}/api/content/ranking`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (!response.ok) throw new Error('Failed to submit ranking');
        return response.json();
    },
    applyRanking: async (data: { shop_id: number; insert_index: number; satisfaction?: string }) => {
        const response = await authFetch(`${API_BASE_URL}/api/content/ranking/apply`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (!response.ok) throw new Error('Failed to apply ranking');
        return response.json();
    }
};
