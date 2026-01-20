import * as maptilersdk from '@maptiler/sdk';
import "@maptiler/sdk/dist/maptiler-sdk.css";
import { useEffect, useRef } from 'react';

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
    center?: [number, number]; // [lat, lon] - keeping Leaflet order for compatibility with parent
    isActive?: boolean;
    selectedShopId?: number | null;
    bottomSheetOffset?: number;
    onMoveEnd?: (bounds: { minLat: number, maxLat: number, minLon: number, maxLon: number }) => void;
    onClusterClick?: (shops: Shop[]) => void;
}

// Function to create custom marker HTML
const createMarkerElement = (isSelected: boolean, isSaved: boolean) => {
    const color = isSaved ? '#DC2626' : '#FF6B00';
    const bgColor = isSelected ? color : '#FFFFFF';
    const borderColor = isSelected ? '#FFFFFF' : color;
    const size = isSelected ? 40 : 32;

    const el = document.createElement('div');
    el.className = 'custom-marker';
    el.style.width = `${size}px`;
    el.style.height = `${size}px`;
    el.style.backgroundColor = bgColor;
    el.style.borderRadius = '50%';
    el.style.border = `2px solid ${borderColor}`;
    el.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
    el.style.display = 'flex';
    el.style.alignItems = 'center';
    el.style.justifyContent = 'center';
    // Fix jitter: Only transition specific properties, avoid generic 'all' which includes transform
    el.style.transition = 'width 0.3s, height 0.3s, background-color 0.3s, border-color 0.3s';
    el.style.cursor = 'pointer';
    el.style.zIndex = isSelected ? '1000' : (isSaved ? '500' : '1');

    const innerHtml = isSaved
        ? `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${isSelected ? '#FFF' : color}" stroke="${isSelected ? '#FFF' : color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 18px; height: 18px;"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>`
        : `<div style="width: 10px; height: 10px; background-color: ${isSelected ? '#FFFFFF' : color}; border-radius: 50%;"></div>`;

    el.innerHTML = innerHtml;
    return el;
};

