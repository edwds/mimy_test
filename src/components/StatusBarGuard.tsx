import { Capacitor } from '@capacitor/core';
import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * A persistent guard that sits at the top of the screen (z-index 100)
 * and blocks the "notch" area with a solid background color.
 */
export const StatusBarGuard = () => {
    const [isNative, setIsNative] = useState(false);
    const location = useLocation();

    useEffect(() => {
        setIsNative(Capacitor.isNativePlatform());

        const handleStatusTap = () => {
            // Find the active scroll container
            // We search for elements with 'data-scroll-container' that are visible
            const containers = document.querySelectorAll('[data-scroll-container="true"]');
            containers.forEach((container) => {
                // Check if visible (simple check: offsetParent is not null)
                if ((container as HTMLElement).offsetParent !== null) {
                    container.scrollTo({ top: 0, behavior: 'smooth' });
                }
            });
        };

        window.addEventListener('statusTap', handleStatusTap);
        return () => window.removeEventListener('statusTap', handleStatusTap);
    }, []);

    // If on Discovery Tab (assuming query param or specific route), disable the white background
    // Discovery is usually the second tab.
    // If URL contains 'tab=discovery' or we are on specific route?
    // Let's check MainTab logic... but strictly speaking, if user is on Discovery, they want full map.
    // If I cannot detect it easily, I'll update MainTab/DiscoveryTab to toggle a global context or something.
    // But for now, let's assume if location.search includes 'tab=discovery' or pathname is '/main/discovery'.
    const isDiscovery = location.search.includes('tab=discovery') || location.pathname.includes('/discover');
    const isShopDetail = location.pathname.startsWith('/shop/');

    if (!isNative) return null;
    if (isDiscovery || isShopDetail) return null; // Don't block map or shop detail image



    return (
        <div
            className="fixed top-0 left-0 right-0 bg-background z-[100]"
            style={{
                height: 'env(safe-area-inset-top)',
            }}
        />
    );
};
