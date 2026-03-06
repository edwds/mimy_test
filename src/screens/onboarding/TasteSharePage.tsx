import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, ChevronRight, ChevronsUp, ChevronUp, Minus, ChevronDown, ChevronsDown, Store } from 'lucide-react';
import { OnboardingService, type TasteShareData } from '@/services/OnboardingService';
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
    const scores = data.tasteScores;

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

            <div className="flex-1 px-6 overflow-y-auto">
                <div className="flex flex-col items-center py-5">
                    {/* Compact Card - for sharing/screenshot */}
                    <div
                        className="w-full rounded-3xl overflow-hidden shadow-xl p-8 text-center flex flex-col items-center gap-4"
                        style={{ background: 'linear-gradient(135deg, #FDFBF7 0%, #F5F3FF 100%)' }}
                    >
                        <div className="flex flex-col items-center gap-2">
                            <div className="pb-2.5 flex flex-col items-center gap-2.5">
                                {data.user.profile_image ? (
                                    <img src={data.user.profile_image} alt="" className="w-[70px] h-[70px] rounded-full object-cover" />
                                ) : (
                                    <div className="w-[70px] h-[70px] rounded-full bg-primary/10 flex items-center justify-center">
                                        <span className="text-2xl">🍽️</span>
                                    </div>
                                )}
                                <p className="text-sm text-gray-500">
                                    {nickname}{t('onboarding.share_page.suffix', { defaultValue: '님의 입맛 분석' })}
                                </p>
                            </div>

                            {data.tasteType && (
                                <span className="inline-block px-4 py-1.5 bg-primary/10 rounded-full text-sm font-bold text-primary tracking-wider">
                                    {data.tasteType}
                                </span>
                            )}

                            {data.tasteProfile && (
                                <p className="text-xl font-bold text-gray-900">{data.tasteProfile.name}</p>
                            )}

                            {data.tasteProfile?.tagline && (
                                <p className="text-sm text-gray-500">{data.tasteProfile.tagline}</p>
                            )}
                        </div>

                        {/* 7-axis emoji grid */}
                        {scores && Object.keys(scores).length > 0 && (
                            <div className="flex items-center justify-center gap-3">
                                {TASTE_AXES.map(({ key, emoji }) => {
                                    const value = scores[key] ?? 0;
                                    const { Icon: ArrowIcon, color } = getArrowIcon(value);
                                    return (
                                        <div key={key} className="flex flex-col items-center gap-0.5">
                                            <span className="text-base leading-none">{emoji}</span>
                                            <ArrowIcon className={cn("w-3.5 h-3.5", color)} />
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        <div className="w-full h-px bg-gray-200" />

                        <p className="text-base font-semibold text-gray-900">
                            {analysis.summary}
                        </p>
                    </div>

                    {/* Detailed Analysis Section */}
                    {analysis.insights && analysis.insights.length > 0 && (
                        <div className="w-full mt-8">
                            <p className="text-xs text-muted-foreground tracking-wider uppercase mb-4 px-1">
                                상세 분석
                            </p>
                            <div className="flex flex-col">
                                {analysis.insights.map((insight: string, i: number) => (
                                    <div key={i}>
                                        <div className="flex gap-3 min-w-0">
                                            <span className="text-xs font-mono text-primary/40 pt-0.5 shrink-0">
                                                {String(i + 1).padStart(2, '0')}
                                            </span>
                                            <p className="text-sm text-gray-700 leading-relaxed min-w-0">
                                                {insight}
                                            </p>
                                        </div>
                                        {i < analysis.insights!.length - 1 && (
                                            <div className="h-px bg-gray-100 my-4" />
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Recommendations */}
                    {data.matchedRecommendations && data.matchedRecommendations.length > 0 && (
                        <div className="w-full mt-8">
                            <p className="text-xs text-muted-foreground tracking-wider uppercase mb-4 px-1">
                                이런 곳도 좋아하실 것 같아요
                            </p>
                            <div className="flex flex-col gap-3">
                                {data.matchedRecommendations.map((rec: any, i: number) => (
                                    <div
                                        key={i}
                                        className={`bg-primary/5 border border-primary/10 rounded-xl p-4 ${rec.shop ? 'cursor-pointer active:bg-primary/10' : ''}`}
                                        onClick={() => rec.shop && navigate(`/main?viewShop=${rec.shop.id}`)}
                                    >
                                        <div className="flex items-center gap-3">
                                            {rec.shop && (
                                                rec.shop.thumbnail_img ? (
                                                    <img src={rec.shop.thumbnail_img} alt={rec.shop.name} className="w-10 h-10 rounded-lg object-cover shrink-0" />
                                                ) : (
                                                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                                                        <Store className="w-4 h-4 text-muted-foreground" />
                                                    </div>
                                                )
                                            )}
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-gray-900">{rec.name}</p>
                                                <p className="text-xs text-gray-500 leading-relaxed mt-0.5">{rec.reason}</p>
                                            </div>
                                            {rec.shop && <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="px-6 pt-3 pb-4">
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
