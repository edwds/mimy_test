import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Smile, Meh, Frown, Image as ImageIcon, Heart, MessageCircle, Send, Search } from 'lucide-react';
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
            title: t('write_guide.step1.title', '방문한 곳을 찾아서'),
            subtitle: t('write_guide.step1.subtitle', '순위를 매겨주세요'),
        },
        {
            title: t('write_guide.step2.title', '사진과 함께'),
            subtitle: t('write_guide.step2.subtitle', '기록을 써주세요'),
        },
        {
            title: t('write_guide.step3.title', '쓴 글은 피드에서'),
            subtitle: t('write_guide.step3.subtitle', '볼 수 있어요'),
        },
    ];

    // Auto-cycle through steps
    useEffect(() => {
        if (!isOpen) return;

        const interval = setInterval(() => {
            setCurrentStep((prev) => (prev + 1) % 3);
        }, 5000); // Increased to 5s for search+ranking animation

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

            {/* Step Indicators */}
            <div className="flex justify-center gap-2 mb-6">
                {[0, 1, 2].map((step) => (
                    <button
                        key={step}
                        onClick={() => setCurrentStep(step)}
                        className={`w-2 h-2 rounded-full transition-all duration-300 ${
                            currentStep === step
                                ? 'w-6 bg-primary'
                                : 'bg-gray-300'
                        }`}
                    />
                ))}
            </div>

            {/* Text Area */}
            <div className="px-8 mb-8 text-center min-h-[80px]">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentStep}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.3 }}
                    >
                        <h2 className="text-2xl font-bold text-gray-900 mb-1">
                            {steps[currentStep].title}
                        </h2>
                        <p className="text-2xl font-bold text-gray-900">
                            {steps[currentStep].subtitle}
                        </p>
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* Start Button */}
            <div className="px-6 pb-4">
                <Button
                    onClick={handleStart}
                    className="w-full py-6 text-lg rounded-2xl bg-primary hover:bg-primary/90 text-white font-bold shadow-lg shadow-primary/20"
                >
                    {t('write_guide.start_button', '시작하기')}
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

    const fullSearchText = t('write_guide.demo.search_text', '스시');

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

            // Search phase: type text
            for (let i = 1; i <= fullSearchText.length; i++) {
                timers.push(setTimeout(() => setSearchText(fullSearchText.slice(0, i)), 300 + i * 100));
            }

            // Show results
            timers.push(setTimeout(() => setShowResults(true), 300 + fullSearchText.length * 100 + 300));

            // Select shop
            timers.push(setTimeout(() => setSelectedShop(true), 300 + fullSearchText.length * 100 + 800));

            // Transition to ranking
            timers.push(setTimeout(() => setPhase('ranking'), 300 + fullSearchText.length * 100 + 1200));

            // Ranking: Select satisfaction
            timers.push(setTimeout(() => setSelectedSatisfaction(0), 300 + fullSearchText.length * 100 + 1600));
            timers.push(setTimeout(() => setRankingStep('compare'), 300 + fullSearchText.length * 100 + 2100));

            // Select NEW
            timers.push(setTimeout(() => setSelectedChoice('new'), 300 + fullSearchText.length * 100 + 2500));
            timers.push(setTimeout(() => setRankingStep('result'), 300 + fullSearchText.length * 100 + 3000));

            // Restart
            timers.push(setTimeout(runAnimation, 300 + fullSearchText.length * 100 + 4500));
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
                                    { name: t('write_guide.demo.shop_name', '스시 오마카세'), category: t('write_guide.demo.category', '일식'), emoji: '🍣' },
                                    { name: t('write_guide.demo.existing_shop', '라멘 이치란'), category: t('write_guide.demo.category', '일식'), emoji: '🍜' },
                                ].map((shop, idx) => (
                                    <motion.div
                                        key={idx}
                                        className={`flex items-center gap-3 p-2.5 rounded-xl transition-all ${
                                            idx === 0 && selectedShop
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
                {/* Header */}
                {rankingStep !== 'result' && (
                    <div className="p-4 border-b border-gray-100">
                        <div className="flex gap-3 items-center">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-100 to-orange-50 flex items-center justify-center text-xl">🍣</div>
                            <div>
                                <h3 className="font-bold text-base text-gray-900">{t('write_guide.demo.shop_name', '스시 오마카세')}</h3>
                                <p className="text-xs text-gray-500">{t('write_guide.demo.category', '일식')}</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Body */}
                <div className="p-4">
                    <AnimatePresence mode="wait">
                        {rankingStep === 'satisfaction' && (
                            <motion.div
                                key="satisfaction"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="space-y-2"
                            >
                                <p className="text-center text-xs text-gray-500 mb-3">{t('write_guide.demo.how_was_it', '어떠셨나요?')}</p>
                                {[
                                    { icon: Smile, label: t('write.basic.good', '맛있어요'), color: 'text-orange-500', bg: 'bg-orange-50 border-orange-200' },
                                    { icon: Meh, label: t('write.basic.ok', '괜찮아요'), color: 'text-yellow-500', bg: 'bg-yellow-50 border-yellow-200' },
                                    { icon: Frown, label: t('write.basic.bad', '별로에요'), color: 'text-gray-400', bg: 'bg-gray-50 border-gray-200' },
                                ].map((item, idx) => (
                                    <motion.div
                                        key={idx}
                                        className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                                            selectedSatisfaction === idx ? item.bg : 'border-gray-200'
                                        }`}
                                        animate={selectedSatisfaction === idx ? { scale: [1, 1.02, 1] } : {}}
                                    >
                                        <span className={`text-sm font-medium ${selectedSatisfaction === idx ? item.color : 'text-gray-600'}`}>
                                            {item.label}
                                        </span>
                                        <item.icon className={`w-5 h-5 ${selectedSatisfaction === idx ? item.color : 'text-gray-300'}`} />
                                    </motion.div>
                                ))}
                            </motion.div>
                        )}

                        {rankingStep === 'compare' && (
                            <motion.div
                                key="compare"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="space-y-3"
                            >
                                <p className="text-center text-xs text-gray-500 mb-2">{t('write_guide.demo.which_better', '어디가 더 좋았나요?')}</p>
                                <motion.div
                                    className={`p-3 rounded-xl border-2 transition-all ${
                                        selectedChoice === 'new' ? 'border-orange-400 bg-orange-50' : 'border-gray-200'
                                    }`}
                                    animate={selectedChoice === 'new' ? { scale: [1, 1.03, 1] } : {}}
                                >
                                    <div className="text-center">
                                        <span className="text-sm font-bold text-gray-900">{t('write_guide.demo.shop_name', '스시 오마카세')}</span>
                                        <p className="text-xs text-gray-400">{t('write_guide.demo.this_place', '이번에 방문')}</p>
                                    </div>
                                </motion.div>
                                <p className="text-center text-[10px] text-gray-300 font-bold">VS</p>
                                <div className="p-3 rounded-xl border border-gray-200">
                                    <div className="text-center">
                                        <span className="text-sm font-bold text-gray-900">{t('write_guide.demo.existing_shop', '라멘 이치란')}</span>
                                        <p className="text-xs text-gray-400">{t('write_guide.demo.my_rank', '내 3위')}</p>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {rankingStep === 'result' && (
                            <motion.div
                                key="result"
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0 }}
                                className="text-center py-4"
                            >
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ type: 'spring', damping: 10 }}
                                    className="w-16 h-16 mx-auto mb-3 rounded-full bg-gradient-to-br from-orange-400 to-orange-500 flex items-center justify-center text-white text-2xl font-bold shadow-lg"
                                >
                                    2
                                </motion.div>
                                <h4 className="font-bold text-gray-900 mb-1">{t('write_guide.demo.shop_name', '스시 오마카세')}</h4>
                                <p className="text-xs text-gray-500">{t('write_guide.demo.registered_rank', '일식 2위로 등록!')}</p>
                                <div className="flex justify-center gap-1 mt-3">
                                    <span className="px-2 py-1 bg-orange-100 text-orange-600 rounded-full text-[10px] font-medium">{t('write.basic.good', '맛있어요')}</span>
                                    <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-[10px] font-medium">{t('write_guide.demo.top_percent', '상위 15%')}</span>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
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

    useEffect(() => {
        const timers: NodeJS.Timeout[] = [];

        const runAnimation = () => {
            // Reset
            setPhase('photos');
            setPhotoCount(0);
            setTextLength(0);

            // Add photos one by one
            timers.push(setTimeout(() => setPhotoCount(1), 500));
            timers.push(setTimeout(() => setPhotoCount(2), 900));
            timers.push(setTimeout(() => setPhotoCount(3), 1300));

            // Move to text
            timers.push(setTimeout(() => setPhase('text'), 1700));

            // Type text
            const fullText = t('write_guide.demo.review_text', '오마카세가 정말 신선하고 맛있었어요! 특히 중트로가 최고였습니다.');
            for (let i = 1; i <= fullText.length; i++) {
                timers.push(setTimeout(() => setTextLength(i), 1700 + i * 30));
            }

            // Done
            timers.push(setTimeout(() => setPhase('done'), 1700 + fullText.length * 30 + 500));

            // Restart
            timers.push(setTimeout(runAnimation, 1700 + fullText.length * 30 + 1500));
        };

        runAnimation();
        return () => timers.forEach(clearTimeout);
    }, [t]);

    const fullText = t('write_guide.demo.review_text', '오마카세가 정말 신선하고 맛있었어요! 특히 중트로가 최고였습니다.');

    return (
        <div className="w-full h-full flex items-center justify-center px-4">
            <div className="w-full max-w-[280px] bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
                {/* Header */}
                <div className="p-3 border-b border-gray-100 flex items-center justify-between">
                    <span className="text-sm font-bold text-gray-900">{t('write_guide.demo.write_review', '리뷰 작성')}</span>
                    <span className={`text-xs font-bold px-3 py-1 rounded-full transition-all ${
                        phase === 'done' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-400'
                    }`}>
                        {t('write_guide.demo.done', '완료')}
                    </span>
                </div>

                {/* POI Card */}
                <div className="p-3 border-b border-gray-100">
                    <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-100 to-orange-50 flex items-center justify-center text-lg">🍣</div>
                        <div className="flex-1 min-w-0">
                            <span className="text-xs font-bold text-gray-900">{t('write_guide.demo.shop_name', '스시 오마카세')}</span>
                            <span className="ml-1.5 text-[10px] font-bold text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded">{t('write.basic.good', '맛있어요')}</span>
                        </div>
                    </div>
                </div>

                {/* Photos Section */}
                <div className="p-3 border-b border-gray-100">
                    <div className="flex items-center gap-1.5 mb-2">
                        <ImageIcon className="w-4 h-4 text-gray-500" />
                        <span className="text-xs font-medium text-gray-700">{t('write_guide.demo.photos', '사진')}</span>
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
                                className={`w-16 h-16 rounded-lg flex-shrink-0 flex items-center justify-center text-2xl ${
                                    photoCount > idx
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
                                <span className="text-gray-400">{t('write_guide.demo.placeholder', '방문 후기를 적어주세요...')}</span>
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
            setLikeCount(12);
            setCurrentPhotoIndex(0);

            // Show card
            timers.push(setTimeout(() => setShowCard(true), 300));

            // Photo swipe animations
            timers.push(setTimeout(() => setCurrentPhotoIndex(1), 1200));
            timers.push(setTimeout(() => setCurrentPhotoIndex(2), 2000));
            timers.push(setTimeout(() => setCurrentPhotoIndex(0), 2800));

            // Like animation
            timers.push(setTimeout(() => {
                setIsLiked(true);
                setLikeCount(13);
            }, 3500));

            // Unlike and restart
            timers.push(setTimeout(() => {
                setIsLiked(false);
                setLikeCount(12);
            }, 4500));

            // Restart
            timers.push(setTimeout(runAnimation, 5500));
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
                className="w-full max-w-[280px] bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100"
            >
                {/* Header */}
                <div className="p-3 flex items-center gap-2">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-orange-100 to-orange-200 flex items-center justify-center text-lg">😊</div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                            <span className="font-bold text-sm text-gray-900">{t('write_guide.demo.username', '미식가123')}</span>
                            <span className="text-[10px] text-orange-600 font-medium">{t('write_guide.demo.cluster', '담백 러버')}</span>
                        </div>
                        <p className="text-xs text-gray-500">
                            {t('write_guide.demo.visited_text', '스시 오마카세를 오늘 방문')}
                        </p>
                    </div>
                </div>

                {/* Image Carousel */}
                <div className="relative aspect-[4/3] bg-gradient-to-br from-orange-100 to-orange-50 overflow-hidden">
                    <motion.div
                        className="flex h-full"
                        animate={{ x: `-${currentPhotoIndex * 100}%` }}
                        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    >
                        {photos.map((emoji, idx) => (
                            <div
                                key={idx}
                                className="w-full h-full flex-shrink-0 flex items-center justify-center bg-gradient-to-br from-orange-100 to-orange-50"
                            >
                                <span className="text-6xl">{emoji}</span>
                            </div>
                        ))}
                    </motion.div>

                    {/* Photo Indicators */}
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
                        {photos.map((_, idx) => (
                            <div
                                key={idx}
                                className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                                    currentPhotoIndex === idx ? 'w-3 bg-white' : 'bg-white/50'
                                }`}
                            />
                        ))}
                    </div>

                    {/* Like animation overlay */}
                    <AnimatePresence>
                        {isLiked && (
                            <motion.div
                                initial={{ scale: 0, opacity: 0 }}
                                animate={{ scale: 1.2, opacity: 1 }}
                                exit={{ scale: 0, opacity: 0 }}
                                transition={{ type: 'spring', damping: 10 }}
                                className="absolute inset-0 flex items-center justify-center"
                            >
                                <Heart className="w-20 h-20 text-white fill-white drop-shadow-xl" />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Satisfaction Badge */}
                <div className="px-3 pt-2">
                    <span className="text-xs font-bold text-orange-600 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-full">
                        {t('write.basic.good', '맛있어요')} | {t('write_guide.demo.top_percent', '상위 15%')}
                    </span>
                </div>

                {/* Text */}
                <div className="px-3 py-2">
                    <p className="text-sm text-gray-800 line-clamp-2">
                        {t('write_guide.demo.review_text', '오마카세가 정말 신선하고 맛있었어요! 특히 중트로가 최고였습니다.')}
                    </p>
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
