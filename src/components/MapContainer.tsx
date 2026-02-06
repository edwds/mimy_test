import * as maptilersdk from '@maptiler/sdk';
import "@maptiler/sdk/dist/maptiler-sdk.css";
import { useEffect, useRef, useMemo } from 'react';
import { scoreToTasteRatingStep } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

// Format ranking number with language-specific suffix
const formatRanking = (rank: number, language: string): string => {
    if (language === 'ko') {
        // Korean: 1위, 2위, 3위...
        return `${rank}위`;
    } else {
        // English: 1st, 2nd, 3rd, 4th...
        const j = rank % 10;
        const k = rank % 100;
        if (j === 1 && k !== 11) {
            return `${rank}st`;
        }
        if (j === 2 && k !== 12) {
            return `${rank}nd`;
        }
        if (j === 3 && k !== 13) {
            return `${rank}rd`;
        }
        return `${rank}th`;
    }
};

interface Shop {
    id: number;
    name: string;
    lat?: number;
    lon?: number;
    is_saved?: boolean;
    shop_user_match_score?: number | null;
    my_review_stats?: {
        rank?: number;
        satisfaction_tier?: number;
    } | null;
}

interface Props {
    shops: Shop[];
    onMarkerClick?: (shopId: number) => void;
    onMapClick?: () => void;
    center?: [number, number]; // [lat, lon]
    isActive?: boolean;
    selectedShopId?: number | null;
    bottomSheetOffset?: number;
    onMoveEnd?: (bounds: { minLat: number, maxLat: number, minLon: number, maxLon: number }) => void;
    onClusterClick?: (shops: Shop[]) => void;
    onMapReady?: (map: maptilersdk.Map) => void;
}

