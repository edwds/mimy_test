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

// Format relative time (e.g., "방금", "5분 전", "1시간 전")
export function formatRelativeTime(dateString: string, locale: string = 'ko'): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) {
        return locale === 'ko' ? '방금' : 'just now';
    }

    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) {
        return locale === 'ko' ? `${diffInMinutes}분 전` : `${diffInMinutes}m ago`;
    }

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) {
        return locale === 'ko' ? `${diffInHours}시간 전` : `${diffInHours}h ago`;
    }

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) {
        return locale === 'ko' ? `${diffInDays}일 전` : `${diffInDays}d ago`;
    }

    const diffInWeeks = Math.floor(diffInDays / 7);
    if (diffInWeeks < 4) {
        return locale === 'ko' ? `${diffInWeeks}주 전` : `${diffInWeeks}w ago`;
    }

    const diffInMonths = Math.floor(diffInDays / 30);
    if (diffInMonths < 12) {
        return locale === 'ko' ? `${diffInMonths}개월 전` : `${diffInMonths}mo ago`;
    }

    const diffInYears = Math.floor(diffInDays / 365);
    return locale === 'ko' ? `${diffInYears}년 전` : `${diffInYears}y ago`;
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

// ----------------------------------------------------------------------------
// Taste Rating Conversion (0-100 Score -> 1.00-5.00 Rating)
// Anchor: 50 Score = 3.00 Rating (Neutral)
// ----------------------------------------------------------------------------

export function scoreToTasteRatingRaw(score: number): number {
    const clamped = Math.max(0, Math.min(100, score));

    // Distribution-based Mapping (Calibrated for Power=2.0)
    // P95 (87.4) -> 3.5
    // P99 (92.6) -> 4.0
    // P99.95 (96.6) -> 4.5
    // Max (100) -> 5.0

    if (clamped >= 96.6) {
        // Top 0.05% (96.6 ~ 100): 4.5 ~ 5.0
        return 4.5 + ((clamped - 96.6) / 3.4) * 0.5;
    } else if (clamped >= 92.6) {
        // Top 1% (92.6 ~ 96.6): 4.0 ~ 4.5
        return 4.0 + ((clamped - 92.6) / 4.0) * 0.5;
    } else if (clamped >= 87.4) {
        // Top 5% (87.4 ~ 92.6): 3.5 ~ 4.0
        return 3.5 + ((clamped - 87.4) / 5.2) * 0.5;
    } else {
        // Bottom 95% (0 ~ 87.4): 3.0 ~ 3.5
        // Note: 0 score maps to 3.0. 
        // If we want lower scores for really bad matches, we might want a steeper drop?
        // But user said "3~3.5 사이에 전체 95% 분포". So 3.0 is effectively the floor.
        return 3.0 + (clamped / 87.4) * 0.5;
    }
}

export function scoreToTasteRatingStep(score: number, step: number = 0.01): number {
    const raw = scoreToTasteRatingRaw(score);
    const snapped = Math.round(raw / step) * step;
    return parseFloat(snapped.toFixed(2));
}

export function scoreToTasteRating2(score: number): number {
    const raw = scoreToTasteRatingRaw(score);
    return Math.round(raw * 100) / 100;
}

export const getTasteBadgeStyle = (score: number | null) => {
    if (score === null) return "text-gray-400";

    // Text-only Orange Scale
    if (score >= 85) return "text-red-500 font-medium";
    if (score >= 70) return "text-orange-400 font-medium";
    if (score >= 55) return "text-muted-foreground";
    return "text-gray-400"; // Low match
};
