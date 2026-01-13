
export const ContentService = {
    create: async (data: any) => {
        const response = await fetch('/api/content', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (!response.ok) throw new Error('Failed to create content');
        return response.json();
    },
    submitRanking: async (data: { user_id: number; shop_id: number; sort_key: number }) => {
        // Deprecated: use applyRanking
        const response = await fetch('/api/content/ranking', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (!response.ok) throw new Error('Failed to submit ranking');
        return response.json();
    },
    applyRanking: async (data: { user_id: number; shop_id: number; insert_index: number }) => {
        const response = await fetch('/api/content/ranking/apply', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (!response.ok) throw new Error('Failed to apply ranking');
        return response.json();
    }
};
