import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import * as CheckboxPrimitive from "@radix-ui/react-checkbox"

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

    const [agreements, setAgreements] = useState({
        service: false,
        privacy: false,
        marketing: false
    });

    const allRequiredChecked = agreements.service && agreements.privacy;
    const allChecked = agreements.service && agreements.privacy && agreements.marketing;

    const toggleAll = (checked: boolean) => {
        setAgreements({
            service: checked,
            privacy: checked,
            marketing: checked
        });
    };

    return (
        <div className="flex flex-col h-full bg-background px-6 pt-safe-offset-6 pb-safe-offset-6 animate-in fade-in duration-500 overflow-hidden">
            <header className="flex items-center mb-8">
                <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-muted">
                    <ChevronLeft className="w-6 h-6" />
                </button>
            </header>

            <main className="flex-1 space-y-8">
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
                        {/* Service Required */}
                        <div className="flex items-center space-x-3">
                            <Checkbox
                                id="service"
                                checked={agreements.service}
                                onCheckedChange={(c) => setAgreements(prev => ({ ...prev, service: c }))}
                            />
                            <label htmlFor="service" className="text-sm font-medium cursor-pointer text-muted-foreground flex-1 flex justify-between items-center group">
                                <span>{t('onboarding.agreement.service')}</span>
                                <ChevronRight className="w-4 h-4 opacity-50 group-hover:opacity-100" />
                            </label>
                        </div>

                        {/* Privacy Required */}
                        <div className="flex items-center space-x-3">
                            <Checkbox
                                id="privacy"
                                checked={agreements.privacy}
                                onCheckedChange={(c) => setAgreements(prev => ({ ...prev, privacy: c }))}
                            />
                            <label htmlFor="privacy" className="text-sm font-medium cursor-pointer text-muted-foreground flex-1 flex justify-between items-center group">
                                <span>{t('onboarding.agreement.privacy')}</span>
                                <ChevronRight className="w-4 h-4 opacity-50 group-hover:opacity-100" />
                            </label>
                        </div>

                        {/* Marketing Optional */}
                        <div className="flex items-center space-x-3">
                            <Checkbox
                                id="marketing"
                                checked={agreements.marketing}
                                onCheckedChange={(c) => setAgreements(prev => ({ ...prev, marketing: c }))}
                            />
                            <label htmlFor="marketing" className="text-sm font-medium cursor-pointer text-muted-foreground flex-1 flex justify-between items-center group">
                                <span>{t('onboarding.agreement.marketing')}</span>
                                <ChevronRight className="w-4 h-4 opacity-50 group-hover:opacity-100" />
                            </label>
                        </div>
                    </div>
                </div>
            </main>

            <footer className="mt-auto">
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

// Import ChevronRight here since it was used but not imported
import { ChevronRight } from 'lucide-react';
