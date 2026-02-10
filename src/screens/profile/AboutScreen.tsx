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
        <div className="flex flex-col h-full bg-background">
            {/* Back Button */}
            <button
                onClick={() => navigate(-1)}
                className="fixed top-4 left-4 z-20 p-2 rounded-full bg-background/80 backdrop-blur-sm border border-border/50 shadow-sm hover:bg-muted"
                style={{ marginTop: Capacitor.isNativePlatform() ? 'env(safe-area-inset-top)' : undefined }}
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
                            <StepCard page={page} />
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
        <div ref={ref} className="w-full min-h-screen relative flex flex-col items-center justify-center overflow-hidden">
            {/* Background */}
            <div className="absolute top-[-10%] left-[-20%] w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-[-20%] right-[-20%] w-[600px] h-[600px] bg-secondary/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 text-center space-y-10 px-12">
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
                >
                    {t('about.outro.title')}
                </motion.h2>
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
                    transition={{ duration: 0.7, delay: 0.3, ease: "easeOut" }}
                    className="pt-8 space-y-2"
                >
                    <p className="text-base font-medium text-foreground">{t('about.footer.company')}</p>
                    <p className="text-sm text-muted-foreground">{t('about.footer.contact')}</p>
                </motion.div>
            </div>
        </div>
    );
};

