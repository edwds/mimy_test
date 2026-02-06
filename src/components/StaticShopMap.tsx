import * as maptilersdk from '@maptiler/sdk';
import "@maptiler/sdk/dist/maptiler-sdk.css";
import { useEffect, useRef } from 'react';

interface Props {
    lat: number;
    lon: number;
    name: string;
    className?: string;
}

export const StaticShopMap = ({ lat, lon, name, className = '' }: Props) => {
    const mapContainer = useRef<HTMLDivElement>(null);
    const map = useRef<maptilersdk.Map | null>(null);

    useEffect(() => {
        if (!mapContainer.current || map.current) return;

        maptilersdk.config.apiKey = import.meta.env.VITE_MAPTILER_API_KEY || 'YOUR_MAPTILER_API_KEY';

        map.current = new maptilersdk.Map({
            container: mapContainer.current,
            style: `https://api.maptiler.com/maps/streets-v4/style.json?key=${import.meta.env.VITE_MAPTILER_API_KEY}`,
            center: [lon, lat],
            zoom: 16,
            minZoom: 13,
            maxZoom: 18,
            // Disable drag/rotate but allow zoom
            dragPan: false,
            dragRotate: false,
            touchPitch: false,
            pitchWithRotate: false,
            navigationControl: false,
            geolocateControl: false,
            logoPosition: 'bottom-left'
        });

        // Add compact navigation control (zoom only)
        map.current.addControl(
            new maptilersdk.NavigationControl({ showCompass: false, visualizePitch: false }),
            'bottom-right'
        );

        map.current.on('load', () => {
            if (!map.current) return;

            // Create bubble marker
            const el = createBubbleMarker(name);

            new maptilersdk.Marker({
                element: el,
                anchor: 'bottom'
            })
                .setLngLat([lon, lat])
                .addTo(map.current);
        });

        return () => {
            map.current?.remove();
            map.current = null;
        };
    }, [lat, lon, name]);

    return (
        <div className={`relative ${className}`}>
            <div ref={mapContainer} className="absolute inset-0 static-shop-map" />
            <style>{`
                .static-shop-map .maplibregl-ctrl-bottom-left .maplibregl-ctrl a[aria-label="MapTiler logo"] {
                    width: 70px !important;
                    height: 21px !important;
                    background-size: 70px 21px !important;
                    margin: 0 !important;
                }
                .static-shop-map .maplibregl-ctrl-group,
                .static-shop-map .mapboxgl-ctrl-group {
                    margin: 8px !important;
                }
                .static-shop-map .maplibregl-ctrl-group button,
                .static-shop-map .mapboxgl-ctrl-group button {
                    width: 28px !important;
                    height: 28px !important;
                }
            `}</style>
        </div>
    );
};

// Create speech bubble marker element
function createBubbleMarker(name: string): HTMLElement {
    const container = document.createElement('div');
    container.style.position = 'relative';
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.alignItems = 'center';

    // Pin (circle at the bottom)
    const pin = document.createElement('div');
    pin.style.width = '12px';
    pin.style.height = '12px';
    pin.style.backgroundColor = '#FF6B00';
    pin.style.borderRadius = '50%';
    pin.style.border = '2px solid #FFFFFF';
    pin.style.boxShadow = '0 2px 6px rgba(0,0,0,0.3)';
    pin.style.position = 'absolute';
    pin.style.bottom = '0';
    pin.style.left = '50%';
    pin.style.transform = 'translateX(-50%)';
    pin.style.zIndex = '1';

    // Speech bubble
    const bubble = document.createElement('div');
    bubble.style.position = 'relative';
    bubble.style.backgroundColor = '#FF6B00';
    bubble.style.color = '#FFFFFF';
    bubble.style.padding = '8px 14px';
    bubble.style.borderRadius = '12px';
    bubble.style.fontSize = '13px';
    bubble.style.fontWeight = '600';
    bubble.style.whiteSpace = 'nowrap';
    bubble.style.boxShadow = '0 4px 12px rgba(0,0,0,0.25)';
    bubble.style.marginBottom = '8px';

    // Truncate name if too long
    let displayName = name;
    if (displayName.length > 16) {
        displayName = displayName.substring(0, 16) + '...';
    }
    bubble.textContent = displayName;

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
    container.appendChild(pin);

    return container;
}
