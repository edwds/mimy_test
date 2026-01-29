import { useState, useEffect, useRef } from 'react';
import { ShopCard } from './ShopCard';
import { motion, PanInfo, useAnimation, useDragControls } from 'framer-motion';
// import { X } from 'lucide-react'; // Removed unused
import { useTranslation } from 'react-i18next';
import { prefetchReviewSnippet, snippetCache } from '@/components/discovery/SelectedShopCard';

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
}

export const ShopBottomSheet = ({ shops, selectedShopId, onSave, isInitialLoad = false }: Props) => {
    // Only 2 states: half (default), expanded (max)
    const [snapState, setSnapState] = useState<'half' | 'expanded'>('half');
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
            half: { y: "50%" }, // Default: 50% of screen
            expanded: { y: "20%" } // Max: 80% of screen
        };
        controls.start(variants[snapState]);
    }, [snapState, controls]);

    const handleDragEnd = (_: any, info: PanInfo) => {
        isDraggingHandle.current = false;
        const velocity = info.velocity.y;

        // Simple logic: down motion = collapse to half, up motion = expand
        if (velocity > 100) {
            // Dragging down
            setSnapState('half');
        } else if (velocity < -100) {
            // Dragging up
            setSnapState('expanded');
        } else {
            // No strong velocity, maintain current state
            // Could add position-based logic here if needed
        }
    };

    return (
        <motion.div
            ref={sheetRef}
            initial={{ y: "50%" }}
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
            dragMomentum={false} // Disable momentum for tighter control
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.02} // Minimal resistance for smooth feel
            onDragEnd={handleDragEnd}
            className={`absolute bottom-0 left-0 right-0 h-full bg-background shadow-[0_-5px_20px_rgba(0,0,0,0.1)] z-20 flex flex-col will-change-transform rounded-t-3xl`}
            style={{ touchAction: 'none' }}
        >
            {/* Draggable Area Container */}
            <div className="flex-shrink-0">
                {/* Handle Bar - Only this area is draggable */}
                <div
                    className="pt-3 pb-2 flex justify-center w-full cursor-grab active:cursor-grabbing touch-none"
                    onPointerDown={(e) => {
                        e.stopPropagation();
                        isDraggingHandle.current = true;
                        dragControls.start(e);
                    }}
                    onTouchStart={(e) => {
                        e.stopPropagation();
                        isDraggingHandle.current = true;
                    }}
                >
                    <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
                </div>

                {/* Header - Not draggable */}
                <div className="flex flex-col mb-0 px-5 pb-4">
                    <h2 className="text-lg font-bold">
                        {selectedShopId
                            ? t('discovery.bottom_sheet.selected_shop')
                            : isInitialLoad
                                ? t('discovery.bottom_sheet.initial_title')
                                : t('discovery.bottom_sheet.nearby_shops', { count: shops.length })}
                    </h2>
                    {!selectedShopId && isInitialLoad && (
                        <p className="text-sm text-muted-foreground mt-1">
                            {t('discovery.bottom_sheet.initial_subtitle')}
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
                    WebkitOverflowScrolling: 'touch'
                }}
                onTouchStart={(e) => {
                    if (!contentRef.current || isDraggingHandle.current) return;
                    touchStartY.current = e.touches[0].clientY;
                    initialScrollTop.current = contentRef.current.scrollTop;
                    isScrolling.current = false;
                }}
                onTouchMove={(e) => {
                    if (!contentRef.current || isDraggingHandle.current) return;

                    const touchY = e.touches[0].clientY;
                    const deltaY = touchStartY.current - touchY;
                    const currentScrollTop = contentRef.current.scrollTop;

                    // Detect scroll intent
                    if (Math.abs(deltaY) > 5) {
                        isScrolling.current = true;
                    }

                    // If in half state and scrolling down (deltaY > 0), expand
                    if (snapState === 'half' && deltaY > 10 && isScrolling.current) {
                        setSnapState('expanded');
                    }

                    // If in expanded state, at top, and pulling down, collapse
                    if (snapState === 'expanded' && currentScrollTop === 0 && deltaY < -30) {
                        setSnapState('half');
                    }
                }}
                onTouchEnd={() => {
                    isScrolling.current = false;
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
