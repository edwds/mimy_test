import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, Check, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import * as CheckboxPrimitive from "@radix-ui/react-checkbox"

const API_URL = import.meta.env.VITE_API_URL || '';

interface Term {
    id: number;
    code: string;
    title: string;
    summary: string | null;
    is_required: boolean;
    version: string;
    effective_date: string;
}

// Simple Checkbox component inside file for speed
const Checkbox = ({ checked, onCheckedChange, id }: { checked: boolean; onCheckedChange: (c: boolean) => void; id: string }) => (
    <CheckboxPrimitive.Root
        id={id}
        className={cn(
            "peer h-6 w-6 shrink-0 rounded-full border border-primary shadow focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground",
            checked ? "bg-primary text-primary-foreground" : "border-muted-foreground"
        )}
        checked={checked}
        onCheckedChange={onCheckedChange}
    >
        <CheckboxPrimitive.Indicator className={cn("flex items-center justify-center text-current")}>
            <Check className="h-4 w-4" />
        </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
)

export const AgreementStep = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();

    const [terms, setTerms] = useState<Term[]>([]);
    const [agreements, setAgreements] = useState<Record<string, boolean>>({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchTerms = async () => {
            try {
                const response = await fetch(`${API_URL}/api/terms`);
                if (response.ok) {
                    const data: Term[] = await response.json();
                    setTerms(data);
                    // Initialize agreements state
                    const initialAgreements: Record<string, boolean> = {};
                    data.forEach(term => {
                        initialAgreements[term.code] = false;
                    });
                    setAgreements(initialAgreements);
                }
            } catch (error) {
                console.error('Failed to fetch terms:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchTerms();
    }, []);

    const requiredTerms = terms.filter(term => term.is_required);
    const optionalTerms = terms.filter(term => !term.is_required);

    const allRequiredChecked = requiredTerms.every(term => agreements[term.code]);
    const allChecked = terms.every(term => agreements[term.code]);

    const toggleAll = (checked: boolean) => {
        const newAgreements: Record<string, boolean> = {};
        terms.forEach(term => {
            newAgreements[term.code] = checked;
        });
        setAgreements(newAgreements);
    };

    const toggleAgreement = (code: string, checked: boolean) => {
        setAgreements(prev => ({ ...prev, [code]: checked }));
    };

    const handleTermClick = (code: string) => {
        navigate(`/terms/${code}`);
    };

    if (loading) {
        return (
            <div className="flex flex-col h-full bg-background px-6 pt-safe-offset-6 pb-safe-offset-6 animate-in fade-in duration-500">
                <header className="flex items-center mb-8">
                    <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-muted">
                        <ChevronLeft className="w-6 h-6" />
                    </button>
                </header>
                <div className="flex-1 flex items-center justify-center">
                    <div className="animate-pulse text-muted-foreground">Loading...</div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-background px-6 pt-safe-offset-6 pb-safe-offset-6 animate-in fade-in duration-500 overflow-hidden">
            <header className="flex items-center mb-8">
                <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-muted">
                    <ChevronLeft className="w-6 h-6" />
                </button>
            </header>

            <main className="flex-1 space-y-8 overflow-y-auto">
                <div className="space-y-2">
                    <h1 className="text-2xl font-bold">{t('onboarding.agreement.title')}</h1>
                    <p className="text-muted-foreground">{t('onboarding.agreement.desc')}</p>
                </div>

                <div className="space-y-6">
                    {/* All Agree */}
                    <div className="flex items-center space-x-3 p-4 bg-muted/50 rounded-xl border border-border">
                        <Checkbox
                            id="all"
                            checked={allChecked}
                            onCheckedChange={toggleAll}
                        />
                        <label htmlFor="all" className="text-base font-semibold cursor-pointer flex-1">
                            {t('onboarding.agreement.all')}
                        </label>
                    </div>

                    <div className="space-y-4 px-2">
                        {/* Required Terms */}
                        {requiredTerms.map((term) => (
                            <div key={term.code} className="flex items-center space-x-3">
                                <Checkbox
                                    id={term.code}
                                    checked={agreements[term.code] || false}
                                    onCheckedChange={(c) => toggleAgreement(term.code, c)}
                                />
                                <label
                                    htmlFor={term.code}
                                    className="text-sm font-medium cursor-pointer text-muted-foreground flex-1 flex justify-between items-center group"
                                >
                                    <span>{term.title} ({t('onboarding.agreement.required')})</span>
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            handleTermClick(term.code);
                                        }}
                                        className="p-1"
                                    >
                                        <ChevronRight className="w-4 h-4 opacity-50 group-hover:opacity-100" />
                                    </button>
                                </label>
                            </div>
                        ))}

                        {/* Optional Terms */}
                        {optionalTerms.map((term) => (
                            <div key={term.code} className="flex items-center space-x-3">
                                <Checkbox
                                    id={term.code}
                                    checked={agreements[term.code] || false}
                                    onCheckedChange={(c) => toggleAgreement(term.code, c)}
                                />
                                <label
                                    htmlFor={term.code}
                                    className="text-sm font-medium cursor-pointer text-muted-foreground flex-1 flex justify-between items-center group"
                                >
                                    <span>{term.title} ({t('onboarding.agreement.optional')})</span>
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            handleTermClick(term.code);
                                        }}
                                        className="p-1"
                                    >
                                        <ChevronRight className="w-4 h-4 opacity-50 group-hover:opacity-100" />
                                    </button>
                                </label>
                            </div>
                        ))}
                    </div>
                </div>
            </main>

            <footer className="mt-auto pt-4">
                <Button
                    className="w-full"
                    size="lg"
                    onClick={() => navigate('/login')}
                    disabled={!allRequiredChecked}
                >
                    {t('common.next')}
                </Button>
            </footer>
        </div>
    );
};
