import * as maptilersdk from '@maptiler/sdk';
import "@maptiler/sdk/dist/maptiler-sdk.css";
import { useEffect, useRef, useMemo } from 'react';

interface Shop {
    id: number;
    name: string;
    lat?: number;
    lon?: number;
    is_saved?: boolean;
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
}

// Function to create custom marker HTML
const createMarkerElement = (shop: Shop, isSelected: boolean) => {
    const isSaved = shop.is_saved;
    const color = isSaved ? '#DC2626' : '#FF6B00';
    const bgColor = isSelected ? color : '#FFFFFF';
    const borderColor = isSelected ? '#FFFFFF' : color;
    const size = isSelected ? 32 : 24;

    // Root Container: 0x0 size, centered at coordinate
    const container = document.createElement('div');
    container.className = 'marker-root';
    container.style.width = '0px';
    container.style.height = '0px';
    container.style.position = 'relative';
    container.style.display = 'flex';
    container.style.alignItems = 'center';
    container.style.justifyContent = 'center';
    container.style.cursor = 'pointer';
    container.style.pointerEvents = 'auto'; // allow clicks
    container.style.zIndex = isSelected ? '1000' : (isSaved ? '500' : '100');

    // Pin: Absolutely centered
    const pin = document.createElement('div');
    pin.className = 'custom-marker-pin';
    pin.style.position = 'absolute';
    pin.style.width = `${size}px`;
    pin.style.height = `${size}px`;
    pin.style.left = '50%';
    pin.style.top = '50%';
    pin.style.transform = 'translate(-50%, -50%)';
    pin.style.backgroundColor = bgColor;
    pin.style.borderRadius = '50%';
    pin.style.border = `2px solid ${borderColor}`;
    pin.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';
    pin.style.display = 'flex';
    pin.style.alignItems = 'center';
    pin.style.justifyContent = 'center';
    pin.style.transition = 'all 0.2s ease-out';

    const innerHtml = isSaved
        ? `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${isSelected ? '#FFF' : color}" stroke="${isSelected ? '#FFF' : color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: ${size * 0.6}px; height: ${size * 0.6}px;"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>`
        : `<div style="width: ${size * 0.3}px; height: ${size * 0.3}px; background-color: ${isSelected ? '#FFFFFF' : color}; border-radius: 50%;"></div>`;

    pin.innerHTML = innerHtml;
    container.appendChild(pin);

    // Label: Positioned to the right of the pin
    const label = document.createElement('div');
    label.innerText = shop.name;
    label.style.position = 'absolute';
    label.style.left = `${size / 2 + 6}px`; // Offset by radius + margin
    label.style.top = '50%';
    label.style.transform = 'translateY(-50%)';
    label.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
    label.style.padding = '2px 6px';
    label.style.borderRadius = '4px';
    label.style.boxShadow = '0 1px 4px rgba(0,0,0,0.15)';
    label.style.fontSize = '12px';
    label.style.fontWeight = '600';
    label.style.color = '#333';
    label.style.whiteSpace = 'nowrap';
    label.style.pointerEvents = 'auto'; // Make label clickable
    label.style.cursor = 'pointer';
    label.style.transition = 'opacity 0.2s';

    container.appendChild(label);

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
    // onClusterClick // Not used anymore
}: Props) => {
    const mapContainer = useRef<HTMLDivElement>(null);
    const map = useRef<maptilersdk.Map | null>(null);
    const markers = useRef<Map<string, maptilersdk.Marker>>(new Map());
    const prevParams = useRef<{ center?: [number, number], offset?: number }>({});

    // Initialize Map
    useEffect(() => {
        if (!mapContainer.current || map.current) return;

        maptilersdk.config.apiKey = import.meta.env.VITE_MAPTILER_API_KEY || 'YOUR_MAPTILER_API_KEY';

        map.current = new maptilersdk.Map({
            container: mapContainer.current,
            style: `https://api.maptiler.com/maps/base-v4/style.json?key=${import.meta.env.VITE_MAPTILER_API_KEY}`,
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
        });

        map.current.on('click', (e) => {
            if (!e.defaultPrevented) {
                onMapClick?.();
            }
        });

        map.current.on('moveend', () => {
            if (!map.current) return;
            const bounds = map.current.getBounds();
            onMoveEnd?.({
                minLat: bounds.getSouth(),
                maxLat: bounds.getNorth(),
                minLon: bounds.getWest(),
                maxLon: bounds.getEast()
            });
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
            const features = currentMap.queryRenderedFeatures({ layers: ['shops-point'] });

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
                    const el = createMarkerElement(shop, isSelected);

                    el.addEventListener('click', (e) => {
                        e.stopPropagation();
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

                    const newEl = createMarkerElement(shop, isSelected);
                    const oldEl = marker.getElement();

                    if (oldEl.innerHTML !== newEl.innerHTML || oldEl.style.zIndex !== newEl.style.zIndex) {
                        oldEl.innerHTML = newEl.innerHTML;
                        oldEl.style.zIndex = newEl.style.zIndex;
                    }
                    // For selected marker, ensure position serves correct if we manually added it
                    if (isSelected) {
                        marker.setLngLat([finalLon, finalLat]);
                    }
                }
            };

            // 1. Render Visible Features
            features.forEach((feature: any) => {
                const shopId = feature.properties.id;
                // Properties might be localized or partial, but ID is reliable.
                // We need lat/lon. Feature geometry has it.
                // Note: feature.geometry.coordinates is [lon, lat]
                const [lon, lat] = feature.geometry.coordinates;
                renderMarker(shopId, lat, lon);
            });

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
    }, [selectedShopId, shops]);

    // Handle Centering
    useEffect(() => {
        if (!map.current || !center) return;
        const prev = prevParams.current;
        const sameCenter = prev.center && prev.center[0] === center[0] && prev.center[1] === center[1];
        const sameOffset = prev.offset === bottomSheetOffset;

        if (sameCenter && sameOffset) return;
        prevParams.current = { center, offset: bottomSheetOffset };

        let targetCenter: [number, number] = [center[1], center[0]];

        if (bottomSheetOffset && bottomSheetOffset > 0) {
            const point = map.current.project(targetCenter as any);
            const newPoint = point.add(new maptilersdk.Point(0, bottomSheetOffset));
            const unprojected = map.current.unproject(newPoint);
            targetCenter = [unprojected.lng, unprojected.lat];
        }

        map.current.flyTo({
            center: targetCenter,
            duration: 1000,
            essential: true
        });
    }, [center, bottomSheetOffset]);

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


