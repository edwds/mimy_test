import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Smile, Meh, Frown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import * as maptilersdk from '@maptiler/sdk';
import "@maptiler/sdk/dist/maptiler-sdk.css";
import { useTranslation } from 'react-i18next';
import { QUESTIONS } from '@/data/quiz';

// 32유형 MBTI 스타일 입맛 프로필 (src/lib/tasteType.ts의 TASTE_TYPE_PROFILES에서 선별)
const DEMO_TASTE_TYPES = [
    { code: 'HASP-A', name: '선도자형 미식가', tagline: '강렬하고 생동감 있는 맛을 앞서 경험한다. 새로운 조합을 이끄는 타입이다.' },
    { code: 'LDUF-T', name: '보존자형 미식가', tagline: '익숙하고 깊은 맛을 안정적으로 즐긴다. 한 번 마음에 든 메뉴를 꾸준히 찾는 편이다.' },
    { code: 'LASF-A', name: '감각자형 미식가', tagline: '상큼하고 달콤한 조합을 즐긴다. 밝고 경쾌한 취향을 가졌다.' },
    { code: 'HDUF-A', name: '실천자형 미식가', tagline: '강하고 묵직한 맛을 선호한다. 취향이 분명하고 흔들림이 적다.' },
    { code: 'LAUP-T', name: '탐색자형 미식가', tagline: '가볍고 산뜻한 메뉴를 중심으로 새로운 맛을 시도한다.' },
    { code: 'HDSF-A', name: '집중자형 미식가', tagline: '강렬한 단맛과 묵직함에 몰입한다. 확실한 쾌감을 추구한다.' },
];

