import { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Capacitor } from '@capacitor/core';
import { ChevronLeft, Smile, Meh, Frown } from 'lucide-react';
import { motion, useScroll, useTransform, useInView, AnimatePresence } from 'framer-motion';
import * as maptilersdk from '@maptiler/sdk';
import "@maptiler/sdk/dist/maptiler-sdk.css";

export const AboutScreen = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const containerRef = useRef<HTMLDivElement>(null);

    // iOS 스테이터스바 탭 시 스크롤 탑
    const scrollToTop = () => {
        containerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const pages = [
        {
            type: 'intro' as const,
        },
        {
            type: 'step' as const,
            id: 'why',
            title: t('about.why.title'),
            description: t('about.why.description'),
        },
        {
            type: 'step' as const,
            id: 'discover',
            title: t('about.steps.discover.title'),
            description: t('about.steps.discover.description'),
        },
        {
            type: 'step' as const,
            id: 'rank',
            title: t('about.steps.rank.title'),
            description: t('about.steps.rank.description'),
        },
        {
            type: 'step' as const,
            id: 'share',
            title: t('about.steps.share.title'),
            description: t('about.steps.share.description'),
        },
        {
            type: 'step' as const,
            id: 'find',
            title: t('about.steps.find.title'),
            description: t('about.steps.find.description'),
        },
        {
            type: 'step' as const,
            id: 'compete',
            title: t('about.steps.compete.title'),
            description: t('about.steps.compete.description'),
        },
        {
            type: 'outro' as const,
        }
    ];

    return (
        <div className="flex flex-col h-full bg-background relative">
            {/* iOS Status Bar Tap Area - 스테이터스바 탭 시 스크롤 탑 */}
            {Capacitor.isNativePlatform() && (
                <div
                    onClick={scrollToTop}
                    className="absolute top-0 left-0 right-0 z-50"
                    style={{ height: 'env(safe-area-inset-top)' }}
                />
            )}

            {/* Back Button - absolute로 프레임 내부에 위치 */}
            <button
                onClick={() => navigate(-1)}
                className="absolute z-20 p-2 rounded-full bg-background/80 backdrop-blur-sm border border-border/50 shadow-sm hover:bg-muted"
                style={{
                    top: Capacitor.isNativePlatform() ? 'calc(env(safe-area-inset-top) + 16px)' : '16px',
                    left: '16px'
                }}
            >
                <ChevronLeft className="w-6 h-6" />
            </button>

            {/* Scroll Container */}
            <div
                ref={containerRef}
                className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-hide"
            >
                {pages.map((page, index) => (
                    <ScrollSection
                        key={index}
                        containerRef={containerRef}
                    >
                        {page.type === 'intro' ? (
                            <IntroPage t={t} />
                        ) : page.type === 'outro' ? (
                            <OutroPage t={t} />
                        ) : (
                            <StepCard page={page} t={t} />
                        )}
                    </ScrollSection>
                ))}
            </div>
        </div>
    );
};

// 스크롤 기반 디졸브 섹션
interface ScrollSectionProps {
    children: React.ReactNode;
    containerRef: React.RefObject<HTMLDivElement | null>;
}

const ScrollSection = ({ children, containerRef }: ScrollSectionProps) => {
    const sectionRef = useRef<HTMLDivElement>(null);

    const { scrollYProgress } = useScroll({
        container: containerRef,
        target: sectionRef,
        offset: ["start end", "end start"]
    });

    // 섹션이 뷰포트에 들어올 때 fade in, 나갈 때 fade out
    const opacity = useTransform(
        scrollYProgress,
        [0, 0.25, 0.75, 1],
        [0, 1, 1, 0]
    );

    const y = useTransform(
        scrollYProgress,
        [0, 0.25, 0.75, 1],
        [80, 0, 0, -40]
    );

    return (
        <div
            ref={sectionRef}
            className="min-h-screen flex items-center justify-center"
        >
            <motion.div
                style={{ opacity, y }}
                className="w-full h-full"
            >
                {children}
            </motion.div>
        </div>
    );
};

interface PageProps {
    t: any;
}

