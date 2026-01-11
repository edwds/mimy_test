import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export const PhoneStep = () => {
    useTranslation();
    const navigate = useNavigate();
    const [phone, setPhone] = useState("");
    const [countryCode] = useState("82");

    const formatPhoneNumber = (value: string) => {
        const numbers = value.replace(/[^\d]/g, "");
        if (numbers.length <= 3) return numbers;
        if (numbers.length <= 7) return `${numbers.slice(0, 3)}-${numbers.slice(3)}`;
        return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7, 11)}`;
    };

    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const formatted = formatPhoneNumber(e.target.value);
        if (formatted.replace(/-/g, "").length <= 11) {
            setPhone(formatted);
        }
    };

    const handleNext = () => {
        localStorage.setItem("mimy_reg_phone", phone);
        // In real app, send SMS here
        navigate('/register/otp');
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
                    <h1 className="text-2xl font-bold">What is your number?</h1>
                    <p className="text-muted-foreground">We need it to verify your account.</p>
                </div>

                <div className="flex space-x-4">
                    <div className="w-28 border-b-2 border-border py-4 text-xl font-bold text-center flex items-center justify-center gap-2">
                        <span className="text-2xl">🇰🇷</span>
                        <span>+{countryCode}</span>
                    </div>
                    <input
                        type="tel"
                        placeholder="010-0000-0000"
                        value={phone}
                        onChange={handlePhoneChange}
                        className={cn(
                            "flex-1 text-xl font-bold bg-transparent border-b-2 border-border py-4 focus:outline-none focus:border-primary transition-colors placeholder:text-muted/20"
                        )}
                        autoFocus
                    />
                </div>
            </main>

            <footer className="mt-auto">
                <Button
                    className="w-full"
                    size="lg"
                    onClick={handleNext}
                    disabled={phone.replace(/-/g, "").length < 10}
                >
                    Send Code
                </Button>
            </footer>
        </div>
    );
};
