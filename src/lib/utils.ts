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

// Taste Match Logic
export interface TasteScores {
    [key: string]: number;
}

export const calculateTasteMatch = (myScores: TasteScores, targetScores: TasteScores): number => {
    const axes = ['boldness', 'acidity', 'richness', 'experimental', 'spiciness', 'sweetness', 'umami'];

    let sumSqDiff = 0;
    axes.forEach(axis => {
        const v1 = myScores[axis] || 0;
        const v2 = targetScores[axis] || 0;
        sumSqDiff += Math.pow(v1 - v2, 2);
    });

    // Gaussian (RBF) Kernel: exp(-distance^2 / (2 * sigma^2))
    // Sigma determines the width of the "bell curve".
    // A sigma of ~5 means a distance of 5 drops similarity to ~60%.
    const sigma = 5;
    const similarity = Math.exp(-sumSqDiff / (2 * sigma * sigma)) * 100;

    return Math.round(similarity);
};

export const getTasteBadgeStyle = (score: number | null) => {
    if (score === null) return "text-gray-400";

    // Text-only Orange Scale
    if (score >= 90) return "text-orange-600 font-bold";
    if (score >= 80) return "text-orange-500 font-bold";
    if (score >= 70) return "text-orange-500 font-medium";
    if (score >= 50) return "text-orange-400 font-medium";
    return "text-gray-400"; // Low match
};
