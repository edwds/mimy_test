import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

type Lang = 'en' | 'ko';
const DEBUG_LANG = 'cimode';

const baseBtn: React.CSSProperties = {
    appearance: 'none',
    border: 'none',
    background: 'transparent',
    color: 'rgba(255,255,255,0.85)',
    padding: '8px 10px',
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 600,
    letterSpacing: 0.2,
    cursor: 'pointer',
    outline: 'none',
};

const DebugLocaleSwitcher = () => {
    const { i18n } = useTranslation();

    const current = i18n.language;
    const isDebug = current === DEBUG_LANG;

    // cimode에서 빠져나올 때 "최근 실사용 언어"로 복귀
    const lastRealLang: Lang = useMemo(() => {
        const saved = (typeof window !== 'undefined' && window.localStorage.getItem('i18nextLng')) || 'ko';
        return (saved === 'en' ? 'en' : 'ko');
    }, []);

    const setLang = (lng: Lang) => {
        i18n.changeLanguage(lng);
    };

    const toggleDebug = () => {
        if (i18n.language === DEBUG_LANG) {
            i18n.changeLanguage(lastRealLang);
        } else {
            i18n.changeLanguage(DEBUG_LANG);
        }
    };

    const SegButton = ({
        label,
        active,
        onClick,
    }: {
        label: string;
        active: boolean;
        onClick: () => void;
    }) => (
        <button
            onClick={onClick}
            aria-pressed={active}
            style={{
                ...baseBtn,
                color: active ? 'rgba(0,0,0,0.9)' : 'rgba(255,255,255,0.85)',
                background: active ? 'rgba(255,255,255,0.92)' : 'transparent',
                boxShadow: active ? '0 6px 18px rgba(0,0,0,0.25)' : 'none',
                transform: active ? 'translateY(-0.5px)' : 'none',
                transition: 'background 140ms ease, box-shadow 140ms ease, transform 140ms ease, color 140ms ease',
            }}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') onClick();
            }}
        >
            {label}
        </button>
    );

    return (
        <div
            className="hidden md:flex"
            style={{
                position: 'fixed',
                top: 16,
                right: 16,
                zIndex: 9999,
                alignItems: 'center',
                padding: '6px 8px',
                borderRadius: 9999,
                background: 'rgba(15, 15, 18, 0.72)',
                border: '1px solid rgba(255,255,255,0.12)',
                boxShadow: '0 12px 40px rgba(0,0,0,0.05)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                userSelect: 'none',
                gap: '4px',
            }}
        >
            <SegButton label="EN" active={current === 'en'} onClick={() => setLang('en')} />
            <SegButton label="KO" active={current === 'ko'} onClick={() => setLang('ko')} />
            <SegButton label="CODE" active={isDebug} onClick={toggleDebug} />
        </div>
    );
};

export default DebugLocaleSwitcher;