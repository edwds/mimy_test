import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export const PhoneStep = () => {
    useTranslation();
    const navigate = useNavigate();
    const [phone, setPhone] = useState("");
    const [countryCode, setCountryCode] = useState("82");

    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        // Delay focus to ensure animation completes and keyboard triggers
        const timer = setTimeout(() => {
            inputRef.current?.focus();
        }, 300);
        return () => clearTimeout(timer);
    }, []);

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
        <div className="flex flex-col h-full bg-background p-6 animate-in fade-in duration-500 overflow-hidden">
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
                    <select
                        value={countryCode}
                        onChange={(e) => {
                            setCountryCode(e.target.value);
                            setPhone(""); // Reset phone on country change
                        }}
                        className="w-28 border-b-2 border-border py-4 text-xl font-bold bg-transparent focus:outline-none focus:border-primary text-center appearance-none"
                    >
                        <option value="82">🇰🇷 +82</option>
                        <option value="81">🇯🇵 +81</option>
                        <option value="886">🇹🇼 +886</option>
                        <option value="852">🇭🇰 +852</option>
                        <option value="65">🇸🇬 +65</option>
                        <option value="66">🇹🇭 +66</option>
                        <option value="1">🇺🇸 +1</option>
                        <option value="61">🇦🇺 +61</option>
                    </select>
                    <input
                        ref={inputRef}
                        type="tel"
                        placeholder="Phone Number"
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
