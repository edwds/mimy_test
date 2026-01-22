import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
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
    const pinchStartCenter = useRef<{ x: number, y: number } | null>(null);
    const startScaleRef = useRef<number>(1);
    const startPanRef = useRef<{ x: number, y: number }>({ x: 0, y: 0 });

    // Pan Motion Values (separate from dismissal y)
    // Actually, let's use manual state for x/y translation during zoom to avoid conflict with 'y' dismissal motion value
    const [translation, setTranslation] = useState({ x: 0, y: 0 });

    // Prevent body scroll when open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    // Animation Controls
    const [direction, setDirection] = useState(0);
    const controls = useAnimation();
    const dismissY = useMotionValue(0); // Renamed from y to avoid confusion
    const opacity = useTransform(dismissY, [-200, 0, 200], [0.5, 1, 0.5]);

    // Slide Variants
    const variants = {
        enter: (direction: number) => ({
            x: direction === 0 ? 0 : (direction > 0 ? 1000 : -1000),
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

    // Flag for instant vs spring transition
    const [isPinching, setIsPinching] = useState(false);

    // --- Touch Handlers for Pinch Zoom & Pan ---
    const getTouchDist = (t1: React.Touch, t2: React.Touch) => {
        const dx = t1.clientX - t2.clientX;
        const dy = t1.clientY - t2.clientY;
        return Math.sqrt(dx * dx + dy * dy);
    };

    const getTouchCenter = (t1: React.Touch, t2: React.Touch) => {
        return {
            x: (t1.clientX + t2.clientX) / 2,
            y: (t1.clientY + t2.clientY) / 2
        };
    };

    const handleTouchStart = (e: React.TouchEvent) => {
        if (e.touches.length === 2) {
            setIsPinching(true);
            const t1 = e.touches[0];
            const t2 = e.touches[1];
            pinchStartDist.current = getTouchDist(t1, t2);
            pinchStartCenter.current = getTouchCenter(t1, t2);
            startScaleRef.current = scale;
            startPanRef.current = translation;
        }
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (e.touches.length === 2 && pinchStartDist.current !== null && pinchStartCenter.current !== null && containerRef.current) {
            const t1 = e.touches[0];
            const t2 = e.touches[1];

            // 1. Calculate Scale
            const currentDist = getTouchDist(t1, t2);
            const rawRatio = currentDist / pinchStartDist.current;
            const newScale = Math.max(1, startScaleRef.current * rawRatio);

            // 2. Calculate Pan (Pivot Correction)
            // Goal: Keep the point under the pinch center stationary relative to the screen
            const currentCenter = getTouchCenter(t1, t2);
            const rect = containerRef.current.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;

            // Offsets from screen center
            const startOffset = {
                x: pinchStartCenter.current.x - centerX,
                y: pinchStartCenter.current.y - centerY
            };
            const currentOffset = {
                x: currentCenter.x - centerX,
                y: currentCenter.y - centerY
            };

            // Effective ratio for this step
            const effectiveRatio = newScale / startScaleRef.current;

            // Formula: T_new = Offset_cur - (Offset_start - T_start) * Ratio
            const newTx = currentOffset.x - (startOffset.x - startPanRef.current.x) * effectiveRatio;
            const newTy = currentOffset.y - (startOffset.y - startPanRef.current.y) * effectiveRatio;

            setTranslation({
                x: newTx,
                y: newTy
            });
            setScale(newScale);
        }
    };

    const handleTouchEnd = (e: React.TouchEvent) => {
        // If we were pinching and now have fewer than 2 fingers, stop pinching and snap back
        if (isPinching && e.touches.length < 2) {
            setIsPinching(false);
            pinchStartDist.current = null;
            pinchStartCenter.current = null;

            // Elastic Snap Back
            setScale(1);
            setTranslation({ x: 0, y: 0 });
        }
    };

    // --- Swipe Navigation ---
    const paginate = (newDirection: number) => {
        const newIndex = index + newDirection;
        if (newIndex >= 0 && newIndex < images.length) {
            setDirection(newDirection);
            setIndex(newIndex);
            setScale(1); // Reset zoom on change
            setTranslation({ x: 0, y: 0 });
        }
    };

    // --- Dismiss Logic ---
    const handleDragEnd = (_: any, info: any) => {
        if (scale > 1.1) return; // Should not happen if drag is disabled, but safety check

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
            // Reset position
            dismissY.set(0);
            controls.start({ x: 0, y: 0 });
        }
    };

    if (!isOpen) return null;

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    style={{ backgroundColor: `rgba(0, 0, 0, ${0.9})` }}
                    className="fixed inset-0 z-[9999] flex items-center justify-center touch-none"
                    onClick={onClose}
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
                        onClick={(e) => e.stopPropagation()}
                        onTouchStart={handleTouchStart}
                        onTouchMove={handleTouchMove}
                        onTouchEnd={handleTouchEnd}
                    >
                        {/* 1. Zoom & Pan Layer (Controlled via Animate for Elastic Snap) */}
                        <motion.div
                            animate={{
                                scale: scale,
                                x: translation.x,
                                y: translation.y
                            }}
                            transition={
                                isPinching
                                    ? { type: "tween", duration: 0 } // Instant response during pinch
                                    : { type: "spring", stiffness: 300, damping: 30 } // Elastic snap back
                            }
                            className="absolute w-full h-full flex items-center justify-center"
                        >
                            {/* 2. Drag/Dismiss Layer (Active only when not zoomed) */}
                            <motion.div
                                drag={scale > 1.05 ? false : true} // Disable drag when significantly zoomed
                                dragElastic={0.2}
                                dragConstraints={{ top: 0, bottom: 0, left: 0, right: 0 }}
                                style={{ y: dismissY }}
                                onDragEnd={handleDragEnd}
                                className="w-full h-full flex items-center justify-center"
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
        </AnimatePresence>,
        document.body
    );
};
