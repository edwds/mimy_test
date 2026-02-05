import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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

    // Search Results (for bottom sheet)
    const [shops, setShops] = useState<any[]>([]);

    // Overlay data (for saved/check buttons on map)
    const [overlayShops, setOverlayShops] = useState<any[]>([]);

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

    // Overlay Filter State (for map display only)
    const [showSavedOnly, setShowSavedOnly] = useState(false);
    const [showRankedOnly, setShowRankedOnly] = useState(false);

    // Search Filter State (for bottom sheet results)
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

    const mapCenterRef = useRef<[number, number] | undefined>(undefined);
    const showRankedOnlyRef = useRef(false);
    const showSavedOnlyRef = useRef(false);
    const userRef = useRef<any>(null);
    const selectedFiltersRef = useRef<string[]>([]);

    // Sync state to refs
    useEffect(() => {
        mapCenterRef.current = mapCenter;
        showRankedOnlyRef.current = showRankedOnly;
        showSavedOnlyRef.current = showSavedOnly;
        userRef.current = user;
        selectedFiltersRef.current = selectedFilters;
    }, [mapCenter, showRankedOnly, showSavedOnly, user, selectedFilters]);

    // Fetch search results for bottom sheet (excludes ranked shops initially)
    const fetchShops = useCallback(async (options: { excludeRanked?: boolean; useBounds?: boolean } = {}) => {
        const { excludeRanked = true, useBounds = false } = options;

        setIsLoading(true);
        try {
            let url = `${API_BASE_URL}/api/shops/discovery?page=1&limit=50`;

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
            } else if (mapCenterRef.current) {
                // Use center point with fixed radius for initial/normal load
                console.log('[DiscoveryTab] Using center for load:', mapCenterRef.current);
                url += `&lat=${mapCenterRef.current[0]}&lon=${mapCenterRef.current[1]}&excludeRanked=${excludeRanked}`;
            } else {
                // No location yet
                setIsLoading(false);
                return;
            }

            // Add filter parameters
            if (selectedFiltersRef.current.length > 0) {
                const foodKindFilters = selectedFiltersRef.current.filter(f => f !== 'HIGH_MATCH');
                const hasHighMatch = selectedFiltersRef.current.includes('HIGH_MATCH');

                if (foodKindFilters.length > 0) {
                    url += `&foodKinds=${foodKindFilters.join(',')}`;
                }
                if (hasHighMatch) {
                    url += `&highMatchOnly=true`;
                }
            }

            const res = await authFetch(url);

            if (res.ok) {
                const data = await res.json();
                setShops(data);
                setSelectedShopId(null);

                // Mark as searched when using bounds
                if (useBounds) {
                    setHasSearched(true);
                }
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    }, []); // Empty dependency array - all state accessed via refs

    // Fetch overlay shops for map display (saved/ranked buttons)
    const fetchOverlayShops = useCallback(async () => {
        if (!userRef.current) return;
        if (!showRankedOnlyRef.current && !showSavedOnlyRef.current) {
            // No overlay filters active, clear overlay
            setOverlayShops([]);
            return;
        }

        try {
            // Both filters on: Show union (saved OR ranked)
            if (showRankedOnlyRef.current && showSavedOnlyRef.current) {
                console.log('[DiscoveryTab] Fetching overlay: saved OR ranked (UNION)');
                const rankedRes = await authFetch(`${API_BASE_URL}/api/ranking/all`);
                const savedRes = await authFetch(`${API_BASE_URL}/api/users/${userRef.current.id}/saved_shops`);

                if (rankedRes.ok && savedRes.ok) {
                    const rankedData = await rankedRes.json();
                    const savedData = await savedRes.json();

                    console.log('[DiscoveryTab] Ranked shops:', rankedData.length, 'Saved shops:', savedData.length);

                    // Create a map to combine shops (union with proper merging)
                    const shopMap = new Map<number, any>();

                    // Add all saved shops first
                    savedData.forEach((shop: any) => {
                        shopMap.set(shop.id, {
                            ...shop,
                            is_saved: true
                        });
                    });

                    // Add all ranked shops, merge if already exists
                    rankedData.forEach((ranking: any) => {
                        const existing = shopMap.get(ranking.shop.id);
                        if (existing) {
                            // Shop is both saved AND ranked - merge properties
                            shopMap.set(ranking.shop.id, {
                                ...existing,
                                ...ranking.shop,
                                is_saved: true,
                                my_review_stats: {
                                    rank: ranking.rank,
                                    satisfaction_tier: ranking.satisfaction_tier
                                }
                            });
                        } else {
                            // Shop is only ranked
                            shopMap.set(ranking.shop.id, {
                                ...ranking.shop,
                                my_review_stats: {
                                    rank: ranking.rank,
                                    satisfaction_tier: ranking.satisfaction_tier
                                }
                            });
                        }
                    });

                    const overlayData = Array.from(shopMap.values());

                    console.log('[DiscoveryTab] ✅ Union (saved OR ranked):', overlayData.length, 'shops');

                    setOverlayShops(overlayData);
                } else {
                    console.error('[DiscoveryTab] Failed to fetch overlay shops:', {
                        rankedOk: rankedRes.ok,
                        savedOk: savedRes.ok
                    });
                    // Clear overlay on failure to avoid showing stale data
                    setOverlayShops([]);
                }
                return;
            }

            // Only ranked filter
            if (showRankedOnlyRef.current) {
                console.log('[DiscoveryTab] Fetching overlay: ONLY ranked');
                const res = await authFetch(`${API_BASE_URL}/api/ranking/all`);
                if (res.ok) {
                    const data = await res.json();
                    const overlayData = data.map((ranking: any) => ({
                        ...ranking.shop,
                        my_review_stats: {
                            rank: ranking.rank,
                            satisfaction_tier: ranking.satisfaction_tier
                        }
                    }));
                    console.log('[DiscoveryTab] Ranked shops loaded:', overlayData.length);
                    setOverlayShops(overlayData);
                } else {
                    console.error('[DiscoveryTab] Failed to fetch ranked shops');
                    setOverlayShops([]);
                }
                return;
            }

            // Only saved filter
            if (showSavedOnlyRef.current) {
                console.log('[DiscoveryTab] Fetching overlay: ONLY saved');
                const res = await authFetch(`${API_BASE_URL}/api/users/${userRef.current.id}/saved_shops`);
                if (res.ok) {
                    const data = await res.json();
                    console.log('[DiscoveryTab] Saved shops loaded:', data.length);
                    setOverlayShops(data);
                } else {
                    console.error('[DiscoveryTab] Failed to fetch saved shops');
                    setOverlayShops([]);
                }
                return;
            }
        } catch (e) {
            console.error('[DiscoveryTab] Error fetching overlay shops:', e);
        }
    }, []); // Empty dependency array - all state accessed via refs

    const prevFiltersRef = useRef<string[]>([]);
    const prevShowSavedOnlyRef = useRef<boolean | null>(null); // null = not initialized
    const prevShowRankedOnlyRef = useRef<boolean | null>(null);

    // Effect for saved/ranked overlay changes (independent from search results)
    useEffect(() => {
        const savedChanged = prevShowSavedOnlyRef.current !== showSavedOnly;
        const rankedChanged = prevShowRankedOnlyRef.current !== showRankedOnly;
        const isInitialMount = prevShowSavedOnlyRef.current === null;

        // On mount or when filters change
        if (isInitialMount || savedChanged || rankedChanged) {
            console.log('[DiscoveryTab] Overlay mode update:', { showSavedOnly, showRankedOnly, isInitialMount });
            prevShowSavedOnlyRef.current = showSavedOnly;
            prevShowRankedOnlyRef.current = showRankedOnly;

            if (!isInitialMount) {
                if (showSavedOnly || showRankedOnly) {
                    // Entering saved/ranked mode: clear shops to show only overlay shops
                    console.log('[DiscoveryTab] Entering saved/ranked mode - clearing shops array');
                    setShops([]);
                } else {
                    // Exiting saved/ranked mode: fetch regular shops again
                    console.log('[DiscoveryTab] Exiting saved/ranked mode - fetching regular shops');
                    if (mapCenter) {
                        fetchShops({ excludeRanked: true });
                    }
                }
            }

            // Fetch overlay data
            fetchOverlayShops();
        }
    }, [showSavedOnly, showRankedOnly, fetchOverlayShops]);

    // Effect for search filter changes (affects bottom sheet results)
    useEffect(() => {
        // Only fetch when filters are added (not when removed/cleared)
        const wasEmpty = prevFiltersRef.current.length === 0;
        const isNowFilled = selectedFilters.length > 0;

        if (isNowFilled) {
            // Filter was just added, fetch with current map bounds
            console.log('[DiscoveryTab] Search filter added, fetching shops with current bounds');
            fetchShops({ useBounds: true, excludeRanked: !selectedFilters.includes('HIGH_MATCH') });
        } else if (!wasEmpty && selectedFilters.length === 0) {
            // Filter was just cleared (by panning), don't fetch
            console.log('[DiscoveryTab] Search filter cleared by panning, NOT fetching');
        }

        // Update previous filters
        prevFiltersRef.current = selectedFilters;
    }, [selectedFilters, fetchShops]);

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
    }, [mapInstanceRef.current, mapCenter, initialLoadDone, showSavedOnly, showRankedOnly]); // fetchShops removed


    // Refresh Listener
    useEffect(() => {
        if (refreshTrigger && refreshTrigger > 0) {
            setViewingCluster(false); // Reset cluster view on refresh
            fetchShops();
        }
    }, [refreshTrigger]); // fetchShops removed - stable function

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

    // Combine shops and overlay shops for map display
    // Remove duplicates by ID, prioritizing overlay shop data
    const combinedShopsForMap = useMemo(() => {
        const shopMap = new Map<number, any>();

        // Add search result shops first
        shops.forEach(shop => {
            shopMap.set(shop.id, shop);
        });

        // Add/override with overlay shops (saved/ranked)
        overlayShops.forEach(shop => {
            if (shopMap.has(shop.id)) {
                // Merge: keep base shop but add overlay properties
                const existing = shopMap.get(shop.id);
                shopMap.set(shop.id, {
                    ...existing,
                    is_saved: shop.is_saved || existing.is_saved,
                    my_review_stats: shop.my_review_stats || existing.my_review_stats
                });
            } else {
                // Add overlay shop to map
                shopMap.set(shop.id, shop);
            }
        });

        const combined = Array.from(shopMap.values());
        console.log('[DiscoveryTab] combinedShopsForMap updated:', {
            shops: shops.length,
            overlayShops: overlayShops.length,
            combined: combined.length,
            showSaved: showSavedOnly,
            showRanked: showRankedOnly
        });

        if (combined.length === 0 && (showSavedOnly || showRankedOnly)) {
            console.warn('[DiscoveryTab] ⚠️ No shops to display! Check if saved/ranked filters returned empty results.');
        }

        return combined;
    }, [shops, overlayShops, showSavedOnly, showRankedOnly]);

    const handleCurrentLocation = () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const newCenter: [number, number] = [position.coords.latitude, position.coords.longitude];
                    setMapCenter(newCenter);

                    // Only fetch if not in saved/ranked mode
                    if (!showSavedOnly && !showRankedOnly) {
                        // Wait for map to move, then fetch with center-based query
                        setTimeout(() => {
                            fetchShops({ excludeRanked: true });
                        }, 1000);
                    }
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

        // Clear search filters when user pans the map (only if filters are active)
        setSelectedFilters(currentFilters => {
            if (currentFilters.length > 0) {
                console.log('[DiscoveryTab] Clearing search filters due to map pan');
                return [];
            }
            return currentFilters;
        });
        // Note: saved/check overlay filters are NOT cleared by panning
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
                const s = combinedShopsForMap.find(x => x.id === id);
                if (s && s.lat && s.lon) {
                    setMapCenter([s.lat, s.lon]);
                }
            }
        }
        // IMPORTANT: Do NOT reset selectedShopId to null here when URL is empty
        // The URL sync is disabled (see handleSelectShop), so we shouldn't force-sync state to URL
    }, [searchParams, combinedShopsForMap, selectedShopId]);

    const handleSelectShop = (shopId: number | null) => {
        console.log('[DiscoveryTab] 🎯 handleSelectShop called with shopId:', shopId);
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
        const selected = combinedShopsForMap.find(s => s.id === shopId);
        if (selected && selected.lat && selected.lon) {
            const sortedIds = [...combinedShopsForMap]
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
            navigationOrderRef.current = combinedShopsForMap.map(s => s.id);
        }

        console.log('[DiscoveryTab] ✅ Setting selectedShopId to:', shopId);
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
        console.log('[DiscoveryTab] ❌ handleCloseShop called');
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
        if (!selectedShopId || combinedShopsForMap.length === 0) return;

        // Always use current combinedShopsForMap to handle dynamic filter changes
        // Sort by distance from current shop to ensure smooth navigation
        const currentShop = combinedShopsForMap.find(s => s.id === selectedShopId);
        if (!currentShop) {
            console.warn('[DiscoveryTab] Current shop not found in combinedShopsForMap');
            return;
        }

        // Use navigationOrderRef if it was set and still valid, otherwise create new one
        let navList: number[];
        if (navigationOrderRef.current.length > 0) {
            // Filter navigationOrderRef to only include shops that exist in current combinedShopsForMap
            const currentShopIds = new Set(combinedShopsForMap.map(s => s.id));
            navList = navigationOrderRef.current.filter(id => currentShopIds.has(id));

            // If filtered list is too small, rebuild from current shops
            if (navList.length <= 1) {
                navList = combinedShopsForMap.map(s => s.id);
            }
        } else {
            navList = combinedShopsForMap.map(s => s.id);
        }

        const currentIndex = navList.indexOf(selectedShopId);
        if (currentIndex === -1) {
            console.warn('[DiscoveryTab] Current shop not in navigation list, staying on current shop');
            return;
        }

        // If only one shop, stay on current
        if (navList.length <= 1) {
            console.log('[DiscoveryTab] Only one shop available, staying on current');
            return;
        }

        let nextIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;

        // Bounded check (Cycle)
        if (nextIndex >= navList.length) nextIndex = 0;
        if (nextIndex < 0) nextIndex = navList.length - 1;

        setSlideDirection(direction);

        const nextShopId = navList[nextIndex];
        const nextShop = combinedShopsForMap.find(s => s.id === nextShopId);

        if (nextShop) {
            console.log('[DiscoveryTab] Swiping to shop:', nextShopId);
            setSelectedShopId(nextShop.id);
        } else {
            console.warn('[DiscoveryTab] Next shop not found, staying on current shop');
            // Stay on current shop instead of crashing
        }
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
                    shops={combinedShopsForMap}
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
                {selectedShopId && combinedShopsForMap.find(s => s.id === selectedShopId) ? (
                    <SelectedShopCard
                        key={selectedShopId} // Key change triggers animation
                        shop={combinedShopsForMap.find(s => s.id === selectedShopId)}
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
                    isInitialLoad={!hasSearched}
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
                        setSelectedShopId(null);
                        // Don't reset mapCenter - keep current map view
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
                        setSelectedShopId(null);
                        // Don't reset mapCenter - keep current map view
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