const createClusterElement = (count: number) => {
    const el = document.createElement('div');
    el.className = 'custom-cluster';
    // Premium Cluster Style - White BG, Orange Text
    const size = count < 10 ? 40 : (count < 100 ? 48 : 56);
    el.style.width = `${size}px`;
    el.style.height = `${size}px`;
    el.style.background = '#FFFFFF';
    el.style.borderRadius = '50%';
    el.style.border = '2px solid #FF6B00'; // Orange border
    el.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
    el.style.display = 'flex';
    el.style.alignItems = 'center';
    el.style.justifyContent = 'center';
    el.style.color = '#FF6B00'; // Orange text
    el.style.fontFamily = 'var(--font-family-display, sans-serif)';
    el.style.fontWeight = 'bold';
    el.style.fontSize = '16px';
    el.style.cursor = 'pointer';
    el.style.pointerEvents = 'auto'; // Ensure clicks are captured
    el.innerHTML = `<span>${count}</span>`;
    return el;
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
    onClusterClick
}: Props) => {
    const mapContainer = useRef<HTMLDivElement>(null);
    const map = useRef<maptilersdk.Map | null>(null);
    const markers = useRef<Map<string, maptilersdk.Marker>>(new Map()); // Changed key to string for IDs
    const prevParams = useRef<{ center?: [number, number], offset?: number }>({});

    // Initialize Map
    useEffect(() => {
        if (!mapContainer.current || map.current) return;

        maptilersdk.config.apiKey = import.meta.env.VITE_MAPTILER_API_KEY || 'YOUR_MAPTILER_API_KEY';

        map.current = new maptilersdk.Map({
            container: mapContainer.current,
            style: `https://api.maptiler.com/maps/base-v4/style.json?key=${import.meta.env.VITE_MAPTILER_API_KEY}`,
            center: [126.9780, 37.5665], // Seoul [lng, lat]
            zoom: 14,
            navigationControl: false,
            geolocateControl: false,
            logoPosition: 'bottom-left'
        });

        map.current.on('load', () => {
            map.current?.addSource('shops', {
                type: 'geojson',
                data: { type: 'FeatureCollection', features: [] },
                cluster: true,
                clusterMaxZoom: 16,
                clusterRadius: 35 // Reduced from 50 to keep clusters tighter
            });

            // Add invisible layer to query against
            map.current?.addLayer({
                id: 'shops-point',
                type: 'circle',
                source: 'shops',
                filter: ['!', ['has', 'point_count']],
                paint: { 'circle-opacity': 0, 'circle-radius': 0 }
            });

            // We also need to query clusters? Use same layer or separate?
            // Since we use queryRenderedFeatures, we assume clusters are also rendered?
            // Actually, typically you add a layer for unclustered and a layer for clusters.
            // But if we want to query *anything*, we need layers for both conditions if we filter.
            // OR just one layer without filter?
            // Let's add a general layer with opacity 0 that covers both.
            // Keep it simple.

            // Actually, `queryRenderedFeatures` returns features from layers. If we filter '!', we won't get clusters.
            // So add another layer for clusters.
            map.current?.addLayer({
                id: 'shops-cluster',
                type: 'circle',
                source: 'shops',
                filter: ['has', 'point_count'],
                paint: { 'circle-opacity': 0, 'circle-radius': 1 } // Radius > 0 ensures it renders to be queryable?
            });
        });

        map.current.on('click', (e) => {
            // Check if click was on a marker (markers handle their own clicks)
            // But we want to deselect if click was on map itself
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

    // Handle Active State (resize)
    useEffect(() => {
        if (isActive && map.current) {
            setTimeout(() => {
                map.current?.resize();
            }, 100);
        }
    }, [isActive]);

    // Handle Markers & Clustering
    useEffect(() => {
        if (!map.current) return;

        const currentMap = map.current;
        // removed unused currentMarkers


        // 1. Update Source Data
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
                    // We need to pass selection state, but GeoJSON properties are static until updated.
                    // We can handle selection highlighting in the render loop by checking `selectedShopId`
                }
            }))
        };

        if (source) {
            source.setData(geojson);
        } else {
            // Only add if map is loaded, handled in init or checking `map.loaded()`?
            // Actually, we should add source in init, but if shops update before init, we need to handle it.
            // Best to rely on `useEffect` for data updates and `on('load')` for source creation.
        }
    }, [shops]); // Only data updates

    // Marker Render Loop
    useEffect(() => {
        if (!map.current) return;
        const currentMap = map.current;

        const updateMarkers = () => {
            // Query visible features
            const featuresPoints = currentMap.queryRenderedFeatures({ layers: ['shops-point'] });
            const featuresClusters = currentMap.queryRenderedFeatures({ layers: ['shops-cluster'] });
            const features = [...featuresPoints, ...featuresClusters];

            // Track used IDs to remove old ones
            const newMarkerIds = new Set<string>();

            features.forEach((feature: any) => {
                const isCluster = !!feature.properties.cluster;
                const id = isCluster
                    ? `cluster-${feature.properties.cluster_id}`
                    : `shop-${feature.properties.id}`;

                newMarkerIds.add(id);

                if (!markers.current.has(id)) {
                    // Create Marker
                    let marker: maptilersdk.Marker;
                    let el: HTMLElement;

                    if (isCluster) {
                        const count = feature.properties.point_count;
                        el = createClusterElement(count);
                        el.addEventListener('click', (e) => {
                            e.stopPropagation();
                            e.preventDefault(); // Prevent map click logic

                            const clusterId = feature.properties.cluster_id;
                            const source = currentMap.getSource('shops') as any;

                            // NEW: Activate cluster (Get shops) instead of zooming
                            // Get leaves (unclustered points)
                            source.getClusterLeaves(clusterId, Infinity, 0, (err: any, features: any[]) => {
                                if (err) {
                                    console.error("Error getting cluster leaves:", err);
                                    return;
                                }

                                // Map leaves back to full Shop objects from our prop
                                // We rely on IDs to match current prop data
                                const leafIds = new Set(features.map(f => f.properties.id));
                                const clusterShops = shops.filter(s => leafIds.has(s.id));

                                onClusterClick?.(clusterShops);
                            });
                        });
                        marker = new maptilersdk.Marker({ element: el });
                    } else {
                        // Shop Marker
                        // We need real-time properties. 
                        // `feature.properties` has the static data from Source.
                        // For selection state, we check `selectedShopId`.
                        const shopId = feature.properties.id;
                        const isSaved = !!feature.properties.is_saved;
                        const isSelected = shopId === selectedShopId;

                        el = createMarkerElement(isSelected, isSaved);
                        el.addEventListener('click', (e) => {
                            e.stopPropagation();
                            onMarkerClick?.(shopId);
                        });
                        marker = new maptilersdk.Marker({ element: el });
                    }

                    marker.setLngLat(feature.geometry.coordinates).addTo(currentMap);
                    markers.current.set(id, marker);
                } else {
                    // Update Existing (Highlihgt check)
                    // If it's a shop, we might need to update style if selectedShopId changed
                    if (!isCluster) {
                        const shopId = feature.properties.id;
                        const isSaved = !!feature.properties.is_saved;
                        const isSelected = shopId === selectedShopId;

                        const marker = markers.current.get(id)!;
                        const oldEl = marker.getElement();

                        // Check if we need to replace element? 
                        // Or just update styles. createMarkerElement logic creates a complex SVG/Div.
                        // Simplest is to replace element if state differs? 
                        // Optim: modify styles directly if possible.
                        // For now, let's just replace the element content or style if key props changed.
                        // Optimization: Compare flags. But DOM access is cheap enough for 20 items.

                        const newEl = createMarkerElement(isSelected, isSaved);
                        // Don't lose listeners... replacing element is tricky in Marker.
                        // Better: manual style update.
                        // Let's reuse createMarkerElement logic manually here or make it updateable.
                        // For speed, let's just check if we can update the color/size.

                        // Hack: Replace internal HTML?
                        oldEl.innerHTML = newEl.innerHTML;
                        oldEl.style.backgroundColor = newEl.style.backgroundColor;
                        oldEl.style.border = newEl.style.border;
                        oldEl.style.width = newEl.style.width;
                        oldEl.style.height = newEl.style.height;
                        oldEl.style.zIndex = newEl.style.zIndex;
                    }
                }
            });

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

        // Initial call if loaded
        if (currentMap.loaded()) updateMarkers();

        return () => {
            currentMap.off('load', updateMarkers);
            currentMap.off('move', updateMarkers);
            currentMap.off('moveend', updateMarkers);
        };
    }, [selectedShopId]); // Re-bind updateMarkers when selection changes (to update highlights)

    // Initial Source Setup (Moved from init to separate effect to ensure map exists)
    // Actually, do it in Map Init logic to ensure order.


    // Handle Centering with Offset
    useEffect(() => {
        if (!map.current || !center) return;

        const prev = prevParams.current;
        const sameCenter = prev.center && prev.center[0] === center[0] && prev.center[1] === center[1];
        const sameOffset = prev.offset === bottomSheetOffset;

        if (sameCenter && sameOffset) return;
        prevParams.current = { center, offset: bottomSheetOffset };

        let targetCenter: [number, number] = [center[1], center[0]]; // [lng, lat]

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
        </div>
    );
};
