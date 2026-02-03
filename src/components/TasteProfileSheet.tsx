import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';
import { API_BASE_URL } from '@/lib/api';



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

    // Data Fetching - refetch when sheet is opened
    useEffect(() => {
        if (userId && isOpen) {
            setLoading(true);
            Promise.all([
                fetch(`${API_BASE_URL}/api/vs/history?user_id=${userId}`).then(res => res.json()),
                fetch(`${API_BASE_URL}/api/hate/history?user_id=${userId}`).then(res => res.json())
            ])
                .then(([vsData, hateData]) => {
                    const vsHistory = Array.isArray(vsData) ? vsData : [];
                    const hateHistoryData = Array.isArray(hateData) ? hateData : [];

                    setHistory(vsHistory);
                    setHateHistory(hateHistoryData);

                    // Set default tab based on available data
                    if (vsHistory.length > 0) {
                        setActiveTab('balance');
                    } else if (hateHistoryData.filter((h: any) => h.selection === 'NOT_EAT').length > 0) {
                        setActiveTab('dislike');
                    }
                })
                .catch(err => console.error(err))
                .finally(() => setLoading(false));
        }
    }, [userId, isOpen]);

    // Use same gradient as ProfileScreen taste card
    const bgGradient = "bg-[linear-gradient(135deg,_#FDFBF7_0%,_#F5F3FF_100%)]";

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

            {/* The Card */}
            <div
                className={cn(
                    `relative w-full max-w-sm max-h-[600px] ${bgGradient} rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col transition-all duration-500 transform`,
                    isOpen ? "scale-100 opacity-100 translate-y-0" : "scale-90 opacity-0 translate-y-10"
                )}
            >
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-6 right-6 z-20 p-2 text-gray-600 hover:text-gray-900 bg-white/60 hover:bg-white/80 rounded-full transition-colors backdrop-blur-md"
                >
                    <X className="w-5 h-5" />
                </button>

                {/* Content Container */}
                <div className="flex-1 flex flex-col p-8 z-10 relative min-h-0">

                    {/* Main Content: Name & Tagline */}
                    <div className="min-h-[180px] flex flex-col justify-center text-center shrink-0">
                        <span className="text-xl font-bold text-gray-900 mb-2">{data?.cluster_name || "Unknown"}</span>
                        <h2 className="text-lg font-medium text-gray-700 leading-[1.6]">
                            {data?.cluster_tagline || 'Discovering your unique taste journey.'}
                        </h2>
                    </div>

                    {/* Divider - only show if there's data to display */}
                    {(history.length > 0 || hateHistory.filter(h => h.selection === 'NOT_EAT').length > 0) && (
                        <>
                            <div className="w-full h-px bg-gray-300/50 my-6 shrink-0" />

                            {/* Footer: Tabs & Lists */}
                            <div className="flex-[1.5] flex flex-col min-h-0">
                                {/* Tabs */}
                                <div className="flex items-center gap-6 mb-4 shrink-0 px-1">
                                    {history.length > 0 && (
                                        <button
                                            onClick={() => setActiveTab('balance')}
                                            className={cn(
                                                "text-sm font-bold transition-colors relative pb-1",
                                                activeTab === 'balance' ? "text-gray-900" : "text-gray-400 hover:text-gray-600"
                                            )}
                                        >
                                            Balance Game
                                            {activeTab === 'balance' && (
                                                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-900 rounded-full" />
                                            )}
                                        </button>
                                    )}
                                    {hateHistory.filter(h => h.selection === 'NOT_EAT').length > 0 && (
                                        <button
                                            onClick={() => setActiveTab('dislike')}
                                            className={cn(
                                                "text-sm font-bold transition-colors relative pb-1",
                                                activeTab === 'dislike' ? "text-gray-900" : "text-gray-400 hover:text-gray-600"
                                            )}
                                        >
                                            Dislikes
                                            {activeTab === 'dislike' && (
                                                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-900 rounded-full" />
                                            )}
                                        </button>
                                    )}
                                </div>

                                {/* List Content - Fixed height container to prevent layout shift */}
                                <div className="flex-1 overflow-y-auto pr-2 scrollbar-hide mask-image-b min-h-0">
                                    {loading ? (
                                        <div className="text-gray-500 text-sm py-4">Loading...</div>
                                    ) : (
                                        <>
                                            {activeTab === 'balance' && history.length > 0 && (
                                                <div className="space-y-2 pb-4">
                                                    {history.map(item => (
                                                        <div key={item.id} className="flex items-center justify-between text-xs bg-white/60 rounded-lg p-3 backdrop-blur-sm border border-gray-200/50">
                                                            <span className={cn(item.selected_value === 'A' ? "text-gray-900 font-bold" : "text-gray-400")}>{item.item_a}</span>
                                                            <span className="text-gray-300 mx-2 text-[10px]">vs</span>
                                                            <span className={cn(item.selected_value === 'B' ? "text-gray-900 font-bold" : "text-gray-400")}>{item.item_b}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            {activeTab === 'dislike' && hateHistory.filter(h => h.selection === 'NOT_EAT').length > 0 && (
                                                <div className="space-y-2 pb-4">
                                                    {hateHistory.filter(h => h.selection === 'NOT_EAT').map((item, idx) => (
                                                        <div key={idx} className="flex items-center gap-2 bg-red-50 text-red-700 px-3 py-2 rounded-lg text-xs font-medium border border-red-200">
                                                            <span>🚫</span>
                                                            <span>{item.item}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};
