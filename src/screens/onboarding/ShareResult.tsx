import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Share2, Check, ChevronsUp, ChevronUp, Minus, ChevronDown, ChevronsDown, ChevronRight, Store } from 'lucide-react';
import { useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { Share as CapacitorShare } from '@capacitor/share';
import { useOnboarding } from '@/context/OnboardingContext';
import { useUser } from '@/context/UserContext';
import { WEB_BASE_URL } from '@/lib/api';
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

export const ShareResult = () => {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const { analysis, shareCode, tasteType, tasteProfile, matchedRecommendations } = useOnboarding();
    const { user } = useUser();
    const [showCopied, setShowCopied] = useState(false);

    if (!analysis || !shareCode) {
        navigate('/onboarding/analysis', { replace: true });
        return null;
    }

    const shareUrl = `${WEB_BASE_URL}/taste/${shareCode}`;
    const typeCode = tasteType?.fullType || '';
    const scores = user?.taste_result?.scores as Record<string, number> | undefined;

    const handleShare = async () => {
        const title = tasteProfile?.name || '나의 입맛 분석';
        const insightsText = analysis.insights?.length
            ? '\n\n' + analysis.insights.map(i => `• ${i}`).join('\n')
            : '';
        const text = `${analysis.summary}${insightsText}\n\n나의 입맛 유형: ${tasteType?.fullType} ${tasteProfile?.name}`;

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

    const handleClose = () => {
        navigate('/main', { replace: true });
    };

    return (
        <div className="flex flex-col h-full bg-background pt-safe-offset-6 pb-safe-offset-6">
            <div className="flex-1 px-6 overflow-y-auto">
                <div className="flex flex-col items-center py-5">
                    {/* Compact Card - for sharing/screenshot */}
                    <div
                        className="w-full rounded-3xl overflow-hidden shadow-xl p-8 text-center flex flex-col items-center gap-4"
                        style={{ background: 'linear-gradient(135deg, #FDFBF7 0%, #F5F3FF 100%)' }}
                    >
                        {typeCode && (
                            <span className="inline-block px-4 py-1.5 bg-primary/10 rounded-full text-sm font-bold text-primary tracking-wider">
                                {typeCode}
                            </span>
                        )}

                        {tasteProfile && (
                            <p className="text-xl font-bold text-gray-900">{tasteProfile.name}</p>
                        )}

                        {tasteProfile?.tagline && (
                            <p className="text-sm text-gray-500">{tasteProfile.tagline}</p>
                        )}

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
                                {analysis.insights.map((insight, i) => (
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
                    {matchedRecommendations && matchedRecommendations.length > 0 && (
                        <div className="w-full mt-8">
                            <p className="text-xs text-muted-foreground tracking-wider uppercase mb-4 px-1">
                                이런 곳도 좋아하실 것 같아요
                            </p>
                            <div className="flex flex-col gap-3">
                                {matchedRecommendations.map((rec, i) => (
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

            <div className="px-6 pt-3 pb-4 flex items-center justify-center gap-4">
                <button
                    onClick={handleShare}
                    className="text-sm text-muted-foreground flex items-center gap-1.5"
                >
                    {showCopied ? (
                        <>
                            <Check className="w-4 h-4 text-green-500" />
                            {t('onboarding.share.copied', { defaultValue: '링크가 복사됐어요!' })}
                        </>
                    ) : (
                        <>
                            <Share2 className="w-4 h-4" />
                            {t('onboarding.share.share_button', { defaultValue: '결과 공유하기' })}
                        </>
                    )}
                </button>
                <span className="text-muted-foreground/30">|</span>
                <button
                    onClick={handleClose}
                    className="text-sm text-muted-foreground"
                >
                    {t('onboarding.share.close', { defaultValue: '닫기' })}
                </button>
            </div>
        </div>
    );
};
