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

    // acidity (산미) - 신맛에 대한 선호
    { id: 3, axis: 'acidity', text: "레몬이나 라임을 짜 먹으면 음식이 더 맛있어진다." },
    { id: 4, axis: 'acidity', text: "새콤한 소스나 식초를 음식에 자주 뿌린다." },

    // richness (풍부함/기름진 맛) - 지방에서 오는 풍미 선호
    { id: 5, axis: 'richness', text: "삼겹살 먹을 때 기름기가 많은 부위를 선호한다." },
    { id: 6, axis: 'richness', text: "고소하고 진한 맛의 음식이 끌린다." },

    // experimental (실험성/모험심) - 새로운 맛 경험에 대한 개방성
    { id: 7, axis: 'experimental', text: "처음 먹어보는 식재료도 거부감 없이 시도한다." },
    { id: 8, axis: 'experimental', text: "새로운 맛을 찾아다니는 편이다." },

    // spiciness (매운맛) - 캡사이신 자극 선호
    { id: 9, axis: 'spiciness', text: "고추의 알싸한 맛과 얼얼함이 좋다." },
    { id: 10, axis: 'spiciness', text: "안 매운 음식은 뭔가 아쉽게 느껴질 때가 많다." },

    // sweetness (단맛) - 음식 속 단맛 선호
    { id: 11, axis: 'sweetness', text: "달짝지근하게 양념된 음식이 입에 맞는다." },
    { id: 12, axis: 'sweetness', text: "간이 달콤하게 된 음식이 편하게 느껴진다." },

    // umami (감칠맛) - 깊은 맛 선호
    { id: 13, axis: 'umami', text: "진하게 우려낸 맛이 있어야 음식이 만족스럽다." },
    { id: 14, axis: 'umami', text: "음식의 뒷맛이 깊고 여운이 오래가는 걸 좋아한다." },
];