// ============================================
// 1. QuizSwipeDemo → FlowingTasteCards 전환
// ============================================
const QuizToTasteDemo = () => {
    const [phase, setPhase] = useState<'quiz' | 'cards'>('quiz');
    const [currentCardIndex, setCurrentCardIndex] = useState(0);
    const [cardState, setCardState] = useState<'idle' | 'swiping' | 'exiting'>('idle');
    const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);

    // cards phase 내부 상태 - 카드들이 연속적으로 유지되면서 플로우로 전환
    const [showCenterCard, setShowCenterCard] = useState(false);
    const [showSideCards, setShowSideCards] = useState(false);
    const [startFlow, setStartFlow] = useState(false);

    // 퀴즈 질문 3개 선택 (다양한 축에서)
    const demoQuestions = [
        QUESTIONS.find(q => q.axis === 'spiciness')!, // 매운맛
        QUESTIONS.find(q => q.axis === 'experimental')!, // 실험성
        QUESTIONS.find(q => q.axis === 'richness')!, // 풍부함
    ];

    useEffect(() => {
        const timers: NodeJS.Timeout[] = [];

        const runAnimation = () => {
            // Reset all states
            setPhase('quiz');
            setCurrentCardIndex(0);
            setCardState('idle');
            setSwipeDirection(null);
            setShowCenterCard(false);
            setShowSideCards(false);
            setStartFlow(false);

            // Card 1: 스와이프 시작 → 오른쪽으로 나감
            timers.push(setTimeout(() => {
                setSwipeDirection('right');
                setCardState('swiping');
            }, 1000));
            timers.push(setTimeout(() => {
                setCardState('exiting');
            }, 1400));
            timers.push(setTimeout(() => {
                setCurrentCardIndex(1);
                setCardState('idle');
                setSwipeDirection(null);
            }, 1700));

            // Card 2: 스와이프 시작 → 왼쪽으로 나감
            timers.push(setTimeout(() => {
                setSwipeDirection('left');
                setCardState('swiping');
            }, 2500));
            timers.push(setTimeout(() => {
                setCardState('exiting');
            }, 2900));
            timers.push(setTimeout(() => {
                setCurrentCardIndex(2);
                setCardState('idle');
                setSwipeDirection(null);
            }, 3200));

            // Card 3: 스와이프 시작 → 오른쪽으로 나감 (마지막)
            timers.push(setTimeout(() => {
                setSwipeDirection('right');
                setCardState('swiping');
            }, 4000));
            timers.push(setTimeout(() => {
                setCardState('exiting');
            }, 4400));

            // Phase: Cards - 중앙 카드 뿅 등장 (카드 나가자마자 바로)
            timers.push(setTimeout(() => {
                setPhase('cards');
            }, 4500));
            timers.push(setTimeout(() => {
                setShowCenterCard(true);
            }, 4600));

            // Cards - 양옆 카드 추가 (중앙 카드 유지)
            timers.push(setTimeout(() => {
                setShowSideCards(true);
            }, 5400));

            // 플로우 애니메이션 시작 (cards phase 유지하면서)
            timers.push(setTimeout(() => {
                setStartFlow(true);
            }, 6200));

            // Restart
            timers.push(setTimeout(runAnimation, 12500));
        };

        runAnimation();
        return () => timers.forEach(clearTimeout);
    }, []);

    // 카드 애니메이션 값 계산
    const getCardAnimation = () => {
        if (cardState === 'idle') {
            return { x: 0, rotate: 0, opacity: 1 };
        }
        if (cardState === 'swiping') {
            return {
                x: swipeDirection === 'right' ? 80 : -80,
                rotate: swipeDirection === 'right' ? 8 : -8,
                opacity: 1
            };
        }
        // exiting
        return {
            x: swipeDirection === 'right' ? 400 : -400,
            rotate: swipeDirection === 'right' ? 20 : -20,
            opacity: 0
        };
    };

    return (
        <div className="w-full h-full relative overflow-hidden">
            <AnimatePresence mode="wait">
                {phase === 'quiz' && (
                    <motion.div
                        key="quiz"
                        initial={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 flex items-center justify-center"
                    >
                        {/* Quiz Card Stack */}
                        <div className="relative w-[240px] h-[320px]" style={{ perspective: '1000px' }}>
                            {/* 뒤 카드들 (남은 카드 수에 따라) */}
                            {currentCardIndex < 2 && (
                                <motion.div
                                    className="absolute inset-0 rounded-2xl border border-gray-200 shadow-md"
                                    style={{
                                        background: 'linear-gradient(135deg, #FDFBF7 0%, #F5F3FF 100%)',
                                        transformOrigin: 'top center'
                                    }}
                                    animate={{
                                        scale: cardState === 'exiting' ? 0.94 : 0.88,
                                        y: cardState === 'exiting' ? -10 : -20,
                                    }}
                                    transition={{ duration: 0.3 }}
                                />
                            )}
                            {currentCardIndex < 1 && (
                                <motion.div
                                    className="absolute inset-0 rounded-2xl border border-gray-200 shadow-lg"
                                    style={{
                                        background: 'linear-gradient(135deg, #FDFBF7 0%, #F5F3FF 100%)',
                                        transformOrigin: 'top center'
                                    }}
                                    animate={{
                                        scale: cardState === 'exiting' ? 1 : 0.94,
                                        y: cardState === 'exiting' ? 0 : -10,
                                    }}
                                    transition={{ duration: 0.3 }}
                                />
                            )}

                            {/* Active card - AnimatePresence로 카드 전환 */}
                            <AnimatePresence mode="popLayout">
                                <motion.div
                                    key={currentCardIndex}
                                    className="absolute inset-0 rounded-2xl border border-gray-200 shadow-xl overflow-hidden"
                                    style={{
                                        background: 'linear-gradient(135deg, #FDFBF7 0%, #F5F3FF 100%)',
                                    }}
                                    initial={{ scale: 0.94, y: -10, opacity: 1 }}
                                    animate={getCardAnimation()}
                                    exit={{
                                        x: swipeDirection === 'right' ? 400 : -400,
                                        rotate: swipeDirection === 'right' ? 25 : -25,
                                        opacity: 0,
                                    }}
                                    transition={{
                                        type: 'spring',
                                        stiffness: 300,
                                        damping: 30,
                                    }}
                                >
                                    {/* Swipe overlay - 상단에 배치 */}
                                    <AnimatePresence>
                                        {swipeDirection === 'right' && cardState !== 'idle' && (
                                            <motion.div
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                exit={{ opacity: 0 }}
                                                className="absolute inset-0 bg-green-100/60 flex items-start justify-center pt-8"
                                            >
                                                <span className="text-green-600 text-lg font-bold">내 취향!</span>
                                            </motion.div>
                                        )}
                                        {swipeDirection === 'left' && cardState !== 'idle' && (
                                            <motion.div
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                exit={{ opacity: 0 }}
                                                className="absolute inset-0 bg-red-100/60 flex items-start justify-center pt-8"
                                            >
                                                <span className="text-red-500 text-lg font-bold">별로...</span>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                    <div className="p-6 flex items-center justify-center h-full">
                                        <p className="text-lg font-bold text-gray-900 text-center leading-relaxed">
                                            {demoQuestions[currentCardIndex]?.text}
                                        </p>
                                    </div>
                                </motion.div>
                            </AnimatePresence>
                        </div>
                    </motion.div>
                )}

                {phase === 'cards' && (
                    <motion.div
                        key="cards"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="absolute inset-0 overflow-hidden"
                    >
                        {/* 좌우 fade 효과 - 플로우 시작 시 보임 */}
                        <motion.div
                            className="absolute inset-y-0 left-0 w-20 bg-gradient-to-r from-background to-transparent z-20 pointer-events-none"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: startFlow ? 1 : 0 }}
                            transition={{ duration: 0.3 }}
                        />
                        <motion.div
                            className="absolute inset-y-0 right-0 w-20 bg-gradient-to-l from-background to-transparent z-20 pointer-events-none"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: startFlow ? 1 : 0 }}
                            transition={{ duration: 0.3 }}
                        />

                        {/* 중앙 3장 카드 + 플로우 카드들 (같은 컨테이너에서 함께 움직임) */}
                        {/* 카드: w-52=208px, gap-4=16px, 중앙카드 중심까지: 208+16+104=328px */}
                        <motion.div
                            className="absolute inset-y-0 flex items-center gap-4 z-10"
                            style={{ left: '50%' }}
                            animate={{ x: startFlow ? -1828 : -328 }}
                            transition={startFlow ? {
                                x: {
                                    duration: 20,
                                    ease: "linear",
                                    repeat: Infinity,
                                    repeatType: "loop",
                                },
                            } : { duration: 0 }}
                        >
                            {/* 왼쪽 카드 - 디졸브 */}
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: showSideCards ? 1 : 0 }}
                                transition={{ duration: 0.4, ease: 'easeOut' }}
                                className="shrink-0 w-52 h-64 rounded-2xl shadow-lg flex flex-col items-center justify-center p-5 text-center"
                                style={{ background: 'linear-gradient(135deg, #FDFBF7 0%, #F5F3FF 100%)' }}
                            >
                                <span className="inline-block px-3 py-1 bg-primary/10 rounded-full text-xs font-bold text-primary tracking-wider mb-2">{DEMO_TASTE_TYPES[1].code}</span>
                                <span className="text-base font-bold text-gray-900 mb-1">{DEMO_TASTE_TYPES[1].name}</span>
                                <span className="text-xs text-gray-600 leading-relaxed">{DEMO_TASTE_TYPES[1].tagline}</span>
                            </motion.div>

                            {/* 중앙 카드 - 뿅 */}
                            <motion.div
                                initial={{ opacity: 0, scale: 0.3 }}
                                animate={{
                                    opacity: showCenterCard ? 1 : 0,
                                    scale: showCenterCard ? 1 : 0.3,
                                }}
                                transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                                className="shrink-0 w-52 h-64 rounded-2xl shadow-xl flex flex-col items-center justify-center p-5 text-center"
                                style={{ background: 'linear-gradient(135deg, #FDFBF7 0%, #F5F3FF 100%)' }}
                            >
                                <span className="inline-block px-3 py-1 bg-primary/10 rounded-full text-xs font-bold text-primary tracking-wider mb-2">{DEMO_TASTE_TYPES[0].code}</span>
                                <span className="text-base font-bold text-gray-900 mb-1">{DEMO_TASTE_TYPES[0].name}</span>
                                <span className="text-xs text-gray-600 leading-relaxed">{DEMO_TASTE_TYPES[0].tagline}</span>
                            </motion.div>

                            {/* 오른쪽 카드 - 디졸브 */}
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: showSideCards ? 1 : 0 }}
                                transition={{ duration: 0.4, ease: 'easeOut', delay: 0.1 }}
                                className="shrink-0 w-52 h-64 rounded-2xl shadow-lg flex flex-col items-center justify-center p-5 text-center"
                                style={{ background: 'linear-gradient(135deg, #FDFBF7 0%, #F5F3FF 100%)' }}
                            >
                                <span className="inline-block px-3 py-1 bg-primary/10 rounded-full text-xs font-bold text-primary tracking-wider mb-2">{DEMO_TASTE_TYPES[2].code}</span>
                                <span className="text-base font-bold text-gray-900 mb-1">{DEMO_TASTE_TYPES[2].name}</span>
                                <span className="text-xs text-gray-600 leading-relaxed">{DEMO_TASTE_TYPES[2].tagline}</span>
                            </motion.div>

                            {/* 추가 플로우 카드들 - 처음부터 렌더링 (레이아웃 변경 방지) */}
                            {[...DEMO_TASTE_TYPES, ...DEMO_TASTE_TYPES, ...DEMO_TASTE_TYPES, ...DEMO_TASTE_TYPES].map((profile, i) => (
                                <div
                                    key={`flow-${i}`}
                                    className="shrink-0 w-52 h-64 rounded-2xl shadow-lg flex flex-col items-center justify-center p-5 text-center"
                                    style={{ background: 'linear-gradient(135deg, #FDFBF7 0%, #F5F3FF 100%)' }}
                                >
                                    <span className="inline-block px-3 py-1 bg-primary/10 rounded-full text-xs font-bold text-primary tracking-wider mb-2">{profile.code}</span>
                                    <span className="text-base font-bold text-gray-900 mb-1">{profile.name}</span>
                                    <span className="text-xs text-gray-600 leading-relaxed">{profile.tagline}</span>
                                </div>
                            ))}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

