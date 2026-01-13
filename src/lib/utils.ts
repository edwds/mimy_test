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

export function formatRelativeTime(dateString: string): string {
    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now.getTime() - date.getTime();
    const diffSec = diffMs / 1000;
    const diffMin = diffSec / 60;
    const diffHour = diffMin / 60;
    const diffDay = diffHour / 24;

    // 0~1시간 미만 : n분 전
    if (diffHour < 1) {
        return `${Math.max(0, Math.floor(diffMin))}분 전`;
    }
    // 1~24시간 미만 : n시간 전
    if (diffHour < 24) {
        return `${Math.floor(diffHour)}시간 전`;
    }
    // 24시간~7일 미만 : n일 전
    if (diffDay < 7) {
        return `${Math.floor(diffDay)}일 전`;
    }
    // 7일~1개월 미만 : n주 전 (1달 = 30일 기준)
    if (diffDay < 30) {
        return `${Math.floor(diffDay / 7)}주 전`;
    }
    // 1개월~12개월 미만 : n달 전
    if (diffDay < 365) {
        return `${Math.floor(diffDay / 30)}달 전`;
    }
    // 1년 이후 : n년 전
    return `${Math.floor(diffDay / 365)}년 전`;
}
