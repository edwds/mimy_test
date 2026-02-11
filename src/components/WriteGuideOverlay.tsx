import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Smile, Meh, Frown, Image as ImageIcon, Heart, MessageCircle, Send, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Capacitor } from '@capacitor/core';

interface Props {
    isOpen: boolean;
    onClose: () => void;
}

export const WriteGuideOverlay: React.FC<Props> = ({ isOpen, onClose }) => {
    const { t } = useTranslation();
    const [currentStep, setCurrentStep] = useState(0);

    const steps = [
        {
            title: t('write_guide.step1.title'),
            subtitle: t('write_guide.step1.subtitle'),
        },
        {
            title: t('write_guide.step2.title'),
            subtitle: t('write_guide.step2.subtitle'),
        },
        {
            title: t('write_guide.step3.title'),
            subtitle: t('write_guide.step3.subtitle'),
        },
    ];

    // Auto-cycle through steps
    useEffect(() => {
        if (!isOpen) return;

        const interval = setInterval(() => {
            setCurrentStep((prev) => (prev + 1) % 3);
        }, 7000); // 7s to allow smoother ranking animation

        return () => clearInterval(interval);
    }, [isOpen]);

    // Reset step when opening
    useEffect(() => {
        if (isOpen) {
            setCurrentStep(0);
        }
    }, [isOpen]);

    const handleStart = () => {
        localStorage.setItem('hasSeenWriteGuide', 'true');
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div
            className="absolute inset-0 z-[200] bg-white flex flex-col"
            style={{
                paddingTop: Capacitor.isNativePlatform() ? 'env(safe-area-inset-top)' : '24px',
                paddingBottom: Capacitor.isNativePlatform() ? 'env(safe-area-inset-bottom)' : '24px',
            }}
        >
            {/* Close Button */}
            <button
                onClick={handleStart}
                className="absolute top-4 left-4 z-10 p-2 text-gray-400 hover:text-gray-600 transition-colors"
                style={{
                    marginTop: Capacitor.isNativePlatform() ? 'env(safe-area-inset-top)' : '0px',
                }}
            >
                <X size={24} />
            </button>

            {/* Animation Area */}
            <div className="flex-1 flex items-center justify-center overflow-hidden">
                <div className="w-full max-w-[320px] h-[420px] relative">
                    <AnimatePresence mode="wait">
                        {currentStep === 0 && (
                            <motion.div
                                key="step0"
                                initial={{ opacity: 0, x: 50 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -50 }}
                                transition={{ duration: 0.4 }}
                                className="absolute inset-0"
                            >
                                <SearchRankingGuideDemo t={t} />
                            </motion.div>
                        )}
                        {currentStep === 1 && (
                            <motion.div
                                key="step1"
                                initial={{ opacity: 0, x: 50 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -50 }}
                                transition={{ duration: 0.4 }}
                                className="absolute inset-0"
                            >
                                <WriteGuideDemo t={t} />
                            </motion.div>
                        )}
                        {currentStep === 2 && (
                            <motion.div
                                key="step2"
                                initial={{ opacity: 0, x: 50 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -50 }}
                                transition={{ duration: 0.4 }}
                                className="absolute inset-0"
                            >
                                <FeedGuideDemo t={t} />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Text Area */}
            <div className="px-8 mb-12 text-center min-h-[90px]">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentStep}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.3 }}
                    >
                        <h2 className="text-[28px] font-bold text-gray-900 mb-1 leading-tight">
                            {steps[currentStep].title}
                        </h2>
                        <p className="text-[28px] font-bold text-gray-900 leading-tight">
                            {steps[currentStep].subtitle}
                        </p>
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* Start Button */}
            <div className="px-6 pb-6">
                <Button
                    onClick={handleStart}
                    className="w-full py-6 text-lg rounded-2xl bg-primary hover:bg-primary/90 text-white font-bold shadow-lg shadow-primary/20"
                >
                    {t('write_guide.start_button')}
                </Button>
            </div>
        </div>
    );
};

