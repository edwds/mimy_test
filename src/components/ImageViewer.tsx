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

    // Reset when opening
    useEffect(() => {
        if (isOpen) {
            setIndex(initialIndex);
            setScale(1);
        }
    }, [isOpen, initialIndex]);

    // Refs
    const containerRef = useRef<HTMLDivElement>(null);

    // Touch/Pinch State
    const pinchStartDist = useRef<number | null>(null);
    const pinchStartCenter = useRef<{ x: number, y: number } | null>(null);
    const startScaleRef = useRef<number>(1);
    const startPanRef = useRef<{ x: number, y: number }>({ x: 0, y: 0 });

    // Mouse/Pan State


    // Pan Motion Values
    const [translation, setTranslation] = useState({ x: 0, y: 0 });

    // Flag for instant transitions during gesture
    const [isGesturing, setIsGesturing] = useState(false);

    // Prevent body scroll
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

    // Variants
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

    // --- Touch Handlers (Mobile Pinch/Pan) ---
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
            setIsGesturing(true);
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

            // 1. Calculate new scale
            const currentDist = getTouchDist(t1, t2);
            const rawRatio = currentDist / pinchStartDist.current;
            const newScale = Math.max(1, startScaleRef.current * rawRatio);

            // 2. Calculate Pivot Pan
            const currentCenter = getTouchCenter(t1, t2);
            const rect = containerRef.current.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;

            // Offsets from center
            const startOffset = {
                x: pinchStartCenter.current.x - centerX,
                y: pinchStartCenter.current.y - centerY
            };
            const currentOffset = {
                x: currentCenter.x - centerX,
                y: currentCenter.y - centerY
            };

            const effectiveRatio = newScale / startScaleRef.current;
            const newTx = currentOffset.x - (startOffset.x - startPanRef.current.x) * effectiveRatio;
            const newTy = currentOffset.y - (startOffset.y - startPanRef.current.y) * effectiveRatio;

            setTranslation({ x: newTx, y: newTy });
            setScale(newScale);
        }
    };

    const handleTouchEnd = (e: React.TouchEvent) => {
        if (e.touches.length < 2) {
            setIsGesturing(false);
            pinchStartDist.current = null;
            pinchStartCenter.current = null;

            // Elastic Snap-back: Always return to 1x and center
            setScale(1);
            setTranslation({ x: 0, y: 0 });
        }
    };



    // --- Navigation ---
    const paginate = (newDirection: number) => {
        const newIndex = index + newDirection;
        if (newIndex >= 0 && newIndex < images.length) {
            setDirection(newDirection);
            setIndex(newIndex);
            setScale(1);
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
                    className="fixed inset-0 z-[9999] flex items-center justify-center touch-none select-none"
                    onClick={onClose}
                >
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
                        // Touch Events
                        // Touch Events
                        onTouchStart={handleTouchStart}
                        onTouchMove={handleTouchMove}
                        onTouchEnd={handleTouchEnd}
                        onTouchCancel={handleTouchEnd}
                    >
                        <motion.div
                            animate={{
                                scale: scale,
                                x: translation.x,
                                y: translation.y
                            }}
                            transition={
                                isGesturing
                                    ? { type: "tween", duration: 0 }
                                    : { type: "spring", stiffness: 300, damping: 30 }
                            }
                            className="absolute w-full h-full flex items-center justify-center"
                        >
                            <motion.div
                                drag={scale > 1.05 ? false : true}
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

                    {/* Nav Buttons */}
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

                    {/* Caption */}
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
