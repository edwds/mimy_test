/**
 * HomeTab V2 섹션 설정
 * 섹션 순서 변경은 이 파일만 수정하면 됨
 */

export interface HomeSectionConfig {
    id: string;
    titleKey: string; // i18n key
    fetchLimit: number;
    minItems: number; // 이 수 미만이면 섹션 숨김
    requiresAuth: boolean;
    requiresLocation: boolean;
    priority: 'eager' | 'lazy'; // eager = 즉시 로드, lazy = 뷰포트 진입 시 로드
}

export const HOME_SECTIONS: HomeSectionConfig[] = [
    {
        id: 'similar_taste_reviews',
        titleKey: 'home.sections.similar_taste_reviews',
        fetchLimit: 10,
        minItems: 1,
        requiresAuth: true,
        requiresLocation: false,
        priority: 'eager',
    },
    {
        id: 'recommended_shops',
        titleKey: 'home.sections.recommended_shops',
        fetchLimit: 10,
        minItems: 1,
        requiresAuth: true,
        requiresLocation: true,
        priority: 'eager',
    },
    {
        id: 'vs_game',
        titleKey: 'home.sections.vs_game',
        fetchLimit: 5,
        minItems: 1,
        requiresAuth: true,
        requiresLocation: false,
        priority: 'eager',
    },
    {
        id: 'similar_taste_users',
        titleKey: 'home.sections.similar_taste_users',
        fetchLimit: 5,
        minItems: 1,
        requiresAuth: true,
        requiresLocation: false,
        priority: 'eager',
    },
    {
        id: 'similar_taste_lists',
        titleKey: 'home.sections.similar_taste_lists',
        fetchLimit: 5,
        minItems: 1,
        requiresAuth: true,
        requiresLocation: false,
        priority: 'lazy',
    },
    {
        id: 'popular_posts',
        titleKey: 'home.sections.popular_posts',
        fetchLimit: 10,
        minItems: 1,
        requiresAuth: false,
        requiresLocation: false,
        priority: 'lazy',
    },
    {
        id: 'following_feed',
        titleKey: 'home.sections.following_feed',
        fetchLimit: 10,
        minItems: 1,
        requiresAuth: true,
        requiresLocation: false,
        priority: 'lazy',
    },
];