// Step 1: Search + Ranking Demo (combined flow)
const SearchRankingGuideDemo = ({ t }: { t: any }) => {
    const [phase, setPhase] = useState<'search' | 'ranking'>('search');
    const [searchText, setSearchText] = useState('');
    const [showResults, setShowResults] = useState(false);
    const [selectedShop, setSelectedShop] = useState(false);

    // Ranking states
    const [rankingStep, setRankingStep] = useState<'satisfaction' | 'compare' | 'result'>('satisfaction');
    const [selectedSatisfaction, setSelectedSatisfaction] = useState<number | null>(null);
    const [selectedChoice, setSelectedChoice] = useState<'new' | null>(null);

    const fullSearchText = t('write_guide.demo.search_text');

    useEffect(() => {
        const timers: NodeJS.Timeout[] = [];

        const runAnimation = () => {
            // Reset all
            setPhase('search');
            setSearchText('');
            setShowResults(false);
            setSelectedShop(false);
            setRankingStep('satisfaction');
            setSelectedSatisfaction(null);
            setSelectedChoice(null);

            // Timeline (more generous timing for each step)
            let t = 300; // Start delay

            // Search phase: type text (slower typing)
            for (let i = 1; i <= fullSearchText.length; i++) {
                timers.push(setTimeout(() => setSearchText(fullSearchText.slice(0, i)), t + i * 150));
            }
            t += fullSearchText.length * 150;

            // Show results
            t += 400;
            timers.push(setTimeout(() => setShowResults(true), t));

            // Select shop
            t += 600;
            timers.push(setTimeout(() => setSelectedShop(true), t));

            // Transition to ranking
            t += 500;
            timers.push(setTimeout(() => setPhase('ranking'), t));

            // Ranking: Show satisfaction options, then select
            t += 600;
            timers.push(setTimeout(() => setSelectedSatisfaction(0), t));

            // Move to compare step
            t += 800;
            timers.push(setTimeout(() => setRankingStep('compare'), t));

            // Select NEW choice
            t += 700;
            timers.push(setTimeout(() => setSelectedChoice('new'), t));

            // Show result
            t += 800;
            timers.push(setTimeout(() => setRankingStep('result'), t));

            // Hold result, then restart
            t += 1200;
            timers.push(setTimeout(runAnimation, t));
        };

        runAnimation();
        return () => timers.forEach(clearTimeout);
    }, [fullSearchText]);

    return (
        <div className="w-full h-full flex items-center justify-center px-4 relative overflow-hidden">
            {/* Search Card */}
            <motion.div
                initial={{ x: '0%', opacity: 1 }}
                animate={{
                    x: phase === 'search' ? '0%' : '-110%',
                    opacity: phase === 'search' ? 1 : 0
                }}
                transition={{ duration: 0.4, ease: 'easeInOut' }}
                className="absolute w-full max-w-[280px] bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100"
            >
                {/* Search Header */}
                <div className="p-4 border-b border-gray-100">
                    <div className="flex items-center gap-2 bg-gray-100 rounded-xl px-3 py-2.5">
                        <Search className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-900 flex-1">
                            {searchText}
                            {searchText.length < fullSearchText.length && (
                                <span className="inline-block w-0.5 h-4 bg-primary ml-0.5 animate-pulse" />
                            )}
                        </span>
                    </div>
                </div>

                {/* Search Results */}
                <div className="p-3">
                    <AnimatePresence>
                        {showResults && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="space-y-2"
                            >
                                {[
                                    { name: t('write_guide.demo.shop_name'), category: t('write_guide.demo.category'), emoji: '🍣' },
                                    { name: t('write_guide.demo.existing_shop'), category: t('write_guide.demo.category'), emoji: '🍜' },
                                ].map((shop, idx) => (
                                    <motion.div
                                        key={idx}
                                        className={`flex items-center gap-3 p-2.5 rounded-xl transition-all ${idx === 0 && selectedShop
                                                ? 'bg-primary/10 border-2 border-primary'
                                                : 'bg-gray-50'
                                            }`}
                                        animate={idx === 0 && selectedShop ? { scale: [1, 1.02, 1] } : {}}
                                    >
                                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-100 to-orange-50 flex items-center justify-center text-lg">
                                            {shop.emoji}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-bold text-gray-900 truncate">{shop.name}</p>
                                            <p className="text-xs text-gray-500">{shop.category}</p>
                                        </div>
                                        {idx !== 0 && (
                                            <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-2 py-1 rounded-full">3위</span>
                                        )}
                                    </motion.div>
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {!showResults && (
                        <div className="space-y-2">
                            {[1, 2].map((i) => (
                                <div key={i} className="flex items-center gap-3 p-2.5 bg-gray-50 rounded-xl animate-pulse">
                                    <div className="w-10 h-10 rounded-lg bg-gray-200" />
                                    <div className="flex-1 space-y-1.5">
                                        <div className="h-3 bg-gray-200 rounded w-2/3" />
                                        <div className="h-2 bg-gray-200 rounded w-1/3" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </motion.div>

            {/* Ranking Card */}
            <motion.div
                initial={{ x: '110%', opacity: 0 }}
                animate={{
                    x: phase === 'ranking' ? '0%' : '110%',
                    opacity: phase === 'ranking' ? 1 : 0
                }}
                transition={{ duration: 0.4, ease: 'easeInOut' }}
                className="absolute w-full max-w-[280px] bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100"
            >
                {/* Header - only show for satisfaction/compare */}
                {rankingStep !== 'result' && (
                    <div className="p-4 border-b border-gray-100">
                        <div className="flex gap-3 items-center">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-100 to-orange-50 flex items-center justify-center text-xl">🍣</div>
                            <div>
                                <h3 className="font-bold text-base text-gray-900">{t('write_guide.demo.shop_name')}</h3>
                                <p className="text-xs text-gray-500">{t('write_guide.demo.category')}</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Body */}
                <div className="p-4">
                    {/* Satisfaction */}
                    {rankingStep === 'satisfaction' && (
                        <div className="space-y-2">
                            <p className="text-center text-xs text-gray-500 mb-3">{t('write_guide.demo.how_was_it')}</p>
                            {[
                                { icon: Smile, label: t('write.basic.good'), color: 'text-orange-500', bg: 'bg-orange-50 border-orange-200' },
                                { icon: Meh, label: t('write.basic.ok'), color: 'text-yellow-500', bg: 'bg-yellow-50 border-yellow-200' },
                                { icon: Frown, label: t('write.basic.bad'), color: 'text-gray-400', bg: 'bg-gray-50 border-gray-200' },
                            ].map((item, idx) => (
                                <motion.div
                                    key={idx}
                                    className={`flex items-center justify-between p-3 rounded-xl border transition-all ${selectedSatisfaction === idx ? item.bg : 'border-gray-200'
                                        }`}
                                    animate={selectedSatisfaction === idx ? { scale: [1, 1.02, 1] } : {}}
                                >
                                    <span className={`text-sm font-medium ${selectedSatisfaction === idx ? item.color : 'text-gray-600'}`}>
                                        {item.label}
                                    </span>
                                    <item.icon className={`w-5 h-5 ${selectedSatisfaction === idx ? item.color : 'text-gray-300'}`} />
                                </motion.div>
                            ))}
                        </div>
                    )}

                    {/* Compare */}
                    {rankingStep === 'compare' && (
                        <div className="space-y-3">
                            <p className="text-center text-xs text-gray-500 mb-2">{t('write_guide.demo.which_better')}</p>
                            <motion.div
                                className={`p-3 rounded-xl border-2 transition-all ${selectedChoice === 'new' ? 'border-orange-400 bg-orange-50' : 'border-gray-200'
                                    }`}
                                animate={selectedChoice === 'new' ? { scale: [1, 1.03, 1] } : {}}
                            >
                                <div className="text-center">
                                    <span className="text-sm font-bold text-gray-900">{t('write_guide.demo.shop_name')}</span>
                                    <p className="text-xs text-gray-400">{t('write_guide.demo.this_place')}</p>
                                </div>
                            </motion.div>
                            <p className="text-center text-[10px] text-gray-300 font-bold">VS</p>
                            <div className="p-3 rounded-xl border border-gray-200">
                                <div className="text-center">
                                    <span className="text-sm font-bold text-gray-900">{t('write_guide.demo.existing_shop')}</span>
                                    <p className="text-xs text-gray-400">{t('write_guide.demo.my_rank')}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Result */}
                    {rankingStep === 'result' && (
                        <div className="text-center py-4">
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: [0, 1.1, 1] }}
                                transition={{ type: 'spring', damping: 12 }}
                                className="w-16 h-16 mx-auto mb-3 rounded-full bg-gradient-to-br from-orange-400 to-orange-500 flex items-center justify-center text-white text-2xl font-bold shadow-lg"
                            >
                                2
                            </motion.div>
                            <h4 className="font-bold text-gray-900 mb-1">{t('write_guide.demo.shop_name')}</h4>
                            <p className="text-xs text-gray-500">{t('write_guide.demo.registered_rank')}</p>
                            <div className="flex justify-center gap-1 mt-3">
                                <span className="px-2 py-1 bg-orange-100 text-orange-600 rounded-full text-[10px] font-medium">{t('write.basic.good')}</span>
                                <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-[10px] font-medium">{t('write_guide.demo.top_percent')}</span>
                            </div>
                        </div>
                    )}
                </div>
            </motion.div>
        </div>
    );
};

// Step 2: Write Demo
const WriteGuideDemo = ({ t }: { t: any }) => {
    const [phase, setPhase] = useState<'photos' | 'text' | 'done'>('photos');
    const [photoCount, setPhotoCount] = useState(0);
    const [textLength, setTextLength] = useState(0);

    const fullText = t('write_guide.demo.review_text');

    useEffect(() => {
        const timers: NodeJS.Timeout[] = [];

        // Add photos one by one
        timers.push(setTimeout(() => setPhotoCount(1), 500));
        timers.push(setTimeout(() => setPhotoCount(2), 900));
        timers.push(setTimeout(() => setPhotoCount(3), 1300));

        // Move to text
        timers.push(setTimeout(() => setPhase('text'), 1700));

        // Type text
        for (let i = 1; i <= fullText.length; i++) {
            timers.push(setTimeout(() => setTextLength(i), 1700 + i * 30));
        }

        // Done - hold this state (no restart, let parent transition handle it)
        timers.push(setTimeout(() => setPhase('done'), 1700 + fullText.length * 30 + 300));

        return () => timers.forEach(clearTimeout);
    }, [fullText]);

    return (
        <div className="w-full h-full flex items-center justify-center px-4">
            <div className="w-full max-w-[280px] bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
                {/* Header */}
                <div className="p-3 border-b border-gray-100 flex items-center justify-between">
                    <span className="text-sm font-bold text-gray-900">{t('write_guide.demo.write_review')}</span>
                    <span className={`text-xs font-bold px-3 py-1 rounded-full transition-all ${phase === 'done' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-400'
                        }`}>
                        {t('write_guide.demo.done')}
                    </span>
                </div>

                {/* POI Card */}
                <div className="p-3 border-b border-gray-100">
                    <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-100 to-orange-50 flex items-center justify-center text-lg">🍣</div>
                        <div className="flex-1 min-w-0">
                            <span className="text-xs font-bold text-gray-900">{t('write_guide.demo.shop_name')}</span>
                            <span className="ml-1.5 text-[10px] font-bold text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded">{t('write.basic.good')}</span>
                        </div>
                    </div>
                </div>

                {/* Photos Section */}
                <div className="p-3 border-b border-gray-100">
                    <div className="flex items-center gap-1.5 mb-2">
                        <ImageIcon className="w-4 h-4 text-gray-500" />
                        <span className="text-xs font-medium text-gray-700">{t('write_guide.demo.photos')}</span>
                    </div>
                    <div className="flex gap-2 overflow-hidden">
                        {[0, 1, 2].map((idx) => (
                            <motion.div
                                key={idx}
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{
                                    opacity: photoCount > idx ? 1 : 0.3,
                                    scale: photoCount > idx ? 1 : 0.9
                                }}
                                transition={{ duration: 0.3 }}
                                className={`w-16 h-16 rounded-lg flex-shrink-0 flex items-center justify-center text-2xl ${photoCount > idx
                                        ? 'bg-gradient-to-br from-orange-100 to-orange-50'
                                        : 'bg-gray-100 border-2 border-dashed border-gray-200'
                                    }`}
                            >
                                {photoCount > idx ? ['🍣', '🍱', '🍵'][idx] : <ImageIcon className="w-5 h-5 text-gray-300" />}
                            </motion.div>
                        ))}
                    </div>
                </div>

                {/* Text Section */}
                <div className="p-3">
                    <div className="min-h-[80px] p-3 bg-gray-50 rounded-lg">
                        <motion.p
                            className="text-sm text-gray-800 leading-relaxed"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: phase === 'photos' ? 0.3 : 1 }}
                        >
                            {phase === 'photos' ? (
                                <span className="text-gray-400">{t('write_guide.demo.placeholder')}</span>
                            ) : (
                                <>
                                    {fullText.slice(0, textLength)}
                                    {phase === 'text' && (
                                        <span className="inline-block w-0.5 h-4 bg-primary ml-0.5 animate-pulse" />
                                    )}
                                </>
                            )}
                        </motion.p>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Step 3: Feed Demo
const FeedGuideDemo = ({ t }: { t: any }) => {
    const [isLiked, setIsLiked] = useState(false);
    const [showLikeOverlay, setShowLikeOverlay] = useState(false);
    const [likeCount, setLikeCount] = useState(12);
    const [showCard, setShowCard] = useState(false);
    const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);

    const photos = ['🍣', '🍱', '🍵'];

    useEffect(() => {
        const timers: NodeJS.Timeout[] = [];

        const runAnimation = () => {
            // Reset
            setShowCard(false);
            setIsLiked(false);
            setShowLikeOverlay(false);
            setLikeCount(12);
            setCurrentPhotoIndex(0);

            // Show card
            timers.push(setTimeout(() => setShowCard(true), 300));

            // Photo swipe animations
            timers.push(setTimeout(() => setCurrentPhotoIndex(1), 1200));
            timers.push(setTimeout(() => setCurrentPhotoIndex(2), 2000));
            timers.push(setTimeout(() => setCurrentPhotoIndex(0), 2800));

            // Like animation with overlay
            timers.push(setTimeout(() => {
                setIsLiked(true);
                setShowLikeOverlay(true);
                setLikeCount(13);
            }, 3500));

            // Hide like overlay
            timers.push(setTimeout(() => {
                setShowLikeOverlay(false);
            }, 4200));

            // Unlike and restart
            timers.push(setTimeout(() => {
                setIsLiked(false);
                setLikeCount(12);
            }, 4800));

            // Restart
            timers.push(setTimeout(runAnimation, 5800));
        };

        runAnimation();
        return () => timers.forEach(clearTimeout);
    }, []);

    return (
        <div className="w-full h-full flex items-center justify-center px-4">
            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: showCard ? 1 : 0, y: showCard ? 0 : 30 }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
                className="w-full max-w-[280px] bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100 relative"
            >
                {/* Like Overlay Animation */}
                <AnimatePresence>
                    {showLikeOverlay && (
                        <motion.div
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: [0, 1.3, 1], opacity: [0, 1, 1] }}
                            exit={{ scale: 0, opacity: 0 }}
                            transition={{ duration: 0.4, ease: 'easeOut' }}
                            className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none"
                        >
                            <Heart size={64} className="fill-red-500 text-red-500 drop-shadow-lg" />
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Header */}
                <div className="p-3 flex items-center gap-2">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-orange-100 to-orange-200 flex items-center justify-center text-lg">😊</div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                            <span className="font-bold text-sm text-gray-900">{t('write_guide.demo.username')}</span>
                            <span className="text-[10px] text-orange-600 font-medium">{t('write_guide.demo.cluster')}</span>
                        </div>
                        <p className="text-xs text-gray-500">
                            {t('write_guide.demo.visited_text')}
                        </p>
                    </div>
                </div>

                {/* Image Carousel - Horizontal scroll style with peek */}
                {/* Container: 280px, Card: 200px, Gap: 8px, Padding: 12px */}
                {/* Position 0: left aligned, Position 1: centered, Position 2: right aligned */}
                <div className="overflow-hidden py-2 relative">
                    <motion.div
                        className="flex gap-2 pl-3"
                        animate={{ x: [0, -180, -360][currentPhotoIndex] }}
                        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    >
                        {photos.map((emoji, idx) => (
                            <div
                                key={idx}
                                className="w-[200px] h-[200px] flex-shrink-0 rounded-xl bg-gradient-to-br from-orange-100 to-orange-50 flex items-center justify-center relative"
                            >
                                <span className="text-5xl">{emoji}</span>
                                {/* Caption like in real app */}
                                <span className="absolute bottom-2 left-2 text-[10px] text-gray-600 bg-white/80 px-1.5 py-0.5 rounded">
                                    {(t('write_guide.demo.captions', { returnObjects: true }) as string[])[idx]}
                                </span>
                            </div>
                        ))}
                    </motion.div>
                </div>

                {/* Satisfaction Badge */}
                <div className="px-3 pt-1">
                    <span className="text-xs font-bold text-orange-600 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-full">
                        {t('write.basic.good')} | {t('write_guide.demo.top_percent')}
                    </span>
                </div>

                {/* Text */}
                <div className="px-3 py-2">
                    <p className="text-sm text-gray-800 line-clamp-2">
                        {t('write_guide.demo.review_text')}
                    </p>
                </div>

                {/* ShopInfoCard */}
                <div className="mx-3 mb-2 p-2.5 bg-gray-50 rounded-xl flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-100 to-orange-50 flex items-center justify-center text-lg flex-shrink-0">
                        🍣
                    </div>
                    <div className="flex-1 min-w-0">
                        <span className="text-sm font-bold text-gray-900 truncate block">{t('write_guide.demo.shop_name')}</span>
                        <p className="text-[11px] text-gray-500 truncate">{t('write_guide.demo.category')} · 강남구</p>
                    </div>
                </div>

                {/* Actions */}
                <div className="px-3 pb-3 flex items-center gap-4">
                    <motion.button
                        className="flex items-center gap-1.5 text-gray-600"
                        animate={isLiked ? { scale: [1, 1.2, 1] } : {}}
                    >
                        <Heart size={18} className={isLiked ? 'fill-red-500 text-red-500' : ''} />
                        <span className="text-sm font-medium">{likeCount}</span>
                    </motion.button>
                    <button className="flex items-center gap-1.5 text-gray-600">
                        <MessageCircle size={18} />
                        <span className="text-sm font-medium">3</span>
                    </button>
                    <button className="flex items-center text-gray-600">
                        <Send size={18} />
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

export default WriteGuideOverlay;
