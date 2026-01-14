import { useEffect, useState, useRef, useCallback } from 'react';
import { API_BASE_URL } from '@/lib/api';
import { ContentCard } from '@/components/ContentCard';
import { User as UserIcon, Bell, Search, PenLine } from 'lucide-react';
import { useUser } from '@/context/UserContext';

interface Props {
    onWrite: () => void;
    refreshTrigger?: number;
}

const CHIPS = ["Trending", "Following", "Nearby", "Liked"];

export const HomeTab: React.FC<Props> = ({ onWrite, refreshTrigger }) => {
    const [_, setPage] = useState(1);
    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const { user: currentUser } = useUser();
    const [activeChip, setActiveChip] = useState("Trending");
    const observer = useRef<IntersectionObserver | null>(null);

    // Smart Header & Scroll Preservation
    const [isHeaderVisible, setIsHeaderVisible] = useState(true);
    const lastScrollY = useRef(0);
    const scrollPositions = useRef<{ [key: string]: number }>({});
    const containerRef = useRef<HTMLDivElement>(null);
    const headerRef = useRef<HTMLDivElement>(null);
    const [headerHeight, setHeaderHeight] = useState(0);

    // Measure Header Height for padding
    useEffect(() => {
        if (headerRef.current) {
            setHeaderHeight(headerRef.current.offsetHeight);
        }
    }, []);

    // Scroll Handler
    const handleScroll = () => {
        if (!containerRef.current) return;
        const currentScrollY = containerRef.current.scrollTop;
        const diff = currentScrollY - lastScrollY.current;

        // Smart Header Logic
        if (currentScrollY < 10) {
            setIsHeaderVisible(true);
        } else if (Math.abs(diff) > 10) { // Threshold
            if (diff > 0) { // Scrolling Down
                setIsHeaderVisible(false);
            } else { // Scrolling Up
                setIsHeaderVisible(true);
            }
        }
        lastScrollY.current = currentScrollY;
    };

    const handleChipChange = (newChip: string) => {
        if (containerRef.current) {
            // Save current scroll
            scrollPositions.current[activeChip] = containerRef.current.scrollTop;
        }

        setActiveChip(newChip);

        // Restore scroll for new chip (after render)
        requestAnimationFrame(() => {
            if (containerRef.current) {
                const savedPos = scrollPositions.current[newChip] || 0;
                containerRef.current.scrollTo({ top: savedPos, behavior: 'instant' });
                // Ensure header is visible if we want "chip list to top" style upon switch or just nice UX
                // But user requirement says: "Clicking chip moves list to top... content remembers scroll".
                // If we restore deep scroll, we might want to show header? 
                // Let's ensure header is visible on switch.
                setIsHeaderVisible(true);
            }
        });
    };

    // ... existing fetchFeed and useEffect ...

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

    // Double-tap refresh listener
    useEffect(() => {
        if (refreshTrigger && refreshTrigger > 0) {
            setPage(1);
            setHasMore(true);
            setItems([]); // Optional: clear items or keep them until new load? keeping might be better UX, but let's clear for clear feedback or standard refresh behavior
            // Actually, for "refresh", usually we keep items and replace.
            // But to simplify pagination reset, let's just fetch page 1.
            fetchFeed(1);

            // Scroll to top
            if (containerRef.current) {
                containerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
            }
        }
    }, [refreshTrigger]);

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
        <div className="flex flex-col h-full bg-background relative overflow-hidden">
            {/* Smart Header */}
            <div
                ref={headerRef}
                className={`absolute top-0 left-0 right-0 bg-background/95 backdrop-blur-sm z-50 px-5 pt-6 pb-2 transition-transform duration-300 ${isHeaderVisible ? 'translate-y-0' : '-translate-y-full'
                    }`}
            >
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

            </div>

            {/* Feed List */}
            <div
                ref={containerRef}
                className="flex-1 overflow-y-auto"
                onScroll={handleScroll}
                style={{ paddingTop: headerHeight }} // Compensate for fixed header
            >
                <div className="pb-24">
                    {/* Chips */}
                    <div className="flex gap-2 overflow-x-auto no-scrollbar mb-6 px-5">
                        {CHIPS.map(chip => (
                            <button
                                key={chip}
                                onClick={() => handleChipChange(chip)}
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

                    {/* Upload Nudge Banner */}
                    <div
                        onClick={onWrite}
                        className="mx-5 mb-6 p-6 rounded-3xl shadow-sm relative overflow-hidden cursor-pointer group"
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
                                <div className="bg-muted" />
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
