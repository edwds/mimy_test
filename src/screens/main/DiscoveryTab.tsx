import { useState, useEffect, useRef, useCallback } from 'react';
import { Search } from 'lucide-react';
import { ShopCard } from '@/components/ShopCard';
import { API_BASE_URL } from '@/lib/api';

// Generate a random seed once per session (or component mount)
// To keep it persistent across tab switches, we might want to store it in session storage or parent state.
// User requested: "Maintain in current session (refresh resets)".
// Component state is enough if we don't unmount? But Tab switching usually unmounts/remounts or hides.
// If MainTab conditionally renders, state is lost.
// Better to store in sessionStorage to survive tab switch but reset on refresh.
const getSessionSeed = () => {
    let seed = sessionStorage.getItem('discovery_seed');
    if (!seed) {
        seed = Math.random().toString(36).substring(7);
        sessionStorage.setItem('discovery_seed', seed);
    }
    return seed;
};

interface Props {
    refreshTrigger?: number;
}

export const DiscoveryTab = ({ refreshTrigger }: Props) => {
    const [shops, setShops] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [, setPage] = useState(1);
    const observer = useRef<IntersectionObserver | null>(null);
    const seedRef = useRef(getSessionSeed());

    const fetchShops = async (pageNum: number) => {
        if (loading) return;
        setLoading(true);
        try {
            const userId = localStorage.getItem('mimy_user_id');
            const headers: any = {};
            if (userId) {
                headers['x-user-id'] = userId;
            }

            const res = await fetch(
                `${API_BASE_URL}/api/shops/discovery?page=${pageNum}&limit=20&seed=${seedRef.current}`,
                { headers }
            );

            if (res.ok) {
                const data = await res.json();
                if (data.length < 20) {
                    setHasMore(false);
                }
                setShops(prev => pageNum === 1 ? data : [...prev, ...data]);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // Initial fetch
        fetchShops(1);
    }, []);

    // Refresh Listener
    useEffect(() => {
        if (refreshTrigger && refreshTrigger > 0) {
            // New Seed for fresh discovery
            const newSeed = Math.random().toString(36).substring(7);
            sessionStorage.setItem('discovery_seed', newSeed);
            seedRef.current = newSeed;

            setShops([]);
            setPage(1);
            setHasMore(true);
            fetchShops(1);
        }
    }, [refreshTrigger]);

    const lastElementRef = useCallback((node: HTMLDivElement) => {
        if (loading) return;
        if (observer.current) observer.current.disconnect();
        observer.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && hasMore) {
                setPage(prev => {
                    const nextPage = prev + 1;
                    fetchShops(nextPage);
                    return nextPage;
                });
            }
        });
        if (node) observer.current.observe(node);
    }, [loading, hasMore]);

    // Smart Header State
    const [isHeaderVisible, setIsHeaderVisible] = useState(true);
    const lastScrollY = useRef(0);
    const containerRef = useRef<HTMLDivElement>(null);
    const headerRef = useRef<HTMLDivElement>(null);
    const [headerHeight, setHeaderHeight] = useState(0);

    useEffect(() => {
        if (headerRef.current) {
            setHeaderHeight(headerRef.current.offsetHeight);
        }
    }, []);

    const handleScroll = () => {
        if (!containerRef.current) return;
        const currentScrollY = containerRef.current.scrollTop;
        const diff = currentScrollY - lastScrollY.current;

        if (currentScrollY < 10) {
            setIsHeaderVisible(true);
        } else if (Math.abs(diff) > 10) {
            if (diff > 0) {
                setIsHeaderVisible(false);
            } else {
                setIsHeaderVisible(true);
            }
        }
        lastScrollY.current = currentScrollY;
    };

    const handleSave = async (shopId: number) => {
        const userId = localStorage.getItem('mimy_user_id');
        if (!userId) {
            alert("로그인이 필요합니다.");
            return;
        }

        // Optimistic Update
        setShops(prev => prev.map(shop => {
            if (shop.id === shopId) {
                return {
                    ...shop,
                    is_saved: !shop.is_saved,
                    saved_at: !shop.is_saved ? new Date().toISOString() : null
                };
            }
            return shop;
        }));

        try {
            const res = await fetch(`${API_BASE_URL}/api/shops/${shopId}/save`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: parseInt(userId) })
            });
            if (!res.ok) {
                // Revert on error
                throw new Error("Save failed");
            }
        } catch (e) {
            console.error(e);
            alert("저장에 실패했습니다.");
            // Revert state
            setShops(prev => prev.map(shop => {
                if (shop.id === shopId) {
                    return { ...shop, is_saved: !shop.is_saved };
                }
                return shop;
            }));
        }
    };

    return (
        <div className="flex flex-col h-full bg-background relative overflow-hidden">
            {/* Smart Header */}
            <div
                ref={headerRef}
                className={`absolute top-0 left-0 right-0 bg-background/95 backdrop-blur-sm z-50 px-5 pt-6 pb-2 transition-transform duration-300 border-b border-border/50 ${isHeaderVisible ? 'translate-y-0' : '-translate-y-full'}`}
            >
                <div className="flex items-center justify-between mb-4">
                    <h1 className="text-2xl font-bold">Discovery</h1>
                    <div className="flex gap-4">
                        <button className="p-2 rounded-full hover:bg-muted transition-colors relative">
                            <Search className="w-6 h-6 text-foreground" />
                        </button>
                    </div>
                </div>
            </div>

            {/* List */}
            <div
                ref={containerRef}
                className="flex-1 overflow-y-auto px-5 pb-24"
                onScroll={handleScroll}
                style={{ paddingTop: headerHeight + 20 }} // Add some extra padding used in list
            >
                {shops.map((shop, index) => {
                    const isLast = index === shops.length - 1;
                    return (
                        <div key={`${shop.id}-${index}`} ref={isLast ? lastElementRef : undefined}>
                            <ShopCard
                                shop={shop}
                                onSave={handleSave}
                                onReserve={() => alert("캐치테이블 예약 연동 준비중입니다.")}
                            />
                        </div>
                    );
                })}

                {loading && (
                    <div className="py-8 flex justify-center">
                        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    </div>
                )}

                {!hasMore && shops.length > 0 && (
                    <div className="py-8 text-center text-muted-foreground text-xs">
                        더 이상 추천할 매장이 없습니다.
                    </div>
                )}
            </div>
        </div>
    );
};
