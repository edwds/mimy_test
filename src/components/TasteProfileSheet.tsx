import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

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
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [isVisible, setIsVisible] = useState(false);
    const [history, setHistory] = useState<VsHistoryItem[]>([]);
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

    // Data Fetching (Prefetch)
    useEffect(() => {
        if (userId) {
            setLoading(true);
            fetch(`${import.meta.env.VITE_API_BASE_URL || ''}/api/vs/history?user_id=${userId}`)
                .then(res => res.json())
                .then(data => setHistory(Array.isArray(data) ? data : []))
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
                    `relative w-full max-w-sm aspect-[4/5] ${bgColor} rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col transition-all duration-500 transform`,
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

                    {/* Header: User Info / "Album Art" */}
                    <div className="flex items-center gap-3 mb-auto">
                        <div className="w-12 h-12 rounded-xl bg-white/20 shadow-inner flex items-center justify-center overflow-hidden backdrop-blur-md border border-white/10">
                            {/* Ideally user profile image here, or cluster icon */}
                            <span className="text-2xl">😋</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-xs font-bold opacity-70 uppercase tracking-widest">Taste Profile</span>
                            <span className="text-lg font-bold leading-none">{data?.cluster_name || "Unknown"}</span>
                        </div>
                    </div>

                    {/* Main Body: The "Lyrics" / Tagline */}
                    <div className="my-8">
                        <h2 className="text-4xl font-black leading-[1.15] tracking-tight drop-shadow-sm font-display">
                            "{data?.cluster_tagline || 'Discovering your unique taste journey.'}"
                        </h2>
                    </div>

                    {/* Footer: VS History Preview or Logo */}
                    <div className="mt-auto pt-6 border-t border-white/20">
                        {/* VS History Mini-List (Scrollable if many) */}
                        {(loading || history.length > 0) ? (
                            <div className="space-y-3">
                                <div className="flex items-center justify-between text-xs font-medium opacity-60 uppercase tracking-wider mb-2">
                                    <span>Balance Game History</span>
                                    <span>mimichelin</span>
                                </div>
                                <div className="max-h-[120px] overflow-y-auto space-y-2 pr-1 scrollbar-hide">
                                    {history.map(item => (
                                        <div key={item.id} className="flex items-center justify-between text-xs bg-black/20 rounded-lg p-2.5 backdrop-blur-sm border border-white/5">
                                            <span className={cn(item.selected_value === 'A' ? "text-white font-bold" : "text-white/50")}>{item.item_a}</span>
                                            <span className="opacity-30 mx-2 text-[10px]">vs</span>
                                            <span className={cn(item.selected_value === 'B' ? "text-white font-bold" : "text-white/50")}>{item.item_b}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 opacity-80">
                                {/* Mimy Logo Placeholder */}
                                <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center">
                                    <span className="text-black font-black text-[10px]">M</span>
                                </div>
                                <span className="font-bold tracking-wide">Mimy</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
