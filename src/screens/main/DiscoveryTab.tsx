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

export const DiscoveryTab = () => {
    const [shops, setShops] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [page, setPage] = useState(1);
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
        <div className="flex flex-col h-full bg-background animate-in fade-in duration-500">
            {/* Header */}
            <div className="p-5 pb-2">
                <h1 className="text-2xl font-bold mb-4">Discovery</h1>
                {/* Search Bar Placeholder */}
                <div className="relative">
                    <Search className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="새로운 맛집을 찾아보세요"
                        className="w-full pl-10 pr-4 py-3 bg-muted/50 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-primary/50"
                    />
                </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto px-5 pt-2 pb-24">
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
