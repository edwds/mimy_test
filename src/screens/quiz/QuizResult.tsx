import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { API_BASE_URL } from '@/lib/api';

export const QuizResult = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { cluster } = location.state || { cluster: 'Unknown' };
    const [saving, setSaving] = useState(false);

    const handleStart = async () => {
        setSaving(true);
        const userId = localStorage.getItem("mimy_user_id");

        if (userId) {
            try {
                await fetch(`${API_BASE_URL}/api/users/${userId}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        taste_cluster: cluster
                    })
                });
            } catch (e) {
                console.error("Failed to save cluster", e);
            }
        }

        navigate('/main');
    };

    return (
        <div className="flex flex-col h-full bg-background p-6 items-center justify-center animate-in zoom-in duration-500">
            <div className="text-center space-y-6">
                <p className="text-xl text-muted-foreground font-medium">Your Taste Type is</p>

                <h1 className="text-5xl font-black capitalize text-primary mb-8 tracking-tighter">
                    {cluster}
                </h1>

                <div className="w-64 h-64 bg-muted rounded-full mx-auto flex items-center justify-center mb-8">
                    {/* Placeholder for Character Image */}
                    <span className="text-4xl">🍽️</span>
                </div>

                <p className="text-muted-foreground px-8">
                    Based on your answers, you prefer **{cluster}** flavors.
                    Let's find the perfect restaurants for you.
                </p>
            </div>

            <div className="mt-auto pt-10 w-full max-w-sm">
                <Button
                    size="lg"
                    className="w-full text-lg py-6 rounded-full"
                    onClick={handleStart}
                    disabled={saving}
                >
                    {saving ? <Loader2 className="animate-spin" /> : "Start Mimy"}
                </Button>
            </div>
        </div>
    );
};
