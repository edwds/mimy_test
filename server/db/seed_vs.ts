import { db } from './index.js';
import { vs_prop } from './schema.js';

const SEED_DATA = [
    { item_a: "소고기", item_b: "돼지고기", category: "meat" },
    { item_a: "떡볶이", item_b: "마라탕", category: "spicy" },
    { item_a: "짬뽕", item_b: "짜장면", category: "chinese" },
    { item_a: "회", item_b: "스시", category: "seafood" },
    { item_a: "피자", item_b: "치킨", category: "delivery" },
    { item_a: "맥주", item_b: "소주", category: "alcohol" },
    { item_a: "부먹", item_b: "찍먹", category: "style" },
    { item_a: "물냉", item_b: "비냉", category: "korean" },
    { item_a: "김치찌개", item_b: "된장찌개", category: "korean" },
];

async function seedVsProps() {
    console.log('🌱 Seeding VS properties...');

    try {
        for (const item of SEED_DATA) {
            await db.insert(vs_prop).values(item).onConflictDoNothing();
        }
        console.log('✅ VS properties seeded successfully!');
    } catch (error) {
        console.error('❌ Error seeding VS properties:', error);
    }
}

// Allow running directly
if (import.meta.url === `file://${process.argv[1]}`) {
    seedVsProps().then(() => process.exit(0));
}

export { seedVsProps };