const IntroPage = ({ t }: PageProps) => {
    const ref = useRef<HTMLDivElement>(null);
    const isInView = useInView(ref, { once: false, margin: "-10%" });

    return (
        <div ref={ref} className="w-full min-h-screen relative flex flex-col items-center justify-center overflow-hidden">
            {/* Background */}
            <div className="absolute top-[-20%] right-[-20%] w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-[-10%] left-[-20%] w-[500px] h-[500px] bg-secondary/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 text-center space-y-8 px-12">
                <motion.h1
                    initial={{ opacity: 0, y: 30 }}
                    animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
                    transition={{ duration: 0.7, delay: 0, ease: "easeOut" }}
                    className="text-7xl font-bold text-foreground tracking-tight"
                >
                    mimy
                </motion.h1>
                <motion.p
                    initial={{ opacity: 0, y: 30 }}
                    animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
                    transition={{ duration: 0.7, delay: 0.15, ease: "easeOut" }}
                    className="text-3xl text-primary font-semibold tracking-tight"
                >
                    {t('about.hero.tagline')}
                </motion.p>
                <motion.p
                    initial={{ opacity: 0, y: 30 }}
                    animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
                    transition={{ duration: 0.7, delay: 0.3, ease: "easeOut" }}
                    className="text-muted-foreground max-w-md mx-auto leading-relaxed text-xl"
                >
                    {t('about.hero.description')}
                </motion.p>
            </div>

            {/* Scroll hint */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={isInView ? { opacity: 1 } : { opacity: 0 }}
                transition={{ delay: 0.8, duration: 0.5 }}
                className="absolute bottom-16 left-1/2 -translate-x-1/2"
            >
                <motion.svg
                    animate={{ y: [0, 10, 0] }}
                    transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                    className="w-7 h-7 text-muted-foreground/30"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </motion.svg>
            </motion.div>
        </div>
    );
};

const OutroPage = ({ t }: PageProps) => {
    const ref = useRef<HTMLDivElement>(null);
    const isInView = useInView(ref, { once: false, margin: "-20%" });

    return (
        <div ref={ref} className="w-full min-h-screen relative flex flex-col overflow-hidden">
            {/* Background */}
            <div className="absolute top-[-10%] left-[-20%] w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-[-20%] right-[-20%] w-[600px] h-[600px] bg-secondary/10 rounded-full blur-3xl pointer-events-none" />

            {/* Main Content - 중앙 정렬 */}
            <div className="flex-1 flex items-center justify-center">
                <div className="relative z-10 text-center space-y-6 px-12">
                    <motion.p
                        initial={{ opacity: 0, y: 30 }}
                        animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
                        transition={{ duration: 0.7, delay: 0, ease: "easeOut" }}
                        className="text-2xl text-muted-foreground"
                    >
                        {t('about.outro.subtitle')}
                    </motion.p>
                    <motion.h2
                        initial={{ opacity: 0, y: 30 }}
                        animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
                        transition={{ duration: 0.7, delay: 0.15, ease: "easeOut" }}
                        className="text-5xl font-bold text-foreground leading-tight tracking-tight"
                        style={{ whiteSpace: 'pre-line' }}
                    >
                        {t('about.outro.title')}
                    </motion.h2>
                </div>
            </div>

            {/* Footer */}
            <motion.footer
                initial={{ opacity: 0 }}
                animate={isInView ? { opacity: 1 } : { opacity: 0 }}
                transition={{ duration: 0.7, delay: 0.4, ease: "easeOut" }}
                className="relative z-10 pb-8 px-8"
                style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 32px)' }}
            >
                <div className="border-t border-border/30 pt-6 flex items-center justify-center gap-2 text-sm text-muted-foreground">
                    <span className="font-semibold text-foreground">{t('about.footer.company')}</span>
                    <span className="text-muted-foreground/30">|</span>
                    <span>{t('about.footer.contact')}</span>
                    <span className="text-muted-foreground/30">|</span>
                    <span className="text-xs text-muted-foreground/60">© 2025</span>
                </div>
            </motion.footer>
        </div>
    );
};

