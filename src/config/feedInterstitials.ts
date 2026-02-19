/**
 * 홈 피드 Interstitial 카드 노출 설정
 *
 * 각 타입별로 피드 내 노출 위치와 조건을 관리합니다.
 */

export const FEED_INTERSTITIAL_CONFIG = {
    /**
     * VS/Hate 카드 (밸런스 게임, 못먹는 음식)
     * - interval: N개 콘텐츠마다 1개씩 노출
     * - enabled: 활성화 여부
     */
    bonusCard: {
        enabled: true,
        interval: 3,  // 3개마다 (index 2, 5, 8, ...)
    },

    /**
     * 유저 추천 모듈 (입맛이 비슷한 사람들)
     * - position: 고정 위치 (0-based index)
     * - enabled: 활성화 여부
     */
    userRecommendation: {
        enabled: true,
        position: 4,  // 5번째 콘텐츠 뒤 (index 4)
    },

    /**
     * 유사 입맛 사용자 리스트 카드
     * - startPosition: 시작 위치 (0-based index)
     * - interval: 시작 이후 N개마다 노출
     * - enabled: 활성화 여부
     * - fetchCount: API에서 가져올 리스트 개수
     */
    similarTasteList: {
        enabled: true,
        startPosition: 7,  // 8번째 콘텐츠 뒤부터 (index 7)
        interval: 7,       // 이후 7개마다 (index 14, 21, ...)
        fetchCount: 5,     // API에서 가져올 개수
    },
};

/**
 * 특정 index에서 어떤 interstitial을 보여줄지 계산하는 헬퍼 함수
 */
export const getInterstitialConfig = (index: number) => {
    const config = FEED_INTERSTITIAL_CONFIG;
    const position = index + 1; // 1-based position

    return {
        // VS/Hate 카드
        showBonusCard: config.bonusCard.enabled && position % config.bonusCard.interval === 0,
        bonusCardIndex: config.bonusCard.enabled
            ? Math.floor(position / config.bonusCard.interval) - 1
            : -1,

        // 유저 추천 모듈
        showUserRecommendation: config.userRecommendation.enabled && index === config.userRecommendation.position,

        // 유사 입맛 리스트
        showSimilarTasteList: config.similarTasteList.enabled
            && position >= config.similarTasteList.startPosition + 1
            && (position - (config.similarTasteList.startPosition + 1)) % config.similarTasteList.interval === 0,
        similarTasteListIndex: config.similarTasteList.enabled && position >= config.similarTasteList.startPosition + 1
            ? Math.floor((position - (config.similarTasteList.startPosition + 1)) / config.similarTasteList.interval)
            : -1,
    };
};

/**
 * 타입 정의
 */
export type FeedInterstitialConfig = typeof FEED_INTERSTITIAL_CONFIG;
