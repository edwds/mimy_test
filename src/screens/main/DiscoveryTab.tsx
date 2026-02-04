import { useState, useEffect, useRef, useCallback } from 'react';
import { Locate, Bookmark, Check } from 'lucide-react'; // Icons
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
// Let's keep the Search button overlay if possible, or just the map.
// The Plan said: "Replace current list view with... MapContainer + ShopBottomSheet".
// I will keep the header overlay logic but adapt it.
import { API_BASE_URL } from '@/lib/api';
import { MapContainer } from '@/components/MapContainer';
import { Capacitor } from '@capacitor/core';
import { ShopBottomSheet } from '@/components/ShopBottomSheet';
import { DiscoverySearchOverlay } from '@/components/discovery/DiscoverySearchOverlay'; // Import Overlay
import { SelectedShopCard } from '@/components/discovery/SelectedShopCard';
import { DiscoveryFilters } from '@/components/discovery/DiscoveryFilters';
import { cn } from '@/lib/utils';
import { AnimatePresence } from 'framer-motion';
import { authFetch } from '@/lib/authFetch';
import { useRanking } from '@/context/RankingContext';
import { useUser } from '@/context/UserContext';

interface Props {
    isActive: boolean;
    refreshTrigger?: number;
    isEnabled?: boolean;
}