// 피드 데모 애니메이션 (Share 섹션) - 카드 플립 버전
const FeedDemo = ({ t }: { t: any }) => {
    const [scrollY, setScrollY] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);
    const [clickedUser, setClickedUser] = useState<number | null>(null);
    const [highlightMatch, setHighlightMatch] = useState(false);

    useEffect(() => {
        const timers: NodeJS.Timeout[] = [];

        const runAnimation = () => {
            // Reset
            setScrollY(0);
            setIsFlipped(false);
            setClickedUser(null);
            setHighlightMatch(false);

            // Step 1: 부드러운 스크롤 애니메이션 (단일 스크롤)
            timers.push(setTimeout(() => setScrollY(300), 1000));

            // Step 2: 유저 클릭 하이라이트
            timers.push(setTimeout(() => setClickedUser(1), 2500));

            // Step 3: 카드 플립
            timers.push(setTimeout(() => setIsFlipped(true), 3300));

            // Step 4: 매칭 스코어 강조
            timers.push(setTimeout(() => setHighlightMatch(true), 4200));
            timers.push(setTimeout(() => setHighlightMatch(false), 5000));

            // Step 5: 다시 플립해서 돌아가기
            timers.push(setTimeout(() => {
                setIsFlipped(false);
                setClickedUser(null);
            }, 5800));

            // Step 6: 스크롤 리셋
            timers.push(setTimeout(() => setScrollY(0), 6300));

            // Restart
            timers.push(setTimeout(runAnimation, 7800));
        };

        runAnimation();
        return () => timers.forEach(clearTimeout);
    }, []);

    const demoUsers = t('about.demo.feed.users', { returnObjects: true }) as { name: string; cluster: string }[];
    const demoShops = t('about.demo.feed.shops', { returnObjects: true }) as { name: string; address: string; review: string }[];

    const feedItems = [
        { user: { ...demoUsers[0], image: '😎' }, shop: demoShops[0].name, address: demoShops[0].address, text: demoShops[0].review, likes: 42, comments: 8, images: ['🍣', '🍱', '🍵'] },
        { user: { ...demoUsers[1], image: '🧑‍🍳' }, shop: demoShops[1].name, address: demoShops[1].address, text: demoShops[1].review, likes: 28, comments: 5, images: ['🍜', '🥟', '🍶'] },
        { user: { ...demoUsers[2], image: '👩‍🦰' }, shop: demoShops[2].name, address: demoShops[2].address, text: demoShops[2].review, likes: 35, comments: 12, images: ['🍝', '🍕', '🥗'] },
    ];

    const clickedUserData = feedItems[1];

    return (
        <div className="w-full h-full flex items-center justify-center px-4 relative overflow-hidden">
            {/* 배경 딤 */}
            <div className="absolute inset-x-0 top-0 bottom-0 bg-gradient-to-b from-gray-100/50 to-gray-200/30" />

            {/* 플립 카드 컨테이너 */}
            <div
                className="relative w-full max-w-[300px] h-[420px]"
                style={{ perspective: '1000px' }}
            >
                <motion.div
                    className="relative w-full h-full"
                    animate={{ rotateY: isFlipped ? 180 : 0 }}
                    transition={{ duration: 0.6, ease: 'easeInOut' }}
                    style={{ transformStyle: 'preserve-3d' }}
                >
                    {/* 앞면 - 피드 카드 */}
                    <div
                        className="absolute inset-0 w-full h-full rounded-2xl bg-white shadow-xl border border-gray-100 overflow-hidden"
                        style={{ backfaceVisibility: 'hidden' }}
                    >
                        <motion.div
                            className="space-y-0"
                            animate={{ y: -scrollY }}
                            transition={{ duration: 1.2, ease: 'easeInOut' }}
                        >
                            {feedItems.map((item, idx) => (
                                <div key={idx} className="p-4 border-b border-gray-100">
                                    {/* Header */}
                                    <motion.div
                                        className={`flex items-center gap-3 mb-3 rounded-lg p-1 -m-1 transition-colors ${clickedUser === idx ? 'bg-orange-100' : ''}`}
                                        animate={clickedUser === idx ? { scale: [1, 0.95, 1] } : {}}
                                        transition={{ duration: 0.3 }}
                                    >
                                        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-lg transition-all ${clickedUser === idx ? 'bg-orange-200' : 'bg-gray-100'}`}>
                                            {item.user.image}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-1.5">
                                                <span className="font-bold text-sm text-gray-900">{item.user.name}</span>
                                                <span className="text-[10px] text-orange-600 font-medium">{item.user.cluster}</span>
                                            </div>
                                            <p className="text-xs text-gray-500">{item.shop} {t('about.demo.feed.visited')}</p>
                                        </div>
                                    </motion.div>

                                    {/* Image Carousel */}
                                    <div className="overflow-hidden mb-3 -mx-4">
                                        <div className="flex gap-2 px-4">
                                            {item.images.map((emoji, imgIdx) => (
                                                <div
                                                    key={imgIdx}
                                                    className="w-36 h-36 flex-shrink-0 rounded-xl bg-gradient-to-br from-orange-50 to-orange-100 flex items-center justify-center text-5xl"
                                                >
                                                    {emoji}
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Text */}
                                    <p className="text-sm text-gray-700 line-clamp-2 mb-3">{item.text}</p>

                                    {/* Shop Info Card */}
                                    <div className="p-2 rounded-lg bg-gray-50 flex items-center gap-2 mb-3">
                                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-100 to-orange-50 flex items-center justify-center text-lg flex-shrink-0">
                                            {item.images[0]}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-bold text-gray-900 truncate">{item.shop}</p>
                                            <p className="text-[10px] text-gray-500">{item.address}</p>
                                        </div>
                                        <div className="flex items-center gap-0.5 flex-shrink-0">
                                            <div className="p-1 text-gray-400">
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                    <circle cx="12" cy="12" r="10" />
                                                    <path d="M12 8v8M8 12h8" />
                                                </svg>
                                            </div>
                                            <div className="p-1 text-gray-400">
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                                                </svg>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Stats */}
                                    <div className="flex items-center gap-3 text-xs text-gray-500">
                                        <span className="flex items-center gap-1">❤️ {item.likes}</span>
                                        <span className="flex items-center gap-1">💬 {item.comments}</span>
                                    </div>
                                </div>
                            ))}
                        </motion.div>
                    </div>

                    {/* 뒷면 - 유저 프로필 카드 */}
                    <div
                        className="absolute inset-0 w-full h-full rounded-2xl bg-white shadow-xl border border-gray-100 overflow-hidden"
                        style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
                    >
                        {/* Profile Header */}
                        <div className="p-5">
                            <div className="flex items-start gap-4 mb-4">
                                <div className="flex-1">
                                    <h3 className="font-bold text-lg text-gray-900 mb-1">{clickedUserData.user.name}</h3>
                                    <div className="flex gap-3 text-xs text-gray-500 mb-2">
                                        <span><b className="text-gray-900">24</b> {t('about.demo.feed.contents')}</span>
                                        <span><b className="text-gray-900">128</b> {t('about.demo.feed.followers')}</span>
                                    </div>
                                    <p className="text-sm text-gray-600 mb-3">{t('about.demo.feed.bio')}</p>
                                </div>
                                <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center text-2xl flex-shrink-0">
                                    {clickedUserData.user.image}
                                </div>
                            </div>

                            {/* Taste Cluster */}
                            <div className="p-3 rounded-xl bg-gradient-to-r from-orange-50 to-pink-50 mb-2">
                                <p className="font-bold text-sm text-gray-900">{clickedUserData.user.cluster}</p>
                                <p className="text-xs text-gray-500">{t('about.demo.feed.cluster_desc')}</p>
                            </div>

                            {/* Match Score - 강조 애니메이션 */}
                            <div className="flex items-center justify-between p-3 rounded-xl bg-pink-50">
                                <span className="text-sm text-pink-600 font-medium">{t('about.demo.feed.taste_match')}</span>
                                <motion.span
                                    className="text-xl font-black text-pink-600"
                                    animate={{
                                        scale: highlightMatch ? [1, 1.2, 1] : 1
                                    }}
                                    transition={{ duration: 0.4 }}
                                >
                                    87%
                                </motion.span>
                            </div>
                        </div>

                        {/* Mini Content Preview */}
                        <div className="border-t border-gray-100 p-3">
                            <div className="grid grid-cols-3 gap-1">
                                {['🍜', '🍣', '🥩'].map((emoji, i) => (
                                    <div key={i} className="aspect-square rounded-lg bg-gradient-to-br from-orange-50 to-orange-100 flex items-center justify-center text-2xl">
                                        {emoji}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

// 랭킹 플로우 데모 애니메이션
const RankingDemo = ({ t }: { t: any }) => {
    const [step, setStep] = useState<'satisfaction' | 'compare' | 'result' | 'list'>('satisfaction');
    const [selectedSatisfaction, setSelectedSatisfaction] = useState<number | null>(null);
    const [selectedChoice, setSelectedChoice] = useState<'new' | 'existing' | null>(null);
    const [rankingCardX, setRankingCardX] = useState(0); // 0: center, -100: left exit
    const [listCardX, setListCardX] = useState(100); // 100: right (hidden), 0: center
    const [listScrollY, setListScrollY] = useState(0);
    const [isFirstRender, setIsFirstRender] = useState(true);

    useEffect(() => {
        const timers: NodeJS.Timeout[] = [];

        const runAnimation = () => {
            // Reset
            setStep('satisfaction');
            setSelectedSatisfaction(null);
            setSelectedChoice(null);
            setRankingCardX(isFirstRender ? 0 : -100); // 처음에는 가운데, 이후에는 왼쪽에서 시작
            setListCardX(100);
            setListScrollY(0);

            // 왼쪽에서 들어오기 (처음 제외)
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
            {/* 배경 딤 영역 */}
            <div className="absolute inset-x-0 top-0 bottom-0 bg-gradient-to-b from-gray-100/50 to-gray-200/30" />

            {/* 랭킹 오버레이 카드 */}
            <motion.div
                animate={{ x: `${rankingCardX}%`, opacity: rankingCardX === 0 ? 1 : 0 }}
                transition={{ duration: 0.4, ease: 'easeInOut' }}
                className="absolute w-full max-w-[280px] bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100"
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
                animate={{ x: `${listCardX}%`, opacity: listCardX === 0 ? 1 : 0 }}
                transition={{ duration: 0.4, ease: 'easeInOut' }}
                className="absolute w-full max-w-[280px] bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100"
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

// 흐르는 TasteProfile 카드들
const FlowingTasteCards = ({ t }: { t: any }) => {
    const tasteProfiles = t('about.demo.taste_profiles', { returnObjects: true }) as { name: string; tagline: string }[];

    return (
        <div className="w-full h-full overflow-hidden relative">
            {/* 좌우 fade 효과 */}
            <div className="absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
            <div className="absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />

            <motion.div
                className="flex gap-4 items-center h-full"
                animate={{ x: [0, -600] }}
                transition={{
                    x: {
                        repeat: Infinity,
                        repeatType: "loop",
                        duration: 15,
                        ease: "linear",
                    },
                }}
            >
                {/* 카드들을 2번 반복해서 무한 루프처럼 보이게 */}
                {[...tasteProfiles, ...tasteProfiles].map((profile, i) => (
                    <div
                        key={i}
                        className="shrink-0 w-44 h-56 rounded-2xl shadow-lg flex flex-col items-center justify-center p-5 text-center"
                        style={{
                            background: 'linear-gradient(135deg, #FDFBF7 0%, #F5F3FF 100%)',
                        }}
                    >
                        <span className="text-base font-bold text-gray-900 mb-2">{profile.name}</span>
                        <span className="text-sm text-gray-600 leading-relaxed">{profile.tagline}</span>
                    </div>
                ))}
            </motion.div>
        </div>
    );
};

// 지도 + 샵카드 스와이프 데모 (Find 섹션)
const MapDemo = ({ t }: { t: any }) => {
    const [cardIndex, setCardIndex] = useState(0);
    const [selectedPinId, setSelectedPinId] = useState<number | null>(null);
    const [cardY, setCardY] = useState(100); // 100: 아래에 숨김, 0: 보임

    const mapContainer = useRef<HTMLDivElement>(null);
    const map = useRef<maptilersdk.Map | null>(null);
    const markersRef = useRef<maptilersdk.Marker[]>([]);

    // 판교 중심 좌표
    const centerLon = 127.1112;
    const centerLat = 37.3947;

    // 핀 데이터 - 실제 좌표 오프셋
    const pins = [
        { id: 0, lon: centerLon - 0.004, lat: centerLat + 0.003, score: 4.2 },
        { id: 1, lon: centerLon, lat: centerLat + 0.001, score: 4.5 },           // 첫 번째 카드
        { id: 2, lon: centerLon + 0.003, lat: centerLat - 0.001, score: 4.3 },   // 두 번째 카드
        { id: 3, lon: centerLon - 0.002, lat: centerLat - 0.002, score: 4.2 },   // 세 번째 카드
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
                // 카드가 하단을 가리므로 핀을 화면 상단 25% 위치로 (lat을 낮춰서 지도를 위로 이동)
                map.current.flyTo({
                    center: [pin.lon, pin.lat - 0.0025],
                    duration: 600,
                    easing: (t) => t * (2 - t)
                });
            }
        }
    };

    // 애니메이션 타이머
    useEffect(() => {
        const timers: NodeJS.Timeout[] = [];

        const runAnimation = () => {
            // Reset
            setCardIndex(0);
            setSelectedPinId(null);
            setCardY(100);
            flyToPin(null);

            // Step 1: 첫 번째 핀 선택 + 지도 이동
            timers.push(setTimeout(() => {
                setSelectedPinId(1);
                flyToPin(1);
            }, 1200));

            // Step 2: 카드 올라오기
            timers.push(setTimeout(() => setCardY(0), 1700));

            // Step 3: 두 번째 카드로 페이지네이션 + 지도 이동
            timers.push(setTimeout(() => {
                setCardIndex(1);
                setSelectedPinId(2);
                flyToPin(2);
            }, 3200));

            // Step 4: 세 번째 카드로 페이지네이션 + 지도 이동
            timers.push(setTimeout(() => {
                setCardIndex(2);
                setSelectedPinId(3);
                flyToPin(3);
            }, 4700));

            // Step 5: 카드 내리기 + 지도 원위치
            timers.push(setTimeout(() => {
                setCardY(100);
            }, 6200));

            timers.push(setTimeout(() => {
                setSelectedPinId(null);
                flyToPin(null);
            }, 6500));

            // Restart
            timers.push(setTimeout(runAnimation, 7800));
        };

        // 지도 로드 후 애니메이션 시작
        const startTimeout = setTimeout(runAnimation, 500);
        timers.push(startTimeout);

        return () => timers.forEach(clearTimeout);
    }, []);

    return (
        <div className="w-full h-full relative overflow-hidden">
            {/* MapTiler SDK 지도 */}
            <div ref={mapContainer} className="absolute inset-0" />

            {/* 샵 카드 - SelectedShopCard 스타일 */}
            <motion.div
                animate={{ y: `${cardY}%`, opacity: cardY === 0 ? 1 : 0 }}
                transition={{ duration: 0.4, ease: 'easeInOut' }}
                className="absolute bottom-6 left-4 right-4"
                style={{ zIndex: 9999 }}
            >
                <div className="relative bg-white rounded-2xl shadow-xl overflow-hidden">
                    {/* Close Button */}
                    <div className="absolute top-2 right-2 z-10 p-2 bg-black/20 text-white rounded-full">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </div>

                    {/* 썸네일 이미지 */}
                    <div className="h-32 bg-gradient-to-br from-orange-100 to-orange-50 flex items-center justify-center text-5xl relative">
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
                        <div className="absolute bottom-3 left-3">
                            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-900 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-full border border-gray-200 shadow-sm">
                                <span className="text-gray-500">{t('about.demo.map.expected_rating')}</span>
                                <span className="text-orange-600">{shopCards[cardIndex]?.score.toFixed(2)}</span>
                            </span>
                        </div>
                    </div>

                    {/* 콘텐츠 영역 */}
                    <div className="p-4">
                        {/* 가게 정보 */}
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={cardIndex}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.25 }}
                            >
                                <h3 className="font-bold text-lg text-gray-900 mb-0.5">
                                    {shopCards[cardIndex]?.name}
                                    <span className="text-sm text-gray-400 font-normal ml-2">{shopCards[cardIndex]?.category}</span>
                                </h3>
                                <p className="text-xs text-gray-500 mb-3">{t('about.demo.map.address')}</p>
                            </motion.div>
                        </AnimatePresence>

                        {/* 액션 버튼 */}
                        <div className="flex gap-2">
                            <button className="flex-1 h-11 rounded-xl border border-gray-200 bg-white text-gray-700 font-bold flex items-center justify-center gap-1.5 text-sm">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                {t('about.demo.map.directions')}
                            </button>
                            <button className="flex-1 h-11 rounded-xl bg-gray-100 text-gray-700 font-bold flex items-center justify-center gap-1.5 text-sm">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                                </svg>
                                {t('about.demo.map.rate')}
                            </button>
                            <button className="flex-1 h-11 rounded-xl border border-gray-200 bg-white text-gray-700 font-bold flex items-center justify-center gap-1.5 text-sm">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                                </svg>
                                {t('about.demo.map.save')}
                            </button>
                        </div>
                    </div>

                    {/* 리뷰 스니펫 - ShopCard 스타일 */}
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={cardIndex}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="bg-gray-50 px-4 py-3 border-t border-gray-100"
                        >
                            <div className="flex items-start gap-2">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-baseline gap-1.5 mb-0.5">
                                        <span className="text-xs font-bold text-gray-900 truncate">
                                            {shopCards[cardIndex]?.review.nickname}
                                        </span>
                                        <span className="text-xs font-medium text-orange-500 truncate">
                                            {shopCards[cardIndex]?.review.cluster}
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-600 line-clamp-2 leading-relaxed">
                                        {shopCards[cardIndex]?.review.text}
                                    </p>
                                </div>
                            </div>
                        </motion.div>
                    </AnimatePresence>
                </div>
            </motion.div>
        </div>
    );
};

// 리더보드 데모 (Compete 섹션)
const LeaderboardDemo = ({ t }: { t: any }) => {
    const ref = useRef<HTMLDivElement>(null);
    const isInView = useInView(ref, { once: false, amount: 0.3 });

    const [filter, setFilter] = useState<'company' | 'neighborhood' | 'overall'>('company');
    const hasStartedRef = useRef(false);
    const hasBeenMountedRef = useRef(false);

    const demoCompanyUsers = t('about.demo.leaderboard.company_users', { returnObjects: true }) as { nickname: string; cluster: string }[];
    const demoNeighborhoodUsers = t('about.demo.leaderboard.neighborhood_users', { returnObjects: true }) as { nickname: string; cluster: string }[];
    const demoOverallUsers = t('about.demo.leaderboard.overall_users', { returnObjects: true }) as { nickname: string; cluster: string }[];

    // 데모 유저 데이터 (4명)
    const companyUsers = demoCompanyUsers.map((u, i) => ({ rank: i + 1, ...u, score: [847, 823, 798, 756][i] }));
    const neighborhoodUsers = demoNeighborhoodUsers.map((u, i) => ({ rank: i + 1, ...u, score: [912, 876, 834, 789][i] }));

    const overallUsers = demoOverallUsers.map((u, i) => ({ rank: i + 1, ...u, score: [1247, 1189, 1134, 1098][i] }));

    const users = filter === 'company' ? companyUsers : filter === 'neighborhood' ? neighborhoodUsers : overallUsers;

    // 마운트 후 짧은 지연을 두어 초기 로드와 실제 스크롤을 구분
    useEffect(() => {
        const timer = setTimeout(() => {
            hasBeenMountedRef.current = true;
        }, 300);
        return () => clearTimeout(timer);
    }, []);

    // 애니메이션 타이머 - 화면에 보일 때만 실행
    useEffect(() => {
        if (!isInView) {
            // 화면에서 벗어나면 초기 상태로 리셋
            setFilter('company');
            hasStartedRef.current = false;
            return;
        }

        // 마운트 직후에는 시작하지 않음 (초기 로드 방지)
        if (!hasBeenMountedRef.current) return;

        // 이미 시작했으면 중복 실행 방지
        if (hasStartedRef.current) return;
        hasStartedRef.current = true;

        const timers: NodeJS.Timeout[] = [];

        const runAnimation = () => {
            setFilter('company');

            // Step 1: 동네 탭으로 전환
            timers.push(setTimeout(() => {
                setFilter('neighborhood');
            }, 2000));

            // Step 2: 전체 탭으로 전환
            timers.push(setTimeout(() => {
                setFilter('overall');
            }, 4000));

            // Step 3: 회사 탭으로 돌아오기
            timers.push(setTimeout(() => {
                setFilter('company');
            }, 6000));

            // Restart
            timers.push(setTimeout(runAnimation, 8000));
        };

        const startTimeout = setTimeout(runAnimation, 500);
        timers.push(startTimeout);

        return () => timers.forEach(clearTimeout);
    }, [isInView]);

    const getRankStyle = (rank: number) => {
        switch (rank) {
            case 1: return { bg: 'bg-[#FFFBEB]', text: 'text-yellow-600', border: 'border-yellow-400' };
            case 2: return { bg: 'bg-[#F9FAFB]', text: 'text-gray-500', border: 'border-gray-300' };
            case 3: return { bg: 'bg-[#FFF7ED]', text: 'text-orange-600', border: 'border-orange-300' };
            default: return { bg: 'bg-white', text: 'text-gray-600', border: 'border-transparent' };
        }
    };

    return (
        <div ref={ref} className="w-full h-full flex items-center justify-center px-4 relative overflow-hidden">
            {/* 배경 딤 영역 */}
            <div className="absolute inset-x-0 top-4 bottom-4 bg-gradient-to-b from-gray-100/50 to-gray-200/30" />

            {/* 리더보드 카드 */}
            <motion.div
                animate={{ opacity: 1 }}
                className="absolute w-full max-w-[300px] h-[420px] bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100 flex flex-col"
            >
                {/* 헤더 */}
                <div className="px-4 pt-5 pb-3">
                    <h2 className="text-lg font-bold text-gray-900">{t('about.demo.leaderboard.title')}</h2>
                </div>

                {/* 필터 칩 */}
                <div className="px-4 pb-4">
                    <div className="flex gap-2">
                        <button
                            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${filter === 'company'
                                ? 'bg-gray-900 text-white'
                                : 'bg-gray-100 text-gray-600'
                                }`}
                        >
                            {t('about.demo.leaderboard.filters.company')}
                        </button>
                        <button
                            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${filter === 'neighborhood'
                                ? 'bg-gray-900 text-white'
                                : 'bg-gray-100 text-gray-600'
                                }`}
                        >
                            {t('about.demo.leaderboard.filters.neighborhood')}
                        </button>
                        <button
                            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${filter === 'overall'
                                ? 'bg-gray-900 text-white'
                                : 'bg-gray-100 text-gray-600'
                                }`}
                        >
                            {t('about.demo.leaderboard.filters.overall')}
                        </button>
                    </div>
                </div>

                {/* 리더보드 리스트 */}
                <div className="flex-1 overflow-hidden px-4 pb-5">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={filter}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.25 }}
                            className="space-y-2.5"
                        >
                            {users.map((user) => {
                                const style = getRankStyle(user.rank);
                                return (
                                    <div
                                        key={user.rank}
                                        className={`flex items-center gap-3 p-3 rounded-xl ${style.bg}`}
                                    >
                                        {/* 순위 */}
                                        <div className="w-6 flex justify-center">
                                            <span className={`font-black text-base ${style.text}`}>
                                                {user.rank}
                                            </span>
                                        </div>

                                        {/* 프로필 이미지 */}
                                        <div className={`w-9 h-9 rounded-full border-2 ${style.border} bg-gray-200 flex items-center justify-center flex-shrink-0`}>
                                            <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                            </svg>
                                        </div>

                                        {/* 정보 */}
                                        <div className="flex-1 min-w-0">
                                            <span className="font-bold text-sm text-gray-900 truncate block">
                                                {user.nickname}
                                            </span>
                                            <span className="text-[10px] text-orange-500">
                                                {user.cluster}
                                            </span>
                                        </div>

                                        {/* 점수 */}
                                        <span className={`font-black text-base ${style.text}`}>
                                            {user.score}
                                        </span>
                                    </div>
                                );
                            })}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </motion.div>
        </div>
    );
};

