import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

export function appendJosa(word: string, josa: '을/를' | '이/가' | '은/는' | '와/과'): string {
    const lastChar = word.charCodeAt(word.length - 1);
    const hasJongseong = (lastChar - 0xAC00) % 28 > 0;

    const josaMap = {
        '을/를': hasJongseong ? '을' : '를',
        '이/가': hasJongseong ? '이' : '가',
        '은/는': hasJongseong ? '은' : '는',
        '와/과': hasJongseong ? '과' : '와',
    };

    return `${word}${josaMap[josa]}`;
}

// Format YYYY-MM-DD visit date
// Format YYYY-MM-DD visit date
// Needs to receive 't' function from i18next to support switching languages dynamically
export function formatVisitDate(dateString: string, t: (key: string, options?: any) => string): string {
    const now = new Date();
    const date = new Date(dateString);

    // Reset time components for date comparison
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());

    const diffTime = today.getTime() - target.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    // Same day
    // Same day
    if (diffDays === 0) {
        return t('date.today');
    }

    // ~7일 미만
    if (diffDays < 7) {
        return t('date.days_ago', { count: diffDays });
    }

    // 7일~1개월 미만 (Use 30 days as approx)
    if (diffDays < 30) {
        return t('date.weeks_ago', { count: Math.floor(diffDays / 7) });
    }

    // 1개월~12개월 미만
    if (diffDays < 365) {
        return t('date.months_ago', { count: Math.floor(diffDays / 30) });
    }

    // 1년 이후
    return t('date.years_ago', { count: Math.floor(diffDays / 365) });
}

// Format created_at to "2026년 1월 13일 오후 1시 35분"
// Accepts locale string (e.g., 'ko', 'en')
export function formatFullDateTime(dateString: string, locale: string = 'ko'): string {
    const date = new Date(dateString);
    return date.toLocaleString(locale, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        hour12: true
    });
}
