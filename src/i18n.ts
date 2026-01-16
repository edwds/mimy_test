import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import HttpBackend from 'i18next-http-backend';
import LanguageDetector from 'i18next-browser-languagedetector';

i18n
    .use(HttpBackend)
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        fallbackLng: 'ko',
        debug: false,

        // 리소스 로드는 ko/en 같은 언어코드만
        load: 'languageOnly',
        supportedLngs: ['ko', 'en', 'ja', 'zh'],
        nonExplicitSupportedLngs: true,
        cleanCode: true,

        backend: {
            loadPath: '/locales/{{lng}}/{{ns}}.json',
        },

        detection: {
            order: ['querystring', 'localStorage', 'cookie', 'navigator'],
            caches: ['localStorage', 'cookie'],

            // ✅ 핵심: 감지 결과를 언어만 남기기 (ko-KR -> ko)
            convertDetectedLanguage: (lng: string) => lng?.split?.('-')?.[0] ?? lng,
        },

        interpolation: { escapeValue: false },
    });

export default i18n;