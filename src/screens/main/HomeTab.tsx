import { useEffect, useState, useRef, useCallback } from 'react';
import { API_BASE_URL } from '@/lib/api';
import { ContentCard } from '@/components/ContentCard';
import { UserService } from '@/services/UserService';
import { User as UserIcon, Bell, Search, PenLine } from 'lucide-react';

interface Props {
    onWrite: () => void;
}

const CHIPS = ["Trending", "Following", "Nearby", "Liked"];

export const HomeTab: React.FC<Props> = ({ onWrite }) => {
    const [_, setPage] = useState(1);
    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [currentUser, setCurrentUser] = useState<any>(null);
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
        <div className="flex flex-col h-full bg-background">
            {/* Header */}
            <div className="sticky top-0 bg-background/95 backdrop-blur-sm z-10 px-5 pt-4 pb-2">
                <div className="flex items-center justify-between mb-4">
                    <h1 className="text-2xl font-bold">Today</h1>
                    <div className="flex gap-4">
                        <button className="p-2 rounded-full hover:bg-muted transition-colors relative">
                            <Bell className="w-6 h-6 text-foreground" />
                            <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border border-background" />
                        </button>
                        <button className="p-2 rounded-full hover:bg-muted transition-colors">
                            <Search className="w-6 h-6 text-foreground" />
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
                                px-4 py-2 text-sm font-medium rounded-full transition-colors whitespace-nowrap
                                ${activeChip === chip
                                    ? 'bg-primary text-primary-foreground shadow-sm'
                                    : 'bg-muted/50 text-muted-foreground hover:bg-muted'
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
                    <div
                        onClick={onWrite}
                        className="mx-5 mb-6 p-6 rounded-3xl border border-border shadow-sm relative overflow-hidden cursor-pointer group"
                        style={{
                            background: 'linear-gradient(135deg, #FDFBF7 0%, #F5F3FF 100%)'
                        }}
                    >
                        <div className="relative z-10 flex justify-between items-start">
                            <div className="flex-1 pr-4">
                                <h2 className="text-xl font-bold mb-2 text-foreground leading-tight">
                                    오늘 {currentUser?.nickname || '회원'}님의<br />미식은 무엇이었나요
                                </h2>
                                <p className="text-muted-foreground text-sm leading-relaxed">
                                    방문한 곳의 경험을 남겨주세요
                                </p>
                            </div>

                            {/* User Profile + Write Button Group */}
                            <div className="flex relative mt-1">
                                <div className="w-12 h-12 rounded-full border-2 border-background overflow-hidden bg-muted shadow-md z-10">
                                    {currentUser?.profile_image ? (
                                        <img
                                            src={currentUser.profile_image}
                                            alt="Profile"
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-400">
                                            <UserIcon size={20} />
                                        </div>
                                    )}
                                </div>
                                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center absolute -bottom-1 -right-1 z-20 shadow-lg border-2 border-background group-hover:scale-110 transition-transform">
                                    <PenLine size={14} />
                                </div>
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
                                <div className="h-1 bg-muted/50" />
                            </div>
                        );
                    })}

                    {loading && (
                        <div className="py-8 flex justify-center">
                            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                        </div>
                    )}

                    {!hasMore && items.length > 0 && (
                        <div className="py-8 text-center text-muted-foreground text-sm">
                            모든 콘텐츠를 확인했습니다.
                        </div>
                    )}

                    {!loading && items.length === 0 && (
                        <div className="py-20 text-center text-muted-foreground">
                            등록된 콘텐츠가 없습니다.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