// ============================================
// 2. RankingDemo (AboutScreen 원본)
// ============================================
const RankingDemo = ({ t }: { t: any }) => {
    const [step, setStep] = useState<'satisfaction' | 'compare' | 'result' | 'list'>('satisfaction');
    const [selectedSatisfaction, setSelectedSatisfaction] = useState<number | null>(null);
    const [selectedChoice, setSelectedChoice] = useState<'new' | 'existing' | null>(null);
    const [rankingCardX, setRankingCardX] = useState(0);
    const [listCardX, setListCardX] = useState(100);
    const [listScrollY, setListScrollY] = useState(0);
    const [isFirstRender, setIsFirstRender] = useState(true);

    useEffect(() => {
        const timers: NodeJS.Timeout[] = [];

        const runAnimation = () => {
            // Reset
            setStep('satisfaction');
            setSelectedSatisfaction(null);
            setSelectedChoice(null);
            setRankingCardX(isFirstRender ? 0 : -100);
            setListCardX(100);
            setListScrollY(0);

            if (!isFirstRender) {
                timers.push(setTimeout(() => setRankingCardX(0), 100));
            }
            setIsFirstRender(false);

            // Step 1: Select satisfaction (good)
            timers.push(setTimeout(() => setSelectedSatisfaction(0), 1000));
            timers.push(setTimeout(() => setStep('compare'), 1600));

            // Step 2: Select NEW
            timers.push(setTimeout(() => setSelectedChoice('new'), 2400));
            timers.push(setTimeout(() => setStep('result'), 3000));

            // Step 3: Result 보여주고 → 랭킹카드 왼쪽으로 나감
            timers.push(setTimeout(() => setRankingCardX(-100), 4200));

            // Step 4: 리스트카드 오른쪽에서 들어옴
            timers.push(setTimeout(() => {
                setStep('list');
                setListCardX(0);
            }, 4500));

            // Step 5: 리스트 스크롤 (10개 아이템, 아래로 스크롤 후 다시 위로)
            timers.push(setTimeout(() => setListScrollY(260), 5000));
            timers.push(setTimeout(() => setListScrollY(0), 7200));

            // Step 6: 리스트카드 오른쪽으로 나감
            timers.push(setTimeout(() => setListCardX(100), 8200));

            // Restart
            timers.push(setTimeout(runAnimation, 8900));
        };

        runAnimation();

        return () => timers.forEach(clearTimeout);
    }, []);

    const demoMapShopsRanking = t('about.demo.map.shops', { returnObjects: true }) as { name: string; category: string }[];
    const category = t('about.demo.ranking.category');
    const demoShop = { name: demoMapShopsRanking[0]?.name || 'Sushi Omakase', category };
    const existingShop = { name: demoMapShopsRanking[1]?.name || 'Ramen Ichiran', rank: 3 };

    // 미니 리스트 데이터
    const listItems = [
        { rank: 1, name: demoMapShopsRanking[1]?.name, category, emoji: '🍜' },
        { rank: 2, name: demoMapShopsRanking[0]?.name, category, emoji: '🍣' },
        { rank: 3, name: 'Udon Kaden', category, emoji: '🍲' },
        { rank: 4, name: 'Tonkatsu Maisen', category, emoji: '🍱' },
        { rank: 5, name: 'Yakitori Toriki', category, emoji: '🍢' },
        { rank: 6, name: 'Soba Meiga', category, emoji: '🍜' },
        { rank: 7, name: 'Gyukatsu Motomura', category, emoji: '🥩' },
        { rank: 8, name: 'Tendon Tenya', category, emoji: '🍤' },
        { rank: 9, name: 'Izakaya Hana', category, emoji: '🍶' },
        { rank: 10, name: 'Curry Coco Ichi', category, emoji: '🍛' },
    ];

    return (
        <div className="w-full h-full flex items-center justify-center px-4 relative overflow-hidden">
            {/* 랭킹 오버레이 카드 */}
            <motion.div
                initial={{ x: '0%', opacity: 1 }}
                animate={{ x: `${rankingCardX}%`, opacity: rankingCardX === 0 ? 1 : 0 }}
                transition={{ duration: 0.4, ease: 'easeInOut' }}
                className="absolute w-full max-w-[280px] bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100 text-left"
            >
                {/* Header - Shop Info */}
                {step !== 'result' && step !== 'list' && (
                    <div className="p-4 border-b border-gray-100">
                        <div className="flex gap-3 items-center">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-100 to-orange-50 flex items-center justify-center text-xl">🍣</div>
                            <div>
                                <h3 className="font-bold text-base text-gray-900">{demoShop.name}</h3>
                                <p className="text-xs text-gray-500">{demoShop.category}</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Body */}
                <div className="p-4">
                    <AnimatePresence mode="wait">
                        {step === 'satisfaction' && (
                            <motion.div
                                key="satisfaction"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="space-y-2"
                            >
                                <p className="text-center text-xs text-gray-500 mb-3">{t('about.demo.ranking.how_was_it')}</p>
                                {[
                                    { icon: Smile, label: t('about.demo.ranking.good'), color: 'text-orange-500', bg: 'bg-orange-50 border-orange-200' },
                                    { icon: Meh, label: t('about.demo.ranking.ok'), color: 'text-yellow-500', bg: 'bg-yellow-50 border-yellow-200' },
                                    { icon: Frown, label: t('about.demo.ranking.bad'), color: 'text-gray-400', bg: 'bg-gray-50 border-gray-200' },
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
                            </motion.div>
                        )}

                        {step === 'compare' && (
                            <motion.div
                                key="compare"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="space-y-3"
                            >
                                <p className="text-center text-xs text-gray-500 mb-2">{t('about.demo.ranking.which_better')}</p>
                                <motion.div
                                    className={`p-3 rounded-xl border-2 transition-all ${selectedChoice === 'new' ? 'border-orange-400 bg-orange-50' : 'border-gray-200'
                                        }`}
                                    animate={selectedChoice === 'new' ? { scale: [1, 1.03, 1] } : {}}
                                >
                                    <div className="text-center">
                                        <span className="text-sm font-bold text-gray-900">{demoShop.name}</span>
                                        <p className="text-xs text-gray-400">{t('about.demo.ranking.this_visit')}</p>
                                    </div>
                                </motion.div>
                                <p className="text-center text-[10px] text-gray-300 font-bold">VS</p>
                                <div className={`p-3 rounded-xl border transition-all ${selectedChoice === 'existing' ? 'border-orange-400 bg-orange-50' : 'border-gray-200'
                                    }`}>
                                    <div className="text-center">
                                        <span className="text-sm font-bold text-gray-900">{existingShop.name}</span>
                                        <p className="text-xs text-gray-400">{t('about.demo.ranking.my_rank', { rank: existingShop.rank })}</p>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {step === 'result' && (
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
                                <h4 className="font-bold text-gray-900 mb-1">{demoShop.name}</h4>
                                <p className="text-xs text-gray-500">{t('about.demo.ranking.registered', { category, rank: 2 })}</p>
                                <div className="flex justify-center gap-1 mt-3">
                                    <span className="px-2 py-1 bg-orange-100 text-orange-600 rounded-full text-[10px] font-medium">{t('about.demo.ranking.good')}</span>
                                    <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-[10px] font-medium">{t('about.demo.ranking.top_percent', { percent: 15 })}</span>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </motion.div>

            {/* 리스트 카드 */}
            <motion.div
                initial={{ x: '100%', opacity: 0 }}
                animate={{ x: `${listCardX}%`, opacity: listCardX === 0 ? 1 : 0 }}
                transition={{ duration: 0.4, ease: 'easeInOut' }}
                className="absolute w-full max-w-[280px] bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100 text-left"
            >
                {/* List Header */}
                <div className="p-4 border-b border-gray-100">
                    <h3 className="font-bold text-base text-gray-900">{t('about.demo.ranking.my_ranking', { category })}</h3>
                    <p className="text-xs text-gray-500">{t('about.demo.ranking.n_restaurants', { count: 10 })}</p>
                </div>

                {/* List Items - 고정 높이 내에서 스크롤 */}
                <div className="h-[180px] overflow-hidden">
                    <motion.div
                        className="p-3 space-y-2"
                        animate={{ y: -listScrollY }}
                        transition={{ duration: 1.2, ease: 'easeInOut' }}
                    >
                        {listItems.map((item) => (
                            <div
                                key={item.rank}
                                className={`flex items-center gap-3 p-2 rounded-xl ${item.rank === 2 ? 'bg-orange-50 border border-orange-200' : 'bg-gray-50'
                                    }`}
                            >
                                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${item.rank === 2 ? 'bg-orange-500 text-white' : 'bg-gray-200 text-gray-600'
                                    }`}>
                                    {item.rank}
                                </span>
                                <span className="text-lg">{item.emoji}</span>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
                                    <p className="text-xs text-gray-500">{item.category}</p>
                                </div>
                                {item.rank === 2 && (
                                    <span className="px-1.5 py-0.5 bg-orange-100 text-orange-600 rounded text-[10px] font-medium">NEW</span>
                                )}
                            </div>
                        ))}
                    </motion.div>
                </div>
            </motion.div>
        </div>
    );
};

// ============================================
// 3. MapDemo (AboutScreen 원본 - 전체 너비)
// ============================================
const MapDemo = ({ t }: { t: any }) => {
    const [cardIndex, setCardIndex] = useState(0);
    const [selectedPinId, setSelectedPinId] = useState<number | null>(1);

    const mapContainer = useRef<HTMLDivElement>(null);
    const map = useRef<maptilersdk.Map | null>(null);
    const markersRef = useRef<maptilersdk.Marker[]>([]);

    // 판교 중심 좌표
    const centerLon = 127.1112;
    const centerLat = 37.3947;

    // 핀 데이터 - 실제 좌표 오프셋
    const pins = [
        { id: 0, lon: centerLon - 0.004, lat: centerLat + 0.003, score: 4.2 },
        { id: 1, lon: centerLon, lat: centerLat + 0.001, score: 4.5 },
        { id: 2, lon: centerLon + 0.003, lat: centerLat - 0.001, score: 4.3 },
        { id: 3, lon: centerLon - 0.002, lat: centerLat - 0.002, score: 4.2 },
        { id: 4, lon: centerLon + 0.004, lat: centerLat + 0.002, score: 3.9 },
    ];

    const demoMapShops = t('about.demo.map.shops', { returnObjects: true }) as { name: string; category: string; reviewer: string; cluster: string; review: string }[];

    const shopCards = [
        { name: demoMapShops[0].name, category: demoMapShops[0].category, score: 4.5, emoji: '🍣', pinId: 1, review: { nickname: demoMapShops[0].reviewer, cluster: demoMapShops[0].cluster, text: demoMapShops[0].review } },
        { name: demoMapShops[1].name, category: demoMapShops[1].category, score: 4.3, emoji: '🍜', pinId: 2, review: { nickname: demoMapShops[1].reviewer, cluster: demoMapShops[1].cluster, text: demoMapShops[1].review } },
        { name: demoMapShops[2].name, category: demoMapShops[2].category, score: 4.2, emoji: '🍝', pinId: 3, review: { nickname: demoMapShops[2].reviewer, cluster: demoMapShops[2].cluster, text: demoMapShops[2].review } },
    ];

    // 핀 엘리먼트 생성 (MapContainer 스타일)
    const createPinElement = (pin: typeof pins[0], isSelected: boolean, shopName?: string) => {
        const container = document.createElement('div');
        container.style.width = '0px';
        container.style.height = '0px';
        container.style.position = 'relative';
        container.style.zIndex = isSelected ? '1000' : '100';

        if (isSelected && shopName) {
            // 선택된 핀: Speech Bubble 스타일
            // Pin dot below
            const pinDot = document.createElement('div');
            pinDot.style.position = 'absolute';
            pinDot.style.width = '14px';
            pinDot.style.height = '14px';
            pinDot.style.left = '50%';
            pinDot.style.top = '2px';
            pinDot.style.transform = 'translate(-50%, 0)';
            pinDot.style.backgroundColor = '#FF6B00';
            pinDot.style.borderRadius = '50%';
            pinDot.style.border = '2px solid #FFFFFF';
            pinDot.style.boxShadow = '0 2px 6px rgba(0,0,0,0.3)';
            container.appendChild(pinDot);

            // Speech bubble
            const bubble = document.createElement('div');
            bubble.style.position = 'absolute';
            bubble.style.left = '50%';
            bubble.style.top = '0';
            bubble.style.transform = 'translate(-50%, -100%)';
            bubble.style.backgroundColor = '#FF6B00';
            bubble.style.color = '#FFFFFF';
            bubble.style.padding = '8px 12px';
            bubble.style.borderRadius = '12px';
            bubble.style.fontSize = '13px';
            bubble.style.fontWeight = '600';
            bubble.style.whiteSpace = 'nowrap';
            bubble.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
            bubble.style.marginBottom = '8px';

            // Name + Score
            const displayName = shopName.length > 10 ? shopName.substring(0, 10) + '...' : shopName;
            bubble.innerHTML = `<span>${displayName}</span> <span style="opacity: 0.7;">${pin.score.toFixed(1)}</span>`;

            // Tail
            const tail = document.createElement('div');
            tail.style.position = 'absolute';
            tail.style.left = '50%';
            tail.style.bottom = '-6px';
            tail.style.transform = 'translateX(-50%)';
            tail.style.width = '0';
            tail.style.height = '0';
            tail.style.borderLeft = '6px solid transparent';
            tail.style.borderRight = '6px solid transparent';
            tail.style.borderTop = '6px solid #FF6B00';
            bubble.appendChild(tail);

            container.appendChild(bubble);
        } else {
            // 일반 핀: 원형 마커
            const size = 28;
            const pinCircle = document.createElement('div');
            pinCircle.style.position = 'absolute';
            pinCircle.style.width = `${size}px`;
            pinCircle.style.height = `${size}px`;
            pinCircle.style.left = '50%';
            pinCircle.style.top = '0';
            pinCircle.style.transform = 'translate(-50%, -50%)';
            pinCircle.style.backgroundColor = '#FFFFFF';
            pinCircle.style.borderRadius = '50%';
            pinCircle.style.border = '2px solid #FF6B00';
            pinCircle.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';
            pinCircle.style.display = 'flex';
            pinCircle.style.alignItems = 'center';
            pinCircle.style.justifyContent = 'center';
            pinCircle.innerHTML = `<span style="font-size: 11px; font-weight: 700; color: #FF6B00;">${pin.score.toFixed(1)}</span>`;
            container.appendChild(pinCircle);
        }

        return container;
    };

    // 지도 초기화
    useEffect(() => {
        if (!mapContainer.current || map.current) return;

        maptilersdk.config.apiKey = import.meta.env.VITE_MAPTILER_API_KEY || '';

        map.current = new maptilersdk.Map({
            container: mapContainer.current,
            style: `https://api.maptiler.com/maps/streets-v2/style.json?key=${import.meta.env.VITE_MAPTILER_API_KEY}`,
            center: [centerLon, centerLat],
            zoom: 15,
            dragPan: false,
            dragRotate: false,
            scrollZoom: false,
            touchZoomRotate: false,
            touchPitch: false,
            keyboard: false,
            doubleClickZoom: false,
            navigationControl: false,
            geolocateControl: false,
            attributionControl: false,
        });

        map.current.on('load', () => {
            if (!map.current) return;

            // 핀 마커 생성 (MapContainer 스타일)
            pins.forEach((pin) => {
                const el = createPinElement(pin, false);
                el.setAttribute('data-pin-id', String(pin.id));

                const marker = new maptilersdk.Marker({ element: el, anchor: 'center' })
                    .setLngLat([pin.lon, pin.lat])
                    .addTo(map.current!);

                markersRef.current.push(marker);
            });
        });

        return () => {
            map.current?.remove();
            map.current = null;
            markersRef.current = [];
        };
    }, []);

    // 선택된 핀 스타일 업데이트 (마커 재생성)
    useEffect(() => {
        if (!map.current) return;

        // 기존 마커 제거
        markersRef.current.forEach(marker => marker.remove());
        markersRef.current = [];

        // 마커 재생성
        pins.forEach((pin) => {
            const isSelected = selectedPinId === pin.id;
            const shopCard = shopCards.find(s => s.pinId === pin.id);
            const el = createPinElement(pin, isSelected, shopCard?.name);

            const marker = new maptilersdk.Marker({ element: el, anchor: 'center' })
                .setLngLat([pin.lon, pin.lat])
                .addTo(map.current!);

            markersRef.current.push(marker);
        });
    }, [selectedPinId]);

    // 선택된 핀으로 지도 이동
    const flyToPin = (pinId: number | null) => {
        if (!map.current) return;

        if (pinId === null) {
            map.current.flyTo({
                center: [centerLon, centerLat],
                duration: 600,
                easing: (t) => t * (2 - t)
            });
        } else {
            const pin = pins.find(p => p.id === pinId);
            if (pin) {
                // 카드가 하단을 가리므로 핀을 화면 중앙 아래로 (lat을 낮춰서 지도를 위로 이동)
                map.current.flyTo({
                    center: [pin.lon, pin.lat - 0.0015],
                    duration: 600,
                    easing: (t) => t * (2 - t)
                });
            }
        }
    };

    // 애니메이션 타이머 - 카드/핀 순환만
    useEffect(() => {
        const timers: NodeJS.Timeout[] = [];

        const runAnimation = () => {
            // Reset - 첫 번째 카드/핀으로
            setCardIndex(0);
            setSelectedPinId(1);
            flyToPin(1);

            // Step 1: 두 번째 카드/핀으로
            timers.push(setTimeout(() => {
                setCardIndex(1);
                setSelectedPinId(2);
                flyToPin(2);
            }, 2500));

            // Step 2: 세 번째 카드/핀으로
            timers.push(setTimeout(() => {
                setCardIndex(2);
                setSelectedPinId(3);
                flyToPin(3);
            }, 5000));

            // Restart
            timers.push(setTimeout(runAnimation, 7500));
        };

        // 지도 로드 후 애니메이션 시작
        const startTimeout = setTimeout(runAnimation, 500);
        timers.push(startTimeout);

        return () => timers.forEach(clearTimeout);
    }, []);

    return (
        <div className="w-full h-full relative overflow-hidden pb-8">
            {/* MapTiler SDK 지도 */}
            <div ref={mapContainer} className="absolute inset-x-0 top-0 bottom-8" />

            {/* 샵 카드 - SelectedShopCard 스타일 */}
            <div
                className="absolute bottom-12 left-3 right-3"
                style={{ zIndex: 9999 }}
            >
                <div className="relative bg-white rounded-2xl shadow-xl overflow-hidden text-left">
                    {/* Close Button */}
                    <div className="absolute top-2 right-2 z-10 p-2 bg-black/20 text-white rounded-full">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </div>

                    {/* 썸네일 이미지 */}
                    <div className="h-28 bg-gradient-to-br from-orange-100 to-orange-50 flex items-center justify-center text-5xl relative">
                        <AnimatePresence mode="wait">
                            <motion.span
                                key={cardIndex}
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.8 }}
                                transition={{ duration: 0.2 }}
                            >
                                {shopCards[cardIndex]?.emoji}
                            </motion.span>
                        </AnimatePresence>

                        {/* 예상 평가 뱃지 - 이미지 영역 좌하단 */}
                        <div className="absolute bottom-2 left-2">
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-gray-900 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-full border border-gray-200 shadow-sm">
                                <span className="text-gray-500">{t('about.demo.map.expected_rating')}</span>
                                <span className="text-orange-600">{shopCards[cardIndex]?.score.toFixed(2)}</span>
                            </span>
                        </div>
                    </div>

                    {/* 콘텐츠 영역 */}
                    <div className="p-3">
                        {/* 가게 정보 */}
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={cardIndex}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.25 }}
                            >
                                <h3 className="font-bold text-base text-gray-900 mb-0.5">
                                    {shopCards[cardIndex]?.name}
                                    <span className="text-xs text-gray-400 font-normal ml-2">{shopCards[cardIndex]?.category}</span>
                                </h3>
                                <p className="text-[10px] text-gray-500">{t('about.demo.map.address')}</p>
                            </motion.div>
                        </AnimatePresence>

                    </div>

                    {/* 리뷰 스니펫 - ShopCard 스타일 */}
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={cardIndex}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="bg-gray-50 px-3 py-2 border-t border-gray-100"
                        >
                            <div className="flex items-start gap-2">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-baseline gap-1.5 mb-0.5">
                                        <span className="text-xs font-bold text-gray-900 truncate">
                                            {shopCards[cardIndex]?.review.nickname}
                                        </span>
                                        <span className="text-[10px] font-medium text-orange-500 truncate">
                                            {shopCards[cardIndex]?.review.cluster}
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">
                                        {shopCards[cardIndex]?.review.text}
                                    </p>
                                </div>
                            </div>
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
};

// ============================================
// Slides Configuration
// ============================================
const getSlides = (t: any) => [
    {
        demo: 'quiz',
        title: t('intro.slides.0.title'),
        desc: t('intro.slides.0.desc')
    },
    {
        demo: 'ranking',
        title: t('intro.slides.1.title'),
        desc: t('intro.slides.1.desc')
    },
    {
        demo: 'map',
        title: t('intro.slides.2.title'),
        desc: t('intro.slides.2.desc')
    }
];

// ============================================
// Main Component
// ============================================
export const StartPage = ({ onStart }: { onStart: () => void }) => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [currentSlide, setCurrentSlide] = useState(0);
    const slides = getSlides(t);

    const handleDragEnd = (_event: any, info: any) => {
        const threshold = 50;
        if (info.offset.x < -threshold) {
            if (currentSlide < slides.length - 1) {
                setCurrentSlide(currentSlide + 1);
            }
        } else if (info.offset.x > threshold) {
            if (currentSlide > 0) {
                setCurrentSlide(currentSlide - 1);
            }
        }
    };

    const renderDemo = (demoType: string) => {
        switch (demoType) {
            case 'quiz':
                return <QuizToTasteDemo />;
            case 'ranking':
                return <RankingDemo t={t} />;
            case 'map':
                return <MapDemo t={t} />;
            default:
                return null;
        }
    };

    return (
        <div className="flex flex-col h-full bg-background relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-[-20%] left-[-10%] w-[500px] h-[500px] bg-secondary/20 rounded-full blur-3xl pointer-events-none" />

            <main className="flex-1 flex flex-col items-center justify-center pt-safe-offset-2 pb-safe-offset-2 relative z-10">
                <div className="w-full max-w-md space-y-3 text-center animate-in fade-in slide-in-from-bottom-5 duration-700">
                    {/* Carousel Content */}
                    <div className="flex flex-col items-center justify-start">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={currentSlide}
                                className="flex flex-col items-center w-full cursor-grab active:cursor-grabbing"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.3 }}
                                drag="x"
                                dragConstraints={{ left: 0, right: 0 }}
                                dragElastic={0.2}
                                onDragEnd={handleDragEnd}
                            >
                                {/* Demo Area - 더 크게 */}
                                <div className="w-full h-[420px] mb-4 pointer-events-none select-none">
                                    {renderDemo(slides[currentSlide].demo)}
                                </div>

                                {/* Text Content */}
                                <div className="space-y-2 select-none px-2">
                                    <h2 className="text-2xl font-bold tracking-tight text-foreground pointer-events-none">
                                        {slides[currentSlide].title}
                                    </h2>
                                    <p className="text-muted-foreground text-base leading-relaxed max-w-[300px] mx-auto pointer-events-none">
                                        {slides[currentSlide].desc}
                                    </p>
                                </div>
                            </motion.div>
                        </AnimatePresence>
                    </div>

                    {/* Pagination Dots */}
                    <div className="flex justify-center space-x-2 pt-3">
                        {slides.map((_, index) => (
                            <button
                                key={index}
                                onClick={() => setCurrentSlide(index)}
                                className={cn(
                                    "w-2.5 h-2.5 rounded-full transition-all duration-300",
                                    currentSlide === index ? "bg-primary w-8" : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
                                )}
                            />
                        ))}
                    </div>
                </div>
            </main>

            <footer className="px-4 pt-4 pb-8 relative z-10 w-full max-w-md mx-auto space-y-3">
                <button
                    className="w-full group relative inline-flex h-14 items-center justify-center overflow-hidden rounded-xl bg-primary px-8 font-medium text-primary-foreground shadow-lg transition-all hover:bg-primary/90 active:scale-95"
                    onClick={onStart}
                >
                    <span className="mr-2 text-lg">{t('intro.get_started')}</span>
                    <ChevronRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                </button>

                <p className="text-center text-sm text-muted-foreground">
                    {t('intro.have_account')} <span onClick={() => navigate('/login')} className="text-primary font-semibold cursor-pointer hover:underline">{t('intro.login')}</span>
                </p>
            </footer>
        </div>
    );
};
