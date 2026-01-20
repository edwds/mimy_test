import { useState, useRef, RefObject } from 'react';

export const useSmartScroll = <T extends HTMLElement>(containerRef: RefObject<T | null>) => {
    const [isVisible, setIsVisible] = useState(true);
    const lastScrollY = useRef(0);

    const handleScroll = () => {
        if (!containerRef.current) return;
        const currentScrollY = containerRef.current.scrollTop;
        const diff = currentScrollY - lastScrollY.current;

        if (currentScrollY < 10) {
            setIsVisible(true);
        } else if (Math.abs(diff) > 10) {
            if (diff > 0) { // Scrolling Down
                setIsVisible(false);
            } else { // Scrolling Up
                setIsVisible(true);
            }
        }
        lastScrollY.current = currentScrollY;
    };

    return { isVisible, setIsVisible, handleScroll };
};
