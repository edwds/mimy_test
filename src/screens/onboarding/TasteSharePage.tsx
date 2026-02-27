import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Loader2, ChevronRight } from 'lucide-react';
import { OnboardingService, type TasteShareData } from '@/services/OnboardingService';
import { cn } from '@/lib/utils';

const slideVariants = {
    enter: { opacity: 0, x: 50 },
    center: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -50 },
};

export const TasteSharePage = () => {
    const { code } = useParams<{ code: string }>();
    const navigate = useNavigate();
    const { t } = useTranslation();
    const [data, setData] = useState<TasteShareData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);

    useEffect(() => {
        if (!code) return;

        const load = async () => {
            try {
                const result = await OnboardingService.getTasteShareData(code);
                setData(result);
            } catch {
                setError(true);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [code]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-full gap-4">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="flex flex-col items-center justify-center h-full px-6 gap-4">
                <span className="text-4xl">🔍</span>
                <p className="text-center text-muted-foreground">
                    {t('onboarding.share_page.not_found', { defaultValue: '분석 결과를 찾을 수 없어요' })}
                </p>
                <Button onClick={() => navigate('/start')}>
                    {t('onboarding.share_page.go_start', { defaultValue: 'Mimy 시작하기' })}
                </Button>
            </div>
        );
    }

    const analysis = data.analysis;
    const nickname = data.user.nickname || t('onboarding.share_page.anonymous', { defaultValue: '미식가' });

    return (
        <div className="flex flex-col h-full bg-background pt-safe-offset-6 pb-safe-offset-6">
            {/* Branding + User */}
            <div className="px-6 pb-2 flex items-center justify-between">
                <p className="text-xs text-muted-foreground font-medium tracking-wider">MIMY</p>
                <div className="flex items-center gap-1.5">
                    {data.user.profile_image ? (
                        <img src={data.user.profile_image} alt="" className="w-5 h-5 rounded-full object-cover" />
                    ) : (
                        <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-[10px]">🍽️</span>
                        </div>
                    )}
                    <span className="text-xs text-muted-foreground">{nickname}</span>
                </div>
            </div>

            {/* Pagination Dots */}
            <div className="flex justify-center gap-2 py-3">
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
                                    {nickname}{t('onboarding.share_page.suffix', { defaultValue: '님의 입맛 유형' })}
                                </p>
                                <h1 className="text-4xl font-black tracking-[0.2em] text-primary mb-2">
                                    {data.tasteType}
                                </h1>
                                {data.tasteProfile && (
                                    <p className="text-lg font-bold text-gray-900 mb-1">{data.tasteProfile.name}</p>
                                )}
                                {data.tasteProfile?.tagline && (
                                    <p className="text-xs text-gray-500 leading-relaxed">{data.tasteProfile.tagline}</p>
                                )}

                                <div className="w-full h-px bg-gray-200 my-6" />

                                <p className="text-sm text-gray-700 leading-relaxed">
                                    {analysis.summary}
                                </p>

                                {analysis.highlights.length > 0 && (
                                    <div className="flex flex-wrap justify-center gap-2 mt-5">
                                        {analysis.highlights.map((h: string, i: number) => (
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
                                            {analysis.personalityTraits.map((trait: string, i: number) => (
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
                                                {analysis.foodRecommendations.map((rec: string, i: number) => (
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
                                {t('onboarding.share_page.cta_title', { defaultValue: '나도 입맛 분석 받아보기' })}
                            </h2>

                            <div
                                className="w-full rounded-2xl p-6 text-center shadow-lg mb-8"
                                style={{ background: 'linear-gradient(135deg, #FDFBF7 0%, #F5F3FF 100%)' }}
                            >
                                <h3 className="text-3xl font-black tracking-[0.2em] text-primary mb-1">
                                    {data.tasteType}
                                </h3>
                                {data.tasteProfile && (
                                    <p className="text-base font-bold text-gray-900">{data.tasteProfile.name}</p>
                                )}
                                <p className="text-xs text-gray-500 mt-1">
                                    {nickname}{t('onboarding.share_page.suffix', { defaultValue: '님의 입맛 유형' })}
                                </p>
                            </div>

                            <div className="w-full">
                                <Button
                                    size="lg"
                                    className="w-full text-lg py-6 rounded-full shadow-lg shadow-primary/20"
                                    onClick={() => navigate('/start')}
                                >
                                    {t('onboarding.share_page.cta', { defaultValue: '나도 입맛 분석하기' })}
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
