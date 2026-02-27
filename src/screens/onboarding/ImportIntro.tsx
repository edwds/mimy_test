import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { Camera, ChevronRight } from 'lucide-react';

export const ImportIntro = () => {
    const navigate = useNavigate();
    const { t } = useTranslation();

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
            </main>

            {/* Bottom Buttons */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
                className="px-6 pb-4 space-y-3"
            >
                <Button
                    size="lg"
                    className="w-full text-lg py-6 rounded-full shadow-lg shadow-primary/20"
                    onClick={() => navigate('/onboarding/screenshot-upload')}
                >
                    {t('onboarding.import_intro.upload_button', { defaultValue: '스크린샷 업로드하기' })}
                    <ChevronRight className="w-5 h-5 ml-1" />
                </Button>
                <Button
                    size="lg"
                    variant="ghost"
                    className="w-full text-muted-foreground"
                    onClick={() => navigate('/onboarding/relay')}
                >
                    {t('onboarding.import_intro.skip', { defaultValue: '건너뛰기' })}
                </Button>
            </motion.div>
        </div>
    );
};