// Function to create custom marker HTML
const createMarkerElement = (shop: Shop, isSelected: boolean, language: string = 'en') => {
    const hasRanking = shop.my_review_stats && shop.my_review_stats.rank !== undefined;
    const isSaved = shop.is_saved;
    const hasMatchScore = shop.shop_user_match_score != null && shop.shop_user_match_score >= 0;

    // Root Container: 0x0 size, centered at coordinate
    const container = document.createElement('div');
    container.className = 'marker-root';
    container.style.width = '0px';
    container.style.height = '0px';
    container.style.position = 'relative';
    container.style.display = 'block';
    container.style.cursor = 'pointer';
    container.style.pointerEvents = 'auto';
    container.style.zIndex = isSelected ? '1000' : (isSaved ? '500' : '100');

    if (isSelected) {
        // Pin below the bubble (add first so it renders behind)
        const pin = document.createElement('div');
        pin.style.position = 'absolute';
        pin.style.width = '16px';
        pin.style.height = '16px';
        pin.style.left = '50%';
        pin.style.top = '2px';
        pin.style.transform = 'translate(-50%, 0)';
        pin.style.backgroundColor = '#FF6B00';
        pin.style.borderRadius = '50%';
        pin.style.border = '2px solid #FFFFFF';
        pin.style.boxShadow = '0 2px 6px rgba(0,0,0,0.3)';

        container.appendChild(pin);

        // Speech bubble for selected marker (add after pin)
        const bubble = document.createElement('div');
        bubble.className = 'speech-bubble';
        bubble.style.position = 'absolute';
        bubble.style.left = '50%';
        bubble.style.top = '0';
        bubble.style.transform = 'translate(-50%, -100%)';
        bubble.style.backgroundColor = '#FF6B00';
        bubble.style.color = '#FFFFFF';
        bubble.style.padding = '8px 12px';
        bubble.style.borderRadius = '12px';
        bubble.style.fontSize = '13px';
        bubble.style.fontWeight = '600';
        bubble.style.whiteSpace = 'nowrap';
        bubble.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
        bubble.style.marginBottom = '8px';

        // Content: name (ranking or score) - max 12 chars for name
        let shopName = shop.name;
        if (shopName.length > 12) {
            shopName = shopName.substring(0, 12) + '...';
        }

        let scoreOrRanking = '';
        if (hasRanking && shop.my_review_stats?.rank) {
            // Show ranking for visited shops with language-specific format
            scoreOrRanking = formatRanking(shop.my_review_stats.rank, language);
        } else if (hasMatchScore) {
            // Show score for not-yet-visited shops (show full precision)
            const rating = scoreToTasteRatingStep(shop.shop_user_match_score!);
            scoreOrRanking = rating.toFixed(2);
        }

        // Create HTML with different opacity for score/ranking
        if (scoreOrRanking) {
            bubble.innerHTML = `<span style="opacity: 1;">${shopName}</span> <span style="opacity: 0.7;">${scoreOrRanking}</span>`;
        } else {
            bubble.textContent = shopName;
        }

        // Tail (triangle pointing down)
        const tail = document.createElement('div');
        tail.style.position = 'absolute';
        tail.style.left = '50%';
        tail.style.bottom = '-6px';
        tail.style.transform = 'translateX(-50%)';
        tail.style.width = '0';
        tail.style.height = '0';
        tail.style.borderLeft = '6px solid transparent';
        tail.style.borderRight = '6px solid transparent';
        tail.style.borderTop = '6px solid #FF6B00';
        bubble.appendChild(tail);

        container.appendChild(bubble);
        // No label for selected marker
    } else {
        // Regular circular marker (not selected)
        // Priority: Ranking > Saved > Default
        let color = '#FF6B00'; // Default orange
        let bgColor = '#FFFFFF'; // Default white background
        let borderColor = color;

        if (hasRanking) {
            color = '#10B981'; // Green for ranked
            borderColor = color;
        } else if (isSaved) {
            // Saved: filled orange circle
            bgColor = '#FF6B00';
            borderColor = '#FF6B00';
            color = '#FFFFFF'; // White content
        }

        const size = 24;

        const pin = document.createElement('div');
        pin.className = 'custom-marker-pin';
        pin.style.position = 'absolute';
        pin.style.width = `${size}px`;
        pin.style.height = `${size}px`;
        pin.style.left = '50%';
        pin.style.top = '0';
        pin.style.transform = 'translate(-50%, -50%)';
        pin.style.backgroundColor = bgColor;
        pin.style.borderRadius = '50%';
        pin.style.border = `2px solid ${borderColor}`;
        pin.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';
        pin.style.display = 'flex';
        pin.style.alignItems = 'center';
        pin.style.justifyContent = 'center';
        pin.style.transition = 'all 0.2s ease-out';

        let innerHtml: string;

        if (hasMatchScore) {
            // Display score
            const rating = scoreToTasteRatingStep(shop.shop_user_match_score!);
            const scoreText = rating.toFixed(1);
            const fontSize = size * 0.4;
            innerHtml = `<div style="font-size: ${fontSize}px; font-weight: 700; color: ${color};">${scoreText}</div>`;
        } else if (hasRanking) {
            // Check icon for ranked shops
            innerHtml = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="width: ${size * 0.6}px; height: ${size * 0.6}px;"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
        } else {
            // Dot for default shops
            innerHtml = `<div style="width: ${size * 0.3}px; height: ${size * 0.3}px; background-color: ${color}; border-radius: 50%;"></div>`;
        }

        pin.innerHTML = innerHtml;
        container.appendChild(pin);

        // Label: only for non-selected markers
        const label = document.createElement('div');

        const maxCharsPerLine = 10;
        const maxLines = 2;
        const maxChars = maxCharsPerLine * maxLines;

        let text = (shop.name ?? '').trim();
        if (text.length > maxChars) text = text.slice(0, maxChars - 1) + '…';

        const line1 = text.slice(0, maxCharsPerLine);
        const line2 = text.slice(maxCharsPerLine, maxChars);

        label.textContent = line2 ? `${line1}\n${line2}` : line1;

        label.style.position = 'absolute';
        label.style.left = '50%';
        label.style.top = '10px';
        label.style.transform = 'translateX(-50%)';

        label.style.whiteSpace = 'pre';
        label.style.wordBreak = 'keep-all';
        label.style.overflowWrap = 'normal';

        label.style.color = '#000';
        label.style.fontSize = '12px';
        label.style.fontWeight = '500';
        label.style.backgroundColor = 'transparent';
        label.style.border = 'none';
        label.style.boxShadow = 'none';

        label.style.whiteSpace = 'pre';
        label.style.wordBreak = 'keep-all';
        label.style.overflowWrap = 'normal';

        // ❌ (label.style as any).webkitTextStroke = '...'; // 제거

        // ✅ outside outline: text-shadow
        label.style.textShadow = [
            // 1px ring
            '-1px -1px 0 #fff',
            '0px -1px 0 #fff',
            '1px -1px 0 #fff',
            '-1px  0px 0 #fff',
            '1px  0px 0 #fff',
            '-1px  1px 0 #fff',
            '0px  1px 0 #fff',
            '1px  1px 0 #fff',

            // 2px ring (더 두껍게)
            '-2px -2px 0 #fff',
            '0px -2px 0 #fff',
            '2px -2px 0 #fff',
            '-2px  0px 0 #fff',
            '2px  0px 0 #fff',
            '-2px  2px 0 #fff',
            '0px  2px 0 #fff',
            '2px  2px 0 #fff',
        ].join(', ');    // ✅ 자동 줄바꿈 금지 + 우리가 넣은 \n만 줄바꿈


        container.appendChild(label);
    }

    return container;
};