// 피드 데모 애니메이션 (Share 섹션)
const FeedDemo = () => {
    const [scrollY, setScrollY] = useState(0);
    const [feedCardX, setFeedCardX] = useState(0); // 0: center, -100: left
    const [profileCardX, setProfileCardX] = useState(100); // 100: right, 0: center
    const [clickedUser, setClickedUser] = useState<number | null>(null);

    useEffect(() => {
        const timers: NodeJS.Timeout[] = [];

        const runAnimation = () => {
            // Reset - 피드가 가운데, 스크롤 0
            setScrollY(0);
            setFeedCardX(0);
            setProfileCardX(100);
            setClickedUser(null);

            // Step 1: 잠시 대기 후 천천히 스크롤
            timers.push(setTimeout(() => setScrollY(150), 1200));
            timers.push(setTimeout(() => setScrollY(300), 2400));

            // Step 2: 유저 클릭 애니메이션
            timers.push(setTimeout(() => setClickedUser(1), 3200));

            // Step 3: 피드 왼쪽으로 나감
            timers.push(setTimeout(() => setFeedCardX(-100), 3700));

            // Step 4: 프로필 오른쪽에서 들어옴
            timers.push(setTimeout(() => setProfileCardX(0), 4000));

            // Step 5: 프로필 보여주기 (2.5초)

            // Step 6: 프로필 오른쪽으로 나감
            timers.push(setTimeout(() => setProfileCardX(100), 6500));

            // Step 7: 피드 다시 들어옴 (스크롤 0으로 리셋 먼저)
            timers.push(setTimeout(() => setScrollY(0), 6700));
            timers.push(setTimeout(() => {
                setClickedUser(null);
                setFeedCardX(0);
            }, 6800));

            // Restart (피드 등장 후 1.5초 대기)
            timers.push(setTimeout(runAnimation, 8300));
        };

        runAnimation();
        return () => timers.forEach(clearTimeout);
    }, []);

    const feedItems = [
        {
            user: { name: '미식가_제이', cluster: '화끈한 마라샹궈', image: '😎' },
            shop: '스시 오마카세',
            address: '서울 강남구 압구정로',
            text: '오늘 점심은 여기! 오마카세 코스 정말 만족스러웠어요. 특히 오도로가...',
            likes: 42,
            comments: 8,
            image: '🍣'
        },
        {
            user: { name: '맛집헌터', cluster: '진지한 미식가', image: '🧑‍🍳' },
            shop: '라멘 이치란',
            address: '서울 마포구 홍대입구',
            text: '면발이 정말 쫄깃하고 국물이 진해서 좋았어요. 다음에 또 올 예정!',
            likes: 28,
            comments: 5,
            image: '🍜'
        },
        {
            user: { name: '푸디_린', cluster: '상큼한 탐험가', image: '👩‍🦰' },
            shop: '트라토리아 베네',
            address: '서울 용산구 이태원로',
            text: '파스타 면이 알덴테로 딱 좋았고, 토마토 소스가 신선했어요!',
            likes: 35,
            comments: 12,
            image: '🍝'
        },
    ];

    const clickedUserData = feedItems[1]; // 맛집헌터

    return (
        <div className="w-full h-full flex items-center justify-center px-4 relative overflow-hidden">
            {/* 배경 딤 */}
            <div className="absolute inset-x-0 top-4 bottom-4 bg-gradient-to-b from-gray-100/50 to-gray-200/30" />

            {/* 피드 카드 */}
            <motion.div
                animate={{ x: `${feedCardX}%`, opacity: feedCardX === 0 ? 1 : 0 }}
                transition={{ duration: 0.4, ease: 'easeInOut' }}
                className="absolute w-full max-w-[300px] h-[420px] overflow-hidden rounded-2xl bg-white shadow-xl border border-gray-100"
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
                                className={`flex items-center gap-3 mb-3 rounded-lg p-1 -m-1 ${clickedUser === idx ? 'bg-gray-100' : ''}`}
                                animate={clickedUser === idx ? { scale: [1, 0.97, 1] } : {}}
                                transition={{ duration: 0.2 }}
                            >
                                <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-lg">
                                    {item.user.image}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5">
                                        <span className="font-bold text-sm text-gray-900">{item.user.name}</span>
                                        <span className="text-[10px] text-orange-600 font-medium">{item.user.cluster}</span>
                                    </div>
                                    <p className="text-xs text-gray-500">{item.shop} 방문</p>
                                </div>
                            </motion.div>

                            {/* Image placeholder */}
                            <div className="w-full h-28 rounded-lg bg-gradient-to-br from-orange-50 to-orange-100 flex items-center justify-center text-4xl mb-3">
                                {item.image}
                            </div>

                            {/* Text */}
                            <p className="text-sm text-gray-700 line-clamp-2 mb-3">{item.text}</p>

                            {/* Shop Info Card */}
                            <div className="p-2 rounded-lg bg-gray-50 flex items-center gap-2 mb-3">
                                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-100 to-orange-50 flex items-center justify-center text-lg flex-shrink-0">
                                    {item.image}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-bold text-gray-900 truncate">{item.shop}</p>
                                    <p className="text-[10px] text-gray-500">{item.address}</p>
                                </div>
                                {/* Action Buttons */}
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
            </motion.div>

            {/* 유저 프로필 카드 */}
            <motion.div
                animate={{ x: `${profileCardX}%`, opacity: profileCardX === 0 ? 1 : 0 }}
                transition={{ duration: 0.4, ease: 'easeInOut' }}
                className="absolute w-full max-w-[300px] h-[420px] bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100"
            >
                {/* Profile Header */}
                <div className="p-5">
                    <div className="flex items-start gap-4 mb-4">
                        <div className="flex-1">
                            <h3 className="font-bold text-lg text-gray-900 mb-1">{clickedUserData.user.name}</h3>
                            <div className="flex gap-3 text-xs text-gray-500 mb-2">
                                <span><b className="text-gray-900">24</b> 콘텐츠</span>
                                <span><b className="text-gray-900">128</b> 팔로워</span>
                            </div>
                            <p className="text-sm text-gray-600 mb-3">맛집 탐방이 취미인 직장인입니다 🍜</p>
                        </div>
                        <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center text-2xl flex-shrink-0">
                            {clickedUserData.user.image}
                        </div>
                    </div>

                    {/* Taste Cluster */}
                    <div className="p-3 rounded-xl bg-gradient-to-r from-orange-50 to-pink-50 mb-4">
                        <p className="font-bold text-sm text-gray-900">{clickedUserData.user.cluster}</p>
                        <p className="text-xs text-gray-500">깊은 풍미와 묵직한 질감을 선호해요</p>
                    </div>

                    {/* Match Score */}
                    <div className="flex items-center justify-between p-3 bg-pink-50 rounded-xl">
                        <span className="text-sm text-pink-600 font-medium">나와의 미식 매칭</span>
                        <span className="text-xl font-black text-pink-600">87%</span>
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
            </motion.div>
        </div>
    );
};

