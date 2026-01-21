import React from 'react';
import { ShopCard } from '../ShopCard';
import { X } from 'lucide-react';
import { motion, PanInfo } from 'framer-motion';

interface Props {
    shop: any;
    onClose: () => void;
    onSave?: (id: number) => void;
    onReserve?: (id: number) => void;
    onNext?: () => void;
    onPrev?: () => void;
    direction?: 'next' | 'prev';
}

const variants = {
    enter: (direction: string) => {
        return {
            x: direction === 'next' ? '100vw' : '-100vw',
            opacity: 1, // No fade in
            y: 0
        };
    },
    center: {
        zIndex: 1,
        x: 0,
        opacity: 1,
        y: 0
    },
    exit: (direction: string) => {
        return {
            zIndex: 0,
            x: direction === 'next' ? '-100vw' : '100vw',
            opacity: 1, // No fade out
            y: 0
        };
    }
};

export const SelectedShopCard: React.FC<Props> = ({ shop, onClose, onSave, onReserve, onNext, onPrev, direction = 'next' }) => {
    // Swipe Handler
    const handleDragEnd = (_: any, info: PanInfo) => {
        const threshold = 50;
        const velocity = 200;

        // Swipe Left (drag x negative) -> Next
        if (info.offset.x < -threshold || info.velocity.x < -velocity) {
            onNext?.();
        }
        // Swipe Right (drag x positive) -> Prev
        else if (info.offset.x > threshold || info.velocity.x > velocity) {
            onPrev?.();
        }
    };

    return (
        <motion.div
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: "tween", ease: "easeInOut", duration: 0.3 }}
            className="absolute bottom-6 left-4 right-4 z-40"
            drag="x" // Allow horizontal drag
            dragConstraints={{ left: 0, right: 0 }} // Snap back
            dragElastic={0.2}
            onDragEnd={handleDragEnd}
            whileDrag={{ scale: 0.98 }}
        // Ensure padding for safe area if needed, though 'bottom-6' usually covers it. 
        // We adding marginBottom safe area manually if needed.
        >
            <div className="relative bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
                {/* Close Button - absolute top right */}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onClose();
                    }}
                    className="absolute top-2 right-2 z-10 p-2 bg-black/20 hover:bg-black/40 text-white rounded-full backdrop-blur-sm transition-colors"
                    onPointerDown={(e) => e.stopPropagation()} // Prevent drag start on button
                >
                    <X size={16} />
                </button>

                <div className="-mb-4">
                    <div className="pointer-events-auto">
                        <ShopCard
                            shop={shop}
                            onSave={onSave}
                            onReserve={onReserve}
                        />
                    </div>
                </div>
            </div>
        </motion.div>
    );
};
