import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import { useUser } from '@/context/UserContext';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

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
        // Refresh user profile to get updated taste info
        await refreshUser();
        setIsLoading(false);
        navigate('/main');
    };

    // Same gradient as TasteProfileSheet
    const bgGradient = "bg-[linear-gradient(135deg,_#FDFBF7_0%,_#F5F3FF_100%)]";

    if (!showContent) {
        return (
            <div className="flex items-center justify-center h-full bg-background">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-background items-center justify-center px-8 py-safe-offset-12">
            {/* Card Container with 1:2 aspect ratio - similar to TasteProfileSheet */}
            <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className={`relative w-full max-w-[320px] aspect-[1/2] ${bgGradient} rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col`}
            >
                {/* Content Container */}
                <div className="flex-1 flex flex-col p-8 justify-center items-center text-center">
                    {/* Success Icon */}
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                        className="mb-6"
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
                        className="text-2xl font-bold text-gray-900 mb-6"
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
                        <p className="text-base font-medium text-gray-700 leading-[1.6] px-2">
                            {clusterTagline}
                        </p>
                    </motion.div>
                </div>
            </motion.div>

            {/* Start Button - Outside the card */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="w-full max-w-[320px] mt-8"
            >
                <Button
                    size="lg"
                    className="w-full text-lg py-6 rounded-full shadow-lg shadow-primary/20"
                    onClick={handleStart}
                    disabled={isLoading}
                >
                    {isLoading ? t('common.loading', { defaultValue: '로딩 중...' }) : t('quiz.result.start_app', { defaultValue: '시작하기' })}
                </Button>
            </motion.div>
        </div>
    );
};
