import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useMotionValue, useTransform, useAnimation } from 'framer-motion';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ImageViewerProps {
    images: string[];
    initialIndex: number;
    isOpen: boolean;
    onClose: () => void;
}

export const ImageViewer = ({ images, initialIndex, isOpen, onClose, imgTexts }: ImageViewerProps & { imgTexts?: string[] }) => {
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

    const startPanRef = useRef<{ x: number, y: number }>({ x: 0, y: 0 });
    const startScaleRef = useRef<number>(1);

    // Pan Motion Values (separate from dismissal y)
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
    const dismissY = useMotionValue(0);
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

    // --- Pointer Events Handlers for Pinch Zoom & Pan (PC & Mobile Unified) ---
    const activePointers = useRef<Map<number, { x: number, y: number }>>(new Map());
    const prevPinchInfo = useRef<{ dist: number, center: { x: number, y: number } } | null>(null);

    const handlePointerDown = (e: React.PointerEvent) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        activePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

        if (activePointers.current.size === 2) {
            setIsPinching(true);
            const points = Array.from(activePointers.current.values());
            const p1 = points[0];
            const p2 = points[1];
            prevPinchInfo.current = {
                dist: Math.hypot(p1.x - p2.x, p1.y - p2.y),
                center: { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 }
            };
            startScaleRef.current = scale;
            startPanRef.current = translation;
        }
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        const prev = activePointers.current.get(e.pointerId);
        if (!prev) return;

        const current = { x: e.clientX, y: e.clientY };
        activePointers.current.set(e.pointerId, current);

        const points = Array.from(activePointers.current.values());

        // 1. Pinch Zoom (2 fingers)
        if (points.length === 2) {
            const p1 = points[0];
            const p2 = points[1];
            const dist = Math.hypot(p1.x - p2.x, p1.y - p2.y);
            const center = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };

            if (prevPinchInfo.current) {
                // Scale
                const zoomRatio = dist / prevPinchInfo.current.dist;
                const newScale = Math.max(1, startScaleRef.current * zoomRatio);

                // Pan (Move center)
                const dx = center.x - prevPinchInfo.current.center.x;
                const dy = center.y - prevPinchInfo.current.center.y;

                if (newScale > 1) {
                    setTranslation(prev => ({
                        x: prev.x + dx,
                        y: prev.y + dy
                    }));
                }
                setScale(newScale);
            }
            prevPinchInfo.current = { dist, center };
        }
        // 2. Pan (1 finger/mouse) - ONLY when zoomed
        else if (points.length === 1 && scale > 1) {
            const dx = current.x - prev.x;
            const dy = current.y - prev.y;
            setTranslation(prev => ({
                x: prev.x + dx,
                y: prev.y + dy
            }));
        }
    };

    const handlePointerUp = (e: React.PointerEvent) => {
        activePointers.current.delete(e.pointerId);
        e.currentTarget.releasePointerCapture(e.pointerId);

        if (activePointers.current.size < 2) {
            setIsPinching(false);
            prevPinchInfo.current = null;
            if (scale < 1) setScale(1);
        }
    };

    // Double Click to Zoom
    const handleDoubleClick = () => {
        if (scale > 1) {
            setScale(1);
            setTranslation({ x: 0, y: 0 });
        } else {
            setScale(2.5);
            setTranslation({ x: 0, y: 0 }); // Center zoom for simplicity
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
        if (scale > 1.1) return;

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
                        onDoubleClick={handleDoubleClick}
                        onPointerDown={handlePointerDown}
                        onPointerMove={handlePointerMove}
                        onPointerUp={handlePointerUp}
                        onPointerCancel={handlePointerUp}
                        onPointerLeave={handlePointerUp}
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

                    {/* Caption Overlay */}
                    {imgTexts && imgTexts[index] && (
                        <div className="absolute bottom-0 left-0 right-0 p-6 pb-12 bg-gradient-to-t from-black/90 via-black/50 to-transparent pointer-events-none z-50">
                            <p className="text-white text-base md:text-lg text-center max-w-3xl mx-auto drop-shadow-md font-medium">
                                {imgTexts[index]}
                            </p>
                        </div>
                    )}
                </motion.div>
            )}
        </AnimatePresence>,
        document.body
    );
};
