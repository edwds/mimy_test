import { MapContainer as PacketMapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect, useRef } from 'react';
import L from 'leaflet';

// Define a custom DivIcon for a premium look
const createCustomIcon = (isSelected: boolean, isSaved: boolean) => {
    // Colors
    const color = isSaved ? '#DC2626' : '#FF6B00'; // Red for saved, Orange for recommended
    const bgColor = isSelected ? color : '#FFFFFF';
    const borderColor = isSelected ? '#FFFFFF' : color;

    // Different icon/shape based on type?
    // Let's keep circle but use Heart icon for saved maybe? 
    // Or just color differentiation as requested + icon inside.

    // Using simple HTML string templating
    return L.divIcon({
        className: 'custom-marker',
        html: `
            <div style="
                background-color: ${bgColor};
                width: ${isSelected ? '40px' : '32px'};
                height: ${isSelected ? '40px' : '32px'};
                border-radius: 50%;
                border: 2px solid ${borderColor};
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275); 
                position: relative;
                z-index: ${isSelected ? 100 : 1};
            ">
                ${isSaved
                ? `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${isSelected ? '#FFF' : color}" stroke="${isSelected ? '#FFF' : color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 16px; height: 16px;"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>`
                : `<div style="width: 8px; height: 8px; background-color: ${isSelected ? '#FFFFFF' : color}; border-radius: 50%;"></div>`
            }
                ${isSelected ? `<div style="position: absolute; bottom: -6px; left: 50%; transform: translateX(-50%); width: 0; height: 0; border-left: 6px solid transparent; border-right: 6px solid transparent; border-top: 6px solid ${color};"></div>` : ''}
            </div>
        `,
        iconSize: [40, 40],
        iconAnchor: [20, 42],
        popupAnchor: [0, -42]
    });
};

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
    center?: [number, number];
    isActive?: boolean;
    selectedShopId?: number | null;
    bottomSheetOffset?: number;
    onMoveEnd?: (bounds: { minLat: number, maxLat: number, minLon: number, maxLon: number }) => void;
}

const MapController = ({
    center,
    isActive,
    onMapClick,
    bottomSheetOffset,
    onMoveEnd
}: {
    center?: [number, number],
    isActive?: boolean,
    onMapClick?: () => void,
    bottomSheetOffset?: number,
    onMoveEnd?: (bounds: { minLat: number, maxLat: number, minLon: number, maxLon: number }) => void
}) => {
    const map = useMap();
    const prevParams = useRef<{ center?: [number, number], offset?: number }>({});

    useMapEvents({
        click: () => {
            onMapClick?.();
        },
        moveend: () => {
            const bounds = map.getBounds();
            onMoveEnd?.({
                minLat: bounds.getSouth(),
                maxLat: bounds.getNorth(),
                minLon: bounds.getWest(),
                maxLon: bounds.getEast()
            });
        }
    });

    useEffect(() => {
        if (isActive) {
            setTimeout(() => {
                map.invalidateSize();
            }, 100);
        }
    }, [isActive, map]);

    useEffect(() => {
        if (center) {
            const prev = prevParams.current;
            const sameCenter = prev.center && prev.center[0] === center[0] && prev.center[1] === center[1];
            const sameOffset = prev.offset === bottomSheetOffset;

            // If same center and same offset, skip.
            if (sameCenter && sameOffset) return;

            // Update refs
            prevParams.current = { center, offset: bottomSheetOffset };

            let targetCenter: L.LatLngExpression = center;

            if (bottomSheetOffset && bottomSheetOffset > 0) {
                // Determine current zoom
                const zoom = map.getZoom();
                // Project current center to point
                const point = map.project(center, zoom);
                // Shift Y up (or rather, the target needs to move down relative to view center, 
                // so we fly to a point "north" of the target so target ends up "south" (lower) in view?
                // Wait.
                // View Center (VC) is y=H/2.
                // We want Target (T) to be at y=H/4 (Top quarter).
                // So T needs to be "above" VC.
                // So we need to look at a point C such that T is above C.
                // So C is "south" of T.
                // C.y = T.y + offset.
                // Yes. Add positive Y offset produces a southern latitude (in screen coords, Y increases downwards).

                const newPoint = point.add([0, bottomSheetOffset]);
                targetCenter = map.unproject(newPoint, zoom);
            }

            map.flyTo(targetCenter, map.getZoom(), {
                animate: true,
                duration: 1.0 // Faster animation for responsiveness
            });
        }
    }, [center, map, bottomSheetOffset]);
    return null;
};

export const MapContainer = ({ shops, onMarkerClick, onMapClick, center, isActive, selectedShopId, bottomSheetOffset, onMoveEnd }: Props) => {
    const defaultCenter: [number, number] = [37.5665, 126.9780]; // Seoul City Hall Default

    return (
        <div className="w-full h-full relative z-0">
            <PacketMapContainer
                center={defaultCenter}
                zoom={14}
                style={{ height: '100%', width: '100%' }}
                zoomControl={false}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {shops.map((shop) => (
                    shop.lat && shop.lon ? (
                        <Marker
                            key={shop.id}
                            position={[shop.lat, shop.lon]}
                            icon={createCustomIcon(shop.id === selectedShopId, !!shop.is_saved)}
                            eventHandlers={{
                                click: (e) => {
                                    L.DomEvent.stopPropagation(e); // Prevent map click
                                    onMarkerClick?.(shop.id);
                                },
                            }}
                            zIndexOffset={shop.id === selectedShopId ? 1000 : (shop.is_saved ? 500 : 0)}
                        />
                    ) : null
                ))}

                <MapController
                    center={center}
                    isActive={isActive}
                    onMapClick={onMapClick}
                    bottomSheetOffset={bottomSheetOffset}
                    onMoveEnd={onMoveEnd}
                />
            </PacketMapContainer>
        </div>
    );
};
