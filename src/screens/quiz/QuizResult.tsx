import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import { useUser } from '@/context/UserContext';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Capacitor } from '@capacitor/core';
import { requestPhotoLibraryPermission } from '@/utils/photoLocationUtils';
import { getTasteType, getTasteTypeProfile, TASTE_TYPE_LABELS } from '@/lib/tasteType';
import { HelpCircle, ChevronsUp, ChevronUp, Minus, ChevronDown, ChevronsDown } from 'lucide-react';
import { cn } from '@/lib/utils';

const TASTE_AXES = [
    { key: 'boldness', emoji: '🔥' },
    { key: 'acidity', emoji: '🍋' },
    { key: 'richness', emoji: '🧈' },
    { key: 'experimental', emoji: '🧪' },
    { key: 'spiciness', emoji: '🌶️' },
    { key: 'sweetness', emoji: '🍬' },
    { key: 'umami', emoji: '🍜' },
] as const;

const getArrowIcon = (value: number) => {
    if (value >= 2) return { Icon: ChevronsUp, color: 'text-violet-500' };
    if (value >= 1) return { Icon: ChevronUp, color: 'text-violet-400' };
    if (value <= -2) return { Icon: ChevronsDown, color: 'text-amber-500' };
    if (value <= -1) return { Icon: ChevronDown, color: 'text-amber-400' };
    return { Icon: Minus, color: 'text-gray-300' };
};

