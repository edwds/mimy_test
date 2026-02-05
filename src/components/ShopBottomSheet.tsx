import { useState, useEffect, useRef } from 'react';
import { ShopCard } from './ShopCard';
import { motion, PanInfo, useAnimation, useDragControls } from 'framer-motion';
// import { X } from 'lucide-react'; // Removed unused
import { useTranslation } from 'react-i18next';
import { prefetchReviewSnippet, snippetCache } from '@/components/discovery/SelectedShopCard';
import { Capacitor } from '@capacitor/core';

// Wrapper to handle individual review fetching
const ShopCardWithReview = ({ shop, onSave, displayContext }: { shop: any, onSave?: (id: number) => void, displayContext?: 'default' | 'discovery' | 'saved_list' }) => {
    // Initialize with prop if available, or cache, or null
    const [reviewSnippet, setReviewSnippet] = useState<any>(shop.reviewSnippet || snippetCache.get(shop.id) || null);

    useEffect(() => {
        // If we have a snippet from props, ensure it's in the cache for future use
        if (shop.reviewSnippet && !snippetCache.has(shop.id)) {
            snippetCache.set(shop.id, shop.reviewSnippet);
        }

        // If we still don't have a snippet (and it wasn't explicitly null from prop), try to fetch
        // Note: We need to be careful not to fetch if shop.reviewSnippet is explicitly null (meaning no review exists)
        // Check if 'reviewSnippet' property exists in shop object to distinguish "undefined" vs "null"
        const hasSnippetProp = 'reviewSnippet' in shop;

        if (!reviewSnippet && !hasSnippetProp && !snippetCache.has(shop.id)) {
            const fetchData = async () => {
                await prefetchReviewSnippet(shop.id);
                if (snippetCache.has(shop.id)) {
                    setReviewSnippet(snippetCache.get(shop.id));
                }
            };
            fetchData();
        } else if (shop.reviewSnippet !== undefined && reviewSnippet !== shop.reviewSnippet) {
            // Sync if prop updates
            setReviewSnippet(shop.reviewSnippet);
        }
    }, [shop.id, shop.reviewSnippet, reviewSnippet]);

    return <ShopCard shop={shop} onSave={onSave} reviewSnippet={reviewSnippet} displayContext={displayContext} />;
};

interface Props {
    shops: any[];
    selectedShopId?: number | null;
    onSave?: (id: number) => void;
    isInitialLoad?: boolean; // Flag to indicate if this is the initial discovery load
    userName?: string; // User nickname for personalized message
}