interface StepCardProps {
    page: any;
    t: any;
}

const StepCard = ({ page, t }: StepCardProps) => {
    const ref = useRef<HTMLDivElement>(null);
    const isInView = useInView(ref, { once: false, margin: "-20%" });

    const renderDemoArea = () => {
        if (page.id === 'why') {
            return (
                <div className="w-full h-full flex items-center justify-center">
                    <div className="flex gap-4 text-6xl">
                        <span>⭐</span>
                        <span>🍽️</span>
                        <span>🤔</span>
                    </div>
                </div>
            );
        }
        if (page.id === 'discover') {
            return <FlowingTasteCards t={t} />;
        }
        if (page.id === 'rank') {
            return <RankingDemo t={t} />;
        }
        if (page.id === 'share') {
            return <FeedDemo t={t} />;
        }
        if (page.id === 'find') {
            return <MapDemo t={t} />;
        }
        if (page.id === 'compete') {
            return <LeaderboardDemo t={t} />;
        }

        return (
            <div className="w-full h-full flex items-center justify-center px-6">
                <div className="w-full h-full rounded-3xl bg-muted/20 flex items-center justify-center">
                    <span className="text-muted-foreground/40 text-sm">Image</span>
                </div>
            </div>
        );
    };

    return (
        <div
            ref={ref}
            className="w-full min-h-screen flex flex-col"
            style={{ paddingTop: 'calc(env(safe-area-inset-top) + 80px)', paddingBottom: '24px' }}
        >
            {/* Why 섹션: 이미지가 타이틀 위에 */}
            {page.id === 'why' && (
                <motion.div
                    initial={{ opacity: 0, y: 50 }}
                    animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
                    transition={{ duration: 0.7, delay: 0, ease: "easeOut" }}
                    className="flex items-center justify-center h-32 mb-4"
                >
                    {renderDemoArea()}
                </motion.div>
            )}

            {/* Title */}
            <div className="px-10 pb-8">
                <motion.h2
                    initial={{ opacity: 0, y: 40 }}
                    animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
                    transition={{ duration: 0.6, delay: page.id === 'why' ? 0.15 : 0, ease: "easeOut" }}
                    className="text-4xl font-bold text-foreground leading-tight text-left whitespace-pre-line"
                >
                    {page.title}
                </motion.h2>
            </div>

            {/* Demo Area - 이미지 영역 (섹션별 높이 다름, why 제외) */}
            {page.id !== 'why' && (
                <motion.div
                    initial={{ opacity: 0, y: 50 }}
                    animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
                    transition={{ duration: 0.7, delay: 0.15, ease: "easeOut" }}
                    className={`flex items-center justify-center ${page.id === 'rank' ? 'h-[420px]' :
                        page.id === 'share' ? 'h-[540px]' :
                            page.id === 'find' ? 'h-[480px]' :
                                page.id === 'discover' ? 'h-72' :
                                    'h-[520px]'
                        }`}
                >
                    {renderDemoArea()}
                </motion.div>
            )}

            {/* Description */}
            <div className="px-10 pt-8">
                <motion.div
                    initial={{ opacity: 0, y: 40 }}
                    animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
                    transition={{ duration: 0.6, delay: page.id === 'why' ? 0.3 : 0.3, ease: "easeOut" }}
                    className="text-base text-muted-foreground leading-relaxed text-left"
                >
                    {page.description?.split('\n\n').map((paragraph: string, i: number) => (
                        <p key={i} className={i > 0 ? 'mt-3' : ''} style={{ whiteSpace: 'pre-line' }}>
                            {paragraph}
                        </p>
                    ))}
                </motion.div>
            </div>
        </div>
    );
};
