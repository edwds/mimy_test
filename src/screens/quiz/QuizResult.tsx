import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export const QuizResult = () => {
    const navigate = useNavigate();
    const location = useLocation();

    // Result from backend: { clusterId, clusterData: { cluster_name, cluster_tagline, ... }, scores }
    const { result } = location.state || {};

    // Fallback if accessed directly without state
    const clusterName = result?.clusterData?.cluster_name || "Unknown Flavor";
    const clusterTagline = result?.clusterData?.cluster_tagline || "Your unique taste profile discovery.";

    const handleStart = () => {
        // User already updated on backend in QuizScreen
        navigate('/main');
    };

    return (
        <div className="flex flex-col h-full bg-background p-6 items-center justify-center animate-in zoom-in duration-500">
            <div className="text-center space-y-6">
                <p className="text-xl text-muted-foreground font-medium">Your Taste Type is</p>

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
                    Start Mimy
                </Button>
            </div>
        </div>
    );
};
