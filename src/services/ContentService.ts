
import { API_BASE_URL } from '@/lib/api';

export const ContentService = {
    create: async (data: any) => {
        const response = await fetch(`${API_BASE_URL}/api/content`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(data),
        });
        if (!response.ok) throw new Error('Failed to create content');
        return response.json();
    },
    submitRanking: async (data: { shop_id: number; sort_key: number }) => {
        // Deprecated: use applyRanking
        const response = await fetch(`${API_BASE_URL}/api/content/ranking`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(data),
        });
        if (!response.ok) throw new Error('Failed to submit ranking');
        return response.json();
    },
    applyRanking: async (data: { shop_id: number; insert_index: number; satisfaction?: string }) => {
        const response = await fetch(`${API_BASE_URL}/api/content/ranking/apply`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(data),
        });
        if (!response.ok) throw new Error('Failed to apply ranking');
        return response.json();
    }
};
