import { ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import {
    TASTE_TYPE_PROFILES,
    TASTE_TYPE_LABELS
} from '@/lib/tasteType';

// 축 설명 데이터
const AXIS_EXPLANATIONS = {
    intensity: {
        ko: {
            title: '자극 강도',
            description: '음식의 자극적인 맛(매움, 강한 맛)에 대한 선호도',
            L: '부드럽고 순한 맛을 선호해요',
            H: '강렬하고 자극적인 맛을 즐겨요'
        },
        en: {
            title: 'Intensity',
            description: 'Preference for bold, spicy flavors',
            L: 'Prefers mild, gentle flavors',
            H: 'Enjoys bold, intense flavors'
        }
    },
    flavor: {
        ko: {
            title: '맛 성향',
            description: '깊고 진한 맛과 산뜻한 맛 사이의 선호도',
            D: '깊고 묵직한 맛을 좋아해요',
            A: '상큼하고 산뜻한 맛을 좋아해요'
        },
        en: {
            title: 'Flavor Profile',
            description: 'Preference between deep and fresh flavors',
            D: 'Likes deep, rich flavors',
            A: 'Likes fresh, tangy flavors'
        }
    },
    pleasure: {
        ko: {
            title: '쾌감 유형',
            description: '감칠맛과 달콤한 맛 사이의 선호도',
            U: '감칠맛 나는 음식을 좋아해요',
            S: '달콤한 음식을 좋아해요'
        },
        en: {
            title: 'Pleasure Type',
            description: 'Preference between umami and sweet',
            U: 'Enjoys savory, umami flavors',
            S: 'Enjoys sweet flavors'
        }
    },
    exploration: {
        ko: {
            title: '탐험 성향',
            description: '새로운 음식에 대한 도전 의지',
            F: '익숙하고 검증된 맛을 선호해요',
            P: '새롭고 도전적인 맛을 즐겨요'
        },
        en: {
            title: 'Exploration',
            description: 'Willingness to try new foods',
            F: 'Prefers familiar, proven flavors',
            P: 'Enjoys new, adventurous tastes'
        }
    }
};

// 서브타입 설명
const SUBTYPE_EXPLANATIONS = {
    ko: {
        title: '확신도',
        description: '맛에 대한 선호가 얼마나 뚜렷한지를 나타내요',
        A: { name: '확신형 (Assertive)', desc: '맛에 대한 확고한 기준이 있어요' },
        T: { name: '탐구형 (Turbulent)', desc: '다양한 맛을 열린 마음으로 탐색해요' }
    },
    en: {
        title: 'Certainty',
        description: 'How clear your taste preferences are',
        A: { name: 'Assertive', desc: 'Has firm standards for taste' },
        T: { name: 'Turbulent', desc: 'Explores flavors with an open mind' }
    }
};

export const TasteTypeGuideScreen = () => {
    const navigate = useNavigate();
    const { i18n } = useTranslation();
    const lang = (i18n.language === 'ko' ? 'ko' : 'en') as 'ko' | 'en';

    return (
        <div className="flex flex-col h-screen bg-background overflow-hidden">
            {/* Header */}
            <header className="shrink-0 bg-background border-b border-border pt-safe">
                <div className="flex items-center h-14 px-4">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 -ml-2 hover:bg-muted rounded-full transition-colors"
                    >
                        <ChevronLeft className="w-6 h-6" />
                    </button>
                    <h1 className="flex-1 text-center font-bold text-lg pr-10">
                        {lang === 'ko' ? '입맛 유형 가이드' : 'Taste Type Guide'}
                    </h1>
                </div>
            </header>

            {/* Content */}
            <main className="flex-1 overflow-y-auto pb-safe-offset-20">
                {/* Intro Section */}
                <section className="px-6 py-6 bg-gradient-to-br from-[#FDFBF7] to-[#F5F3FF]">
                    <h2 className="text-xl font-bold text-foreground mb-2">
                        {lang === 'ko' ? '32가지 입맛 유형' : '32 Taste Types'}
                    </h2>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                        {lang === 'ko'
                            ? '미미는 7가지 미각 축을 분석하여 MBTI처럼 4개의 알파벳 + 서브타입으로 당신의 입맛을 표현해요.'
                            : 'Mimy analyzes 7 taste axes and expresses your palate with 4 letters + subtype, like MBTI.'}
                    </p>
                </section>

                {/* Type Code Structure */}
                <section className="px-6 py-6 border-b border-border">
                    <h3 className="text-base font-bold text-foreground mb-4">
                        {lang === 'ko' ? '유형 코드 구조' : 'Type Code Structure'}
                    </h3>

                    {/* Code example */}
                    <div className="bg-muted/30 rounded-xl p-4 mb-6">
                        <div className="flex items-center justify-center gap-1 text-2xl font-black tracking-wider text-primary">
                            <span className="bg-violet-100 px-2 py-1 rounded">H</span>
                            <span className="bg-amber-100 px-2 py-1 rounded">A</span>
                            <span className="bg-emerald-100 px-2 py-1 rounded">S</span>
                            <span className="bg-sky-100 px-2 py-1 rounded">P</span>
                            <span className="text-muted-foreground">-</span>
                            <span className="bg-rose-100 px-2 py-1 rounded">A</span>
                        </div>
                        <p className="text-center text-xs text-muted-foreground mt-3">
                            {lang === 'ko' ? '예시: 선도자형 미식가' : 'Example: The Trendsetter'}
                        </p>
                    </div>

                    {/* 4 Main Axes */}
                    <div className="space-y-4">
                        {(['intensity', 'flavor', 'pleasure', 'exploration'] as const).map((axis, idx) => {
                            const axisData = AXIS_EXPLANATIONS[axis][lang];
                            const labels = TASTE_TYPE_LABELS[axis];
                            const colors = ['violet', 'amber', 'emerald', 'sky'][idx];
                            const letters = axis === 'intensity' ? ['L', 'H'] :
                                axis === 'flavor' ? ['D', 'A'] :
                                    axis === 'pleasure' ? ['U', 'S'] : ['F', 'P'];

                            return (
                                <div key={axis} className="bg-muted/20 rounded-xl p-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className={cn(
                                            "w-7 h-7 rounded-lg flex items-center justify-center text-sm font-bold",
                                            colors === 'violet' && "bg-violet-100 text-violet-700",
                                            colors === 'amber' && "bg-amber-100 text-amber-700",
                                            colors === 'emerald' && "bg-emerald-100 text-emerald-700",
                                            colors === 'sky' && "bg-sky-100 text-sky-700"
                                        )}>
                                            {idx + 1}
                                        </div>
                                        <h4 className="font-bold text-foreground">{axisData.title}</h4>
                                    </div>
                                    <p className="text-xs text-muted-foreground mb-3">{axisData.description}</p>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="bg-background rounded-lg p-3 border border-border/50">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className={cn(
                                                    "text-sm font-bold px-2 py-0.5 rounded",
                                                    colors === 'violet' && "bg-violet-100 text-violet-700",
                                                    colors === 'amber' && "bg-amber-100 text-amber-700",
                                                    colors === 'emerald' && "bg-emerald-100 text-emerald-700",
                                                    colors === 'sky' && "bg-sky-100 text-sky-700"
                                                )}>
                                                    {letters[0]}
                                                </span>
                                                <span className="text-xs font-medium text-foreground">
                                                    {labels[letters[0] as keyof typeof labels][lang]}
                                                </span>
                                            </div>
                                            <p className="text-xs text-muted-foreground">
                                                {(axisData as any)[letters[0]]}
                                            </p>
                                        </div>
                                        <div className="bg-background rounded-lg p-3 border border-border/50">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className={cn(
                                                    "text-sm font-bold px-2 py-0.5 rounded",
                                                    colors === 'violet' && "bg-violet-100 text-violet-700",
                                                    colors === 'amber' && "bg-amber-100 text-amber-700",
                                                    colors === 'emerald' && "bg-emerald-100 text-emerald-700",
                                                    colors === 'sky' && "bg-sky-100 text-sky-700"
                                                )}>
                                                    {letters[1]}
                                                </span>
                                                <span className="text-xs font-medium text-foreground">
                                                    {labels[letters[1] as keyof typeof labels][lang]}
                                                </span>
                                            </div>
                                            <p className="text-xs text-muted-foreground">
                                                {(axisData as any)[letters[1]]}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}

                        {/* Subtype */}
                        <div className="bg-muted/20 rounded-xl p-4">
                            <div className="flex items-center gap-2 mb-2">
                                <div className="w-7 h-7 rounded-lg flex items-center justify-center text-sm font-bold bg-rose-100 text-rose-700">
                                    5
                                </div>
                                <h4 className="font-bold text-foreground">{SUBTYPE_EXPLANATIONS[lang].title}</h4>
                            </div>
                            <p className="text-xs text-muted-foreground mb-3">{SUBTYPE_EXPLANATIONS[lang].description}</p>
                            <div className="grid grid-cols-2 gap-2">
                                <div className="bg-background rounded-lg p-3 border border-border/50">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-sm font-bold px-2 py-0.5 rounded bg-rose-100 text-rose-700">-A</span>
                                        <span className="text-xs font-medium text-foreground">
                                            {SUBTYPE_EXPLANATIONS[lang].A.name}
                                        </span>
                                    </div>
                                    <p className="text-xs text-muted-foreground">{SUBTYPE_EXPLANATIONS[lang].A.desc}</p>
                                </div>
                                <div className="bg-background rounded-lg p-3 border border-border/50">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-sm font-bold px-2 py-0.5 rounded bg-rose-100 text-rose-700">-T</span>
                                        <span className="text-xs font-medium text-foreground">
                                            {SUBTYPE_EXPLANATIONS[lang].T.name}
                                        </span>
                                    </div>
                                    <p className="text-xs text-muted-foreground">{SUBTYPE_EXPLANATIONS[lang].T.desc}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* 16 Types Matrix Table */}
                <section className="px-4 py-6">
                    <h3 className="text-base font-bold text-foreground mb-4 px-2">
                        {lang === 'ko' ? '16가지 입맛 유형' : '16 Taste Types'}
                    </h3>

                    {/* 4x4 Matrix Table */}
                    <div className="overflow-x-auto rounded-xl border border-border">
                        <table className="w-full text-xs border-collapse">
                            {/* Header Row 1: Pleasure axis */}
                            <thead>
                                <tr className="bg-muted/30">
                                    <th rowSpan={2} className="border border-border p-2 text-center font-bold bg-muted/50 w-12">
                                        {lang === 'ko' ? '구분' : ''}
                                    </th>
                                    <th rowSpan={2} className="border border-border p-2 text-center font-bold bg-muted/50 w-12">
                                    </th>
                                    <th colSpan={2} className="border border-border p-2 text-center font-bold">
                                        <span className="text-emerald-700">U</span>
                                        <span className="text-muted-foreground ml-1">({lang === 'ko' ? '감칠' : 'Umami'})</span>
                                    </th>
                                    <th colSpan={2} className="border border-border p-2 text-center font-bold">
                                        <span className="text-emerald-700">S</span>
                                        <span className="text-muted-foreground ml-1">({lang === 'ko' ? '달콤' : 'Sweet'})</span>
                                    </th>
                                </tr>
                                {/* Header Row 2: Exploration axis */}
                                <tr className="bg-muted/20">
                                    <th className="border border-border p-2 text-center font-medium">
                                        <span className="text-sky-700">F</span>
                                        <span className="text-muted-foreground ml-1">({lang === 'ko' ? '안정' : 'Familiar'})</span>
                                    </th>
                                    <th className="border border-border p-2 text-center font-medium">
                                        <span className="text-sky-700">P</span>
                                        <span className="text-muted-foreground ml-1">({lang === 'ko' ? '탐험' : 'Progressive'})</span>
                                    </th>
                                    <th className="border border-border p-2 text-center font-medium">
                                        <span className="text-sky-700">F</span>
                                        <span className="text-muted-foreground ml-1">({lang === 'ko' ? '안정' : 'Familiar'})</span>
                                    </th>
                                    <th className="border border-border p-2 text-center font-medium">
                                        <span className="text-sky-700">P</span>
                                        <span className="text-muted-foreground ml-1">({lang === 'ko' ? '탐험' : 'Progressive'})</span>
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {/* L + D row */}
                                <tr>
                                    <td rowSpan={2} className="border border-border p-2 text-center font-bold bg-muted/30 align-middle">
                                        <span className="text-violet-700">L</span>
                                        <span className="block text-[10px] text-muted-foreground">({lang === 'ko' ? '저자극' : 'Low'})</span>
                                    </td>
                                    <td className="border border-border p-2 text-center font-bold bg-muted/20">
                                        <span className="text-amber-700">D</span>
                                        <span className="block text-[10px] text-muted-foreground">({lang === 'ko' ? '깊이' : 'Deep'})</span>
                                    </td>
                                    {['LDUF', 'LDUP', 'LDSF', 'LDSP'].map((code) => {
                                        const profile = TASTE_TYPE_PROFILES[code];
                                        return (
                                            <td key={code} className="border border-border p-2 text-center bg-background">
                                                <div className="font-bold text-primary text-sm">{code}</div>
                                                <div className="font-medium text-foreground text-[11px]">{profile.name[lang]}</div>
                                            </td>
                                        );
                                    })}
                                </tr>
                                {/* L + A row */}
                                <tr>
                                    <td className="border border-border p-2 text-center font-bold bg-muted/20">
                                        <span className="text-amber-700">A</span>
                                        <span className="block text-[10px] text-muted-foreground">({lang === 'ko' ? '산뜻' : 'Acidic'})</span>
                                    </td>
                                    {['LAUF', 'LAUP', 'LASF', 'LASP'].map((code) => {
                                        const profile = TASTE_TYPE_PROFILES[code];
                                        return (
                                            <td key={code} className="border border-border p-2 text-center bg-background">
                                                <div className="font-bold text-primary text-sm">{code}</div>
                                                <div className="font-medium text-foreground text-[11px]">{profile.name[lang]}</div>
                                            </td>
                                        );
                                    })}
                                </tr>
                                {/* H + D row */}
                                <tr>
                                    <td rowSpan={2} className="border border-border p-2 text-center font-bold bg-muted/30 align-middle">
                                        <span className="text-violet-700">H</span>
                                        <span className="block text-[10px] text-muted-foreground">({lang === 'ko' ? '고자극' : 'High'})</span>
                                    </td>
                                    <td className="border border-border p-2 text-center font-bold bg-muted/20">
                                        <span className="text-amber-700">D</span>
                                        <span className="block text-[10px] text-muted-foreground">({lang === 'ko' ? '깊이' : 'Deep'})</span>
                                    </td>
                                    {['HDUF', 'HDUP', 'HDSF', 'HDSP'].map((code) => {
                                        const profile = TASTE_TYPE_PROFILES[code];
                                        return (
                                            <td key={code} className="border border-border p-2 text-center bg-background">
                                                <div className="font-bold text-primary text-sm">{code}</div>
                                                <div className="font-medium text-foreground text-[11px]">{profile.name[lang]}</div>
                                            </td>
                                        );
                                    })}
                                </tr>
                                {/* H + A row */}
                                <tr>
                                    <td className="border border-border p-2 text-center font-bold bg-muted/20">
                                        <span className="text-amber-700">A</span>
                                        <span className="block text-[10px] text-muted-foreground">({lang === 'ko' ? '산뜻' : 'Acidic'})</span>
                                    </td>
                                    {['HAUF', 'HAUP', 'HASF', 'HASP'].map((code) => {
                                        const profile = TASTE_TYPE_PROFILES[code];
                                        return (
                                            <td key={code} className="border border-border p-2 text-center bg-background">
                                                <div className="font-bold text-primary text-sm">{code}</div>
                                                <div className="font-medium text-foreground text-[11px]">{profile.name[lang]}</div>
                                            </td>
                                        );
                                    })}
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    {/* Note about subtypes */}
                    <p className="mt-4 text-xs text-muted-foreground text-center px-2">
                        {lang === 'ko'
                            ? '* 각 유형에 -A(확신형) 또는 -T(탐구형)가 붙어 총 32가지 유형이 됩니다.'
                            : '* Each type gets -A (Assertive) or -T (Turbulent) suffix for 32 total types.'}
                    </p>
                </section>

                {/* 16 Types Detailed List */}
                <section className="px-6 py-6 border-t border-border">
                    <h3 className="text-base font-bold text-foreground mb-4">
                        {lang === 'ko' ? '유형별 상세 설명' : 'Type Descriptions'}
                    </h3>

                    <div className="space-y-3">
                        {Object.entries(TASTE_TYPE_PROFILES).map(([code, profile]) => (
                            <div key={code} className="bg-muted/20 rounded-xl p-4">
                                <div className="flex items-center gap-3 mb-2">
                                    <span className="font-bold text-primary text-lg tracking-wide">{code}</span>
                                    <span className="font-bold text-foreground">{profile.name[lang]}</span>
                                </div>
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                    {profile.tagline[lang]}
                                </p>
                            </div>
                        ))}
                    </div>
                </section>
            </main>
        </div>
    );
};