export const QuizResult = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { t } = useTranslation();
    const { refreshUser } = useUser();
    const [isLoading, setIsLoading] = useState(false);
    const [showContent, setShowContent] = useState(false);

    // Result from backend: { clusterId, clusterData: { cluster_name, cluster_tagline, ... }, scores }
    const { result } = location.state || {};

    console.log('[QuizResult] location.state:', location.state);
    console.log('[QuizResult] result:', result);

    // Get 32-type MBTI-style taste type
    const tasteType = getTasteType(result);
    const tasteProfile = tasteType ? getTasteTypeProfile(tasteType, 'ko') : null;
    const tasteProfileEn = tasteType ? getTasteTypeProfile(tasteType, 'en') : null;

    // Use taste type profile name/tagline if available, fallback to cluster data
    const typeName = tasteProfile?.name || result?.clusterData?.cluster_name || t('quiz.result.flavor_unknown');
    const typeNameEn = tasteProfileEn?.name || '';
    const typeTagline = tasteProfile?.tagline || result?.clusterData?.cluster_tagline || t('quiz.result.tagline_default');

    useEffect(() => {
        // Show content after a brief delay to ensure proper rendering
        const timer = setTimeout(() => setShowContent(true), 100);
        return () => clearTimeout(timer);
    }, []);

    // If no result data, redirect back
    useEffect(() => {
        if (!result && showContent) {
            console.warn('[QuizResult] No result data found, redirecting...');
            navigate('/main', { replace: true });
        }
    }, [result, showContent, navigate]);

    const handleStart = async () => {
        setIsLoading(true);

        // Request photo library permission on iOS (non-blocking)
        if (Capacitor.isNativePlatform()) {
            try {
                console.log('[QuizResult] Requesting photo library permission');
                await requestPhotoLibraryPermission();
            } catch (error) {
                console.error('[QuizResult] Failed to request photo permission:', error);
                // Don't block user from proceeding even if permission fails
            }
        }

        // Refresh user profile to get updated taste info
        await refreshUser();
        setIsLoading(false);
        navigate('/main');
    };

    const handleStartRelay = async () => {
        setIsLoading(true);

        // Request photo library permission on iOS (non-blocking)
        if (Capacitor.isNativePlatform()) {
            try {
                await requestPhotoLibraryPermission();
            } catch (error) {
                console.error('[QuizResult] Failed to request photo permission:', error);
            }
        }

        await refreshUser();
        setIsLoading(false);
        navigate('/onboarding/import-intro');
    };

    // Same gradient as TasteProfileSheet
    // const bgGradient = "bg-[linear-gradient(135deg,_#FDFBF7_0%,_#F5F3FF_100%)]";

    if (!showContent) {
        return (
            <div className="flex flex-col h-full bg-background pt-safe-offset-6 pb-safe-offset-6">
                {/* Header */}
                <div className="px-6 pb-4">
                    <div className="flex items-center justify-between">
                        <span className="text-lg font-bold text-muted-foreground">
                            분석 중...
                        </span>
                    </div>
                </div>

                {/* Loading Card */}
                <main className="flex-1 flex flex-col items-center justify-center px-6 relative">
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 0.3, ease: "easeOut" }}
                        className="relative w-full max-w-md border border-border rounded-3xl shadow-2xl overflow-hidden"
                        style={{
                            height: 'min(calc(200vw * 4/3), 500px)',
                            background: 'linear-gradient(135deg, #FDFBF7 0%, #F5F3FF 100%)'
                        }}
                    >
                        <div className="p-10 flex flex-col items-center justify-center h-full space-y-6">
                            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary"></div>
                        </div>
                    </motion.div>
                </main>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-background pt-safe-offset-6 pb-safe-offset-6">
            {/* Header */}
            <div className="px-6 pb-4">
                <div className="flex items-center justify-between">
                    <span className="text-lg font-bold text-muted-foreground">
                        분석 완료
                    </span>
                </div>
            </div>

            {/* Result Card */}
            <main className="flex-1 flex flex-col items-center justify-center px-6 relative">
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                    className="relative w-full max-w-md border border-border rounded-3xl shadow-2xl overflow-hidden"
                    style={{
                        height: 'min(calc(200vw * 4/3), 500px)',
                        background: 'linear-gradient(135deg, #FDFBF7 0%, #F5F3FF 100%)'
                    }}
                >
                    {/* Content Container */}
                    <div className="flex-1 flex flex-col p-10 justify-center items-center text-center h-full">
                        {/* Success Icon */}
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                            className="mb-8"
                        >
                            <div className="w-24 h-24 bg-white/80 rounded-full flex items-center justify-center shadow-lg backdrop-blur-md">
                                <span className="text-5xl">🍽️</span>
                            </div>
                        </motion.div>

                        {/* Title */}
                        <motion.p
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            className="text-sm text-gray-600 mb-3 font-medium"
                        >
                            {t('quiz.result.title', { defaultValue: '당신의 입맛은' })}
                        </motion.p>

                        {/* Taste Type Code */}
                        {tasteType && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 0.35, type: "spring", stiffness: 200 }}
                                className="mb-3"
                            >
                                <span className="text-4xl font-black tracking-[0.2em] text-primary">
                                    {tasteType.fullType}
                                </span>
                            </motion.div>
                        )}

                        {/* Type Code Breakdown */}
                        {tasteType && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.4 }}
                                className="mb-4 flex items-center justify-center gap-1 whitespace-nowrap"
                            >
                                {/* Intensity */}
                                <span className={cn(
                                    "px-1.5 py-0.5 rounded-full text-[11px] font-medium shrink-0",
                                    tasteType.axes.intensity === 'H' ? "bg-violet-100 text-violet-700" : "bg-violet-50 text-violet-600"
                                )}>
                                    {tasteType.axes.intensity} {TASTE_TYPE_LABELS.intensity[tasteType.axes.intensity].ko}
                                </span>
                                                                {/* Flavor */}
                                <span className={cn(
                                    "px-1.5 py-0.5 rounded-full text-[11px] font-medium shrink-0",
                                    tasteType.axes.flavor === 'A' ? "bg-amber-100 text-amber-700" : "bg-amber-50 text-amber-600"
                                )}>
                                    {tasteType.axes.flavor} {TASTE_TYPE_LABELS.flavor[tasteType.axes.flavor].ko}
                                </span>
                                                                {/* Pleasure */}
                                <span className={cn(
                                    "px-1.5 py-0.5 rounded-full text-[11px] font-medium shrink-0",
                                    tasteType.axes.pleasure === 'S' ? "bg-emerald-100 text-emerald-700" : "bg-emerald-50 text-emerald-600"
                                )}>
                                    {tasteType.axes.pleasure} {TASTE_TYPE_LABELS.pleasure[tasteType.axes.pleasure].ko}
                                </span>
                                                                {/* Exploration */}
                                <span className={cn(
                                    "px-1.5 py-0.5 rounded-full text-[11px] font-medium shrink-0",
                                    tasteType.axes.exploration === 'P' ? "bg-sky-100 text-sky-700" : "bg-sky-50 text-sky-600"
                                )}>
                                    {tasteType.axes.exploration} {TASTE_TYPE_LABELS.exploration[tasteType.axes.exploration].ko}
                                </span>
                                <span className="text-gray-400 text-[11px]">-</span>
                                {/* Subtype */}
                                <span className="text-[11px] font-medium text-gray-500 shrink-0">
                                    {tasteType.subtype} {TASTE_TYPE_LABELS.subtype[tasteType.subtype].ko}
                                </span>
                            </motion.div>
                        )}

                        {/* Divider */}
                        <div className="w-full h-px bg-gray-300/50 mt-3 mb-5" />

                        {/* Type Name */}
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.45 }}
                        >
                            <div className="flex items-center justify-center gap-1">
                                <h1 className="text-2xl font-bold text-gray-900">
                                    {typeName}
                                </h1>
                                <button
                                    onClick={() => navigate('/profile/taste-guide')}
                                    className="p-1 rounded-full hover:bg-white/50 transition-colors"
                                >
                                    <HelpCircle className="w-5 h-5 text-muted-foreground" />
                                </button>
                            </div>
                            {typeNameEn && (
                                <p className="text-xs text-gray-400 mt-0.5">{typeNameEn}</p>
                            )}
                        </motion.div>

                        {/* Tagline */}
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.5 }}
                            className="mt-1"
                        >
                            <p className="text-sm font-medium text-gray-600 leading-[1.7]">
                                {typeTagline}
                            </p>
                        </motion.div>

                        {/* 7-Axis Taste Scores */}
                        {result?.scores && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.55 }}
                                className="mt-5 flex items-center justify-center gap-3"
                            >
                                {TASTE_AXES.map(({ key, emoji }) => {
                                    const value = result.scores[key] ?? 0;
                                    const { Icon: ArrowIcon, color } = getArrowIcon(value);
                                    return (
                                        <div key={key} className="flex flex-col items-center gap-0.5">
                                            <span className="text-base leading-none">{emoji}</span>
                                            <ArrowIcon className={cn("w-3.5 h-3.5", color)} />
                                        </div>
                                    );
                                })}
                            </motion.div>
                        )}
                    </div>
                </motion.div>

                {/* Action Buttons */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                    className="w-full max-w-md mt-8 space-y-3"
                >
                    <Button
                        size="lg"
                        className="w-full text-lg py-6 rounded-full shadow-lg shadow-primary/20"
                        onClick={handleStartRelay}
                        disabled={isLoading}
                    >
                        {isLoading ? t('common.loading', { defaultValue: '로딩 중...' }) : t('quiz.result.start_relay', { defaultValue: '맛집 기록 시작하기' })}
                    </Button>
                    <Button
                        size="lg"
                        variant="outline"
                        className="w-full text-lg py-6 rounded-full"
                        onClick={handleStart}
                        disabled={isLoading}
                    >
                        {t('quiz.result.skip_relay', { defaultValue: '나중에 하기' })}
                    </Button>
                </motion.div>
            </main>
        </div>
    );
};