// TasteProfile 미니 카드 데이터 (from cluster.json)
const tasteProfiles = [
    { name: '화끈한 마라샹궈', tagline: '입안이 얼얼할 정도로 맵고 묵직하며 강렬한 타격감을 주는 이색 요리를 즐깁니다.' },
    { name: '고독한 평양냉면', tagline: '슴슴함 속에 은은하게 느껴지는 감칠맛만을 즐기는 미식가입니다.' },
    { name: '달콤한 탕후루', tagline: '강렬한 단맛과 독특한 식감을 가진 트렌디한 간식을 찾아다닙니다.' },
    { name: '상큼한 탐험가', tagline: '산미와 감칠맛이 어우러진 새롭고 실험적인 메뉴를 즐깁니다.' },
    { name: '진지한 미식가', tagline: '깊은 풍미와 묵직한 질감, 감칠맛이 어우러진 요리를 선호합니다.' },
];

// 랭킹 플로우 데모 애니메이션
const RankingDemo = () => {
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

    const demoShop = { name: '스시 오마카세', category: '일식' };
    const existingShop = { name: '라멘 이치란', rank: 3 };

    // 미니 리스트 데이터
    const listItems = [
        { rank: 1, name: '라멘 이치란', category: '일식', emoji: '🍜' },
        { rank: 2, name: '스시 오마카세', category: '일식', emoji: '🍣' },
        { rank: 3, name: '우동 카덴', category: '일식', emoji: '🍲' },
        { rank: 4, name: '돈카츠 마이센', category: '일식', emoji: '🍱' },
        { rank: 5, name: '야키토리 토리키', category: '일식', emoji: '🍢' },
        { rank: 6, name: '소바 명가', category: '일식', emoji: '🍜' },
        { rank: 7, name: '규카츠 모토무라', category: '일식', emoji: '🥩' },
        { rank: 8, name: '텐동 텐야', category: '일식', emoji: '🍤' },
        { rank: 9, name: '이자카야 하나', category: '일식', emoji: '🍶' },
        { rank: 10, name: '카레 코코이치', category: '일식', emoji: '🍛' },
    ];

    return (
        <div className="w-full h-full flex items-center justify-center px-4 relative overflow-hidden">
            {/* 배경 딤 영역 */}
            <div className="absolute inset-x-0 top-4 bottom-4 bg-gradient-to-b from-gray-100/50 to-gray-200/30" />

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
                                <p className="text-center text-xs text-gray-500 mb-3">어떠셨나요?</p>
                                {[
                                    { icon: Smile, label: '맛있어요', color: 'text-orange-500', bg: 'bg-orange-50 border-orange-200' },
                                    { icon: Meh, label: '괜찮아요', color: 'text-yellow-500', bg: 'bg-yellow-50 border-yellow-200' },
                                    { icon: Frown, label: '별로예요', color: 'text-gray-400', bg: 'bg-gray-50 border-gray-200' },
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
                                <p className="text-center text-xs text-gray-500 mb-2">어디가 더 맛있었나요?</p>
                                <motion.div
                                    className={`p-3 rounded-xl border-2 transition-all ${selectedChoice === 'new' ? 'border-orange-400 bg-orange-50' : 'border-gray-200'
                                        }`}
                                    animate={selectedChoice === 'new' ? { scale: [1, 1.03, 1] } : {}}
                                >
                                    <div className="text-center">
                                        <span className="text-sm font-bold text-gray-900">{demoShop.name}</span>
                                        <p className="text-xs text-gray-400">이번에 간 곳</p>
                                    </div>
                                </motion.div>
                                <p className="text-center text-[10px] text-gray-300 font-bold">VS</p>
                                <div className={`p-3 rounded-xl border transition-all ${selectedChoice === 'existing' ? 'border-orange-400 bg-orange-50' : 'border-gray-200'
                                    }`}>
                                    <div className="text-center">
                                        <span className="text-sm font-bold text-gray-900">{existingShop.name}</span>
                                        <p className="text-xs text-gray-400">내 {existingShop.rank}위</p>
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
                                <p className="text-xs text-gray-500">나의 일식 2위에 등록!</p>
                                <div className="flex justify-center gap-1 mt-3">
                                    <span className="px-2 py-1 bg-orange-100 text-orange-600 rounded-full text-[10px] font-medium">맛있어요</span>
                                    <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-[10px] font-medium">상위 15%</span>
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
                    <h3 className="font-bold text-base text-gray-900">나의 일식 랭킹</h3>
                    <p className="text-xs text-gray-500">10개의 맛집</p>
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
const FlowingTasteCards = () => {
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
const MapDemo = () => {
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

    const shopCards = [
        {
            name: '스시 오마카세',
            category: '일식',
            score: 4.5,
            emoji: '🍣',
            pinId: 1,
            review: { nickname: '미식가김철수', cluster: '감칠맛 러버', text: '신선한 재료와 장인의 손길이 느껴지는 곳. 특히 우니가 일품!' }
        },
        {
            name: '라멘 이치란',
            category: '일식',
            score: 4.3,
            emoji: '🍜',
            pinId: 2,
            review: { nickname: '라멘덕후', cluster: '진한맛 탐험가', text: '진한 돈코츠 육수가 끝내줍니다. 면발도 딱 좋아요.' }
        },
        {
            name: '트라토리아 베네',
            category: '이탈리안',
            score: 4.2,
            emoji: '🍝',
            pinId: 3,
            review: { nickname: '파스타매니아', cluster: '산뜻한 맛 추구', text: '정통 이탈리안 파스타를 맛볼 수 있는 숨은 맛집!' }
        },
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
                                <span className="text-gray-500">예상 평가</span>
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
                                <p className="text-xs text-gray-500 mb-3">서울 성남시 분당구 판교역로</p>
                            </motion.div>
                        </AnimatePresence>

                        {/* 액션 버튼 */}
                        <div className="flex gap-2">
                            <button className="flex-1 h-11 rounded-xl border border-gray-200 bg-white text-gray-700 font-bold flex items-center justify-center gap-1.5 text-sm">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                길찾기
                            </button>
                            <button className="flex-1 h-11 rounded-xl bg-gray-100 text-gray-700 font-bold flex items-center justify-center gap-1.5 text-sm">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                                </svg>
                                평가하기
                            </button>
                            <button className="flex-1 h-11 rounded-xl border border-gray-200 bg-white text-gray-700 font-bold flex items-center justify-center gap-1.5 text-sm">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                                </svg>
                                저장
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

interface StepCardProps {
    page: any;
}

const StepCard = ({ page }: StepCardProps) => {
    const ref = useRef<HTMLDivElement>(null);
    const isInView = useInView(ref, { once: false, margin: "-20%" });

    const renderDemoArea = () => {
        if (page.id === 'discover') {
            return <FlowingTasteCards />;
        }
        if (page.id === 'rank') {
            return <RankingDemo />;
        }
        if (page.id === 'share') {
            return <FeedDemo />;
        }
        if (page.id === 'find') {
            return <MapDemo />;
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
            {/* Title */}
            <div className="px-10 pb-4">
                <motion.h2
                    initial={{ opacity: 0, y: 40 }}
                    animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
                    transition={{ duration: 0.6, delay: 0, ease: "easeOut" }}
                    className="text-4xl font-bold text-foreground leading-tight text-left whitespace-pre-line"
                >
                    {page.title}
                </motion.h2>
            </div>

            {/* Demo Area - 이미지 영역 (섹션별 높이 다름) */}
            <motion.div
                initial={{ opacity: 0, y: 50 }}
                animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
                transition={{ duration: 0.7, delay: 0.15, ease: "easeOut" }}
                className={`flex items-center justify-center ${page.id === 'rank' ? 'h-[420px]' :
                    page.id === 'share' ? 'h-[540px]' :
                        page.id === 'find' ? 'h-[480px]' :
                            page.id === 'discover' ? 'h-72' :
                                page.id === 'why' ? 'h-48' :
                                    'h-64'
                    }`}
            >
                {renderDemoArea()}
            </motion.div>

            {/* Description */}
            <div className="px-10 pt-4">
                <motion.div
                    initial={{ opacity: 0, y: 40 }}
                    animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
                    transition={{ duration: 0.6, delay: 0.3, ease: "easeOut" }}
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
