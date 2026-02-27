import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { OnboardingService } from '@/services/OnboardingService';
import { useOnboarding } from '@/context/OnboardingContext';

const LOADING_MESSAGES = [
    '입맛 데이터를 분석하고 있어요...',
    '평가한 맛집 패턴을 살펴보는 중...',
    'AI가 입맛 프로필을 작성 중...',
    '거의 다 됐어요!',
];

export const TasteAnalysis = () => {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const { setAnalysisResult } = useOnboarding();
    const [messageIndex, setMessageIndex] = useState(0);
    const [error, setError] = useState(false);
    const calledRef = useRef(false);

    useEffect(() => {
        const interval = setInterval(() => {
            setMessageIndex(prev => (prev + 1) % LOADING_MESSAGES.length);
        }, 3000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (calledRef.current) return;
        calledRef.current = true;

        const analyze = async () => {
            try {
                const result = await OnboardingService.generateTasteAnalysis();
                setAnalysisResult(
                    result.analysis,
                    result.shareCode,
                    result.tasteType,
                    result.tasteProfile,
                );
                navigate('/onboarding/share', { replace: true });
            } catch (err) {
                console.error('Taste analysis failed:', err);
                setError(true);
            }
        };

        analyze();
    }, []);

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-full px-6 gap-4">
                <span className="text-4xl">😢</span>
                <p className="text-center text-muted-foreground">
                    {t('onboarding.analysis.error', { defaultValue: '분석에 실패했어요. 다시 시도해주세요.' })}
                </p>
                <button
                    onClick={() => {
                        setError(false);
                        calledRef.current = false;
                    }}
                    className="text-primary font-medium"
                >
                    {t('common.retry', { defaultValue: '다시 시도' })}
                </button>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center h-full px-6">
            {/* Animated plate */}
            <motion.div
                animate={{
                    rotate: [0, 10, -10, 5, -5, 0],
                    scale: [1, 1.05, 0.95, 1.02, 0.98, 1],
                }}
                transition={{
                    duration: 4,
                    repeat: Infinity,
                    ease: "easeInOut",
                }}
                className="mb-10"
            >
                <div className="w-24 h-24 bg-gradient-to-br from-violet-100 to-amber-50 rounded-full flex items-center justify-center shadow-lg">
                    <span className="text-5xl">🍽️</span>
                </div>
            </motion.div>

            {/* Spinner */}
            <Loader2 className="w-8 h-8 text-primary animate-spin mb-6" />

            {/* Loading message */}
            <motion.p
                key={messageIndex}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="text-center text-muted-foreground text-sm"
            >
                {t(`onboarding.analysis.loading_${messageIndex}`, { defaultValue: LOADING_MESSAGES[messageIndex] })}
            </motion.p>

            {/* Progress dots */}
            <div className="flex gap-2 mt-6">
                {LOADING_MESSAGES.map((_, i) => (
                    <motion.div
                        key={i}
                        className={`w-2 h-2 rounded-full ${i <= messageIndex ? 'bg-primary' : 'bg-muted'}`}
                        animate={{ scale: i === messageIndex ? 1.3 : 1 }}
                    />
                ))}
            </div>
        </div>
    );
};
