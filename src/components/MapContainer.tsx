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

export const MapContainer = ({
    shops,
    onMarkerClick,
    onMapClick,
    center,
    isActive,
    selectedShopId,
    bottomSheetOffset,
    onMoveEnd
}: Props) => {
    const mapContainer = useRef<HTMLDivElement>(null);
    const map = useRef<maptilersdk.Map | null>(null);
    const markers = useRef<Map<number, maptilersdk.Marker>>(new Map());
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

    // Handle Markers
    useEffect(() => {
        if (!map.current) return;

        const currentMap = map.current;
        const currentMarkers = markers.current;

        // Remove markers not in shops list
        const shopIds = new Set(shops.map(s => s.id));
        currentMarkers.forEach((marker, id) => {
            if (!shopIds.has(id)) {
                marker.remove();
                currentMarkers.delete(id);
            }
        });

        // Add or Update markers
        shops.forEach(shop => {
            if (!shop.lat || !shop.lon) return;

            const isSelected = shop.id === selectedShopId;
            const isSaved = !!shop.is_saved;

            let marker = currentMarkers.get(shop.id);

            if (marker) {
                // Update existing marker element if selection state changed
                const el = marker.getElement();
                const color = isSaved ? '#DC2626' : '#FF6B00';
                const bgColor = isSelected ? color : '#FFFFFF';
                const borderColor = isSelected ? '#FFFFFF' : color;
                const size = isSelected ? 40 : 32;

                el.style.width = `${size}px`;
                el.style.height = `${size}px`;
                el.style.backgroundColor = bgColor;
                el.style.border = `2px solid ${borderColor}`;
                el.style.zIndex = isSelected ? '1000' : (isSaved ? '500' : '1');

                const innerHtml = isSaved
                    ? `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${isSelected ? '#FFF' : color}" stroke="${isSelected ? '#FFF' : color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 18px; height: 18px;"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>`
                    : `<div style="width: 10px; height: 10px; background-color: ${isSelected ? '#FFFFFF' : color}; border-radius: 50%;"></div>`;

                el.innerHTML = innerHtml;
            } else {
                // Create new marker
                const el = createMarkerElement(isSelected, isSaved);
                el.addEventListener('click', (e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    onMarkerClick?.(shop.id);
                });

                marker = new maptilersdk.Marker({
                    element: el,
                    anchor: 'bottom'
                })
                    .setLngLat([shop.lon, shop.lat])
                    .addTo(currentMap);

                currentMarkers.set(shop.id, marker);
            }
        });
    }, [shops, selectedShopId, onMarkerClick]);

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
