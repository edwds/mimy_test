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

        // ✅ ko-KR, en-US 같은 걸 감지해도 로딩은 ko, en만 쓰게
        load: 'languageOnly',

        // (옵션) 지원 언어를 명시하면 detector가 더 안정적으로 동작
        supportedLngs: ['ko', 'en', 'ja', 'zh'],
        nonExplicitSupportedLngs: true,

        interpolation: {
            escapeValue: false,
        },

        backend: {
            loadPath: '/locales/{{lng}}/{{ns}}.json',
        },

        detection: {
            // 필요시 우선순위/캐시 지정
            order: ['querystring', 'localStorage', 'cookie', 'navigator'],
            caches: ['localStorage', 'cookie'],
        },
    });

export default i18n;