import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Share2, Check, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { Share as CapacitorShare } from '@capacitor/share';
import { useOnboarding } from '@/context/OnboardingContext';
import { WEB_BASE_URL } from '@/lib/api';

export const ShareResult = () => {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const { analysis, shareCode, tasteType, tasteProfile, reset } = useOnboarding();
    const [showCopied, setShowCopied] = useState(false);

    if (!analysis || !shareCode) {
        navigate('/onboarding/analysis', { replace: true });
        return null;
    }

    const shareUrl = `${WEB_BASE_URL}/taste/${shareCode}`;

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

        // Fallback: clipboard
        try {
            await navigator.clipboard.writeText(`${text}\n\n${shareUrl}`);
            setShowCopied(true);
            setTimeout(() => setShowCopied(false), 2000);
        } catch {
            // Final fallback
            window.prompt('Copy this link:', shareUrl);
        }
    };

    const handleGoHome = () => {
        reset();
        navigate('/main', { replace: true });
    };

    // Parse type code for display
    const typeCode = tasteType?.fullType || '';

    return (
        <div className="flex flex-col h-full bg-background pt-safe-offset-6 pb-safe-offset-6 overflow-y-auto">
            {/* Result Card */}
            <div className="px-6">
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.4 }}
                    className="w-full rounded-3xl overflow-hidden shadow-xl"
                    style={{ background: 'linear-gradient(135deg, #FDFBF7 0%, #F5F3FF 100%)' }}
                >
                    <div className="p-8 text-center">
                        {/* Type Code */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                        >
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
                        </motion.div>

                        {/* Divider */}
                        <div className="w-full h-px bg-gray-200 my-6" />

                        {/* Summary */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.3 }}
                        >
                            <p className="text-sm text-gray-700 leading-relaxed">
                                {analysis.summary}
                            </p>
                        </motion.div>

                        {/* Highlights */}
                        {analysis.highlights.length > 0 && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.4 }}
                                className="flex flex-wrap justify-center gap-2 mt-5"
                            >
                                {analysis.highlights.map((h, i) => (
                                    <span
                                        key={i}
                                        className="px-3 py-1.5 bg-white/70 rounded-full text-xs font-medium text-gray-700 shadow-sm"
                                    >
                                        {h}
                                    </span>
                                ))}
                            </motion.div>
                        )}

                        {/* Personality Traits */}
                        {analysis.personalityTraits.length > 0 && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.5 }}
                                className="mt-6"
                            >
                                <p className="text-xs text-gray-400 mb-2">
                                    {t('onboarding.share.personality', { defaultValue: '미식 성격' })}
                                </p>
                                <div className="space-y-1.5">
                                    {analysis.personalityTraits.map((trait, i) => (
                                        <p key={i} className="text-sm text-gray-600">
                                            {trait}
                                        </p>
                                    ))}
                                </div>
                            </motion.div>
                        )}

                        {/* Food Recommendations */}
                        {analysis.foodRecommendations.length > 0 && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.6 }}
                                className="mt-6"
                            >
                                <p className="text-xs text-gray-400 mb-2">
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
                            </motion.div>
                        )}

                        {/* Detailed Analysis */}
                        {analysis.detailedAnalysis && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.7 }}
                                className="mt-6 pt-5 border-t border-gray-200"
                            >
                                <p className="text-xs text-gray-600 leading-relaxed">
                                    {analysis.detailedAnalysis}
                                </p>
                            </motion.div>
                        )}
                    </div>
                </motion.div>
            </div>

            {/* Actions */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
                className="px-6 mt-6 space-y-3 pb-4"
            >
                {/* Share Button */}
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

                {/* Go to Main */}
                <Button
                    size="lg"
                    className="w-full text-lg py-6 rounded-full shadow-lg shadow-primary/20"
                    onClick={handleGoHome}
                >
                    {t('onboarding.share.go_home', { defaultValue: '다른 사람들의 프로필 보기' })}
                    <ChevronRight className="w-5 h-5 ml-1" />
                </Button>
            </motion.div>
        </div>
    );
};
