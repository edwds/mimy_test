import { useState, useRef, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const ITEM_HEIGHT = 48; // Height of each picker item

// Reusable Picker Component
const WheelPicker = ({ items, selected, onSelect }: { items: number[], selected: number | null, onSelect: (val: number) => void }) => {
    const scrollRef = useRef<HTMLDivElement>(null);
    const isInitialScroll = useRef(true);

    const handleScroll = () => {
        if (!scrollRef.current) return;
        const scrollTop = scrollRef.current.scrollTop;
        const index = Math.round(scrollTop / ITEM_HEIGHT);
        if (index >= 0 && index < items.length) {
            onSelect(items[index]);
        }
    };

    useEffect(() => {
        if (scrollRef.current && selected) {
            const index = items.indexOf(selected);
            if (index !== -1) {
                if (isInitialScroll.current) {
                    scrollRef.current.scrollTop = index * ITEM_HEIGHT;
                    isInitialScroll.current = false;
                } else {
                    // Adding a small delay or check to prevent conflict with user scroll
                    // simplified for now: only scroll if far off?
                    // Actually, for wheel picker, we want it to snap.
                }
            }
        }
    }, []); // Only initial mount scroll for simplicity or we need better logic

    return (
        <div className="relative w-full h-[240px] overflow-hidden flex-1">
            <div className="absolute top-1/2 left-0 right-0 -translate-y-1/2 h-12 border-y border-primary/20 bg-primary/5 pointer-events-none z-10" />
            <div
                ref={scrollRef}
                className="h-full overflow-y-auto snap-y snap-mandatory scrollbar-hide py-[96px]"
                onScroll={handleScroll}
                style={{ scrollBehavior: 'auto' }} // auto for better immediate response
            >
                {items.map((item, index) => (
                    <div
                        key={item}
                        className={cn(
                            "h-12 flex items-center justify-center text-xl font-medium transition-all duration-200 snap-center cursor-pointer",
                            selected === item ? "text-primary text-2xl font-bold scale-110" : "text-muted-foreground/40"
                        )}
                        onClick={() => {
                            if (scrollRef.current) scrollRef.current.scrollTop = index * ITEM_HEIGHT;
                        }}
                    >
                        {item}
                    </div>
                ))}
            </div>
        </div>
    );
};

export const AgeCheckStep = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();

    // Default to 2000-01-01
    const [year, setYear] = useState<number>(2000);
    const [month, setMonth] = useState<number>(1);
    const [day, setDay] = useState<number>(1);

    const [error, setError] = useState<string | null>(null);

    const currentYear = new Date().getFullYear();
    const startYear = 1950;

    const years = useMemo(() => Array.from({ length: currentYear - startYear + 1 }, (_, i) => startYear + i).reverse(), [currentYear]);
    const months = useMemo(() => Array.from({ length: 12 }, (_, i) => i + 1), []);

    const daysInMonth = useMemo(() => new Date(year, month, 0).getDate(), [year, month]);
    const days = useMemo(() => Array.from({ length: daysInMonth }, (_, i) => i + 1), [daysInMonth]);

    // Validation
    useEffect(() => {
        if (day > daysInMonth) setDay(daysInMonth);
    }, [daysInMonth, day]);

    const handleNext = () => {
        const birthDate = new Date(year, month - 1, day);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }

        if (age >= 14) {
            // Format YYYY-MM-DD
            const formattedDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            localStorage.setItem("mimy_reg_birthyear", formattedDate); // Keeping key name for compatibility but storing full date
            navigate('/onboarding/agreement');
        } else {
            setError(t('onboarding.age_check.error_underage'));
        }
    };

    return (
        <div className="flex flex-col h-full bg-background p-6 animate-in fade-in duration-500 overflow-hidden">
            <header className="flex items-center mb-8">
                <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-muted">
                    <ChevronLeft className="w-6 h-6" />
                </button>
            </header>

            <main className="flex-1 space-y-8 flex flex-col">
                <div className="space-y-2 shrink-0">
                    <h1 className="text-2xl font-bold">{t('onboarding.age_check.title')}</h1>
                    <p className="text-muted-foreground">{t('onboarding.age_check.desc')}</p>
                </div>

                <div className="flex-1 flex flex-col items-center justify-center relative min-h-[300px]">
                    <div className="flex gap-2 w-full max-w-sm h-[240px]">
                        <WheelPicker items={years} selected={year} onSelect={setYear} />
                        <WheelPicker items={months} selected={month} onSelect={setMonth} />
                        <WheelPicker items={days} selected={day} onSelect={setDay} />
                    </div>
                    {error && <p className="text-destructive text-sm text-center mt-4 absolute bottom-0 w-full">{error}</p>}
                </div>
            </main>

            <footer className="mt-auto shrink-0">
                <Button className="w-full" size="lg" onClick={handleNext}>
                    {t('common.next')}
                </Button>
            </footer>
        </div>
    );
};