export const ShopBottomSheet = ({ shops, selectedShopId, onSave, isInitialLoad = false, userName }: Props) => {
    // 3 states: minimized, half (default), expanded (max)
    const [snapState, setSnapState] = useState<'minimized' | 'half' | 'expanded'>('half');
    const controls = useAnimation();
    const dragControls = useDragControls();
    const sheetRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    const { t } = useTranslation();
    const prevFirstShopId = useRef<number | null>(shops[0]?.id || null);
    const isScrolling = useRef(false);
    const touchStartY = useRef(0);
    const initialScrollTop = useRef(0);
    const isDraggingHandle = useRef(false);

    // Calculate positions
    // Sheet has h-full (100vh) and bottom-0, so y transform moves it up/down
    // y=0: fully visible, y=screenHeight: completely hidden below screen
    const searchBarArea = Capacitor.isNativePlatform() ? 120 : 90;
    const screenHeight = typeof window !== 'undefined' ? window.innerHeight : 800;

    const expandedPosition = searchBarArea; // Show max, just below search bar
    const halfPosition = screenHeight * 0.5; // Show 50% of screen
    const minimizedPosition = screenHeight - 200; // Only show ~200px (header + bit of content)

    // If a shop is selected, show only that shop.
    const displayedShops = selectedShopId
        ? shops.filter(s => s.id === selectedShopId)
        : shops;

    // Reset scroll and height when shops list changes (e.g., after search)
    useEffect(() => {
        const currentFirstShopId = shops[0]?.id || null;

        // Only reset if the first shop ID changed (indicates new search results)
        if (currentFirstShopId !== prevFirstShopId.current && currentFirstShopId !== null) {
            prevFirstShopId.current = currentFirstShopId;

            // Reset to half state
            setSnapState('half');

            // Reset scroll position
            if (contentRef.current) {
                contentRef.current.scrollTop = 0;
            }
        }
    }, [shops]);

    // Handle Snap State Changes
    useEffect(() => {
        const variants = {
            minimized: { y: minimizedPosition }, // Only header visible
            half: { y: halfPosition }, // Default: 50% of screen
            expanded: { y: expandedPosition } // Max: just below search bar
        };
        controls.start(variants[snapState]);
    }, [snapState, controls, minimizedPosition, halfPosition, expandedPosition]);

    const handleDragEnd = (_: any, info: PanInfo) => {
        const velocity = info.velocity.y;
        const offset = info.offset.y;

        // Determine next state based on velocity and position
        let nextState = snapState;

        // Strong velocity takes priority
        if (velocity > 400) {
            // Fast drag down - go to next lower state
            if (snapState === 'expanded') nextState = 'half';
            else if (snapState === 'half') nextState = 'minimized';
            // If already minimized, stay minimized (don't close)
        } else if (velocity < -400) {
            // Fast drag up - go to next higher state
            if (snapState === 'minimized') nextState = 'half';
            else if (snapState === 'half') nextState = 'expanded';
            // If already expanded, stay expanded
        } else if (Math.abs(offset) > 80) {
            // Significant drag distance - go to next state
            if (offset > 0) {
                // Dragged down
                if (snapState === 'expanded') nextState = 'half';
                else if (snapState === 'half') nextState = 'minimized';
            } else {
                // Dragged up
                if (snapState === 'minimized') nextState = 'half';
                else if (snapState === 'half') nextState = 'expanded';
            }
        }
        // If offset is small, stay in current state

        // Always snap to one of the three states
        setSnapState(nextState);

        // Reset flag after a delay to ensure all touch events are processed
        setTimeout(() => {
            isDraggingHandle.current = false;
        }, 100);
    };

    return (
        <motion.div
            ref={sheetRef}
            initial={{ y: halfPosition }}
            animate={controls}
            transition={{
                type: "spring",
                damping: 35,
                stiffness: 350,
                mass: 0.5
            }}
            drag="y"
            dragControls={dragControls}
            dragListener={false}
            dragMomentum={false}
            dragConstraints={{
                top: 0, // Can't drag above expanded position
                bottom: minimizedPosition // Can't drag below minimized position
            }}
            dragElastic={{
                top: 0.1,
                bottom: 0.2
            }}
            onDragEnd={handleDragEnd}
            className={`absolute bottom-0 left-0 right-0 h-full bg-background shadow-[0_-5px_20px_rgba(0,0,0,0.1)] z-20 flex flex-col will-change-transform rounded-t-3xl`}
        >
            {/* Draggable Area Container */}
            <div className="flex-shrink-0 relative" style={{ pointerEvents: 'none' }}>
                {/* Handle Bar - Absolute positioned to prevent touch event conflicts */}
                <div
                    className="pt-3 pb-2 flex justify-center w-full cursor-grab active:cursor-grabbing"
                    style={{
                        pointerEvents: 'auto',
                        position: 'relative',
                        zIndex: 100,
                        touchAction: 'none'
                    }}
                    onPointerDown={(e) => {
                        e.stopPropagation();
                        isDraggingHandle.current = true;
                        dragControls.start(e);
                    }}
                >
                    <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
                </div>

                {/* Header - Not draggable */}
                <div
                    className="flex flex-col mb-0 px-5 pb-4"
                    style={{ pointerEvents: 'auto' }}
                    onPointerDown={(e) => e.stopPropagation()}
                >
                    {selectedShopId ? (
                        <h2 className="text-lg font-bold">
                            {t('discovery.bottom_sheet.selected_shop')}
                        </h2>
                    ) : isInitialLoad ? (
                        <>
                            <h2 className="text-lg font-bold">
                                {t('discovery.bottom_sheet.initial_title', { name: userName || '님' })}
                            </h2>
                            <p className="text-sm text-muted-foreground mt-1">
                                {t('discovery.bottom_sheet.initial_subtitle')}
                            </p>
                        </>
                    ) : (
                        <p className="text-sm text-muted-foreground">
                            {t('discovery.bottom_sheet.nearby_shops', { count: shops.length })}
                        </p>
                    )}
                </div>
            </div>

            {/* Content (Always scrollable) */}
            <div
                ref={contentRef}
                className="flex-1 px-4 pb-24 overflow-y-auto"
                style={{
                    pointerEvents: 'auto',
                    WebkitOverflowScrolling: 'touch',
                    touchAction: 'pan-y'
                }}
                onPointerDown={(e) => {
                    // Prevent drag from starting in content area
                    e.stopPropagation();
                }}
                onTouchStart={(e) => {
                    if (!contentRef.current || isDraggingHandle.current) return;
                    // Prevent drag from starting in content area
                    e.stopPropagation();
                    touchStartY.current = e.touches[0].clientY;
                    initialScrollTop.current = contentRef.current.scrollTop;
                    isScrolling.current = false;
                }}
                onTouchMove={(e) => {
                    if (!contentRef.current) return;

                    // CRITICAL: Ignore all touch events if handle is being dragged
                    if (isDraggingHandle.current) {
                        return;
                    }

                    const touchY = e.touches[0].clientY;
                    const deltaY = touchStartY.current - touchY;
                    const currentScrollTop = contentRef.current.scrollTop;

                    // Detect scroll intent (require more movement)
                    if (Math.abs(deltaY) > 10) {
                        isScrolling.current = true;
                    }

                    // If in minimized/half state and scrolling up, expand to next state
                    if (snapState === 'minimized' && deltaY > 30 && isScrolling.current) {
                        setSnapState('half');
                    } else if (snapState === 'half' && deltaY > 30 && isScrolling.current) {
                        setSnapState('expanded');
                    }

                    // If in expanded state, at top, and pulling down, collapse to half
                    if (snapState === 'expanded' && currentScrollTop === 0 && deltaY < -50) {
                        setSnapState('half');
                    }

                    // If in half state, at top, and pulling down, collapse to minimized
                    if (snapState === 'half' && currentScrollTop === 0 && deltaY < -50) {
                        setSnapState('minimized');
                    }
                }}
                onTouchEnd={() => {
                    isScrolling.current = false;
                    // Keep isDraggingHandle flag until drag actually ends
                }}
            >
                {displayedShops.length === 0 ? (
                    <div className="text-center py-10 text-muted-foreground">
                        {selectedShopId ? t('discovery.bottom_sheet.no_shop_info') : t('discovery.bottom_sheet.no_nearby')}
                    </div>
                ) : (
                    displayedShops.map((shop) => (
                        <div key={shop.id} className="mb-4">
                            <ShopCardWithReview
                                shop={shop}
                                onSave={onSave}
                                displayContext="discovery"
                            />
                        </div>
                    ))
                )}
            </div>
        </motion.div>
    );
};
