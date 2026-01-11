import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
    en: {
        translation: {
            "common": {
                "next": "Next",
                "start": "Start",
                "confirm": "Confirm"
            },
            "onboarding": {
                "age_check": {
                    "title": "When were you born?",
                    "desc": "We need this to ensure you can use our service.",
                    "error_underage": "You must be at least 14 years old."
                },
                "agreement": {
                    "title": "Terms of Service",
                    "desc": "Please agree to the terms to continue.",
                    "all": "Agree to all",
                    "service": "Service Terms (Required)",
                    "privacy": "Privacy Policy (Required)",
                    "marketing": "Marketing (Optional)"
                }
            }
        }
    }
};

i18n
    .use(initReactI18next)
    .init({
        resources,
        lng: "en",
        interpolation: {
            escapeValue: false
        }
    });

export default i18n;
