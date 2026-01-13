
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { API_BASE_URL } from '@/lib/api';
import { ContentCard } from '@/components/ContentCard';

export const HomeTab = () => {
    const [page, setPage] = useState(1);
    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const observer = useRef<IntersectionObserver | null>(null);

    const fetchFeed = async (pageNum: number) => {
        if (loading) return;
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/content/feed?page=${pageNum}&limit=20`);
            if (res.ok) {
                const data = await res.json();
                if (data.length < 20) {
                    setHasMore(false);
                }
                setItems(prev => pageNum === 1 ? data : [...prev, ...data]);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchFeed(1);
    }, []);

    const lastElementRef = useCallback((node: HTMLDivElement) => {
        if (loading) return;
        if (observer.current) observer.current.disconnect();
        observer.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && hasMore) {
                setPage(prev => {
                    const nextPage = prev + 1;
                    fetchFeed(nextPage);
                    return nextPage;
                });
            }
        });
        if (node) observer.current.observe(node);
    }, [loading, hasMore]);

    return (
        <div className="flex flex-col h-full bg-[var(--color-background)]">
            {/* Header */}
            <div className="sticky top-0 bg-[var(--color-surface)]/80 backdrop-blur-md z-10 border-b border-[var(--color-border)] px-5 h-14 flex items-center justify-between">
                <div className="font-display text-xl font-bold tracking-tight text-[var(--color-primary)]">Mimy</div>
            </div>

            {/* Feed List */}
            <div className="flex-1 overflow-y-auto">
                <div className="pb-24">
                    {items.map((item, index) => {
                        const isLast = index === items.length - 1;
                        return (
                            <div key={`${item.id}-${index}`} ref={isLast ? lastElementRef : undefined}>
                                <ContentCard
                                    user={item.user}
                                    content={item}
                                // Handlers can be added later (like, comment, etc.)
                                />
                                <div className="h-1 bg-[var(--color-gray-50)]" />
                            </div>
                        );
                    })}

                    {loading && (
                        <div className="py-8 flex justify-center">
                            <div className="w-6 h-6 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
                        </div>
                    )}

                    {!hasMore && items.length > 0 && (
                        <div className="py-8 text-center text-[var(--color-text-tertiary)] text-sm">
                            모든 콘텐츠를 확인했습니다.
                        </div>
                    )}

                    {!loading && items.length === 0 && (
                        <div className="py-20 text-center text-[var(--color-text-tertiary)]">
                            등록된 콘텐츠가 없습니다.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
