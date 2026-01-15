import { db } from './index';
import { shops } from './schema';
import { sql } from 'drizzle-orm';

const MOCK_SHOPS = [
    {
        name: "스아게 강남",
        description: "삿포로 1위 스프카레 맛집",
        address_full: "서울 강남구 테헤란로 1길 1",
        lat: 37.498095,
        lon: 127.027610,
        thumbnail_img: "https://images.unsplash.com/photo-1543353071-87d89205cf16?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=60",
        food_kind: "KOREAN", // Using existing schema enum/text
        kind: "RESTAURANT"
    },
    {
        name: "땀땀",
        description: "줄서서 먹는 곱창 쌀국수",
        address_full: "서울 강남구 강남대로 98길 12",
        lat: 37.500115,
        lon: 127.029053,
        thumbnail_img: "https://images.unsplash.com/photo-1547496502-84383a3d08c6?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=60",
        food_kind: "KOREAN",
        kind: "RESTAURANT"
    },
    {
        name: "다운타우너 청담",
        description: "프리미엄 수제버거",
        address_full: "서울 강남구 도산대로 53길 14",
        lat: 37.525546,
        lon: 127.039235,
        thumbnail_img: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=60",
        food_kind: "WESTERN",
        kind: "RESTAURANT"
    },
    {
        name: "카페 노티드 청담",
        description: "도넛 열풍의 주역",
        address_full: "서울 강남구 도산대로 53길 15",
        lat: 37.524946,
        lon: 127.039135,
        thumbnail_img: "https://images.unsplash.com/photo-1551024601-569d6f4e12a9?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=60",
        food_kind: "CAFE",
        kind: "CAFE"
    },
    {
        name: "정식당",
        description: "미슐랭 2스타 모던 한식",
        address_full: "서울 강남구 선릉로 158길 11",
        lat: 37.525200,
        lon: 127.040500,
        thumbnail_img: "https://images.unsplash.com/photo-1559339352-11d035aa65de?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=60",
        food_kind: "FINE_DINING",
        kind: "RESTAURANT"
    }
];

async function seedShops() {
    console.log("Seeding shops with coordinates...");
    try {
        for (const shop of MOCK_SHOPS) {
            await db.insert(shops).values(shop).onConflictDoNothing(); // Basic avoidance of dupes if name unique, but schema only has ID PK.
            // Actually, we might want to update if exists, but for now simple insert is okay.
            // Schema: `name` is not unique. 
            // Let's just insert them.
        }
        console.log(`Seeded ${MOCK_SHOPS.length} shops.`);
    } catch (e) {
        console.error("Error seeding shops:", e);
    }
    process.exit(0);
}

seedShops();
