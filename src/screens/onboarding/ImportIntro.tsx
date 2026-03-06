import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, ChevronRight, Loader2 } from 'lucide-react';
import { OnboardingService } from '@/services/OnboardingService';
import { useOnboarding } from '@/context/OnboardingContext';

export const ImportIntro = () => {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const { setExtractedNames, setCatchtableRefs } = useOnboarding();
    const [catchtableLoading, setCatchtableLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleCatchtableImport = async () => {
        setCatchtableLoading(true);
        setError(null);

        try {
            const result = await OnboardingService.importCatchtable();
            setExtractedNames(result.extractedNames);
            setCatchtableRefs(result.catchtableRefs);
            navigate('/onboarding/shop-match');
        } catch (err: any) {
            if (err.message === 'AUTH_REQUIRED') {
                setError(t('onboarding.screenshot_upload.catchtable_auth_error', { defaultValue: '캐치테이블 로그인이 필요해요' }));
                window.open('https://app.catchtable.co.kr', '_blank');
            } else if (err.message === 'EMPTY') {
                setError(t('onboarding.screenshot_upload.catchtable_empty', { defaultValue: '방문 완료된 예약이 없어요' }));
            } else {
                setError(t('onboarding.screenshot_upload.catchtable_auth_error', { defaultValue: '캐치테이블 로그인이 필요해요' }));
                window.open('https://app.catchtable.co.kr', '_blank');
            }
        } finally {
            setCatchtableLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-background pt-safe-offset-6 pb-safe-offset-6">
            <main className="flex-1 flex flex-col items-center justify-center px-6">
                {/* Illustration */}
                <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                    className="mb-10"
                >
                    <div className="w-28 h-28 bg-gradient-to-br from-violet-100 to-amber-50 rounded-3xl flex items-center justify-center shadow-lg">
                        <Camera className="w-14 h-14 text-violet-500" />
                    </div>
                </motion.div>

                {/* Title */}
                <motion.h1
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                    className="text-2xl font-bold text-center mb-3"
                >
                    {t('onboarding.import_intro.title', { defaultValue: '방문했던 곳들을 알려주세요' })}
                </motion.h1>

                {/* Description */}
                <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25 }}
                    className="text-muted-foreground text-center text-sm leading-relaxed max-w-xs"
                >
                    {t('onboarding.import_intro.description', { defaultValue: '캐치테이블이나 네이버 예약 스크린샷을 올리면\nAI가 자동으로 맛집을 찾아드려요' })}
                </motion.p>

                {/* Error */}
                <AnimatePresence>
                    {error && (
                        <motion.p
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className="text-sm text-red-500 text-center mt-4"
                        >
                            {error}
                        </motion.p>
                    )}
                </AnimatePresence>
            </main>

            {/* Bottom Buttons */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
                className="px-6 pb-4 space-y-3"
            >
                {catchtableLoading ? (
                    <div className="flex flex-col items-center gap-3 py-4">
                        <Loader2 className="w-8 h-8 text-primary animate-spin" />
                        <p className="text-sm text-muted-foreground text-center">
                            {t('onboarding.screenshot_upload.catchtable_importing', { defaultValue: '캐치테이블에서 가져오는 중...' })}
                        </p>
                    </div>
                ) : (
                    <>
                        <Button
                            size="lg"
                            className="w-full text-lg py-6 rounded-full shadow-lg shadow-primary/20"
                            onClick={handleCatchtableImport}
                        >
                            {t('onboarding.screenshot_upload.catchtable_import', { defaultValue: '캐치테이블 이력 가져오기' })}
                            <ChevronRight className="w-5 h-5 ml-1" />
                        </Button>
                        <Button
                            size="lg"
                            variant="outline"
                            className="w-full text-lg py-6 rounded-full"
                            onClick={() => navigate('/onboarding/screenshot-upload')}
                        >
                            {t('onboarding.import_intro.upload_button', { defaultValue: '스크린샷 업로드하기' })}
                        </Button>
                        <Button
                            size="lg"
                            variant="ghost"
                            className="w-full text-muted-foreground"
                            onClick={() => navigate('/onboarding/relay')}
                        >
                            {t('onboarding.import_intro.skip', { defaultValue: '건너뛰기' })}
                        </Button>
                    </>
                )}
            </motion.div>
        </div>
    );
};
