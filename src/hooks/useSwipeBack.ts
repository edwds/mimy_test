import { useEffect, useRef, useState } from 'react';

interface UseSwipeBackOptions {
    onSwipeBack: () => void;
    enabled?: boolean;
    threshold?: number; // Minimum swipe distance to trigger back navigation
    edgeThreshold?: number; // Maximum distance from left edge to start swipe
}

export const useSwipeBack = ({
    onSwipeBack,
    enabled = true,
    threshold = 100,
    edgeThreshold = 50,
}: UseSwipeBackOptions) => {
    const [dragX, setDragX] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const startXRef = useRef(0);
    const startYRef = useRef(0);
    const currentXRef = useRef(0);
    const isValidSwipeRef = useRef(false);

    useEffect(() => {
        if (!enabled) return;

        const handleTouchStart = (e: TouchEvent) => {
            const touch = e.touches[0];
            startXRef.current = touch.clientX;
            startYRef.current = touch.clientY;
            currentXRef.current = touch.clientX;

            // Only start tracking if touch begins near the left edge
            if (touch.clientX <= edgeThreshold) {
                isValidSwipeRef.current = true;
            }
        };

        const handleTouchMove = (e: TouchEvent) => {
            if (!isValidSwipeRef.current) return;

            const touch = e.touches[0];
            currentXRef.current = touch.clientX;

            const deltaX = touch.clientX - startXRef.current;
            const deltaY = touch.clientY - startYRef.current;

            // Only track horizontal swipes (prevent vertical scroll interference)
            if (Math.abs(deltaX) > Math.abs(deltaY) && deltaX > 0) {
                setIsDragging(true);
                setDragX(Math.min(deltaX, 300)); // Cap maximum drag distance

                // Prevent default scroll behavior during horizontal swipe
                e.preventDefault();
            } else if (Math.abs(deltaY) > Math.abs(deltaX)) {
                // If vertical scroll is dominant, cancel the swipe
                isValidSwipeRef.current = false;
            }
        };

        const handleTouchEnd = () => {
            if (!isValidSwipeRef.current) {
                setDragX(0);
                setIsDragging(false);
                return;
            }

            const deltaX = currentXRef.current - startXRef.current;

            if (deltaX > threshold) {
                onSwipeBack();
            }

            // Reset state
            setDragX(0);
            setIsDragging(false);
            isValidSwipeRef.current = false;
        };

        document.addEventListener('touchstart', handleTouchStart, { passive: true });
        document.addEventListener('touchmove', handleTouchMove, { passive: false });
        document.addEventListener('touchend', handleTouchEnd);

        return () => {
            document.removeEventListener('touchstart', handleTouchStart);
            document.removeEventListener('touchmove', handleTouchMove);
            document.removeEventListener('touchend', handleTouchEnd);
        };
    }, [enabled, onSwipeBack, threshold, edgeThreshold]);

    return {
        dragX,
        isDragging,
        containerStyle: {
            transform: isDragging ? `translateX(${dragX}px)` : 'translateX(0)',
            transition: isDragging ? 'none' : 'transform 0.3s ease-out',
            boxShadow: isDragging ? '-4px 0 16px rgba(0, 0, 0, 0.15)' : 'none',
        },
        overlayStyle: {
            opacity: isDragging ? Math.min(dragX / threshold, 1) * 0.2 : 0,
            transition: isDragging ? 'none' : 'opacity 0.3s ease-out',
        },
    };
};
