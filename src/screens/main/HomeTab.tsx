import { useEffect, useState, useRef, useCallback } from 'react';
import { API_BASE_URL } from '@/lib/api';
import { ContentCard } from '@/components/ContentCard';
import { Bell, Search } from 'lucide-react';

interface Props {
    onWrite: () => void;
}

const CHIPS = ["Trending", "Following", "Nearby", "Liked"];

export const HomeTab: React.FC<Props> = ({ onWrite }) => {
    const [_, setPage] = useState(1);
    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [activeChip, setActiveChip] = useState("Trending");
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
            <div className="sticky top-0 bg-[var(--color-background)]/95 backdrop-blur-sm z-10 px-5 pt-4 pb-2">
                <div className="flex items-center justify-between mb-4">
                    <h1 className="text-2xl font-bold font-display">Today</h1>
                    <div className="flex gap-4">
                        <button className="p-2 rounded-full hover:bg-[var(--color-gray-50)] transition-colors relative">
                            <Bell className="w-6 h-6 text-[var(--color-text-primary)]" />
                            <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border border-[var(--color-background)]" />
                        </button>
                        <button className="p-2 rounded-full hover:bg-[var(--color-gray-50)] transition-colors">
                            <Search className="w-6 h-6 text-[var(--color-text-primary)]" />
                        </button>
                    </div>
                </div>

                {/* Chips */}
                <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
                    {CHIPS.map(chip => (
                        <button
                            key={chip}
                            onClick={() => setActiveChip(chip)}
                            className={`
                                px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors border
                                ${activeChip === chip
                                    ? 'bg-[var(--color-gray-900)] text-white border-transparent'
                                    : 'bg-[var(--color-surface)] text-[var(--color-text-secondary)] border-[var(--color-border)] hover:bg-[var(--color-gray-50)]'
                                }
                            `}
                        >
                            {chip}
                        </button>
                    ))}
                </div>
            </div>

            {/* Feed List */}
            <div className="flex-1 overflow-y-auto">
                <div className="pb-24 pt-2">
                    {/* Upload Nudge Banner */}
                    <div className="mx-5 mb-6 p-6 rounded-3xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm">
                        <h2 className="text-xl font-bold mb-2">
                            오늘의 미식 경험을<br />기록해보세요
                        </h2>
                        <p className="text-[var(--color-text-secondary)] mb-6 text-sm leading-relaxed">
                            방문한 맛집, 카페에서의 경험을 남겨주세요.<br />
                            데이터가 쌓일수록 더 정확한 추천을 받을 수 있어요.
                        </p>
                        <button
                            onClick={onWrite}
                            className="px-6 py-3 bg-[#4F46E5] text-white rounded-full font-bold text-sm hover:bg-[#4338CA] transition-colors shadow-lg shadow-indigo-500/20"
                        >
                            기록하기 {'>'}
                        </button>
                    </div>

                    {items.map((item, index) => {
                        const isLast = index === items.length - 1;
                        return (
                            <div key={`${item.id}-${index}`} ref={isLast ? lastElementRef : undefined}>
                                <ContentCard
                                    user={item.user}
                                    content={item}
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
