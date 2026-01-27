import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';

export const QuizResult = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { t } = useTranslation();

    // Result from backend: { clusterId, clusterData: { cluster_name, cluster_tagline, ... }, scores }
    const { result } = location.state || {};

    // Fallback if accessed directly without state
    const clusterName = result?.clusterData?.cluster_name || t('quiz.result.flavor_unknown');
    const clusterTagline = result?.clusterData?.cluster_tagline || t('quiz.result.tagline_default');

    const handleStart = () => {
        // User already updated on backend in QuizScreen
        navigate('/main');
    };

    return (
        <div className="flex flex-col h-full bg-background px-6 pt-safe-offset-6 pb-safe-offset-6 items-center justify-center animate-in zoom-in duration-500">
            <div className="text-center space-y-6">
                <p className="text-xl text-muted-foreground font-medium">{t('quiz.result.title')}</p>

                <h1 className="text-4xl font-black text-primary mb-4 tracking-tighter">
                    {clusterName}
                </h1>

                <div className="w-64 h-64 bg-muted rounded-full mx-auto flex items-center justify-center mb-6 shadow-xl border-4 border-surface">
                    {/* Placeholder for Character Image - Could map clusterId to images */}
                    <span className="text-6xl">🍽️</span>
                </div>

                <div className="bg-surface p-6 rounded-2xl shadow-sm border border-border/50">
                    <p className="text-foreground text-lg font-medium leading-relaxed">
                        "{clusterTagline}"
                    </p>
                </div>

                {/* Debug Info (Optional - remove in prod) */}
                {/* <div className='text-xs text-left text-muted-foreground/50'>
                    {JSON.stringify(result?.scores, null, 2)}
                </div> */}
            </div>

            <div className="mt-auto pt-10 w-full max-w-sm">
                <Button
                    size="lg"
                    className="w-full text-lg py-6 rounded-full shadow-lg shadow-primary/20"
                    onClick={handleStart}
                >
                    {t('quiz.result.start_app')}
                </Button>
            </div>
        </div>
    );
};
