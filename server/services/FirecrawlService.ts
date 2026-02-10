/**
 * Firecrawl API를 사용한 웹 스크래핑 서비스
 *
 * Google Maps 웹페이지에서 상세 카테고리 정보를 추출합니다.
 */
import 'dotenv/config';

const FIRECRAWL_API_URL = 'https://api.firecrawl.dev/v1/scrape';

export interface ScrapeResult {
    category: string | null;
    allCategories: string[];
    shopName: string | null;
    address: string | null;
    rawMarkdown?: string;
    error?: string;
}

/**
 * Google Maps 페이지에서 카테고리 정보를 스크래핑합니다.
 *
 * @param googlePlaceId - Google Place ID
 * @returns 스크래핑 결과
 */
export async function scrapeGoogleMapsCategory(googlePlaceId: string): Promise<ScrapeResult> {
    const apiKey = process.env.FIRECRAWL_API_KEY;

    if (!apiKey) {
        return {
            category: null,
            allCategories: [],
            shopName: null,
            address: null,
            error: 'FIRECRAWL_API_KEY not configured'
        };
    }

    // Google Maps URL 형식
    const url = `https://www.google.com/maps/place/?q=place_id:${googlePlaceId}`;

    try {
        const response = await fetch(FIRECRAWL_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                url,
                formats: ['markdown'],
                waitFor: 3000, // JS 렌더링 대기
                headers: {
                    'Accept-Language': 'ko-KR,ko;q=0.9'
                }
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('[FirecrawlService] API error:', response.status, errorText);
            return {
                category: null,
                allCategories: [],
                shopName: null,
                address: null,
                error: `Firecrawl API error: ${response.status}`
            };
        }

        const data = await response.json();
        const markdown = data.data?.markdown || '';

        // 마크다운에서 카테고리 정보 추출
        const result = parseGoogleMapsMarkdown(markdown);

        return {
            ...result,
            rawMarkdown: markdown
        };

    } catch (error) {
        console.error('[FirecrawlService] Error:', error);
        return {
            category: null,
            allCategories: [],
            shopName: null,
            address: null,
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}

/**
 * Google Maps 마크다운에서 카테고리 정보를 파싱합니다.
 *
 * Google Maps 페이지 구조:
 * - 카테고리는 보통 가게명 근처에 버튼/링크 형태로 존재
 * - "음식점", "일본 스테이크 전문점", "라멘 전문점" 등
 */
function parseGoogleMapsMarkdown(markdown: string): Omit<ScrapeResult, 'rawMarkdown' | 'error'> {
    const lines = markdown.split('\n').map(l => l.trim()).filter(Boolean);

    let shopName: string | null = null;
    let address: string | null = null;
    const categories: string[] = [];

    // 음식점 관련 키워드
    const foodKeywords = [
        '전문점', '식당', '레스토랑', '카페', '베이커리', '바', '펍',
        '음식점', '맛집', '요리', '주점', '이자카야', '스시', '라멘',
        '파스타', '피자', '치킨', '버거', '샌드위치', '디저트', '빵집',
        '한식', '중식', '일식', '양식', '아시안', '멕시칸', '이탈리안',
        'restaurant', 'cafe', 'bakery', 'bar', 'pub'
    ];

    // 제외할 키워드 (메뉴, 버튼 텍스트, 섹션 제목 등)
    const excludeKeywords = [
        '리뷰', '사진', '저장', '공유', '경로', '전화', '웹사이트',
        '영업', '시간', '메뉴', '예약', '주문', '배달', '포장',
        '더보기', '접기', '로그인', '검색',
        // 섹션 제목들
        '주변', '근처', '인기', '추천', '관련', '비슷한', '다른',
        '지도', '길찾기', '거리뷰', '스트리트뷰', '평점', '별점',
        '최근', '새로운', '모든', '전체', '목록'
    ];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // 첫 번째 큰 제목을 가게명으로 추정
        if (!shopName && line.startsWith('#')) {
            shopName = line.replace(/^#+\s*/, '').trim();
            continue;
        }

        // 주소 패턴 찾기 (한국 주소 형식)
        if (!address && (
            line.includes('서울') || line.includes('경기') || line.includes('인천') ||
            line.includes('부산') || line.includes('대구') || line.includes('대전') ||
            line.match(/\d+[동|로|길]/)
        )) {
            // 너무 짧거나 긴 건 제외
            if (line.length > 10 && line.length < 100) {
                address = line;
            }
        }

        // 카테고리 후보 찾기
        const hasFood = foodKeywords.some(kw => line.includes(kw));
        const hasExclude = excludeKeywords.some(kw => line.includes(kw));

        if (hasFood && !hasExclude && line.length < 30) {
            // 링크 마크다운 제거
            const cleaned = line.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').trim();
            if (cleaned && !categories.includes(cleaned)) {
                categories.push(cleaned);
            }
        }
    }

    // 가장 구체적인 카테고리 선택 (길이가 긴 것이 보통 더 구체적)
    const sortedCategories = categories.sort((a, b) => b.length - a.length);
    const primaryCategory = sortedCategories[0] || null;

    return {
        category: primaryCategory,
        allCategories: categories,
        shopName,
        address
    };
}

/**
 * 배치 스크래핑을 위한 딜레이 함수
 */
export function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}
