import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';

interface TasteProfileSheetProps {
    isOpen: boolean;
    onClose: () => void;
    data: {
        cluster_name: string;
        cluster_tagline: string;
        // Add more fields if available in the future, e.g. description, image_url
    } | null;
    userId?: number;
}

interface VsHistoryItem {
    id: number;
    item_a: string;
    item_b: string;
    selected_value: 'A' | 'B';
    voted_at: string;
}

export const TasteProfileSheet = ({ isOpen, onClose, data, userId }: TasteProfileSheetProps) => {
    const [isVisible, setIsVisible] = useState(false);
    const [history, setHistory] = useState<VsHistoryItem[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setIsVisible(true);
            if (userId) {
                setLoading(true);
                fetch(`${import.meta.env.VITE_API_BASE_URL || ''}/api/vs/history?user_id=${userId}`)
                    .then(res => res.json())
                    .then(data => setHistory(Array.isArray(data) ? data : []))
                    .catch(err => console.error(err))
                    .finally(() => setLoading(false));
            }
        } else {
            const timer = setTimeout(() => setIsVisible(false), 300);
            return () => clearTimeout(timer);
        }
    }, [isOpen, userId]);

    if (!isVisible) return null;

    return (
        <div className={cn(
            "absolute inset-0 z-50 flex items-center justify-center", // Always center
            isOpen ? "pointer-events-auto" : "pointer-events-none"
        )}>
            {/* Backdrop */}
            <div
                className={cn(
                    "absolute inset-0 bg-black/50 transition-opacity duration-300",
                    isOpen ? "opacity-100" : "opacity-0"
                )}
                onClick={onClose}
            />

            {/* Sheet Content */}
            <div
                className={cn(
                    "relative bg-[linear-gradient(135deg,_#FDFBF7_0%,_#F5F3FF_100%)] rounded-2xl shadow-xl transition-all duration-300 transform flex flex-col overflow-hidden",
                    "w-[80%] max-h-[60%] h-auto", // Dynamic height: auto up to 60%
                    isOpen ? "scale-100 opacity-100" : "scale-95 opacity-0" // Zoom animation
                )}
            >
                {/* Scrollable Content */}
                <div className="overflow-y-auto p-6">
                    {/* Close Button */}
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 text-muted-foreground hover:bg-muted rounded-full"
                    >
                        <X className="w-5 h-5" />
                    </button>

                    <div className="flex flex-col items-center text-center pt-8 pb-8 space-y-6">
                        <div className="space-y-2">
                            <h2 className="text-xl font-black text-primary tracking-tight">
                                {data?.cluster_name || "Unknown Flavor"}
                            </h2>
                            <div className="bg-white rounded-3xl p-4">
                                <p className="text-lg font-medium">
                                    "{data?.cluster_tagline || "Your unique taste profile."}"
                                </p>
                            </div>
                        </div>

                        {/* VS History Section - Only show if has history or loading */}
                        {(loading || history.length > 0) && (
                            <div className="w-full">
                                <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3">
                                    밸런스 게임 결과
                                </h3>

                                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                                    {loading ? (
                                        <div className="text-center py-4 text-sm text-muted-foreground">Loading...</div>
                                    ) : (
                                        history.map(item => (
                                            <div key={item.id} className="flex items-center justify-between text-sm bg-muted/30 rounded-lg p-3 relative overflow-hidden">
                                                {/* Background highlight based on selection */}
                                                <div className={`absolute inset-y-0 left-0 w-1/2 bg-primary/5 transition-colors ${item.selected_value === 'A' ? 'bg-primary/10' : 'bg-transparent'}`} />
                                                <div className={`absolute inset-y-0 right-0 w-1/2 bg-primary/5 transition-colors ${item.selected_value === 'B' ? 'bg-primary/10' : 'bg-transparent'}`} />

                                                <div className={`
                                                flex-1 text-center relative z-10 font-medium transition-all
                                                ${item.selected_value === 'A' ? 'text-primary font-bold scale-105' : 'text-muted-foreground scale-95'}
                                            `}>
                                                    {item.item_a}
                                                </div>

                                                <div className="mx-3 text-xs font-black text-muted-foreground/50 z-10">VS</div>

                                                <div className={`
                                                flex-1 text-center relative z-10 font-medium transition-all
                                                ${item.selected_value === 'B' ? 'text-primary font-bold scale-105' : 'text-muted-foreground scale-95'}
                                            `}>
                                                    {item.item_b}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div> {/* End Scrollable Content */}
            </div>
        </div>
    );
};
