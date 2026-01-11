import { useState, useEffect } from 'react';
import { ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export const OtpStep = () => {
    const navigate = useNavigate();
    const [code, setCode] = useState("");
    const [timer, setTimer] = useState(180); // 3 minutes

    useEffect(() => {
        const interval = setInterval(() => {
            setTimer((prev) => (prev > 0 ? prev - 1 : 0));
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    const handleNext = () => {
        // Verify mock code
        navigate('/register/profile');
    };

    return (
        <div className="flex flex-col h-full bg-background p-6 animate-in fade-in duration-500">
            <header className="flex items-center mb-8">
                <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-muted">
                    <ChevronLeft className="w-6 h-6" />
                </button>
            </header>

            <main className="flex-1 space-y-8">
                <div className="space-y-2">
                    <h1 className="text-2xl font-bold">Enter the code</h1>
                    <p className="text-muted-foreground">Sent to your phone number.</p>
                </div>

                <div className="space-y-8">
                    <div className="relative w-full max-w-sm mx-auto">
                        {/* Visual Slots */}
                        <div
                            className="flex justify-between gap-2"
                            onClick={() => document.getElementById('otp-input')?.focus()}
                        >
                            {Array.from({ length: 6 }).map((_, i) => (
                                <div
                                    key={i}
                                    className={cn(
                                        "w-12 h-16 border-b-2 flex items-center justify-center text-3xl font-bold transition-all duration-200",
                                        code[i]
                                            ? "border-primary text-foreground"
                                            : i === code.length
                                                ? "border-primary/50" // Active slot (cursor pos)
                                                : "border-border text-muted"
                                    )}
                                >
                                    {code[i]}
                                </div>
                            ))}
                        </div>

                        {/* Hidden Input */}
                        <input
                            id="otp-input"
                            type="text" // 'number' ignores maxLength on some browsers
                            inputMode="numeric"
                            autoComplete="one-time-code"
                            maxLength={6}
                            value={code}
                            onChange={(e) => {
                                const val = e.target.value.replace(/[^0-9]/g, '');
                                setCode(val);
                            }}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-text"
                            autoFocus
                        />
                    </div>

                    <div className="flex justify-between text-sm px-2">
                        <span className="text-destructive font-medium">{formatTime(timer)}</span>
                        <button className="text-primary hover:underline font-medium">Resend Code</button>
                    </div>
                </div>
            </main>

            <footer className="mt-auto">
                <Button
                    className="w-full"
                    size="lg"
                    onClick={handleNext}
                    disabled={code.length !== 6}
                >
                    Verify
                </Button>
            </footer>
        </div>
    );
};
