import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Utensils } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTranslation, Trans } from 'react-i18next';
import { useUser } from '@/context/UserContext';

export const QuizIntro = () => {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const { user, loading } = useUser();

    // Fallback to "User" or localstorage if context not ready (edge case)
    const nickname = user?.nickname || localStorage.getItem("mimy_reg_nickname") || t('common.user', { defaultValue: 'User' });

    // Wait for user to load to prevent undefined errors
    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-background px-6 pt-safe-offset-6 pb-safe-offset-6 overflow-hidden">
            <main className="flex-1 flex flex-col items-center justify-center text-center space-y-8 animate-in fade-in duration-500">
                <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.5 }}
                    className="w-32 h-32 bg-primary/10 rounded-full flex items-center justify-center mb-4"
                >
                    <Utensils className="w-16 h-16 text-primary" />
                </motion.div>

                <div className="space-y-4">
                    <h1 className="text-3xl font-bold leading-tight">
                        <Trans
                            i18nKey="quiz.intro.title"
                            values={{ name: nickname }}
                            components={{ 1: <span className="text-primary" /> }}
                        />
                    </h1>
                    <p className="text-muted-foreground text-lg">
                        {t('quiz.intro.desc')}
                    </p>
                </div>
            </main>

            <footer className="mt-auto pt-6">
                <Button
                    size="lg"
                    className="w-full text-lg py-6 rounded-full"
                    onClick={() => navigate('/quiz/test')}
                >
                    {t('common.start_quiz')}
                </Button>
            </footer>
        </div>
    );
};
