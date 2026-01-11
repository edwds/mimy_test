export type QuizAxis = 'boldness' | 'acidity' | 'richness' | 'experimental' | 'spiciness' | 'sweetness' | 'umami';

export interface Question {
    id: number;
    axis: QuizAxis;
    text: string;
}

export const QUESTIONS: Question[] = [
    { id: 1, axis: 'boldness', text: "나는 음식의 향과 풍미가 아주 강한 것을 선호한다." },
    { id: 2, axis: 'boldness', text: "소금이나 후추, 허브를 넉넉히 쓰는 편이다." },
    { id: 3, axis: 'boldness', text: "은은한 맛보다는 확실하고 진한 맛을 좋아한다." },
    { id: 4, axis: 'acidity', text: "새콤한 맛이나 식초의 시큼함을 즐긴다." },
    { id: 5, axis: 'acidity', text: "레몬즙이나 드레싱이 들어간 음식을 자주 찾는다." },
    { id: 6, axis: 'acidity', text: "과일의 산미가 느껴지는 디저트를 좋아한다." },
    { id: 7, axis: 'richness', text: "버터나 크림이 많이 들어간 묵직한 맛을 좋아한다." },
    { id: 8, axis: 'richness', text: "고기 지방의 고소함을 즐기는 편이다." },
    { id: 9, axis: 'richness', text: "치즈나 기름진 음식을 먹어도 질리지 않는다." },
    { id: 10, axis: 'experimental', text: "먹어보지 못한 새로운 식재료나 요리에 거부감이 없다." },
    { id: 11, axis: 'experimental', text: "퓨전 요리나 독특한 조합의 음식을 시도하는 것을 즐긴다." },
    { id: 12, axis: 'experimental', text: "항상 먹던 것보다 새로운 맛집을 찾아다닌다." },
    { id: 13, axis: 'spiciness', text: "매운 음식을 잘 먹고 스트레스가 풀린다고 느낀다." },
    { id: 14, axis: 'spiciness', text: "웬만한 음식에 고추나 핫소스를 추가하고 싶을 때가 많다." },
    { id: 15, axis: 'spiciness', text: "혀가 얼얼할 정도의 화끈한 맛을 선호한다." },
    { id: 16, axis: 'sweetness', text: "식후에 달콤한 디저트를 반드시 챙겨 먹는 편이다." },
    { id: 17, axis: 'sweetness', text: "단짠단짠(달고 짠) 맛의 조화를 매우 좋아한다." },
    { id: 18, axis: 'sweetness', text: "음식에 설탕이나 시럽이 들어간 달달한 풍미를 즐긴다." },
    { id: 19, axis: 'umami', text: "국물 요리의 깊고 진한 감칠맛을 중요하게 생각한다." },
    { id: 20, axis: 'umami', text: "버섯, 다시마, 숙성 치즈 같은 깊은 풍미를 좋아한다." },
    { id: 21, axis: 'umami', text: "입에 착 붙는 조미료나 발효 음식의 맛을 선호한다." },
];

export const LIKERT_MAP: Record<number, number> = { 1: -2, 2: -1, 3: 0, 4: 1, 5: 2 };
