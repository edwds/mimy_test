import { useRef } from 'react';
import { motion, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { MapPin, Smile, Meh, Frown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { RelayShop } from '@/services/RelayService';
import { scoreToTasteRatingStep } from '@/lib/utils';

interface RelayCardProps {
    shop: RelayShop;
    isActive: boolean;
    exitDirection: 'left' | 'right' | 'up' | 'back' | null;
    showGuide: boolean;
    onSwipe: (direction: 'left' | 'right' | 'up') => void;
    onDismissGuide: () => void;
}

export const RelayCard = ({
    shop,
    isActive,
    exitDirection,
    showGuide,
    onSwipe,
    onDismissGuide
}: RelayCardProps) => {
    const { t } = useTranslation();

    const x = useMotionValue(0);
    const y = useMotionValue(0);
    const rotate = useTransform(x, [-200, 200], [-25, 25]);

    // Color overlays based on swipe direction
    const greenOverlay = useTransform(x, [0, 200], [0, 1]);   // Good (right)
    const redOverlay = useTransform(x, [-200, 0], [1, 0]);    // Bad (left)
    const yellowOverlay = useTransform(y, [-200, 0], [1, 0]); // OK (up)

    const handleDragEnd = (_: any, info: PanInfo) => {
        const xOffset = info.offset.x;
        const yOffset = info.offset.y;
        const xVelocity = info.velocity.x;
        const yVelocity = info.velocity.y;

        // Up swipe (OK)
        if (Math.abs(yOffset) > 100 && Math.abs(yVelocity) > 300 && yOffset < 0) {
            onSwipe('up');
        }
        // Left/Right swipe
        else if (Math.abs(xOffset) > 150 || Math.abs(xVelocity) > 500) {
            onSwipe(xOffset > 0 ? 'right' : 'left');
        }
        // Reset if not swiped far enough
        else {
            x.set(0);
            y.set(0);
        }
    };

    // Store exit direction in ref so it persists for exit animation
    const exitDirectionRef = useRef<'left' | 'right' | 'up' | 'back' | null>(null);
    if (exitDirection) {
        exitDirectionRef.current = exitDirection;
    }

    if (!isActive) return null;

    // Determine exit animation based on stored exitDirection
    const getExitAnimation = () => {
        const dir = exitDirectionRef.current;
        const transition = { duration: 0.3, ease: "easeOut" as const };
        if (dir === 'up') {
            return { y: -500, opacity: 0, transition };
        } else if (dir === 'left') {
            return { x: -500, rotate: -30, opacity: 0, transition };
        } else if (dir === 'right') {
            return { x: 500, rotate: 30, opacity: 0, transition };
        } else if (dir === 'back') {
            // Shrink and fade out quickly - card disappears behind the stack
            return { scale: 0.85, y: -20, opacity: 0, zIndex: 0, transition: { duration: 0.25, ease: "easeIn" as const } };
        }
        // Default exit (fallback)
        return { x: -500, rotate: -30, opacity: 0, transition };
    };

    return (
        <motion.div
            className="absolute inset-0 rounded-3xl shadow-2xl overflow-hidden bg-white"
            style={{
                x,
                y,
                rotate,
                transformOrigin: 'top center'
            }}
            initial={{ scale: 0.94, y: -12, opacity: 1 }}
            animate={
                showGuide
                    ? {
                        // Guide animation: Right → Left → Up
                        x: [0, 70, 70, 0, 0, -70, -70, 0, 0, 0, 0, 0],
                        y: [0, 0, 0, 0, 0, 0, 0, 0, 0, -50, -50, 0],
                        rotate: [0, 8, 8, 0, 0, -8, -8, 0, 0, 0, 0, 0],
                        zIndex: 3,
                        transition: {
                            duration: 5,
                            repeat: Infinity,
                            repeatDelay: 1,
                            ease: "easeInOut",
                            times: [0, 0.15, 0.25, 0.3, 0.4, 0.55, 0.65, 0.7, 0.8, 0.9, 0.95, 1]
                        }
                    }
                    : {
                        scale: exitDirection === 'back' ? 0.85 : 1,
                        y: exitDirection === 'up' ? -500 : exitDirection === 'back' ? -20 : 0,
                        x: exitDirection === 'left' ? -500 : exitDirection === 'right' ? 500 : 0,
                        rotate: exitDirection === 'left' ? -30 : exitDirection === 'right' ? 30 : 0,
                        opacity: exitDirection ? 0 : 1,
                        zIndex: exitDirection === 'back' ? 0 : 3
                    }
            }
            exit={getExitAnimation()}
            transition={{ duration: 0.3, ease: "easeOut" }}
            drag={!exitDirection && !showGuide}
            dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
            dragElastic={1}
            onDragEnd={handleDragEnd}
            onClick={() => showGuide && onDismissGuide()}
            onTouchStart={() => showGuide && onDismissGuide()}
        >
            {/* Good overlay (orange - right swipe) - full card coverage with icon */}
            <motion.div
                className="absolute inset-0 z-10 pointer-events-none flex items-center justify-center bg-orange-50"
                style={{
                    opacity: showGuide ? undefined : greenOverlay,
                }}
                animate={showGuide ? {
                    opacity: [0, 0.92, 0.92, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                    transition: {
                        duration: 5,
                        repeat: Infinity,
                        repeatDelay: 1,
                        times: [0, 0.15, 0.25, 0.3, 0.4, 0.55, 0.65, 0.7, 0.8, 0.9, 0.95, 1]
                    }
                } : {}}
            >
                <Smile className="w-24 h-24 text-orange-500" strokeWidth={1.5} />
            </motion.div>

            {/* Bad overlay (gray - left swipe) - full card coverage with icon */}
            <motion.div
                className="absolute inset-0 z-10 pointer-events-none flex items-center justify-center bg-gray-100"
                style={{
                    opacity: showGuide ? undefined : redOverlay,
                }}
                animate={showGuide ? {
                    opacity: [0, 0, 0, 0, 0, 0.92, 0.92, 0, 0, 0, 0, 0],
                    transition: {
                        duration: 5,
                        repeat: Infinity,
                        repeatDelay: 1,
                        times: [0, 0.15, 0.25, 0.3, 0.4, 0.55, 0.65, 0.7, 0.8, 0.9, 0.95, 1]
                    }
                } : {}}
            >
                <Frown className="w-24 h-24 text-gray-500" strokeWidth={1.5} />
            </motion.div>

            {/* OK overlay (yellow - up swipe) - full card coverage with icon */}
            <motion.div
                className="absolute inset-0 z-10 pointer-events-none flex items-center justify-center bg-yellow-50"
                style={{
                    opacity: showGuide ? undefined : yellowOverlay,
                }}
                animate={showGuide ? {
                    opacity: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0.92, 0.92, 0],
                    transition: {
                        duration: 5,
                        repeat: Infinity,
                        repeatDelay: 1,
                        times: [0, 0.15, 0.25, 0.3, 0.4, 0.55, 0.65, 0.7, 0.8, 0.9, 0.95, 1]
                    }
                } : {}}
            >
                <Meh className="w-24 h-24 text-yellow-500" strokeWidth={1.5} />
            </motion.div>

            {/* Card Content */}
            <div className="h-full flex flex-col cursor-grab active:cursor-grabbing">
                {/* Image Area - ShopCard Style */}
                <div className="flex-1 relative bg-gray-100 min-h-0">
                    {shop.thumbnail_img ? (
                        <img
                            src={shop.thumbnail_img}
                            alt={shop.name}
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                            <span className="text-6xl">🍽️</span>
                        </div>
                    )}

                    {/* Badge Overlay - ShopCard Style */}
                    <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/60 to-transparent flex items-end">
                        {shop.shop_user_match_score != null && (
                            <div className="text-xs font-medium text-white bg-black/60 pl-2 pr-2 py-1 rounded-full border border-white/20 flex items-center gap-1 backdrop-blur-md shadow-sm">
                                <span>{t('relay.expected_rating', '예상 평가')}</span>
                                <span className="text-orange-400 font-bold">
                                    {scoreToTasteRatingStep(shop.shop_user_match_score).toFixed(2)}
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Info - ShopCard Style */}
                <div className="p-4 bg-white">
                    {/* Name & Category */}
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h2 className="text-xl font-bold truncate">{shop.name}</h2>
                        {shop.food_kind && (
                            <span className="text-xs text-muted-foreground font-medium px-1.5 py-0.5 bg-muted rounded">
                                {shop.food_kind}
                            </span>
                        )}
                    </div>

                    {/* Description */}
                    {shop.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                            {shop.description}
                        </p>
                    )}

                    {/* Address & Distance */}
                    <div className="flex items-center text-xs text-muted-foreground">
                        <MapPin className="w-3 h-3 mr-1 flex-shrink-0" />
                        <span className="truncate">
                            {shop.address_full || shop.address_region || t('discovery.shop_card.no_address', '주소 정보 없음')}
                        </span>
                        {shop.distance_km > 0 && (
                            <span className="ml-2 flex-shrink-0">
                                ({shop.distance_km}km)
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Guide Animation Indicator - Shows direction arrows */}
            {showGuide && (
                <motion.div
                    className="absolute inset-0 flex items-center justify-center pointer-events-none"
                    animate={{
                        opacity: [0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
                        transition: {
                            duration: 5,
                            repeat: Infinity,
                            repeatDelay: 1,
                            times: [0, 0.1, 0.15, 0.25, 0.3, 0.55, 0.65, 0.7, 0.8, 0.9, 0.95, 1]
                        }
                    }}
                >
                    <motion.div
                        className="w-20 h-20 rounded-full bg-white/90 backdrop-blur-sm shadow-lg flex items-center justify-center"
                        animate={{
                            scale: [1, 1, 1.1, 1, 1, 1.1, 1, 1, 1.1, 1, 1, 1],
                            transition: {
                                duration: 5,
                                repeat: Infinity,
                                repeatDelay: 1,
                                times: [0, 0.15, 0.25, 0.3, 0.4, 0.55, 0.65, 0.7, 0.8, 0.9, 0.95, 1]
                            }
                        }}
                    >
                        {/* Right arrow (Good) */}
                        <motion.svg
                            className="w-10 h-10 text-orange-500 absolute"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            viewBox="0 0 24 24"
                            animate={{
                                opacity: [0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                                transition: {
                                    duration: 5,
                                    repeat: Infinity,
                                    repeatDelay: 1,
                                    times: [0, 0.15, 0.25, 0.3, 0.4, 0.55, 0.65, 0.7, 0.8, 0.9, 0.95, 1]
                                }
                            }}
                        >
                            <path d="M5 12h14M12 5l7 7-7 7" />
                        </motion.svg>

                        {/* Left arrow (Bad) */}
                        <motion.svg
                            className="w-10 h-10 text-gray-500 absolute"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            viewBox="0 0 24 24"
                            animate={{
                                opacity: [0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0],
                                transition: {
                                    duration: 5,
                                    repeat: Infinity,
                                    repeatDelay: 1,
                                    times: [0, 0.15, 0.25, 0.3, 0.4, 0.55, 0.65, 0.7, 0.8, 0.9, 0.95, 1]
                                }
                            }}
                        >
                            <path d="M19 12H5M12 19l-7-7 7-7" />
                        </motion.svg>

                        {/* Up arrow (OK) */}
                        <motion.svg
                            className="w-10 h-10 text-yellow-500 absolute"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            viewBox="0 0 24 24"
                            animate={{
                                opacity: [0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0],
                                transition: {
                                    duration: 5,
                                    repeat: Infinity,
                                    repeatDelay: 1,
                                    times: [0, 0.15, 0.25, 0.3, 0.4, 0.55, 0.65, 0.7, 0.8, 0.9, 0.95, 1]
                                }
                            }}
                        >
                            <path d="M12 19V5M5 12l7-7 7 7" />
                        </motion.svg>
                    </motion.div>
                </motion.div>
            )}
        </motion.div>
    );
};
