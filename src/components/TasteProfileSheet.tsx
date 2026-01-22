import { X } from 'lucide-react';
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
    const [hateHistory, setHateHistory] = useState<{ id: number; item: string; selection: 'EAT' | 'NOT_EAT' }[]>([]);
    const [activeTab, setActiveTab] = useState<'balance' | 'dislike'>('balance');
    const [loading, setLoading] = useState(false);

    // Visibility Animation
    useEffect(() => {
        if (isOpen) {
            setIsVisible(true);
        } else {
            const timer = setTimeout(() => setIsVisible(false), 300);
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    // Data Fetching
    useEffect(() => {
        if (userId) {
            setLoading(true);
            Promise.all([
                fetch(`${import.meta.env.VITE_API_BASE_URL || ''}/api/vs/history?user_id=${userId}`).then(res => res.json()),
                fetch(`${import.meta.env.VITE_API_BASE_URL || ''}/api/hate/history?user_id=${userId}`).then(res => res.json())
            ])
                .then(([vsData, hateData]) => {
                    setHistory(Array.isArray(vsData) ? vsData : []);
                    setHateHistory(Array.isArray(hateData) ? hateData : []);
                })
                .catch(err => console.error(err))
                .finally(() => setLoading(false));
        }
    }, [userId]);

    // Generate color based on cluster name (simple hash or preset)
    const getCardStyle = (name: string = "") => {
        const colors = [
            "bg-[#4e6b9f]", // Blueish (Like the reference)
            "bg-[#9f4e6b]", // Pinkish
            "bg-[#4e9f6b]", // Greenish
            "bg-[#6b4e9f]", // Purplish
            "bg-[#d97706]", // Amber
        ];
        const index = name.length % colors.length;
        return colors[index];
    };

    const bgColor = getCardStyle(data?.cluster_name);

    if (!isVisible) return null;

    return (
        <div className={cn(
            "fixed inset-0 z-50 flex items-center justify-center p-6", // Full screen flex center with padding
            isOpen ? "pointer-events-auto" : "pointer-events-none"
        )}>
            {/* Backdrop - Blur effect */}
            <div
                className={cn(
                    "absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-500",
                    isOpen ? "opacity-100" : "opacity-0"
                )}
                onClick={onClose}
            />

            {/* The "Spotify" Card */}
            <div
                className={cn(
                    `relative w-full max-w-sm aspect-[2/3] ${bgColor} rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col transition-all duration-500 transform`,
                    isOpen ? "scale-100 opacity-100 translate-y-0" : "scale-90 opacity-0 translate-y-10"
                )}
            >
                {/* Texture/Noise Overlay (Optional) */}
                <div className="absolute inset-0 opacity-10 pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />

                {/* Close Button (Subtle, Top Right) */}
                <button
                    onClick={onClose}
                    className="absolute top-6 right-6 z-20 p-2 text-white/70 hover:text-white bg-black/20 hover:bg-black/40 rounded-full transition-colors backdrop-blur-md"
                >
                    <X className="w-5 h-5" />
                </button>

                {/* Content Container */}
                <div className="flex-1 flex flex-col p-8 z-10 text-white relative">

                    {/* Main Content: Name & Tagline */}
                    <div className="flex-1 flex flex-col justify-center text-center">
                        <span className="text-xl font-bold opacity-80 mb-2">{data?.cluster_name || "Unknown"}</span>
                        <h2 className="text-2xl font-black leading-[1.4] tracking-tight">
                            "{data?.cluster_tagline || 'Discovering your unique taste journey.'}"
                        </h2>
                    </div>

                    {/* Divider */}
                    <div className="w-full h-px bg-white/20 my-6 shrink-0" />

                    {/* Footer: Tabs & Lists */}
                    <div className="flex-[1.5] flex flex-col min-h-0">
                        {/* Tabs */}
                        <div className="flex items-center gap-6 mb-4 shrink-0 px-1">
                            <button
                                onClick={() => setActiveTab('balance')}
                                className={cn(
                                    "text-sm font-bold transition-colors relative pb-1",
                                    activeTab === 'balance' ? "text-white opacity-100" : "text-white/50 hover:text-white/80"
                                )}
                            >
                                Balance Game
                                {activeTab === 'balance' && (
                                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white rounded-full" />
                                )}
                            </button>
                            <button
                                onClick={() => setActiveTab('dislike')}
                                className={cn(
                                    "text-sm font-bold transition-colors relative pb-1",
                                    activeTab === 'dislike' ? "text-white opacity-100" : "text-white/50 hover:text-white/80"
                                )}
                            >
                                Dislikes
                                {activeTab === 'dislike' && (
                                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white rounded-full" />
                                )}
                            </button>
                        </div>

                        {/* List Content */}
                        <div className="flex-1 overflow-y-auto pr-2 scrollbar-hide mask-image-b">
                            {loading ? (
                                <div className="text-white/50 text-sm py-4">Loading...</div>
                            ) : (
                                <>
                                    {activeTab === 'balance' && (
                                        <div className="space-y-2 pb-4">
                                            {history.length > 0 ? history.map(item => (
                                                <div key={item.id} className="flex items-center justify-between text-xs bg-black/20 rounded-lg p-3 backdrop-blur-sm border border-white/5">
                                                    <span className={cn(item.selected_value === 'A' ? "text-white font-bold" : "text-white/50")}>{item.item_a}</span>
                                                    <span className="opacity-30 mx-2 text-[10px]">vs</span>
                                                    <span className={cn(item.selected_value === 'B' ? "text-white font-bold" : "text-white/50")}>{item.item_b}</span>
                                                </div>
                                            )) : (
                                                <div className="text-white/50 text-sm py-2">No history yet.</div>
                                            )}
                                        </div>
                                    )}

                                    {activeTab === 'dislike' && (
                                        <div className="flex flex-wrap gap-2 content-start pb-4">
                                            {hateHistory.filter(h => h.selection === 'NOT_EAT').length > 0 ? hateHistory.filter(h => h.selection === 'NOT_EAT').map((item, idx) => (
                                                <div key={idx} className="flex items-center gap-2 bg-red-500/20 text-white px-3 py-1.5 rounded-full text-xs font-medium border border-red-500/30">
                                                    <span>🚫</span>
                                                    <span>{item.item}</span>
                                                </div>
                                            )) : (
                                                <div className="text-white/50 text-sm py-2">No dislikes recorded.</div>
                                            )}
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
