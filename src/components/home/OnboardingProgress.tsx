import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '@/context/UserContext';
import { useTranslation } from 'react-i18next';
import { User, Brain, Trophy, PenLine, Crown, Bookmark, Medal, PartyPopper, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface MilestoneContext {
    user: any;
    savedShopCount: number;
}

interface Milestone {
    key: string;
    icon: React.ElementType;
    labelKey: string;
    route: string;
    isComplete: (ctx: MilestoneContext) => boolean;
    getProgress?: (ctx: MilestoneContext) => { current: number; target: number };
}

const milestones: Milestone[] = [
    {
        key: 'profile',
        icon: User,
        labelKey: 'home.onboarding.profile',
        route: '/profile/edit',
        isComplete: ({ user }) => !!(user?.nickname && user?.profile_image),
    },
    {
        key: 'quiz',
        icon: Brain,
        labelKey: 'home.onboarding.quiz',
        route: '/quiz',
        isComplete: ({ user }) => !!user?.taste_result,
    },
    {
        key: 'ranking20',
        icon: Trophy,
        labelKey: 'home.onboarding.ranking20',
        route: '/main/ranking',
        isComplete: ({ user }) => (user?.stats?.ranking_count ?? 0) >= 20,
        getProgress: ({ user }) => ({
            current: Math.min(user?.stats?.ranking_count ?? 0, 20),
            target: 20,
        }),
    },
    {
        key: 'content5',
        icon: PenLine,
        labelKey: 'home.onboarding.content5',
        route: '/write',
        isComplete: ({ user }) => (user?.stats?.content_count ?? 0) >= 5,
        getProgress: ({ user }) => ({
            current: Math.min(user?.stats?.content_count ?? 0, 5),
            target: 5,
        }),
    },
    {
        key: 'save10',
        icon: Bookmark,
        labelKey: 'home.onboarding.save10',
        route: '/main/discover',
        isComplete: ({ savedShopCount }) => savedShopCount >= 10,
        getProgress: ({ savedShopCount }) => ({
            current: Math.min(savedShopCount, 10),
            target: 10,
        }),
    },
    {
        key: 'leaderboard',
        icon: Medal,
        labelKey: 'home.onboarding.leaderboard',
        route: '/profile/group',
        isComplete: ({ user }) => !!(user?.group_name || user?.neighborhood),
    },
    {
        key: 'ranking100',
        icon: Crown,
        labelKey: 'home.onboarding.ranking100',
        route: '/main/ranking',
        isComplete: ({ user }) => (user?.stats?.ranking_count ?? 0) >= 100,
        getProgress: ({ user }) => ({
            current: Math.min(user?.stats?.ranking_count ?? 0, 100),
            target: 100,
        }),
    },
];

const DISMISS_KEY = 'onboarding_complete_dismissed';

export const OnboardingProgress: React.FC = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { user, savedShops } = useUser();
    const [dismissed, setDismissed] = useState(() => localStorage.getItem(DISMISS_KEY) === 'true');

    if (!user) return null;

    const ctx: MilestoneContext = { user, savedShopCount: savedShops?.length ?? 0 };
    const completedCount = milestones.filter((m) => m.isComplete(ctx)).length;
    const allComplete = completedCount === milestones.length;

    // Default to first incomplete milestone
    const defaultIndex = milestones.findIndex((m) => !m.isComplete(ctx));
    const [viewIndex, setViewIndex] = useState(defaultIndex >= 0 ? defaultIndex : 0);
    const [direction, setDirection] = useState(0); // -1 = left, 1 = right
    if (dismissed) return null;

    if (allComplete) {
        return <CompletionCard completedCount={completedCount} onDismiss={() => {
            localStorage.setItem(DISMISS_KEY, 'true');
            setDismissed(true);
        }} />;
    }

    const viewing = milestones[viewIndex];
    const isComplete = viewing.isComplete(ctx);
    const progress = viewing.getProgress?.(ctx);
    const Icon = viewing.icon;

    const goTo = (index: number) => {
        if (index < 0 || index >= milestones.length) return;
        setDirection(index > viewIndex ? 1 : -1);
        setViewIndex(index);
    };

    return (
        <div className="px-5 py-4 mb-2">
            <div className="bg-card border border-border rounded-2xl px-5 py-5">
                {/* Segment progress bar — tappable */}
                <div className="flex gap-1 mb-4">
                    {milestones.map((m, i) => {
                        const complete = m.isComplete(ctx);
                        const isViewing = i === viewIndex;
                        return (
                            <button
                                key={m.key}
                                className="flex-1 h-1.5 rounded-full overflow-hidden bg-muted"
                                onClick={() => goTo(i)}
                            >
                                <motion.div
                                    className={`h-full rounded-full ${
                                        complete
                                            ? 'bg-primary'
                                            : isViewing
                                              ? 'bg-primary/40'
                                              : ''
                                    }`}
                                    initial={false}
                                    animate={{ width: complete || isViewing ? '100%' : '0%' }}
                                    transition={{ duration: 0.4, ease: 'easeOut' }}
                                />
                            </button>
                        );
                    })}
                </div>

                <AnimatePresence mode="wait" custom={direction}>
                    <motion.div
                        key={viewing.key}
                        custom={direction}
                        initial={{ x: direction * 20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: direction * -20, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                    >
                        {/* Header: icon + nav arrows + counter */}
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                    isComplete ? 'bg-primary' : 'bg-primary/10'
                                }`}>
                                    {isComplete ? (
                                        <Check size={20} className="text-primary-foreground" />
                                    ) : (
                                        <Icon size={20} className="text-primary" />
                                    )}
                                </div>
                                {isComplete && (
                                    <span className="text-xs text-primary font-medium">
                                        {t('common.done')}
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => goTo(viewIndex - 1)}
                                    disabled={viewIndex === 0}
                                    className="w-7 h-7 flex items-center justify-center rounded-full text-muted-foreground disabled:opacity-30 active:bg-muted transition-colors"
                                >
                                    <ChevronLeft size={16} />
                                </button>
                                <span className="text-xs text-muted-foreground tabular-nums w-8 text-center">
                                    {viewIndex + 1}/{milestones.length}
                                </span>
                                <button
                                    onClick={() => goTo(viewIndex + 1)}
                                    disabled={viewIndex === milestones.length - 1}
                                    className="w-7 h-7 flex items-center justify-center rounded-full text-muted-foreground disabled:opacity-30 active:bg-muted transition-colors"
                                >
                                    <ChevronRight size={16} />
                                </button>
                            </div>
                        </div>

                        {/* Title */}
                        <h3 className="text-lg font-bold text-foreground mb-1">
                            {t(`home.onboarding_cta.${viewing.key}.title`)}
                        </h3>

                        {/* Subtitle */}
                        <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                            {t(`home.onboarding_cta.${viewing.key}.subtitle`)}
                        </p>

                        {/* Progress bar (for milestones with progress, not yet complete) */}
                        {progress && !isComplete && (
                            <div className="mb-4">
                                <div className="flex items-center justify-between mb-1.5">
                                    <span className="text-xs text-muted-foreground">
                                        {progress.current}/{progress.target}
                                    </span>
                                </div>
                                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                                    <motion.div
                                        className="h-full bg-primary rounded-full"
                                        initial={{ width: 0 }}
                                        animate={{ width: `${(progress.current / progress.target) * 100}%` }}
                                        transition={{ duration: 0.6, ease: 'easeOut' }}
                                    />
                                </div>
                            </div>
                        )}

                        {/* CTA Button */}
                        {!isComplete && (
                            <button
                                onClick={() => navigate(viewing.route)}
                                className="w-full py-3 bg-primary text-primary-foreground font-semibold text-sm rounded-xl active:scale-[0.98] transition-all"
                            >
                                {t(`home.onboarding_cta.${viewing.key}.cta`)}
                            </button>
                        )}
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    );
};

const CompletionCard: React.FC<{ completedCount: number; onDismiss: () => void }> = ({ completedCount, onDismiss }) => {
    const { t } = useTranslation();

    useEffect(() => {
        const timer = setTimeout(onDismiss, 5000);
        return () => clearTimeout(timer);
    }, [onDismiss]);

    return (
        <div className="px-5 py-4 mb-2">
            <motion.div
                className="bg-card border border-border rounded-2xl px-5 py-5"
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.3 }}
            >
                <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <PartyPopper size={20} className="text-primary" />
                    </div>
                    <span className="text-xs text-muted-foreground">
                        {completedCount}/{milestones.length}
                    </span>
                </div>
                <h3 className="text-lg font-bold text-foreground mb-1">
                    {t('home.onboarding_cta.complete.title')}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                    {t('home.onboarding_cta.complete.subtitle')}
                </p>
            </motion.div>
        </div>
    );
};
