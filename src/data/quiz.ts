export type QuizAxis = 'boldness' | 'acidity' | 'richness' | 'experimental' | 'spiciness' | 'sweetness' | 'umami';

export interface Question {
    id: number;
    axis: QuizAxis;
    text: string;
}

export const QUESTIONS: Question[] = [
    // boldness (대담함/강렬함) - 맛의 강도 선호
    { id: 1, axis: 'boldness', text: "마늘, 생강 같은 강한 향이 음식의 풍미를 살린다고 생각한다." },
    { id: 2, axis: 'boldness', text: "은은한 간보다는 확 느껴지는 간이 좋다." },
    { id: 3, axis: 'boldness', text: "향신료가 많이 든 인도 카레나 태국 음식을 즐긴다." },

    // acidity (산미) - 신맛에 대한 선호
    { id: 4, axis: 'acidity', text: "레몬이나 라임을 짜 먹으면 음식이 더 맛있어진다." },
    { id: 5, axis: 'acidity', text: "신김치가 묵은 김치보다 맛있다." },
    { id: 6, axis: 'acidity', text: "요거트는 플레인 무가당도 괜찮다." },

    // richness (풍부함/기름진 맛) - 지방에서 오는 풍미 선호
    { id: 7, axis: 'richness', text: "삼겹살 먹을 때 기름기가 많은 부위를 선호한다." },
    { id: 8, axis: 'richness', text: "담백한 음식보다 고소하고 진한 맛이 좋다." },
    { id: 9, axis: 'richness', text: "아보카도의 부드럽고 고소한 질감을 좋아한다." },

    // experimental (실험성/모험심) - 새로운 맛 경험에 대한 개방성
    { id: 10, axis: 'experimental', text: "처음 먹어보는 식재료도 거부감 없이 시도한다." },
    { id: 11, axis: 'experimental', text: "평소 안 먹던 나라 음식도 호기심이 생긴다." },
    { id: 12, axis: 'experimental', text: "익숙한 맛보다 새로운 맛을 찾는 편이다." },

    // spiciness (매운맛) - 캡사이신 자극 선호
    { id: 13, axis: 'spiciness', text: "고추의 알싸한 맛과 얼얼함이 좋다." },
    { id: 14, axis: 'spiciness', text: "매운 음식을 먹으면 입맛이 돈다." },
    { id: 15, axis: 'spiciness', text: "안 매운 음식은 뭔가 아쉽게 느껴질 때가 많다." },

    // sweetness (단맛) - 당도 선호
    { id: 16, axis: 'sweetness', text: "과일은 새콤한 것보다 달콤한 게 맛있다." },
    { id: 17, axis: 'sweetness', text: "요리에 설탕이나 꿀이 들어가면 맛의 균형이 좋아진다." },
    { id: 18, axis: 'sweetness', text: "달달한 맛이 있어야 만족스럽다." },

    // umami (감칠맛) - 글루탐산 등에서 오는 깊은 맛 선호
    { id: 19, axis: 'umami', text: "육수가 우러난 국물 요리의 깊은 맛을 중요하게 생각한다." },
    { id: 20, axis: 'umami', text: "된장, 간장, 치즈 같은 발효 식품의 풍미가 좋다." },
    { id: 21, axis: 'umami', text: "버섯이나 다시마의 은은하고 깊은 맛을 즐긴다." },
];