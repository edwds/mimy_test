import { Capacitor } from '@capacitor/core';
import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * A persistent guard that sits at the top of the screen (z-index 100)
 * and blocks the "notch" area with a solid background color.
 */
export const StatusBarGuard = () => {
    const [isNative, setIsNative] = useState(false);
    const [showBackground, setShowBackground] = useState(false);
    const location = useLocation();

    useEffect(() => {
        setIsNative(Capacitor.isNativePlatform());

        const handleStatusTap = () => {
            const containers = document.querySelectorAll('[data-scroll-container="true"]');
            containers.forEach((container) => {
                if ((container as HTMLElement).offsetParent !== null) {
                    container.scrollTo({ top: 0, behavior: 'smooth' });
                }
            });
        };

        window.addEventListener('statusTap', handleStatusTap);
        return () => window.removeEventListener('statusTap', handleStatusTap);
    }, []);

    // Scroll Detection Logic
    useEffect(() => {
        // Reset state on route change
        setShowBackground(false);

        const findAndAttachListener = () => {
            // Find visible scroll container
            const containers = document.querySelectorAll('[data-scroll-container="true"]');
            let activeContainer: HTMLElement | null = null;

            for (const container of containers) {
                if ((container as HTMLElement).offsetParent !== null) {
                    activeContainer = container as HTMLElement;
                    break;
                }
            }

            if (!activeContainer) return null;

            // Check initial position
            if (activeContainer.scrollTop > 10) {
                setShowBackground(true);
            }

            const handleScroll = () => {
                if (activeContainer) {
                    setShowBackground(activeContainer.scrollTop > 10);
                }
            };

            activeContainer.addEventListener('scroll', handleScroll, { passive: true });
            return { container: activeContainer, handler: handleScroll };
        };

        // Attempt to attach listener. 
        // We might need a small delay or retry because the new page's layout 
        // (and thus visibility of container) might not be ready immediately after location change.
        let cleanupFn: (() => void) | null = null;

        const attempt = () => {
            const result = findAndAttachListener();
            if (result) {
                cleanupFn = () => {
                    result.container.removeEventListener('scroll', result.handler);
                };
            }
        };

        // Try immediately and after a short delay for transitions
        attempt();
        const t1 = setTimeout(attempt, 100);
        const t2 = setTimeout(attempt, 300); // Backup for slower transitions

        return () => {
            if (cleanupFn) cleanupFn();
            clearTimeout(t1);
            clearTimeout(t2);
        };
    }, [location.pathname, location.search]); // Re-run on route change

    // If on Discovery Tab (assuming query param or specific route), disable the white background
    const isDiscovery = location.search.includes('tab=discovery') || location.pathname.includes('/discover');
    const isShopDetail = location.pathname.startsWith('/shop/');

    if (!isNative) return null;
    if (isDiscovery || isShopDetail) return null; // Don't block map or shop detail image

    return (
        <div
            className={`fixed top-0 left-0 right-0 z-[100] transition-colors duration-200 ${showBackground ? 'bg-background' : 'bg-transparent'}`}
            style={{
                height: 'env(safe-area-inset-top)',
            }}
        />
    );
};
