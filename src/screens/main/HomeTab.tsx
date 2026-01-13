import { useEffect, useState, useRef, useCallback } from 'react';
import { API_BASE_URL } from '@/lib/api';
import { ContentCard } from '@/components/ContentCard';
import { UserService } from '@/services/UserService';
import { User as UserIcon, PencilIcon } from 'lucide-react';

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
                    <div
                        role="button"
                        tabIndex={0}
                        onClick={onWrite}
                        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onWrite()}
                        className="
    mx-4 mt-6 mb-4
    rounded-2xl border border-[var(--color-border)]
    px-4 py-3
    flex items-center gap-3
    cursor-pointer
    transition hover:shadow-md
    bg-[var(--color-surface)]
    relative overflow-hidden
  "
                    >
                        {/* subtle highlight */}
                        <div
                            className="absolute inset-0 opacity-60 pointer-events-none"
                            style={{
                                background:
                                    'radial-gradient(600px circle at 20% 0%, rgba(255,255,255,0.9), transparent 40%), radial-gradient(600px circle at 90% 80%, rgba(0,0,0,0.04), transparent 45%)',
                            }}
                        />

                        <div className="shrink-0 relative">
                            {currentUser?.profile_image ? (
                                <img
                                    src={currentUser.profile_image}
                                    alt="Profile"
                                    className="w-10 h-10 rounded-full object-cover border border-[var(--color-border)]"
                                />
                            ) : (
                                <div className="w-10 h-10 rounded-full bg-[var(--color-gray-100)] flex items-center justify-center text-[var(--color-text-tertiary)] border border-[var(--color-border)]">
                                    <UserIcon size={18} />
                                </div>
                            )}
                        </div>

                        <div className="flex-1 min-w-0 relative">
                            <div className="text-sm text-[var(--color-text-primary)] truncate">
                                오늘의 미식 경험
                            </div>
                            <div className="text-xs text-[var(--color-text-tertiary)] mt-0.5 truncate">
                                남기면 추천이 더 정확해져요
                            </div>
                        </div>

                        <div className="shrink-0 relative">
                            <div
                                className="
        h-8 px-3 rounded-full   
        bg-[var(--color-gray-900)]
        text-white text-xs font-medium
        flex items-center gap-2
      "
                                aria-hidden
                            >
                                <PencilIcon size={14} />
                                기록
                            </div>
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
