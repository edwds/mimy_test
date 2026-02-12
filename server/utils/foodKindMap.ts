/**
 * food_kind 역매핑: 정규화된 카테고리명 → DB에 존재하는 모든 raw 값들
 *
 * 프론트엔드에서 '한식' 필터를 선택하면,
 * DB의 '한식', '한식당', '한정식', 'korean_restaurant' 등을 모두 매칭한다.
 *
 * DB 실제 값 기반으로 작성됨 (144개 고유 값 전체 커버)
 */

const FOOD_KIND_REVERSE_MAP: Record<string, string[]> = {
    '한식': [
        '한식', '한식당', '한정식', '백반,가정식', '찌개,전골',
        '국수', '국수,냉면', '냉면', '분식',
        '족발,보쌈', '보쌈,족발', '족발, 보쌈',
        '곱창,막창', '뉴코리안', '닭발',
        'korean_restaurant', 'Korean Restaurant',
    ],
    '일식': [
        '일식', '이자카야', '야키토리', '돈가스',
        '일본 음식점', 'japanese_restaurant', 'Japanese Restaurant',
        '일본라면 전문식당',
    ],
    '오마카세': [
        '스시오마카세', ' 스시오마카세', '한우오마카세', '가이세키오마카세',
        '쿠시아게오마카세', '돼지고기오마카세', '일식오마카세', '기타 오마카세',
    ],
    '스시/회': [
        '회,사시미', '참치회', '스시,초밥', 'sushi_restaurant',
    ],
    '라멘': [
        '라멘', 'ramen_restaurant', 'Ramen Restaurant',
    ],
    '중식': [
        '중식', '중국 음식점', 'chinese_restaurant', 'Chinese Restaurant',
    ],
    '이탈리안': [
        '이탈리아음식', '파스타', '이탈리아 음식점', 'italian_restaurant',
    ],
    '피자': [
        '피자', '피자 전문점', 'pizza_restaurant',
    ],
    '프렌치': [
        '프랑스음식', '프랑스 음식점', 'french_restaurant',
    ],
    '양식': [
        '양식', '유러피안음식', '스페인음식', '컨템포러리',
    ],
    '고기/구이': [
        '육류,고기요리', '소고기구이', '돼지고기구이', '양고기',
        '바베큐', '숯불구이/바베큐전문점',
        'barbecue_restaurant', 'Barbecue Restaurant',
        '닭 요리', '닭,오리요리', '오리 요리',
    ],
    '스테이크': [
        '스테이크,립', '스테이크 전문점', '일본 스테이크 전문점', 'steak_house',
    ],
    '해산물': [
        '해물,생선요리', '해물(탕/찜/볶음)', '굴, 조개', '게, 랍스터', '랍스터',
        '복어요리', '장어요리', '장어 요리', '해산물 요리 전문식당',
        'seafood_restaurant', 'Seafood Restaurant', '샤브샤브',
    ],
    '바/주점': [
        '다이닝바', '요리주점', '와인', '칵테일,위스키', '맥주,호프',
        '전통주', '주점', '오뎅바', '와인 바', 'bar',
    ],
    '카페': [
        '카페', '카페,디저트', '커피숍/커피 전문점',
        'coffee_shop', 'Coffee Shop', 'cafe', 'Cafe',
    ],
    '베이커리': [
        '베이커리', '카페 & 베이커리', '제과점', '케이크', 'bakery',
    ],
    '브런치': [
        '브런치', '브런치 식당', 'brunch_restaurant',
    ],
    '태국': [
        '태국음식', '태국 음식점', 'Thai Restaurant', 'thai_restaurant',
    ],
    '베트남': [
        '베트남음식', '베트남 음식점', 'vietnamese_restaurant', 'Vietnamese Restaurant',
    ],
    '인도': [
        '인도음식', '인도요리', 'indian_restaurant',
    ],
    '멕시칸': [
        '멕시코,남미음식', '멕시코음식', 'mexican_restaurant',
    ],
    '미국식': [
        '아메리칸음식', '아메리칸 레스토랑', '햄버거', '햄버거집',
        'hamburger_restaurant', 'american_restaurant',
    ],
    '아시안': [
        '아시아음식',
    ],
    '디저트': [
        '디저트', '아이스크림 가게', 'dessert_restaurant', 'ice_cream_shop',
    ],
    '뷔페': [
        '뷔페', '호텔뷔페', 'buffet_restaurant',
    ],
    '퓨전': [
        '퓨전음식',
    ],
    '파인다이닝': [
        '파인다이닝', '코스요리', 'fine_dining_restaurant',
    ],
};

/**
 * 정규화된 카테고리명 배열을 DB 매칭용 raw 값 배열로 확장
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