export const DiscoveryTab: React.FC<Props> = ({ isActive, refreshTrigger, isEnabled = true }) => {
    const { t } = useTranslation();
    const [searchParams] = useSearchParams();
    const { registerCallback, unregisterCallback } = useRanking();
    const { user } = useUser();
    const [shops, setShops] = useState<any[]>([]);
    const [rankingRefreshTrigger, setRankingRefreshTrigger] = useState(0);
    const lastUpdateDataRef = useRef<{ shopId: number; my_review_stats: any } | null>(null);
    const prevShopsRef = useRef<any[]>([]); // Store previous shops state
    const navigationOrderRef = useRef<number[]>([]); // Store sorted order for navigation to prevent UI flickering
    const mapInstanceRef = useRef<any>(null); // Store map instance for bounds calculation

    // Map & Sheet State
    const [selectedShopId, setSelectedShopId] = useState<number | null>(null);
    const [mapCenter, setMapCenter] = useState<[number, number] | undefined>(undefined);

    // Search State
    const [isLoading, setIsLoading] = useState(false);
    void isLoading; // Used in fetchShops for loading state management

    // Filter State
    const [showSavedOnly, setShowSavedOnly] = useState(false);
    const [showRankedOnly, setShowRankedOnly] = useState(false);
    const [selectedFilters, setSelectedFilters] = useState<string[]>([]);

    // Search Overlay State
    const [isSearching, setIsSearching] = useState(false);

    // Cluster "Freeze" State - prevents auto-refetch on move if we are viewing a cluster
    const [viewingCluster, setViewingCluster] = useState(false);
    void viewingCluster; // Used for cluster navigation logic

    // Track if initial load is done to prevent unwanted fetches on map center changes
    const [initialLoadDone, setInitialLoadDone] = useState(false);

    // Track if user has performed a search (to change bottom sheet title)
    const [hasSearched, setHasSearched] = useState(false);

    const fetchShops = useCallback(async (options: { excludeRanked?: boolean; useBounds?: boolean } = {}) => {
        const { excludeRanked = true, useBounds = false } = options;

        setIsLoading(true);
        try {
            let url = `${API_BASE_URL}/api/shops/discovery?page=1&limit=50`;

            if (showRankedOnly) {
                if (!user) {
                    setIsLoading(false);
                    return;
                }
                url = `${API_BASE_URL}/api/ranking/all`;
            } else if (showSavedOnly) {
                if (!user) {
                    setIsLoading(false);
                    return;
                }
                url = `${API_BASE_URL}/api/users/${user.id}/saved_shops`;
            } else {
                // Only use bounds when explicitly requested (filter button clicked)
                if (useBounds && mapInstanceRef.current) {
                    // Get current map bounds at the moment of search
                    const fullBounds = mapInstanceRef.current.getBounds();
                    const ne = fullBounds.getNorthEast();
                    const sw = fullBounds.getSouthWest();

                    console.log('[DiscoveryTab] Using current viewport bounds for filter search:', {
                        minLat: sw.lat, maxLat: ne.lat, minLon: sw.lng, maxLon: ne.lng
                    });

                    url += `&minLat=${sw.lat}&maxLat=${ne.lat}&minLon=${sw.lng}&maxLon=${ne.lng}&excludeRanked=${excludeRanked}`;
                } else if (mapCenter) {
                    // Use center point with fixed radius for initial/normal load
                    console.log('[DiscoveryTab] Using center for load:', mapCenter);
                    url += `&lat=${mapCenter[0]}&lon=${mapCenter[1]}&excludeRanked=${excludeRanked}`;
                } else {
                    // No location yet
                    setIsLoading(false);
                    return;
                }
            }

            // Add filter parameters
            if (selectedFilters.length > 0) {
                const foodKindFilters = selectedFilters.filter(f => f !== 'HIGH_MATCH');
                const hasHighMatch = selectedFilters.includes('HIGH_MATCH');

                if (foodKindFilters.length > 0) {
                    url += `&foodKinds=${foodKindFilters.join(',')}`;
                }
                if (hasHighMatch) {
                    url += `&highMatchOnly=true`; // Get top 50 shops by match score in current map area
                }
            }

            const res = await authFetch(url);

            if (res.ok) {
                const data = await res.json();
                let shopsToSet = data;

                // If ranked only, transform the ranking data to shop format
                if (showRankedOnly) {
                    shopsToSet = data.map((ranking: any) => ({
                        ...ranking.shop,
                        my_review_stats: {
                            rank: ranking.rank,
                            satisfaction_tier: ranking.satisfaction_tier
                        }
                    }));
                }

                setShops(shopsToSet);

                // Reset selected shop to show bottom sheet with new results
                setSelectedShopId(null);

                // Mark as searched when using bounds
                if (useBounds) {
                    setHasSearched(true);
                }

                // If switching to saved/ranked and we have data, maybe center on the first one?
                if ((showSavedOnly || showRankedOnly) && shopsToSet.length > 0) {
                    const firstShop = shopsToSet[0];
                    if (firstShop && firstShop.lat && firstShop.lon) {
                        setMapCenter([firstShop.lat, firstShop.lon]);
                    }
                }
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    }, [showRankedOnly, showSavedOnly, user, mapCenter, selectedFilters]);

    const prevFiltersRef = useRef<string[]>([]);

    useEffect(() => {
        // Reset when switching to saved/ranked mode
        if (showSavedOnly || showRankedOnly) {
            setSelectedFilters([]);
            fetchShops();
            return;
        }

        // Only fetch when filters are added (not when removed/cleared)
        const wasEmpty = prevFiltersRef.current.length === 0;
        const isNowFilled = selectedFilters.length > 0;

        if (isNowFilled) {
            // Filter was just added, fetch with current map bounds
            console.log('[DiscoveryTab] Filter added, fetching shops with current bounds');
            fetchShops({ useBounds: true });
        } else if (!wasEmpty && selectedFilters.length === 0) {
            // Filter was just cleared (by panning), don't fetch
            console.log('[DiscoveryTab] Filter cleared by panning, NOT fetching');
        }

        // Update previous filters
        prevFiltersRef.current = selectedFilters;
    }, [showSavedOnly, showRankedOnly, selectedFilters, fetchShops]); // Refetch when mode or filters change

    // Initial Fetch with Location - fetch once when map is ready and center is set
    useEffect(() => {
        if (!isEnabled) return;
        // Only set center if not already set (initial load only)
        if (mapCenter) return;

        // Try to get location first and set map center
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const { latitude, longitude } = position.coords;
                    setMapCenter([latitude, longitude]);
                },
                (error) => {
                    console.error("Location init error", error);
                }
            );
        }
    }, [isEnabled, mapCenter]); // Remove refreshTrigger dependency to prevent re-centering

    // Fetch shops once when map is ready (after mapInstanceRef is set) and center is available
    useEffect(() => {
        if (mapInstanceRef.current && mapCenter && !initialLoadDone && !showSavedOnly && !showRankedOnly) {
            console.log('[DiscoveryTab] Map ready with center, fetching initial shops');
            setInitialLoadDone(true);
            setTimeout(() => {
                fetchShops({ excludeRanked: true });
            }, 500); // Wait for map to fully settle
        }
    }, [mapInstanceRef.current, mapCenter, initialLoadDone, showSavedOnly, showRankedOnly, fetchShops]);


    // Refresh Listener
    useEffect(() => {
        if (refreshTrigger && refreshTrigger > 0) {
            setViewingCluster(false); // Reset cluster view on refresh
            fetchShops();
        }
    }, [refreshTrigger]);

    // Ranking Update Callback
    useEffect(() => {
        if (!isEnabled) return;

        const handleRankingUpdate = (data: { shopId: number; my_review_stats: any }) => {
            console.log('[DiscoveryTab] Ranking updated:', data);
            lastUpdateDataRef.current = data;
            setRankingRefreshTrigger(prev => prev + 1);
        };

        registerCallback('DiscoveryTab', handleRankingUpdate);

        return () => {
            unregisterCallback('DiscoveryTab');
        };
    }, [isEnabled]);

    // Handle ranking refresh trigger - Optimistic update
    useEffect(() => {
        if (rankingRefreshTrigger > 0 && lastUpdateDataRef.current) {
            const { shopId, my_review_stats } = lastUpdateDataRef.current;
            console.log('[DiscoveryTab] ⚡ Optimistic update for shop:', shopId);

            // Immediately update shops array with the ranking data
            setShops(prevShops => prevShops.map(shop =>
                shop.id === shopId
                    ? { ...shop, my_review_stats }
                    : shop
            ));
        }
    }, [rankingRefreshTrigger]);

    const handleSave = async (shopId: number) => {
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
            await authFetch(`${API_BASE_URL}/api/shops/${shopId}/save`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({})
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
                    const newCenter: [number, number] = [position.coords.latitude, position.coords.longitude];
                    setMapCenter(newCenter);

                    // Wait for map to move, then fetch with center-based query
                    setTimeout(() => {
                        fetchShops({ excludeRanked: true });
                    }, 1000);
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

    const handleMoveEnd = useCallback(() => {
        console.log('[DiscoveryTab] handleMoveEnd called (user panned map)');

        // Clear filters when user pans the map (only if filters are active)
        setSelectedFilters(currentFilters => {
            if (currentFilters.length > 0) {
                console.log('[DiscoveryTab] Clearing filters due to map pan');
                return [];
            }
            return currentFilters;
        });
    }, []);

    const [slideDirection, setSlideDirection] = useState<'next' | 'prev'>('next');

    const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
        const R = 6371; // km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    };

    // Sync URL -> State
    useEffect(() => {
        const sid = searchParams.get('selectedShop');
        if (sid) {
            const id = parseInt(sid);
            if (!isNaN(id) && id !== selectedShopId) {
                // If shop exists in current list, select it.
                // If not, maybe we should fetch it? For now assume it's in the list or will be fetched.
                // But wait, if we share a link, shops array might be empty initially until fetch.
                // That's a separate issue (deeplink). For now just set ID if available.
                setSelectedShopId(id);
                // Also center map if shop is found
                const s = shops.find(x => x.id === id);
                if (s && s.lat && s.lon) {
                    setMapCenter([s.lat, s.lon]);
                }
            }
        } else {
            if (selectedShopId !== null) {
                setSelectedShopId(null);
            }
        }
    }, [searchParams, shops]);

    const handleSelectShop = (shopId: number | null) => {
        if (!shopId) {
            // Close logic is handled by handleCloseShop usually, but if called directly:
            handleCloseShop();
            return;
        }


        // const isReplacing = !!currentSid;

        // Update URL - DISABLED temporarily to fix "bounce to home" crash issue
        // const newParams = new URLSearchParams(searchParams);
        // newParams.set('selectedShop', shopId.toString());
        // navigate({ search: newParams.toString() }, { replace: isReplacing });

        // Pre-calculate navigation order (sorted by distance to selected)
        // Store in Ref to define the "swipe playlist" without triggering a re-render/flicker
        const selected = shops.find(s => s.id === shopId);
        if (selected && selected.lat && selected.lon) {
            const sortedIds = [...shops]
                .sort((a, b) => {
                    if (a.id === selected.id) return -1;
                    if (b.id === selected.id) return 1;
                    if (!a.lat || !a.lon) return 1;
                    if (!b.lat || !b.lon) return -1;

                    const distA = getDistance(selected.lat!, selected.lon!, a.lat, a.lon);
                    const distB = getDistance(selected.lat!, selected.lon!, b.lat, b.lon);
                    return distA - distB;
                })
                .map(s => s.id);
            navigationOrderRef.current = sortedIds;
        } else {
            // Fallback: just current order
            navigationOrderRef.current = shops.map(s => s.id);
        }

        setSelectedShopId(shopId);


    };

    // Override handleSearchSelect to use new logic
    const handleSearchSelect = (shop: any) => {
        // 1. Save current state if not already in a "search view" mode
        // If prevShopsRef is empty, it means we are in the "base" state.
        if (prevShopsRef.current.length === 0 && shops.length > 0) {
            prevShopsRef.current = shops;
        }

        // 2. Add if missing
        if (!shops.find(s => s.id === shop.id)) {
            setShops(prev => [shop, ...prev]);
        }

        // 3. Center Map
        if (shop.lat && shop.lon) {
            setMapCenter([shop.lat, shop.lon]);
        }

        handleSelectShop(shop.id);
        setIsSearching(false);
        setViewingCluster(false);
    };

    const handleCloseShop = () => {
        // Go back to remove the query param if it exists, simulating a "Close" via navigation
        // const currentSid = searchParams.get('selectedShop');
        // if (currentSid) {
        //     navigate(-1);
        // } else {
        setSelectedShopId(null);
        // }
        // Restore list if we have a saved state
        if (prevShopsRef.current.length > 0) {
            setShops(prevShopsRef.current);
            prevShopsRef.current = [];
        }
    };

    // Override handleSwipeNavigation
    const handleSwipeNavigation = (direction: 'next' | 'prev') => {
        if (!selectedShopId || shops.length === 0) return;

        // Use the stable navigation order
        const navList = navigationOrderRef.current.length > 0 ? navigationOrderRef.current : shops.map(s => s.id);
        const currentIndex = navList.indexOf(selectedShopId);

        if (currentIndex === -1) return;

        let nextIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;

        // Bounded check (Cycle)
        if (nextIndex >= navList.length) nextIndex = 0;
        if (nextIndex < 0) nextIndex = navList.length - 1;

        setSlideDirection(direction);

        const nextShopId = navList[nextIndex];
        const nextShop = shops.find(s => s.id === nextShopId);

        if (nextShop) {
            setSelectedShopId(nextShop.id); // Triggers re-render with new key
        } else {
            // If shop is not in current list, skip to next/prev
            console.warn(`Shop ${nextShopId} not found in shops list, skipping`);
            // Try next shop in the same direction
            const skipIndex = direction === 'next' ? nextIndex + 1 : nextIndex - 1;
            if (skipIndex >= 0 && skipIndex < navList.length) {
                const skipShopId = navList[skipIndex];
                const skipShop = shops.find(s => s.id === skipShopId);
                if (skipShop) {
                    setSelectedShopId(skipShop.id);
                }
            }
        }

        // Update URL (Replace history for carousel navigation)
        // const newParams = new URLSearchParams(searchParams);
        // newParams.set('selectedShop', nextShop.id.toString());
        // navigate({ search: newParams.toString() }, { replace: true });
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
                    onMarkerClick={handleSelectShop}
                    onMapClick={handleCloseShop}
                    center={mapCenter}
                    isActive={isActive}
                    selectedShopId={selectedShopId}
                    bottomSheetOffset={selectedShopId ? window.innerHeight * 0.1 : 0}
                    onMoveEnd={handleMoveEnd}
                    onClusterClick={handleClusterClick}
                    onMapReady={(map) => {
                        mapInstanceRef.current = map;
                        console.log('[DiscoveryTab] Map instance ready');
                    }}
                />
            </div>

            {/* Bottom Sheet or Floating Card */}
            <AnimatePresence mode="popLayout" custom={slideDirection}>
                {selectedShopId && shops.find(s => s.id === selectedShopId) ? (
                    <SelectedShopCard
                        key={selectedShopId} // Key change triggers animation
                        shop={shops.find(s => s.id === selectedShopId)}
                        onClose={handleCloseShop}
                        onSave={handleSave}
                        onReserve={() => alert(t('discovery.bottom_sheet.reserve_alert'))}
                        onNext={() => handleSwipeNavigation('next')}
                        onPrev={() => handleSwipeNavigation('prev')}
                        direction={slideDirection}
                    />
                ) : null}
            </AnimatePresence>

            {!selectedShopId && (
                <ShopBottomSheet
                    shops={shops}
                    selectedShopId={null}
                    onSave={handleSave}
                    isInitialLoad={!hasSearched && !showSavedOnly && !showRankedOnly}
                />
            )}

            {/* Top Search and Filter Bar */}
            <div
                className="absolute left-0 right-0 z-10 px-5"
                style={{ top: Capacitor.isNativePlatform() ? 'calc(env(safe-area-inset-top) + 0.75rem)' : '1.5rem' }}
            >
                <DiscoveryFilters
                    onSearchClick={() => setIsSearching(true)}
                    selectedFilters={selectedFilters}
                    onFilterChange={setSelectedFilters}
                />
            </div>

            {/* Map Controls */}
            <div
                className="absolute right-4 z-10 flex flex-col gap-3"
                style={{ top: Capacitor.isNativePlatform() ? 'calc(env(safe-area-inset-top) + 6.25rem)' : '8rem' }}
            >
                <button
                    onClick={handleCurrentLocation}
                    className="h-10 w-10 flex items-center justify-center bg-white rounded-full shadow-lg border border-gray-100 active:scale-95 transition-transform"
                >
                    <Locate className="w-5 h-5 text-gray-700" />
                </button>

                <button
                    onClick={() => {
                        if (!user) return alert(t('discovery.alerts.login_required'));
                        setShowSavedOnly(!showSavedOnly);
                        setShowRankedOnly(false); // Turn off ranked filter
                        setSelectedShopId(null);
                        setMapCenter(undefined); // Reset center
                    }}
                    className={cn(
                        "h-10 w-10 flex items-center justify-center rounded-full shadow-lg border active:scale-95 transition-all text-gray-700",
                        showSavedOnly ? "bg-primary text-white border-primary" : "bg-white border-gray-100"
                    )}
                >
                    <Bookmark className={cn("w-5 h-5", showSavedOnly ? "fill-current text-white" : "")} />
                </button>

                <button
                    onClick={() => {
                        if (!user) return alert(t('discovery.alerts.login_required'));
                        setShowRankedOnly(!showRankedOnly);
                        setShowSavedOnly(false); // Turn off saved filter
                        setSelectedShopId(null);
                        setMapCenter(undefined); // Reset center
                    }}
                    className={cn(
                        "h-10 w-10 flex items-center justify-center rounded-full shadow-lg border active:scale-95 transition-all text-gray-700",
                        showRankedOnly ? "bg-primary text-white border-primary" : "bg-white border-gray-100"
                    )}
                >
                    <Check className={cn("w-5 h-5", showRankedOnly ? "text-white" : "")} />
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
