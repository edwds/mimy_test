import { useEffect, useState, useRef, useCallback } from 'react';
import { API_BASE_URL } from '@/lib/api';
import { ContentCard } from '@/components/ContentCard';
import { UserService } from '@/services/UserService';
import { User as UserIcon } from 'lucide-react';

interface Props {
    onWrite: () => void;
}

export const HomeTab: React.FC<Props> = ({ onWrite }) => {
    const [_, setPage] = useState(1);
    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [currentUser, setCurrentUser] = useState<any>(null);
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
        // Fetch current user async
        UserService.getCurrentUser().then((user: any) => {
            if (user) setCurrentUser(user);
        });
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
            {/* Feed List */}
            <div className="flex-1 overflow-y-auto">
                <div className="pb-24">
                    {/* Upload Nudge */}
                    <div className="px-5 py-4 border-b border-[var(--color-border)] flex gap-3 bg-[var(--color-surface)]" onClick={onWrite}>
                        <div className="shrink-0">
                            {currentUser?.profile_image ? (
                                <img
                                    src={currentUser.profile_image}
                                    alt="Profile"
                                    className="w-10 h-10 rounded-full object-cover border border-[var(--color-border)]"
                                />
                            ) : (
                                <div className="w-10 h-10 rounded-full bg-[var(--color-gray-100)] flex items-center justify-center text-[var(--color-text-tertiary)]">
                                    <UserIcon size={20} />
                                </div>
                            )}
                        </div>
                        <div className="flex-1">
                            <button
                                className="w-full h-10 rounded-full bg-[var(--color-gray-50)] text-left px-4 text-[var(--color-text-tertiary)] text-sm hover:bg-[var(--color-gray-100)] transition-colors flex items-center justify-between group"
                            >
                                <span>오늘의 미식 경험을 기록해보세요!</span>
                            </button>
                        </div>
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
