import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, ChefHat, Search, Heart } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

const slides = [
    {
        icon: <Search className="w-12 h-12 text-primary" />,
        title: "Discover Your Taste",
        desc: "Find out your unique taste profile with our 3-minute quiz."
    },
    {
        icon: <Heart className="w-12 h-12 text-primary" />,
        title: "Connect with Taste-Alikes",
        desc: "Follow creators who share your exact palate preference."
    },
    {
        icon: <ChefHat className="w-12 h-12 text-primary" />,
        title: "My Michelin Guide",
        desc: "Build your personal dining ranking, not just star ratings."
    }
];

export const StartPage = ({ onStart }: { onStart: () => void }) => {
    const navigate = useNavigate();
    const [currentSlide, setCurrentSlide] = useState(0);

    const handleDragEnd = (_event: any, info: any) => {
        const threshold = 50; // Drag distance required to trigger swipe
        if (info.offset.x < -threshold) {
            // Swipe Left -> Next Slide
            if (currentSlide < slides.length - 1) {
                setCurrentSlide(currentSlide + 1);
            }
        } else if (info.offset.x > threshold) {
            // Swipe Right -> Prev Slide
            if (currentSlide > 0) {
                setCurrentSlide(currentSlide - 1);
            }
        }
    };

    return (
        <div className="flex flex-col h-full bg-background relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-[-20%] left-[-10%] w-[500px] h-[500px] bg-secondary/20 rounded-full blur-3xl pointer-events-none" />

            <main className="flex-1 flex flex-col items-center justify-center p-6 relative z-10">
                <div className="w-full max-w-md space-y-8 text-center animate-in fade-in slide-in-from-bottom-5 duration-700">
                    {/* Carousel Content */}
                    <div className="h-[300px] flex flex-col items-center justify-center space-y-6">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={currentSlide}
                                className="flex flex-col items-center space-y-6 cursor-grab active:cursor-grabbing w-full"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.3 }}
                                drag="x"
                                dragConstraints={{ left: 0, right: 0 }}
                                dragElastic={0.2}
                                onDragEnd={handleDragEnd}
                            >
                                <div className="p-6 bg-card rounded-3xl shadow-xl border border-border/50 ring-1 ring-border/50 pointer-events-none select-none">
                                    {slides[currentSlide].icon}
                                </div>
                                <div className="space-y-4 select-none">
                                    <h2 className="text-3xl font-bold tracking-tight text-foreground pointer-events-none">
                                        {slides[currentSlide].title}
                                    </h2>
                                    <p className="text-muted-foreground text-lg leading-relaxed max-w-[280px] mx-auto pointer-events-none">
                                        {slides[currentSlide].desc}
                                    </p>
                                </div>
                            </motion.div>
                        </AnimatePresence>
                    </div>

                    {/* Pagination Dots */}
                    <div className="flex justify-center space-x-2">
                        {slides.map((_, index) => (
                            <button
                                key={index}
                                onClick={() => setCurrentSlide(index)}
                                className={cn(
                                    "w-2.5 h-2.5 rounded-full transition-all duration-300",
                                    currentSlide === index ? "bg-primary w-8" : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
                                )}
                            />
                        ))}
                    </div>
                </div>
            </main>

            <footer className="p-6 relative z-10 w-full max-w-md mx-auto space-y-4">
                <button
                    className="w-full group relative inline-flex h-14 items-center justify-center overflow-hidden rounded-xl bg-primary px-8 font-medium text-primary-foreground shadow-lg transition-all hover:bg-primary/90 active:scale-95"
                    onClick={onStart}
                >
                    <span className="mr-2 text-lg">Get Started</span>
                    <ChevronRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                </button>

                <p className="text-center text-sm text-muted-foreground">
                    Already have an account? <span onClick={() => navigate('/login')} className="text-primary font-semibold cursor-pointer hover:underline">Log in</span>
                </p>
            </footer>
        </div>
    );
};
