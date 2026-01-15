import { useState, useEffect, useRef } from 'react';
// import { Search } from 'lucide-react'; 
import { Locate, Heart } from 'lucide-react'; // Icons
// Let's keep the Search button overlay if possible, or just the map.
// The Plan said: "Replace current list view with... MapContainer + ShopBottomSheet".
// I will keep the header overlay logic but adapt it.
import { API_BASE_URL } from '@/lib/api';
import { MapContainer } from '@/components/MapContainer';
import { ShopBottomSheet } from '@/components/ShopBottomSheet';
import { cn } from '@/lib/utils';

const getSessionSeed = () => {
    let seed = sessionStorage.getItem('discovery_seed');
    if (!seed) {
        seed = Math.random().toString(36).substring(7);
        sessionStorage.setItem('discovery_seed', seed);
    }
    return seed;
};

interface Props {
    isActive: boolean;
    refreshTrigger?: number;
    isEnabled?: boolean;
}

export const DiscoveryTab: React.FC<Props> = ({ isActive, refreshTrigger, isEnabled = true }) => {
    const [shops, setShops] = useState<any[]>([]);
    const seedRef = useRef(getSessionSeed());

    // Map & Sheet State
    const [selectedShopId, setSelectedShopId] = useState<number | null>(null);
    const [mapCenter, setMapCenter] = useState<[number, number] | undefined>(undefined);

    // Bound Search State
    const [bounds, setBounds] = useState<{ minLat: number, maxLat: number, minLon: number, maxLon: number } | null>(null);
    const [showSearchHere, setShowSearchHere] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // Filter State
    const [showSavedOnly, setShowSavedOnly] = useState(false);

    const fetchShops = async (useBounds = false) => {
        setIsLoading(true);
        try {
            const userId = localStorage.getItem('mimy_user_id');
            const headers: any = {};
            if (userId) headers['x-user-id'] = userId;

            let url = `${API_BASE_URL}/api/shops/discovery?page=1&limit=50&seed=${seedRef.current}`;

            if (showSavedOnly && userId) {
                url = `${API_BASE_URL}/api/users/${userId}/saved_shops`;
            } else if (useBounds && bounds) {
                url += `&minLat=${bounds.minLat}&maxLat=${bounds.maxLat}&minLon=${bounds.minLon}&maxLon=${bounds.maxLon}`;
            }

            const res = await fetch(url, { headers });

            if (res.ok) {
                const data = await res.json();
                setShops(data);

                // If switching to saved and we have data, maybe center on the first one?
                // data is sorted by created_at desc.
                if (showSavedOnly && data.length > 0 && data[0].lat && data[0].lon) {
                    setMapCenter([data[0].lat, data[0].lon]);
                }
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
            if (useBounds) setShowSearchHere(false);
        }
    };

    useEffect(() => {
        // Reset when switching to saved mode
        if (showSavedOnly) setShowSearchHere(false);
        fetchShops();
    }, [showSavedOnly]); // Refetch when mode changes

    // Initial Fetch
    useEffect(() => {
        if (!isEnabled) return;
        fetchShops();
    }, [isEnabled, refreshTrigger]);

    // Refresh Listener
    useEffect(() => {
        if (refreshTrigger && refreshTrigger > 0) {
            const newSeed = Math.random().toString(36).substring(7);
            sessionStorage.setItem('discovery_seed', newSeed);
            seedRef.current = newSeed;
            // Also reset filter?
            // setShowSavedOnly(false); // Maybe? Let's keep filter if user wants.
            fetchShops();
        }
    }, [refreshTrigger]);

    const handleSave = async (shopId: number) => {
        const userId = localStorage.getItem('mimy_user_id');
        if (!userId) {
            alert("로그인이 필요합니다.");
            return;
        }

        // Optimistic Update
        setShops(prev => {
            if (showSavedOnly) {
                // If looking at saved list and untoggle, remove it?
                // Or just mark as unsaved but keep visible for context?
                // Let's keep visible but update status.
                return prev.map(shop =>
                    shop.id === shopId ? { ...shop, is_saved: !shop.is_saved } : shop
                );
            }
            return prev.map(shop => {
                if (shop.id === shopId) {
                    return {
                        ...shop,
                        is_saved: !shop.is_saved,
                        saved_at: !shop.is_saved ? new Date().toISOString() : null
                    };
                }
                return shop;
            });
        });

        try {
            await fetch(`${API_BASE_URL}/api/shops/${shopId}/save`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: parseInt(userId) })
            });
        } catch (e) {
            console.error(e);
            alert("저장에 실패했습니다.");
            // Revert
            setShops(prev => prev.map(shop =>
                shop.id === shopId ? { ...shop, is_saved: !shop.is_saved } : shop
            ));
        }
    };

    const handleCurrentLocation = () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setMapCenter([position.coords.latitude, position.coords.longitude]);
                },
                (error) => {
                    console.error(error);
                    alert("위치 정보를 가져올 수 없습니다.");
                }
            );
        } else {
            alert("GPS를 지원하지 않는 브라우저입니다.");
        }
    };

    const handleMoveEnd = (newBounds: { minLat: number, maxLat: number, minLon: number, maxLon: number }) => {
        // Only show button if we are NOT in saved mode
        if (!showSavedOnly) {
            setBounds(newBounds);
            setShowSearchHere(true);
        }
    };

    return (
        <div className="relative h-full w-full overflow-hidden">
            {/* Map Background */}
            <div className="absolute inset-0 z-0">
                <MapContainer
                    shops={shops}
                    onMarkerClick={setSelectedShopId}
                    onMapClick={() => setSelectedShopId(null)}
                    center={
                        (selectedShopId && shops.find(s => s.id === selectedShopId))
                            ? [shops.find(s => s.id === selectedShopId).lat!, shops.find(s => s.id === selectedShopId).lon!]
                            : mapCenter
                    }
                    isActive={isActive}
                    selectedShopId={selectedShopId}
                    bottomSheetOffset={selectedShopId ? window.innerHeight * 0.1 : 0}
                    onMoveEnd={handleMoveEnd}
                />
            </div>

            {/* Bottom Sheet Overlay */}
            <ShopBottomSheet
                shops={shops}
                selectedShopId={selectedShopId}
                onSave={handleSave}
            />

            {/* Top Search Overlay */}
            <div className="absolute top-6 left-6 right-6 z-10 flex flex-col gap-2 items-center">
                <div className="w-full bg-background/95 backdrop-blur shadow-lg rounded-full px-4 py-3 flex items-center gap-2 border border-border/50">
                    <span className="text-muted-foreground text-sm flex-1">이름, 지역, 메뉴로 원하는 곳을 찾아보세요</span>
                </div>

                {/* Search Here Button */}
                {showSearchHere && !showSavedOnly && (
                    <button
                        onClick={() => fetchShops(true)}
                        className="animate-in fade-in slide-in-from-top-2 bg-white text-primary font-bold px-4 py-2 rounded-full shadow-lg text-sm border border-primary/20 flex items-center gap-2 active:scale-95 transition-transform"
                    >
                        {isLoading ? '검색중...' : '이 지역에서 다시 찾기'}
                    </button>
                )}
            </div>

            {/* Map Controls */}
            <div className="absolute top-32 right-4 z-10 flex flex-col gap-3">
                <button
                    onClick={handleCurrentLocation}
                    className="p-3 bg-white rounded-full shadow-lg border border-gray-100 active:scale-95 transition-transform"
                >
                    <Locate className="w-6 h-6 text-gray-700" />
                </button>

                <button
                    onClick={() => {
                        const userId = localStorage.getItem('mimy_user_id');
                        if (!userId) return alert("로그인이 필요합니다.");
                        setShowSavedOnly(!showSavedOnly);
                        setSelectedShopId(null);
                        setMapCenter(undefined); // Reset center
                    }}
                    className={cn(
                        "p-3 rounded-full shadow-lg border active:scale-95 transition-all text-gray-700",
                        showSavedOnly ? "bg-primary text-white border-primary" : "bg-white border-gray-100"
                    )}
                >
                    <Heart className={cn("w-6 h-6", showSavedOnly ? "fill-current text-white" : "")} />
                </button>
            </div>
        </div>
    );
};
