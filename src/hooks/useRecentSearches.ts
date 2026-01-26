import { useState, useEffect } from 'react';

const STORAGE_KEY = 'mimy_recent_searches';
const MAX_ITEMS = 10;

export const useRecentSearches = () => {
    const [recentSearches, setRecentSearches] = useState<string[]>([]);

    useEffect(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                setRecentSearches(JSON.parse(stored));
            }
        } catch (error) {
            console.error('Failed to load recent searches:', error);
        }
    }, []);

    const addSearch = (keyword: string) => {
        if (!keyword || keyword.trim().length === 0) return;
        const trimmed = keyword.trim();

        setRecentSearches((prev) => {
            // Remove duplicates and add to front
            const filtered = prev.filter((item) => item !== trimmed);
            const newList = [trimmed, ...filtered].slice(0, MAX_ITEMS);

            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(newList));
            } catch (error) {
                console.error('Failed to save recent searches:', error);
            }

            return newList;
        });
    };

    const removeSearch = (keyword: string) => {
        setRecentSearches((prev) => {
            const newList = prev.filter((item) => item !== keyword);
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(newList));
            } catch (error) {
                console.error('Failed to update recent searches:', error);
            }
            return newList;
        });
    };

    const clearSearches = () => {
        setRecentSearches([]);
        try {
            localStorage.removeItem(STORAGE_KEY);
        } catch (error) {
            console.error('Failed to clear recent searches:', error);
        }
    };

    return {
        recentSearches,
        addSearch,
        removeSearch,
        clearSearches
    };
};