export const MapContainer = ({
    shops,
    onMarkerClick,
    onMapClick,
    center,
    isActive,
    selectedShopId,
    bottomSheetOffset,
    onMoveEnd,
    onMapReady,
    // onClusterClick // Not used anymore
}: Props) => {
    const { i18n } = useTranslation();
    const currentLanguage = i18n.language || 'en';

    const mapContainer = useRef<HTMLDivElement>(null);
    const map = useRef<maptilersdk.Map | null>(null);
    const markers = useRef<Map<string, maptilersdk.Marker>>(new Map());
    const initialCenterApplied = useRef(false);
    const lastCenterRef = useRef<[number, number] | undefined>(undefined);
    const isUserDragging = useRef(false);
    const markerClickedRecently = useRef(false);

    // Initialize Map
    useEffect(() => {
        if (!mapContainer.current || map.current) return;

        maptilersdk.config.apiKey = import.meta.env.VITE_MAPTILER_API_KEY || 'YOUR_MAPTILER_API_KEY';

        map.current = new maptilersdk.Map({
            container: mapContainer.current,
            style: `https://api.maptiler.com/maps/streets-v4/style.json?key=${import.meta.env.VITE_MAPTILER_API_KEY}`,
            center: [126.9780, 37.5665],
            zoom: 14,
            navigationControl: false,
            geolocateControl: false,
            logoPosition: 'bottom-left'
        });

        map.current.on('load', () => {
            // Source is still useful for data mgmt but we won't use cluster
            map.current?.addSource('shops', {
                type: 'geojson',
                data: { type: 'FeatureCollection', features: [] },
                cluster: false, // DISABLED
            });

            // We don't strictly need layers if we use Markers for everything.
            // But we might want 'shops-point' layer for queryRenderedFeatures logic to still work efficiently?
            // Yes, queryRenderedFeatures is better for viewport rendering.

            map.current?.addLayer({
                id: 'shops-point',
                type: 'circle',
                source: 'shops',
                paint: { 'circle-opacity': 0, 'circle-radius': 0 } // Invisible query layer
            });

            // Send map instance to parent
            if (map.current && onMapReady) {
                onMapReady(map.current);
            }

            // Note: We don't call onMoveEnd here for initial load
            // Initial fetch will be triggered by parent component's useEffect
        });

        map.current.on('click', (e) => {
            console.log('[MapContainer] 🗺️ Map clicked, defaultPrevented:', e.defaultPrevented);
            // Ignore map clicks shortly after marker clicks to prevent immediate closing
            if (markerClickedRecently.current) {
                console.log('[MapContainer] ⏸️ Ignoring map click - marker was just clicked');
                return;
            }
            if (!e.defaultPrevented) {
                console.log('[MapContainer] ✅ Calling onMapClick');
                onMapClick?.();
            } else {
                console.log('[MapContainer] ⏸️ Map click prevented by defaultPrevented flag');
            }
        });

        // Track user dragging to detect manual pan (both mouse and touch)
        map.current.on('dragstart', () => {
            console.log('[MapContainer] User started dragging');
            isUserDragging.current = true;
        });

        map.current.on('touchstart', () => {
            console.log('[MapContainer] User touched (mobile)');
            isUserDragging.current = true;
        });

        map.current.on('moveend', () => {
            if (!map.current) return;
            console.log('[MapContainer] moveend fired, isUserDragging:', isUserDragging.current);

            // Only call onMoveEnd if user was dragging (manual pan)
            if (isUserDragging.current) {
                // Calculate visible area bounds (excluding UI overlays)
                const mapContainer = map.current.getContainer();
                const mapWidth = mapContainer.clientWidth;
                const mapHeight = mapContainer.clientHeight;

                // UI overlay offsets (in pixels) - more aggressive to focus on center
                const topOffset = 140;    // Filter bar + extra padding
                const bottomOffset = 200; // Bottom sheet + extra padding
                const sideOffset = 60;    // Side margins to exclude edge shops

                // Get full canvas bounds
                const fullBounds = map.current.getBounds();
                const ne = fullBounds.getNorthEast();
                const sw = fullBounds.getSouthWest();

                // Calculate lat/lon per pixel
                const latRange = ne.lat - sw.lat;
                const lonRange = ne.lng - sw.lng;
                const latPerPx = latRange / mapHeight;
                const lonPerPx = lonRange / mapWidth;

                // Adjust bounds to focus on center area (안전 영역)
                const visibleMinLat = sw.lat + (bottomOffset * latPerPx);
                const visibleMaxLat = ne.lat - (topOffset * latPerPx);
                const visibleMinLon = sw.lng + (sideOffset * lonPerPx);
                const visibleMaxLon = ne.lng - (sideOffset * lonPerPx);

                console.log('[MapContainer] Calling onMoveEnd with CENTER-FOCUSED bounds:', {
                    fullBounds: { minLat: sw.lat, maxLat: ne.lat, minLon: sw.lng, maxLon: ne.lng },
                    visibleBounds: { minLat: visibleMinLat, maxLat: visibleMaxLat, minLon: visibleMinLon, maxLon: visibleMaxLon },
                    adjustments: { topOffset, bottomOffset, sideOffset, latPerPx, lonPerPx }
                });

                onMoveEnd?.({
                    minLat: visibleMinLat,
                    maxLat: visibleMaxLat,
                    minLon: visibleMinLon,
                    maxLon: visibleMaxLon
                });
                isUserDragging.current = false; // Reset flag
            }
        });

        return () => {
            map.current?.remove();
            map.current = null;
        };
    }, []);

    useEffect(() => {
        if (isActive && map.current) {
            setTimeout(() => {
                map.current?.resize();
            }, 100);
        }
    }, [isActive]);

    // Handle Data Updates
    useEffect(() => {
        if (!map.current) return;
        const currentMap = map.current;
        const source = currentMap.getSource('shops') as any;
        const geojson = {
            type: 'FeatureCollection',
            features: shops.filter(s => s.lat && s.lon).map(shop => ({
                type: 'Feature',
                geometry: {
                    type: 'Point',
                    coordinates: [shop.lon, shop.lat]
                },
                properties: {
                    id: shop.id,
                    is_saved: shop.is_saved ? 1 : 0,
                    has_ranking: shop.my_review_stats?.rank ? 1 : 0,
                    // Pass name for initial feature properties if needed,
                    // though we use 'shop' object from props in render loop by ID lookup.
                    // Actually feature.properties is handy.
                    name: shop.name
                }
            }))
        };

        if (source) {
            source.setData(geojson);
        }
    }, [shops]);

    // Pre-calculate positions to ensure stability
    const shopPositions = useMemo(() => {
        const positions = new Map<number, [number, number]>();
        const positionCounts = new Map<string, number>();

        // Sort by ID to ensure deterministic order regardless of input array order (or selection status)
        const sortedShops = [...shops].sort((a, b) => a.id - b.id);

        sortedShops.forEach(shop => {
            if (!shop.lat || !shop.lon) return;

            const key = `${shop.lat},${shop.lon}`;
            const count = positionCounts.get(key) || 0;
            positionCounts.set(key, count + 1);

            if (count === 0) {
                positions.set(shop.id, [shop.lon, shop.lat]);
            } else {
                const radius = 0.00015;
                const angle = count * (2 * Math.PI / 8);
                const newLat = shop.lat + radius * Math.sin(angle);
                const newLon = shop.lon + radius * Math.cos(angle);
                positions.set(shop.id, [newLon, newLat]);
            }
        });

        return positions;
    }, [shops]); // Only recalculate if shops list changes

    // Marker Render Loop
    useEffect(() => {
        if (!map.current) return;
        const currentMap = map.current;

        const updateMarkers = () => {
            // Track IDs we want to keep
            const newMarkerIds = new Set<string>();

            const renderMarker = (shopId: number, lat: number, lon: number) => {
                const id = String(shopId);
                newMarkerIds.add(id);

                // Use pre-calculated position
                const pos = shopPositions.get(shopId);
                const [finalLon, finalLat] = pos || [lon, lat];

                const shop = shops.find(s => s.id === shopId);
                if (!shop) return;


                if (!markers.current.has(id)) {
                    // Create New Marker
                    const isSelected = shopId === selectedShopId;
                    const el = createMarkerElement(shop, isSelected, currentLanguage);

                    el.addEventListener('click', (e) => {
                        e.stopPropagation();
                        e.preventDefault();

                        // Set flag to prevent immediate map click from closing the card
                        markerClickedRecently.current = true;
                        setTimeout(() => {
                            markerClickedRecently.current = false;
                        }, 300);

                        onMarkerClick?.(shopId);
                    });

                    const marker = new maptilersdk.Marker({
                        element: el,
                        anchor: 'center'
                    });

                    marker.setLngLat([finalLon, finalLat]).addTo(currentMap);
                    markers.current.set(id, marker);
                } else {
                    // Update Existing
                    const marker = markers.current.get(id)!;
                    const isSelected = shopId === selectedShopId;

                    // Check if selection state changed - if so, recreate marker
                    const oldEl = marker.getElement();
                    const wasSelected = oldEl.querySelector('.speech-bubble') !== null;

                    if (wasSelected !== isSelected) {
                        // Selection state changed - need to fully recreate
                        marker.remove();
                        markers.current.delete(id);

                        const newEl = createMarkerElement(shop, isSelected, currentLanguage);
                        newEl.addEventListener('click', (e) => {
                            e.stopPropagation();
                            e.preventDefault();

                            // Set flag to prevent immediate map click from closing the card
                            markerClickedRecently.current = true;
                            setTimeout(() => {
                                markerClickedRecently.current = false;
                            }, 300);

                            onMarkerClick?.(shopId);
                        });

                        const newMarker = new maptilersdk.Marker({
                            element: newEl,
                            anchor: 'center'
                        });

                        newMarker.setLngLat([finalLon, finalLat]).addTo(currentMap);
                        markers.current.set(id, newMarker);
                    } else {
                        // Just update z-index if needed
                        oldEl.style.zIndex = isSelected ? '1000' : (shop.is_saved ? '500' : '100');

                        // For selected marker, ensure position is correct
                        if (isSelected) {
                            marker.setLngLat([finalLon, finalLat]);
                        }
                    }
                }
            };

            // Try to get features from queryRenderedFeatures first (more efficient for large datasets)
            const features = currentMap.queryRenderedFeatures({ layers: ['shops-point'] });

            if (features.length > 0) {
                // 1. Render Visible Features
                features.forEach((feature: any) => {
                    const shopId = feature.properties.id;
                    // Properties might be localized or partial, but ID is reliable.
                    // We need lat/lon. Feature geometry has it.
                    // Note: feature.geometry.coordinates is [lon, lat]
                    const [lon, lat] = feature.geometry.coordinates;
                    renderMarker(shopId, lat, lon);
                });
            } else {
                // Fallback: Render all shops directly (useful during initial load)
                shops.forEach(shop => {
                    if (shop.lat && shop.lon) {
                        renderMarker(shop.id, shop.lat, shop.lon);
                    }
                });
            }

            // 2. Explicitly Render Selected Shop (to prevent disappearing on pan/edge cases)
            if (selectedShopId) {
                const selectedShop = shops.find(s => s.id === selectedShopId);
                if (selectedShop && selectedShop.lat && selectedShop.lon) {
                    renderMarker(selectedShop.id, selectedShop.lat, selectedShop.lon);
                }
            }

            // Cleanup
            markers.current.forEach((marker, id) => {
                if (!newMarkerIds.has(id)) {
                    marker.remove();
                    markers.current.delete(id);
                }
            });
        };

        currentMap.on('load', updateMarkers);
        currentMap.on('move', updateMarkers);
        currentMap.on('moveend', updateMarkers);
        currentMap.on('sourcedata', (e) => {
            if (e.sourceId === 'shops' && e.isSourceLoaded) updateMarkers();
        });

        if (currentMap.loaded()) updateMarkers();

        return () => {
            currentMap.off('load', updateMarkers);
            currentMap.off('move', updateMarkers);
            currentMap.off('moveend', updateMarkers);
            currentMap.off('sourcedata', updateMarkers);
        };
    }, [selectedShopId, shops, shopPositions]);

    // Handle Center Changes (including user location button)
    useEffect(() => {
        if (!map.current || !center) return;

        // Check if center actually changed
        const centerChanged = !lastCenterRef.current ||
            lastCenterRef.current[0] !== center[0] ||
            lastCenterRef.current[1] !== center[1];

        if (!centerChanged) {
            // Center didn't change, don't fly
            return;
        }

        // Update last center
        lastCenterRef.current = center;

        // First time: just apply and mark as done (don't send bounds, let initial load handle it)
        if (!initialCenterApplied.current) {
            initialCenterApplied.current = true;
            // Use setCenter instead of flyTo for initial position (no animation)
            map.current.setCenter([center[1], center[0]]);
            return;
        }

        // Subsequent times: only fly if not currently showing a selected shop
        // (to avoid conflicts with selectedShopId auto-fly)
        if (!selectedShopId) {
            // Temporarily disable the user dragging flag to prevent moveend from triggering
            isUserDragging.current = false;

            map.current.flyTo({
                center: [center[1], center[0]],
                duration: 800,
                essential: true
            });
        }
    }, [center, selectedShopId]);

    // Auto-fly to selected shop when selectedShopId changes
    useEffect(() => {
        if (!map.current || !selectedShopId) return;

        const selectedShop = shops.find(s => s.id === selectedShopId);
        if (!selectedShop || !selectedShop.lat || !selectedShop.lon) return;

        let targetCenter: [number, number] = [selectedShop.lon, selectedShop.lat];

        // Adjust for bottom sheet offset if present
        if (bottomSheetOffset && bottomSheetOffset > 0) {
            const point = map.current.project(targetCenter as any);
            const newPoint = point.add(new maptilersdk.Point(0, bottomSheetOffset));
            const unprojected = map.current.unproject(newPoint);
            targetCenter = [unprojected.lng, unprojected.lat];
        }

        // Temporarily disable the user dragging flag to prevent moveend from triggering
        isUserDragging.current = false;

        map.current.flyTo({
            center: targetCenter,
            duration: 800,
            essential: true
        });
    }, [selectedShopId, bottomSheetOffset]);

    return (
        <div className="w-full h-full relative">
            <div ref={mapContainer} className="absolute inset-0" />
            <style>{`
                /* Ensure marker interaction */
                .marker-container {
                    /* Since we set width via element style, this might not be needed */
                }
            `}</style>
        </div>
    );
};


