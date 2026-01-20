import { useState, useEffect, useRef } from 'react';
// import { Search } from 'lucide-react'; 
import { Locate, Heart, Search } from 'lucide-react'; // Icons
import { useTranslation } from 'react-i18next';
// Let's keep the Search button overlay if possible, or just the map.
// The Plan said: "Replace current list view with... MapContainer + ShopBottomSheet".
// I will keep the header overlay logic but adapt it.
import { API_BASE_URL } from '@/lib/api';
import { MapContainer } from '@/components/MapContainer';
import { Capacitor } from '@capacitor/core';
import { ShopBottomSheet } from '@/components/ShopBottomSheet';
import { DiscoverySearchOverlay } from '@/components/discovery/DiscoverySearchOverlay'; // Import Overlay
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
    const { t } = useTranslation();
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

    // Search Overlay State
    const [isSearching, setIsSearching] = useState(false);

    // Cluster "Freeze" State - prevents auto-refetch on move if we are viewing a cluster
    const [viewingCluster, setViewingCluster] = useState(false);

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
            } else if (useBounds === false && !showSavedOnly && mapCenter) {
                // Initial load with mapCenter logic if we want to default to "Nearby" without explicit bounds 
                // But better to expect bounds to be passed if useBounds is true.
                // If useBounds is false (initial "discovery" feed), the backend just returns random shops.
                // User Requirement: "Fetch 50 shops based on current location"
                // So we should actually pass bounds or coordinates.
                // Let's modify logic to support lat/lon simply? 
                // Backend supports BBox. Let's stick to BBox.

                // If we have no bounds but have a center (initial load), maybe we construct a box?
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

    // Initial Fetch with Location
    useEffect(() => {
        if (!isEnabled) return;

        // Try to get location first
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const { latitude, longitude } = position.coords;
                    setMapCenter([latitude, longitude]);

                    // Construct 5km approx bounding box (approx 0.045 deg lat, ~0.05 deg lon)
                    const delta = 0.05;
                    const initialBounds = {
                        minLat: latitude - delta,
                        maxLat: latitude + delta,
                        minLon: longitude - delta,
                        maxLon: longitude + delta
                    };
                    setBounds(initialBounds);

                    // Fetch directly with bounds logic (custom call)
                    // We need to pass these bounds to fetchShops manually since state might not be flushed.
                    // Actually refactoring fetchShops to take bounds arg is cleaner.
                    fetchShopsWithBounds(initialBounds);
                },
                (error) => {
                    console.error("Location init error", error);
                    // Fallback to random/default
                    fetchShops();
                }
            );
        } else {
            fetchShops();
        }
    }, [isEnabled, refreshTrigger]);

    const fetchShopsWithBounds = async (customBounds: { minLat: number, maxLat: number, minLon: number, maxLon: number }) => {
        setIsLoading(true);
        try {
            const userId = localStorage.getItem('mimy_user_id');
            const headers: any = {};
            if (userId) headers['x-user-id'] = userId;

            // Always use discovery endpoint with bounds
            let url = `${API_BASE_URL}/api/shops/discovery?page=1&limit=50&seed=${seedRef.current}`;
            url += `&minLat=${customBounds.minLat}&maxLat=${customBounds.maxLat}&minLon=${customBounds.minLon}&maxLon=${customBounds.maxLon}`;

            const res = await fetch(url, { headers });
            if (res.ok) {
                const data = await res.json();
                setShops(data);
            }
        } catch (e) { console.error(e); }
        finally { setIsLoading(false); }
    };

    // Refresh Listener
    useEffect(() => {
        if (refreshTrigger && refreshTrigger > 0) {
            const newSeed = Math.random().toString(36).substring(7);
            sessionStorage.setItem('discovery_seed', newSeed);
            seedRef.current = newSeed;
            // Also reset filter?
            // setShowSavedOnly(false); // Maybe? Let's keep filter if user wants.
            setViewingCluster(false); // Reset cluster view on refresh
            fetchShops();
        }
    }, [refreshTrigger]);

    const handleSave = async (shopId: number) => {
        const userId = localStorage.getItem('mimy_user_id');
        if (!userId) {
            alert(t('discovery.alerts.login_required'));
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
            alert(t('discovery.alerts.save_failed'));
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
                    alert(t('discovery.alerts.location_error'));
                }
            );
        } else {
            alert(t('discovery.alerts.no_gps'));
        }
    };

    const handleMoveEnd = (newBounds: { minLat: number, maxLat: number, minLon: number, maxLon: number }) => {
        // Only show button if we are NOT in saved mode AND not viewing a cluster explicitly
        if (!showSavedOnly && !viewingCluster) {
            setBounds(newBounds);
            setShowSearchHere(true);
        }
        // If viewing cluster, we might want to allow "Search Here" to break out of it?
        // Yes, if user moves map, they might want to search new area.
        if (viewingCluster) {
            setBounds(newBounds);
            setShowSearchHere(true);
        }
    };

    const handleSearchSelect = (shop: any) => {
        // 1. Add to shops if not present (or update)
        setShops(prev => {
            const exists = prev.find(s => s.id === shop.id);
            if (exists) return prev;
            return [shop, ...prev]; // Add to top
        });

        // 2. Select & Center
        setSelectedShopId(shop.id);
        if (shop.lat && shop.lon) {
            setMapCenter([shop.lat, shop.lon]);
        }

        // 3. Close Overlay
        setIsSearching(false);
        setViewingCluster(false);
    };

    const handleClusterClick = (clusterShops: any[]) => {
        setShops(clusterShops);
        setViewingCluster(true);
        setSelectedShopId(null); // Deselect individual shop if any
        // We probably don't need to change map center, user wants to see the cluster context.
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
                    onClusterClick={handleClusterClick}
                />
            </div>

            {/* Bottom Sheet Overlay */}
            <ShopBottomSheet
                shops={shops}
                selectedShopId={selectedShopId}
                onSave={handleSave}
            />

            {/* Top Search Overlay */}
            <div
                className="absolute left-6 right-6 z-10 flex flex-col gap-2 items-center"
                style={{ top: Capacitor.isNativePlatform() ? 'calc(env(safe-area-inset-top) + 2.5rem)' : '1.5rem' }}
            >
                <div
                    onClick={() => setIsSearching(true)}
                    className="w-full bg-background/95 backdrop-blur shadow-lg rounded-full px-4 py-3 flex items-center gap-2 border border-border/50 cursor-pointer active:scale-98 transition-transform"
                >
                    <span className="text-muted-foreground text-sm flex-1">{t('discovery.search_placeholder')}</span>
                    <div className="bg-primary/10 p-1.5 rounded-full">
                        <Search className="w-4 h-4 text-primary" />
                    </div>
                </div>

                {/* Search Here Button */}
                {showSearchHere && !showSavedOnly && (
                    <button
                        onClick={() => fetchShops(true)}
                        className="animate-in fade-in slide-in-from-top-2 bg-white text-primary font-bold px-4 py-2 rounded-full shadow-lg text-sm border border-primary/20 flex items-center gap-2 active:scale-95 transition-transform"
                    >
                        {isLoading ? t('discovery.searching') : t('discovery.search_here')}
                    </button>
                )}
            </div>

            {/* Map Controls */}
            <div
                className="absolute right-4 z-10 flex flex-col gap-3"
                style={{ top: Capacitor.isNativePlatform() ? 'calc(env(safe-area-inset-top) + 8rem)' : '8rem' }}
            >
                <button
                    onClick={handleCurrentLocation}
                    className="p-3 bg-white rounded-full shadow-lg border border-gray-100 active:scale-95 transition-transform"
                >
                    <Locate className="w-6 h-6 text-gray-700" />
                </button>

                <button
                    onClick={() => {
                        const userId = localStorage.getItem('mimy_user_id');
                        if (!userId) return alert(t('discovery.alerts.login_required'));
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
            {/* Search Overlay */}
            {isSearching && (
                <DiscoverySearchOverlay
                    onClose={() => setIsSearching(false)}
                    onSelect={handleSearchSelect}
                />
            )}
        </div>
    );
};
