/**
 * food_kind 역매핑: 정규화된 카테고리명 → DB에 존재할 수 있는 모든 raw 값들
 *
 * 프론트엔드에서 '한식' 필터를 선택하면,
 * DB의 'korean_restaurant', 'KOREAN', '한식당', '한식' 등을 모두 매칭한다.
 */

const FOOD_KIND_REVERSE_MAP: Record<string, string[]> = {
    '한식': ['korean_restaurant', 'korean', 'KOREAN', '한식당', '한식'],
    '일식': ['japanese_restaurant', 'japanese', 'JAPANESE', '일식당', '일식'],
    '중식': ['chinese_restaurant', 'chinese', 'CHINESE', '중식당', '중식', '중국 음식점'],
    '이탈리안': ['italian_restaurant', 'italian', 'ITALIAN', '이탈리안', '이탈리아 음식점', '이탈리아음식'],
    '프렌치': ['french_restaurant', 'french', 'FRENCH', '프렌치', '프랑스 음식점'],
    '태국': ['thai_restaurant', 'thai', 'THAI', '태국 음식점'],
    '베트남': ['vietnamese_restaurant', 'vietnamese', 'VIETNAMESE', '베트남 음식점'],
    '인도': ['indian_restaurant', 'indian', 'INDIAN', '인도 음식점'],
    '멕시칸': ['mexican_restaurant', 'mexican', 'MEXICAN', '멕시코 음식점'],
    '미국식': ['american_restaurant', 'american', 'AMERICAN', '미국 음식점'],
    '양식': ['western', 'WESTERN', '양식'],
    '해산물': ['seafood_restaurant', 'seafood', 'SEAFOOD', '해산물', '해산물 음식점'],
    '스테이크': ['steak_house', 'steak', 'STEAK', '스테이크', '스테이크 하우스', '스테이크,립'],
    '스시': ['sushi_restaurant', 'sushi', 'SUSHI', '스시', '초밥집'],
    '라멘': ['ramen_restaurant', 'ramen', 'RAMEN', '라멘', '라멘집'],
    '피자': ['pizza_restaurant', 'pizza', 'PIZZA', '피자', '피자집'],
    '햄버거': ['hamburger_restaurant', 'hamburger', 'HAMBURGER', '햄버거', '햄버거집'],
    '카페': ['cafe', 'coffee_shop', 'CAFE', '카페', '커피숍', '커피 전문점'],
    '베이커리': ['bakery', 'BAKERY', '베이커리', '빵집'],
    '바': ['bar', 'BAR', '바'],
    '디저트': ['dessert_restaurant', 'ice_cream_shop', 'dessert', 'DESSERT', '디저트', '아이스크림', '아이스크림 가게'],
    '브런치': ['brunch_restaurant', 'breakfast_restaurant', 'brunch', 'BRUNCH', '브런치', '조식'],
    '뷔페': ['buffet_restaurant', 'buffet', 'BUFFET', '뷔페'],
    '파인다이닝': ['fine_dining_restaurant', 'fine_dining', 'FINE_DINING', '파인다이닝'],
    '패스트푸드': ['fast_food_restaurant', 'fast_food', 'FAST_FOOD', '패스트푸드'],
};

/**
 * 정규화된 카테고리명 배열을 DB 매칭용 raw 값 배열로 확장
 *
 * @example expandFoodKindFilter(['한식', '일식'])
 * // → ['korean_restaurant', 'korean', 'KOREAN', '한식당', '한식', 'japanese_restaurant', ...]
 */
export function expandFoodKindFilter(normalizedNames: string[]): string[] {
    const expanded: string[] = [];
    for (const name of normalizedNames) {
        const rawValues = FOOD_KIND_REVERSE_MAP[name];
        if (rawValues) {
            expanded.push(...rawValues);
        } else {
            // 매핑에 없으면 원본 값 그대로 사용
            expanded.push(name);
        }
    }
    return expanded;
}
