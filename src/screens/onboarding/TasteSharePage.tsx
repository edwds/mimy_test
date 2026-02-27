import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Loader2, ChevronRight } from 'lucide-react';
import { OnboardingService, type TasteShareData } from '@/services/OnboardingService';

export const TasteSharePage = () => {
    const { code } = useParams<{ code: string }>();
    const navigate = useNavigate();
    const { t } = useTranslation();
    const [data, setData] = useState<TasteShareData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

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
        <div className="flex flex-col min-h-full bg-background pb-safe-offset-6 overflow-y-auto">
            {/* Branding */}
            <div className="px-6 pt-safe-offset-6 pb-2">
                <p className="text-xs text-muted-foreground font-medium tracking-wider">MIMY</p>
            </div>

            {/* Result Card */}
            <div className="px-6">
                <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.4 }}
                    className="w-full rounded-3xl overflow-hidden shadow-xl"
                    style={{ background: 'linear-gradient(135deg, #FDFBF7 0%, #F5F3FF 100%)' }}
                >
                    <div className="p-8 text-center">
                        {/* User Info */}
                        <div className="flex items-center justify-center gap-2 mb-4">
                            {data.user.profile_image ? (
                                <img src={data.user.profile_image} alt="" className="w-8 h-8 rounded-full object-cover" />
                            ) : (
                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                    <span className="text-sm">🍽️</span>
                                </div>
                            )}
                            <span className="text-sm font-medium text-gray-700">
                                {nickname}{t('onboarding.share_page.suffix', { defaultValue: '님의 입맛 분석' })}
                            </span>
                        </div>

                        {/* Type Code */}
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

                        {/* Summary */}
                        <p className="text-sm text-gray-700 leading-relaxed">
                            {analysis.summary}
                        </p>

                        {/* Highlights */}
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

                        {/* Personality Traits */}
                        {analysis.personalityTraits.length > 0 && (
                            <div className="mt-6">
                                <p className="text-xs text-gray-400 mb-2">
                                    {t('onboarding.share.personality', { defaultValue: '미식 성격' })}
                                </p>
                                <div className="space-y-1.5">
                                    {analysis.personalityTraits.map((trait: string, i: number) => (
                                        <p key={i} className="text-sm text-gray-600">{trait}</p>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Food Recommendations */}
                        {analysis.foodRecommendations.length > 0 && (
                            <div className="mt-6">
                                <p className="text-xs text-gray-400 mb-2">
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
                        )}

                        {/* Detailed Analysis */}
                        {analysis.detailedAnalysis && (
                            <div className="mt-6 pt-5 border-t border-gray-200">
                                <p className="text-xs text-gray-600 leading-relaxed">
                                    {analysis.detailedAnalysis}
                                </p>
                            </div>
                        )}
                    </div>
                </motion.div>
            </div>

            {/* CTA */}
            <div className="px-6 mt-8 pb-4">
                <Button
                    size="lg"
                    className="w-full text-lg py-6 rounded-full shadow-lg shadow-primary/20"
                    onClick={() => navigate('/start')}
                >
                    {t('onboarding.share_page.cta', { defaultValue: '나도 입맛 분석하기' })}
                    <ChevronRight className="w-5 h-5 ml-1" />
                </Button>
            </div>
        </div>
    );
};
