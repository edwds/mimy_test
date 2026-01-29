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
    // 0: Collapsed (just peek), 1: List View (half), 2: Expanded (80%)
    const [snapState, setSnapState] = useState<'peek' | 'half' | 'expanded'>('half');
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
            expanded: { y: "20%" } // Max 80% of screen height
        };
        controls.start(variants[snapState]);
    }, [snapState, controls]);

    const handleDragEnd = (_: any, info: PanInfo) => {
        const velocity = info.velocity.y;
        const currentY = sheetRef.current?.getBoundingClientRect().y || 0;
        const screenH = window.innerHeight;
        const ratio = currentY / screenH;

        // Velocity threshold for flicks
        if (velocity < -400) { // Flick Up
            if (snapState === 'peek') setSnapState('half');
            else setSnapState('expanded');
        } else if (velocity > 400) { // Flick Down
            if (snapState === 'expanded') setSnapState('half');
            else setSnapState('peek');
        } else {
            // Position based snapping (3 states: peek, half, expanded)
            if (ratio > 0.65) setSnapState('peek');      // > 65% = peek
            else if (ratio > 0.35) setSnapState('half');  // 35-65% = half
            else setSnapState('expanded');                // < 35% = expanded (max 80%)
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
            dragConstraints={{ top: 0, bottom: 0 }} // Constrain within bounds
            dragElastic={{ top: 0.05, bottom: 0.2 }} // Stiffer resistance at top
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
                    className="flex flex-col mb-0 px-5 pb-4"
                    onPointerDown={(e) => dragControls.start(e)}
                >
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

            {/* Content (Scrollable only when expanded) */}
            <div
                className={`flex-1 px-4 pb-24 transition-all ${snapState === 'expanded' ? 'overflow-y-auto' : 'overflow-hidden'
                    }`}
                style={{
                    pointerEvents: 'auto'
                }}
                data-scroll-container={snapState === 'expanded' ? "true" : undefined}
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
