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
}

export const ShopBottomSheet = ({ shops, selectedShopId, onSave }: Props) => {
    // 0: Collapsed (just peek), 1: List View (half), 2: Expanded (full)
    const [snapState, setSnapState] = useState<'peek' | 'half' | 'full'>('half');
    const controls = useAnimation();
    const dragControls = useDragControls();
    const sheetRef = useRef<HTMLDivElement>(null);
    const { t } = useTranslation();

    // If a shop is selected, show only that shop.
    const displayedShops = selectedShopId
        ? shops.filter(s => s.id === selectedShopId)
        : shops;

    useEffect(() => {
        // Upon selection, ensure at least half visible
        if (selectedShopId) {
            setSnapState('half');
        }
    }, [selectedShopId]);

    // Handle Snap State Changes
    useEffect(() => {
        const variants = {
            peek: { y: "calc(100% - 130px)" }, // Peek height
            half: { y: "50%" },
            full: { y: "calc(env(safe-area-inset-top) + 110px)" } // Stop below search bar
        };
        controls.start(variants[snapState]);
    }, [snapState, controls]);

    const handleDragEnd = (_: any, info: PanInfo) => {
        const velocity = info.velocity.y;
        const currentY = sheetRef.current?.getBoundingClientRect().y || 0;
        const screenH = window.innerHeight;
        // Adjust ratio calc since full is not 0
        const ratio = currentY / screenH;

        // Velocity threshold for flicks
        if (velocity < -400) { // Flick Up
            if (snapState === 'peek') setSnapState('half');
            else setSnapState('full');
        } else if (velocity > 400) { // Flick Down
            if (snapState === 'full') setSnapState('half');
            else setSnapState('peek');
        } else {
            // Position based snapping
            if (ratio > 0.8) setSnapState('peek');
            else if (ratio > 0.4) setSnapState('half'); // slightly higher threshold
            else setSnapState('full');
        }
    };

    return (
        <motion.div
            ref={sheetRef}
            initial={{ y: "50%" }}
            animate={controls}
            transition={{ type: "spring", damping: 30, stiffness: 300, mass: 0.8 }}
            drag="y"
            dragControls={dragControls}
            dragListener={false} // Only allow drag from specific areas
            dragMomentum={false} // Prevent overshooting
            dragConstraints={{ top: 0 }} // Allow full range, snap back prevents getting stuck
            dragElastic={0.05} // Stiffer resistance
            onDragEnd={handleDragEnd}
            className={`absolute bottom-0 left-0 right-0 h-full bg-background shadow-[0_-5px_20px_rgba(0,0,0,0.1)] z-20 flex flex-col will-change-transform rounded-t-3xl`}
            style={{ touchAction: 'none' }}
        >
            {/* Draggable Area Container */}
            <div
                className="flex-shrink-0 cursor-grab active:cursor-grabbing touch-none"
                onPointerDown={(e) => dragControls.start(e)}
            >
                {/* Handle Bar */}
                <div className="pt-3 pb-2 flex justify-center w-full">
                    <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
                </div>

                {/* Header */}
                <div
                    className="flex justify-between items-center mb-0 px-5 pb-4"
                    onPointerDown={(e) => dragControls.start(e)}
                >
                    <h2 className="text-lg font-bold">
                        {selectedShopId ? t('discovery.bottom_sheet.selected_shop') : t('discovery.bottom_sheet.nearby_shops', { count: shops.length })}
                    </h2>
                    {/* Close button removed as requested */}
                </div>
            </div>

            {/* Content (Scrollable only when full) */}
            <div
                className={`flex-1 px-4 pb-24 transition-all ${snapState === 'full' ? 'overflow-y-auto' : 'overflow-hidden touch-none pointer-events-none'
                    }`}
                // Re-enable pointer events for clicks even when hidden, but prevent scroll?
                // Actually 'pointer-events-none' kills clicks. We want clicks.
                // Just overflow-hidden + removing stopPropagation allows the drag to bubble.
                style={{
                    pointerEvents: 'auto'
                }}
                data-scroll-container={snapState === 'full' ? "true" : undefined}
                onPointerDown={(e) => {
                    // Allow dragging content only if not full (e.g. peek/half state)
                    // Or if we are at the very top and pulling down? (Hard to detect reliably without blocking scroll)
                    if (snapState !== 'full') {
                        dragControls.start(e);
                    }
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
