import { useState, useEffect, useRef } from 'react';
import { ShopCard } from './ShopCard';
import { motion, PanInfo, useAnimation } from 'framer-motion';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface Props {
    shops: any[];
    selectedShopId?: number | null;
    onSave?: (id: number) => void;
}

export const ShopBottomSheet = ({ shops, selectedShopId, onSave }: Props) => {
    // 0: Collapsed (just peek), 1: List View (half), 2: Expanded (full)
    // If selectedShopId is present, we might want to default to 'half' or 'peek' depending on content.
    const [snapState, setSnapState] = useState<'peek' | 'half' | 'full'>('half');
    const controls = useAnimation();
    const sheetRef = useRef<HTMLDivElement>(null);
    const { t } = useTranslation();

    // If a shop is selected, show only that shop.
    const displayedShops = selectedShopId
        ? shops.filter(s => s.id === selectedShopId)
        : shops;

    useEffect(() => {
        // When selection changes...
        if (selectedShopId) {
            setSnapState('half'); // Ensure visible
        }
    }, [selectedShopId]);

    // Handle Snap State Changes
    useEffect(() => {
        const variants = {
            peek: { y: "80%" }, // Raise peek height slightly
            half: { y: "50%" },
            full: { y: "10%" }
        };
        controls.start(variants[snapState]);
    }, [snapState, controls]);

    const handleDragEnd = (_: any, info: PanInfo) => {
        const offset = info.offset.y;
        const velocity = info.velocity.y;
        const currentY = sheetRef.current?.getBoundingClientRect().y || 0;
        const screenH = window.innerHeight;

        // Calculate relative position (0 to 1, where 0 is top)
        const ratio = currentY / screenH;

        // Velocity threshold for flicks
        if (velocity < -500) { // Flick Up
            if (snapState === 'peek') setSnapState('half');
            else setSnapState('full');
        } else if (velocity > 500) { // Flick Down
            if (snapState === 'full') setSnapState('half');
            else setSnapState('peek');
        } else {
            // Position based snapping
            if (ratio > 0.75) setSnapState('peek');
            else if (ratio > 0.30) setSnapState('half');
            else setSnapState('full');
        }
    };

    return (
        <motion.div
            ref={sheetRef}
            initial={{ y: "50%" }}
            animate={controls}
            drag="y"
            dragConstraints={{ top: 0 }}
            dragMomentum={false}
            dragElastic={0.05}
            onDragEnd={handleDragEnd}
            className="absolute bottom-0 left-0 right-0 h-full bg-background rounded-t-3xl shadow-[0_-5px_20px_rgba(0,0,0,0.1)] z-20 flex flex-col will-change-transform"
            style={{ touchAction: 'none' }}
        >
            {/* Handle Bar */}
            <div className="pt-3 pb-2 flex justify-center cursor-grab active:cursor-grabbing w-full">
                <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
            </div>

            {/* Header (Draggable) */}
            <div className="flex justify-between items-center mb-0 px-5 pb-4">
                <h2 className="text-lg font-bold">
                    {selectedShopId ? t('discovery.bottom_sheet.selected_shop') : t('discovery.bottom_sheet.nearby_shops', { count: shops.length })}
                </h2>
                <button
                    onClick={() => setSnapState('peek')}
                    className="p-1 rounded-full hover:bg-gray-100 text-gray-500"
                >
                    <X size={20} />
                </button>
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
            >
                {displayedShops.length === 0 ? (
                    <div className="text-center py-10 text-muted-foreground">
                        {selectedShopId ? t('discovery.bottom_sheet.no_shop_info') : t('discovery.bottom_sheet.no_nearby')}
                    </div>
                ) : (
                    displayedShops.map((shop) => (
                        <div key={shop.id} className="mb-4">
                            <ShopCard
                                shop={shop}
                                onSave={onSave}
                                onReserve={() => alert(t('discovery.bottom_sheet.reserve_alert'))}
                            />
                        </div>
                    ))
                )}
            </div>
        </motion.div>
    );
};
