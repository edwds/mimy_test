import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import { useUser } from '@/context/UserContext';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Capacitor } from '@capacitor/core';
import { requestPhotoLibraryPermission } from '@/utils/photoLocationUtils';

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

    // Fallback if accessed directly without state
    const clusterName = result?.clusterData?.cluster_name || t('quiz.result.flavor_unknown');
    const clusterTagline = result?.clusterData?.cluster_tagline || t('quiz.result.tagline_default');

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
        navigate('/relay');
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

                        {/* Cluster Name */}
                        <motion.h1
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4 }}
                            className="text-3xl font-bold text-gray-900 mb-6"
                        >
                            {clusterName}
                        </motion.h1>

                        {/* Divider */}
                        <div className="w-full h-px bg-gray-300/50 my-4" />

                        {/* Tagline */}
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.5 }}
                            className="flex-1 flex items-center"
                        >
                            <p className="text-base font-medium text-gray-700 leading-[1.6]">
                                {clusterTagline}
                            </p>
                        </motion.div>
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
