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
}

export const TasteProfileSheet = ({ isOpen, onClose, data }: TasteProfileSheetProps) => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setIsVisible(true);
        } else {
            const timer = setTimeout(() => setIsVisible(false), 300); // Wait for fade out
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    if (!isVisible) return null;

    return (
        <div className={cn(
            "absolute inset-0 z-50 flex items-end justify-center sm:items-center",
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
                    "relative w-full max-w-lg bg-background rounded-t-2xl sm:rounded-2xl p-6 shadow-xl transition-transform duration-300 transform",
                    isOpen ? "translate-y-0 scale-100" : "translate-y-full sm:translate-y-10 sm:scale-95 opacity-0"
                )}
            >
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 text-muted-foreground hover:bg-muted rounded-full"
                >
                    <X className="w-5 h-5" />
                </button>

                <div className="flex flex-col items-center text-center pt-4 pb-8 space-y-6">
                    <p className="text-lg text-muted-foreground font-medium">Taste Type</p>

                    <div className="w-32 h-32 bg-muted rounded-full flex items-center justify-center shadow-lg border-4 border-surface text-6xl">
                        🍽️
                    </div>

                    <div className="space-y-2">
                        <h2 className="text-3xl font-black text-primary tracking-tight">
                            {data?.cluster_name || "Unknown Flavor"}
                        </h2>
                        <div className="bg-surface p-4 rounded-xl border border-border/50">
                            <p className="text-foreground font-medium leading-relaxed">
                                "{data?.cluster_tagline || "Your unique taste profile."}"
                            </p>
                        </div>
                    </div>
                </div>

                <div className="w-full">
                    <Button
                        size="lg"
                        className="w-full h-12 text-lg rounded-xl"
                        onClick={onClose}
                    >
                        Close
                    </Button>
                </div>
            </div>
        </div>
    );
};
