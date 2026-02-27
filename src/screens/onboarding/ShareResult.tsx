import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Share2, Check, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { Share as CapacitorShare } from '@capacitor/share';
import { useOnboarding } from '@/context/OnboardingContext';
import { WEB_BASE_URL } from '@/lib/api';
import { cn } from '@/lib/utils';

const slideVariants = {
    enter: { opacity: 0, x: 50 },
    center: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -50 },
};

export const ShareResult = () => {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const { analysis, shareCode, tasteType, tasteProfile, reset } = useOnboarding();
    const [currentStep, setCurrentStep] = useState(0);
    const [showCopied, setShowCopied] = useState(false);

    if (!analysis || !shareCode) {
        navigate('/onboarding/analysis', { replace: true });
        return null;
    }

    const shareUrl = `${WEB_BASE_URL}/taste/${shareCode}`;
    const typeCode = tasteType?.fullType || '';

    const handleShare = async () => {
        const title = tasteProfile?.name || '나의 입맛 분석';
        const text = `${analysis.summary}\n\n나의 입맛 유형: ${tasteType?.fullType} ${tasteProfile?.name}`;

        if (Capacitor.isNativePlatform()) {
            try {
                await CapacitorShare.share({
                    title,
                    text,
                    url: shareUrl,
                    dialogTitle: t('onboarding.share.dialog_title', { defaultValue: '입맛 분석 공유하기' }),
                });
                return;
            } catch (err) {
                console.log('Native share dismissed:', err);
            }
        }

        try {
            await navigator.clipboard.writeText(`${text}\n\n${shareUrl}`);
            setShowCopied(true);
            setTimeout(() => setShowCopied(false), 2000);
        } catch {
            window.prompt('Copy this link:', shareUrl);
        }
    };

    const handleGoHome = () => {
        navigate('/main', { replace: true });
        setTimeout(() => reset(), 0);
    };

    return (
        <div className="flex flex-col h-full bg-background pt-safe-offset-6 pb-safe-offset-6">
            {/* Pagination Dots */}
            <div className="flex justify-center gap-2 py-4">
                {[0, 1, 2].map(i => (
                    <button
                        key={i}
                        onClick={() => setCurrentStep(i)}
                        className={cn(
                            "h-2.5 rounded-full transition-all duration-300",
                            currentStep === i ? "bg-primary w-8" : "bg-muted-foreground/30 w-2.5"
                        )}
                    />
                ))}
            </div>

            {/* Step Content */}
            <div className="flex-1 px-6 overflow-y-auto">
                <AnimatePresence mode="wait">
                    {currentStep === 0 && (
                        <motion.div
                            key="step1"
                            variants={slideVariants}
                            initial="enter"
                            animate="center"
                            exit="exit"
                            transition={{ duration: 0.3 }}
                            className="flex flex-col items-center"
                        >
                            <div
                                className="w-full rounded-3xl overflow-hidden shadow-xl p-8 text-center"
                                style={{ background: 'linear-gradient(135deg, #FDFBF7 0%, #F5F3FF 100%)' }}
                            >
                                <span className="text-5xl mb-4 block">🍽️</span>

                                <p className="text-sm text-gray-500 mb-2">
                                    {t('onboarding.share.your_type', { defaultValue: '나의 입맛 유형' })}
                                </p>
                                <h1 className="text-4xl font-black tracking-[0.2em] text-primary mb-2">
                                    {typeCode}
                                </h1>
                                {tasteProfile && (
                                    <p className="text-lg font-bold text-gray-900 mb-1">{tasteProfile.name}</p>
                                )}
                                {tasteProfile?.tagline && (
                                    <p className="text-xs text-gray-500 leading-relaxed">{tasteProfile.tagline}</p>
                                )}

                                <div className="w-full h-px bg-gray-200 my-6" />

                                <p className="text-sm text-gray-700 leading-relaxed">
                                    {analysis.summary}
                                </p>

                                {analysis.highlights.length > 0 && (
                                    <div className="flex flex-wrap justify-center gap-2 mt-5">
                                        {analysis.highlights.map((h, i) => (
                                            <span
                                                key={i}
                                                className="px-3 py-1.5 bg-white/70 rounded-full text-xs font-medium text-gray-700 shadow-sm"
                                            >
                                                {h}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}

                    {currentStep === 1 && (
                        <motion.div
                            key="step2"
                            variants={slideVariants}
                            initial="enter"
                            animate="center"
                            exit="exit"
                            transition={{ duration: 0.3 }}
                            className="flex flex-col items-center"
                        >
                            <div
                                className="w-full rounded-3xl overflow-hidden shadow-xl p-8 text-center"
                                style={{ background: 'linear-gradient(135deg, #FDFBF7 0%, #F5F3FF 100%)' }}
                            >
                                <span className="text-5xl mb-4 block">🔍</span>

                                {analysis.personalityTraits.length > 0 && (
                                    <div className="mb-6">
                                        <p className="text-xs text-gray-400 mb-3">
                                            {t('onboarding.share.personality', { defaultValue: '미식 성격' })}
                                        </p>
                                        <div className="space-y-2">
                                            {analysis.personalityTraits.map((trait, i) => (
                                                <p key={i} className="text-sm text-gray-700 leading-relaxed">
                                                    {trait}
                                                </p>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {analysis.foodRecommendations.length > 0 && (
                                    <>
                                        <div className="w-full h-px bg-gray-200 my-5" />
                                        <div className="mb-6">
                                            <p className="text-xs text-gray-400 mb-3">
                                                {t('onboarding.share.recommendations', { defaultValue: '추천 음식' })}
                                            </p>
                                            <div className="flex flex-wrap justify-center gap-2">
                                                {analysis.foodRecommendations.map((rec, i) => (
                                                    <span
                                                        key={i}
                                                        className="px-3 py-1.5 bg-primary/10 rounded-full text-xs font-medium text-primary"
                                                    >
                                                        {rec}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    </>
                                )}

                                {analysis.detailedAnalysis && (
                                    <>
                                        <div className="w-full h-px bg-gray-200 my-5" />
                                        <p className="text-xs text-gray-600 leading-relaxed text-left">
                                            {analysis.detailedAnalysis}
                                        </p>
                                    </>
                                )}
                            </div>
                        </motion.div>
                    )}

                    {currentStep === 2 && (
                        <motion.div
                            key="step3"
                            variants={slideVariants}
                            initial="enter"
                            animate="center"
                            exit="exit"
                            transition={{ duration: 0.3 }}
                            className="flex flex-col items-center justify-center h-full"
                        >
                            <span className="text-5xl mb-6">✨</span>

                            <h2 className="text-xl font-bold mb-6">
                                {t('onboarding.share.step3_complete', { defaultValue: '분석이 완료됐어요!' })}
                            </h2>

                            {/* Compact result card */}
                            <div
                                className="w-full rounded-2xl p-6 text-center shadow-lg mb-8"
                                style={{ background: 'linear-gradient(135deg, #FDFBF7 0%, #F5F3FF 100%)' }}
                            >
                                <h3 className="text-3xl font-black tracking-[0.2em] text-primary mb-1">
                                    {typeCode}
                                </h3>
                                {tasteProfile && (
                                    <p className="text-base font-bold text-gray-900">{tasteProfile.name}</p>
                                )}
                            </div>

                            {/* Actions */}
                            <div className="w-full space-y-3">
                                <Button
                                    size="lg"
                                    variant="outline"
                                    className="w-full text-lg py-6 rounded-full"
                                    onClick={handleShare}
                                >
                                    {showCopied ? (
                                        <span className="flex items-center gap-2">
                                            <Check className="w-5 h-5 text-green-500" />
                                            {t('onboarding.share.copied', { defaultValue: '링크가 복사됐어요!' })}
                                        </span>
                                    ) : (
                                        <span className="flex items-center gap-2">
                                            <Share2 className="w-5 h-5" />
                                            {t('onboarding.share.share_button', { defaultValue: '결과 공유하기' })}
                                        </span>
                                    )}
                                </Button>

                                <Button
                                    size="lg"
                                    className="w-full text-lg py-6 rounded-full shadow-lg shadow-primary/20"
                                    onClick={handleGoHome}
                                >
                                    {t('onboarding.share.go_home', { defaultValue: '다른 사람들의 프로필 보기' })}
                                    <ChevronRight className="w-5 h-5 ml-1" />
                                </Button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Bottom Next Button (Step 1 & 2 only) */}
            {currentStep < 2 && (
                <div className="px-6 pt-3 pb-4">
                    <Button
                        size="lg"
                        className="w-full text-lg py-6 rounded-full"
                        onClick={() => setCurrentStep(prev => prev + 1)}
                    >
                        {t('onboarding.share.next_button', { defaultValue: '다음' })}
                        <ChevronRight className="w-5 h-5 ml-1" />
                    </Button>
                </div>
            )}
        </div>
    );
};
