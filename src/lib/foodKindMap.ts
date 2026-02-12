/**
 * food_kind 값을 한국어 표시명으로 변환하는 매핑 유틸리티
 *
 * DB에는 다양한 소스(Google Places types, displayName, 수동 입력)에서
 * 온 값이 혼재되어 있으므로, 프론트엔드에서 통일된 한국어로 표시한다.
 */

const FOOD_KIND_MAP: Record<string, string> = {
    // Google Places types (snake_case)
    korean_restaurant: '한식',
    japanese_restaurant: '일식',
    chinese_restaurant: '중식',
    italian_restaurant: '이탈리안',
    french_restaurant: '프렌치',
    thai_restaurant: '태국',
    vietnamese_restaurant: '베트남',
    indian_restaurant: '인도',
    mexican_restaurant: '멕시칸',
    american_restaurant: '미국식',
    seafood_restaurant: '해산물',
    steak_house: '스테이크',
    sushi_restaurant: '스시',
    ramen_restaurant: '라멘',
    pizza_restaurant: '피자',
    hamburger_restaurant: '햄버거',
    cafe: '카페',
    coffee_shop: '카페',
    bakery: '베이커리',
    bar: '바',
    dessert_restaurant: '디저트',
    ice_cream_shop: '디저트',
    brunch_restaurant: '브런치',
    breakfast_restaurant: '브런치',
    buffet_restaurant: '뷔페',
    fine_dining_restaurant: '파인다이닝',
    fast_food_restaurant: '패스트푸드',
    restaurant: '음식점',
    meal_delivery: '음식점',
    meal_takeaway: '음식점',

    // Seed data / 수동 입력 (uppercase)
    korean: '한식',
    japanese: '일식',
    chinese: '중식',
    western: '양식',
    italian: '이탈리안',
    french: '프렌치',
    thai: '태국',
    vietnamese: '베트남',
    indian: '인도',
    mexican: '멕시칸',
    american: '미국식',
    seafood: '해산물',
    steak: '스테이크',
    sushi: '스시',
    ramen: '라멘',
    pizza: '피자',
    hamburger: '햄버거',
    bakery_upper: '베이커리',
    bar_upper: '바',
    dessert: '디저트',
    brunch: '브런치',
    buffet: '뷔페',
    fine_dining: '파인다이닝',
    fast_food: '패스트푸드',

    // Google Places primaryTypeDisplayName (한국어)
    한식당: '한식',
    한식: '한식',
    일식당: '일식',
    일식: '일식',
    중식당: '중식',
    중식: '중식',
    '중국 음식점': '중식',
    이탈리안: '이탈리안',
    '이탈리아 음식점': '이탈리안',
    프렌치: '프렌치',
    '프랑스 음식점': '프렌치',
    '태국 음식점': '태국',
    '베트남 음식점': '베트남',
    '인도 음식점': '인도',
    '멕시코 음식점': '멕시칸',
    '미국 음식점': '미국식',
    해산물: '해산물',
    '해산물 음식점': '해산물',
    스테이크: '스테이크',
    '스테이크 하우스': '스테이크',
    스시: '스시',
    '초밥집': '스시',
    라멘: '라멘',
    '라멘집': '라멘',
    피자: '피자',
    '피자집': '피자',
    햄버거: '햄버거',
    '햄버거집': '햄버거',
    카페: '카페',
    '커피숍': '카페',
    '커피 전문점': '카페',
    베이커리: '베이커리',
    '빵집': '베이커리',
    바: '바',
    디저트: '디저트',
    '아이스크림': '디저트',
    '아이스크림 가게': '디저트',
    브런치: '브런치',
    '조식': '브런치',
    뷔페: '뷔페',
    파인다이닝: '파인다이닝',
    패스트푸드: '패스트푸드',
    양식: '양식',
    음식점: '음식점',
};

/**
 * food_kind raw 값을 한국어 표시명으로 변환
 * @param foodKind DB에 저장된 food_kind 값
 * @param fallback 매핑이 없을 때 기본값 (기본: '음식점')
 * @returns 한국어 표시명
 */
export function formatFoodKind(foodKind: string | null | undefined, fallback = '음식점'): string {
    if (!foodKind) return fallback;

    // 정확히 매칭되는 경우 (case-insensitive)
    const lower = foodKind.toLowerCase().trim();
    if (FOOD_KIND_MAP[lower]) return FOOD_KIND_MAP[lower];

    // 원본 그대로 매칭 시도 (한국어 등)
    if (FOOD_KIND_MAP[foodKind.trim()]) return FOOD_KIND_MAP[foodKind.trim()];

    // 부분 매칭: "음식점" 접미사 제거 후 재시도
    const withoutSuffix = foodKind.replace(/\s*(음식점|레스토랑|식당)$/, '').trim();
    if (withoutSuffix !== foodKind && FOOD_KIND_MAP[withoutSuffix]) {
        return FOOD_KIND_MAP[withoutSuffix];
    }

    // 매핑 없으면 원본 값 반환 (이미 한국어일 수 있음)
    return foodKind;
}
