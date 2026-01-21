import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, useAnimation } from 'framer-motion';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils'; // Assuming cn exists

interface ImageViewerProps {
    images: string[];
    initialIndex: number;
    isOpen: boolean;
    onClose: () => void;
}

export const ImageViewer = ({ images, initialIndex, isOpen, onClose }: ImageViewerProps) => {
    const [index, setIndex] = useState(initialIndex);
    const [scale, setScale] = useState(1);

    // Reset index when opening with new initialIndex
    useEffect(() => {
        if (isOpen) {
            setIndex(initialIndex);
            setScale(1);
        }
    }, [isOpen, initialIndex]);

    // Refs for Gesture Handling
    const containerRef = useRef<HTMLDivElement>(null);
    const pinchStartDist = useRef<number | null>(null);
    const startScaleRef = useRef<number>(1);

    // Animation Controls
    const [direction, setDirection] = useState(0);
    const controls = useAnimation();
    const y = useMotionValue(0);
    const opacity = useTransform(y, [-200, 0, 200], [0.5, 1, 0.5]);

    // Slide Variants
    const variants = {
        enter: (direction: number) => ({
            x: direction > 0 ? 1000 : -1000,
            opacity: 0
        }),
        center: {
            zIndex: 1,
            x: 0,
            opacity: 1
        },
        exit: (direction: number) => ({
            zIndex: 0,
            x: direction < 0 ? 1000 : -1000,
            opacity: 0
        })
    };

    // --- Touch Handlers for Pinch Zoom ---
    const getTouchDist = (t1: React.Touch, t2: React.Touch) => {
        const dx = t1.clientX - t2.clientX;
        const dy = t1.clientY - t2.clientY;
        return Math.sqrt(dx * dx + dy * dy);
    };

    const handleTouchStart = (e: React.TouchEvent) => {
        if (e.touches.length === 2) {
            pinchStartDist.current = getTouchDist(e.touches[0], e.touches[1]);
            startScaleRef.current = scale;
        }
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (e.touches.length === 2 && pinchStartDist.current !== null) {
            const currentDist = getTouchDist(e.touches[0], e.touches[1]);
            const ratio = currentDist / pinchStartDist.current;
            const newScale = Math.max(1, startScaleRef.current * ratio); // Min scale 1
            setScale(newScale);
        }
    };

    const handleTouchEnd = () => {
        pinchStartDist.current = null;
        if (scale < 1) setScale(1); // Elastic bounce back if under-zoomed
        if (scale > 3) setScale(3); // Max zoom cap
    };

    // --- Swipe Navigation ---
    const paginate = (newDirection: number) => {
        const newIndex = index + newDirection;
        if (newIndex >= 0 && newIndex < images.length) {
            setDirection(newDirection);
            setIndex(newIndex);
            setScale(1); // Reset zoom on change
        }
    };

    // --- Dismiss Logic ---
    const handleDragEnd = (_: any, info: any) => {
        if (scale > 1.1) return; // Don't dismiss if zoomed logic overrides (though we disable drag usually)

        // Vertical Swipe to Close
        if (Math.abs(info.offset.y) > 150 && Math.abs(info.velocity.y) > 200) {
            onClose();
        } else {
            // Horizontal Swipe to Navigate
            const swipeThreshold = 50;
            const swipePower = Math.abs(info.offset.x) * info.velocity.x;

            if (swipePower < -swipeThreshold && index < images.length - 1) {
                paginate(1);
            } else if (swipePower > swipeThreshold && index > 0) {
                paginate(-1);
            }
            controls.start({ y: 0 }); // Snap back vertical drag
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    style={{ backgroundColor: `rgba(0, 0, 0, ${0.9})` }} // We can use motion value here too if we want dynamic dimming on drag
                    className="fixed inset-0 z-[9999] flex items-center justify-center touch-none"
                    onClick={onClose} // Close on backdrop click
                >
                    {/* Dynamic Opacity Background Layer for Drag Dismiss Effect */}
                    <motion.div
                        className="absolute inset-0 bg-black"
                        style={{ opacity }}
                    />

                    {/* Numeric Indicator */}
                    <div className="absolute top-4 left-0 right-0 z-50 flex justify-center pointer-events-none" style={{ paddingTop: 'calc(env(safe-area-inset-top))' }}>
                        <div className="bg-black/50 backdrop-blur-md px-3 py-1 rounded-full text-white text-sm font-medium">
                            {index + 1} / {images.length}
                        </div>
                    </div>

                    {/* Close Button */}
                    <div className="absolute top-4 right-4 z-50" style={{ paddingTop: 'calc(env(safe-area-inset-top))' }}>
                        <button
                            onClick={(e) => { e.stopPropagation(); onClose(); }}
                            className="p-2 rounded-full bg-black/50 hover:bg-white/20 text-white transition-colors"
                        >
                            <X size={24} />
                        </button>
                    </div>

                    {/* Image Container */}
                    <motion.div
                        ref={containerRef}
                        className="relative w-full h-full flex items-center justify-center overflow-hidden"
                        onClick={(e) => e.stopPropagation()} // Prevent closing on image click
                        onTouchStart={handleTouchStart}
                        onTouchMove={handleTouchMove}
                        onTouchEnd={handleTouchEnd}
                    >
                        {/* Draggable Wrapper for Dismiss/Swipe */}
                        <motion.div
                            // Elastic Zoom Logic:
                            // If zoomed (scale > 1), we disable the standard drag (x/y) to prevent dismiss/swipe interference.
                            // Since we are implementing a "Temporary Zoom" (elastic snap back on release),
                            // the drag for dismiss/swipe should only be active when not zoomed.
                            drag={scale > 1 ? false : true} // Disable dismiss/swipe drag if zoomed
                            dragConstraints={scale > 1 ? undefined : { top: 0, bottom: 0, left: 0, right: 0 }} // Elastic drag for dismiss
                            dragElastic={0.2} // Elasticity for dismiss
                            style={{ x: 0, y, scale }}
                            onDragEnd={handleDragEnd}
                            className="absolute w-full h-full flex items-center justify-center"
                        >
                            <AnimatePresence initial={false} custom={direction} mode='popLayout'>
                                <motion.img
                                    key={index}
                                    src={images[index]}
                                    custom={direction}
                                    variants={variants}
                                    initial="enter"
                                    animate="center"
                                    exit="exit"
                                    transition={{
                                        x: { type: "spring", stiffness: 300, damping: 30 },
                                        opacity: { duration: 0.2 }
                                    }}
                                    className="max-w-full max-h-full object-contain pointer-events-none select-none shadow-2xl absolute"
                                    draggable={false}
                                />
                            </AnimatePresence>
                        </motion.div>
                    </motion.div>

                    {/* Navigation Buttons (Desktop/Overlay) */}
                    {images.length > 1 && (
                        <>
                            <button
                                className={cn(
                                    "absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md transition-all hidden md:flex z-50",
                                    index === 0 && "opacity-30 cursor-not-allowed"
                                )}
                                onClick={(e) => { e.stopPropagation(); paginate(-1); }}
                                disabled={index === 0}
                            >
                                <ChevronLeft size={24} />
                            </button>
                            <button
                                className={cn(
                                    "absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md transition-all hidden md:flex z-50",
                                    index === images.length - 1 && "opacity-30 cursor-not-allowed"
                                )}
                                onClick={(e) => { e.stopPropagation(); paginate(1); }}
                                disabled={index === images.length - 1}
                            >
                                <ChevronRight size={24} />
                            </button>
                        </>
                    )}
                </motion.div>
            )}
        </AnimatePresence>
    );
};
