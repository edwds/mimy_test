import { db } from './index.js';
import { hate_prop } from './schema.js';

const SEED_DATA = [
    { item: "오이", category: "vegetable" },
    { item: "민트초코", category: "desert" },
    { item: "하와이안 피자", category: "pizza" },
    { item: "굴", category: "seafood" },
    { item: "가지", category: "vegetable" },
    { item: "고수", category: "vegetable" },
    { item: "홍어", category: "seafood" },
    { item: "닭발", category: "meat" },
    { item: "번데기", category: "snack" },
    { item: "건포도", category: "fruit" },
];

async function seedHateProps() {
    console.log('🌱 Seeding Hate properties...');

    try {
        for (const item of SEED_DATA) {
            // Using a raw check or simple insert. Since we don't have unique constraint on item name in schema (only ID),
            // maybe we should check if exists or just insert. 
            // The VS seed used onConflictDoNothing but vs_prop has no unique constraint on items usually unless defined.
            // Let's just standard insert for now, assuming empty table or we don't care about dupes for this test.
            // Actually VS seed used onConflictDoNothing, implying unique constraint or primary key conflict? 
            // In schema, vs_prop only has PK on ID. So onConflictDoNothing might do nothing if ID is not provided.
            // Let's just insert.
            await db.insert(hate_prop).values(item);
        }
        console.log('✅ Hate properties seeded successfully!');
    } catch (error) {
        console.error('❌ Error seeding Hate properties:', error);
    }
}

// Allow running directly
if (import.meta.url === `file://${process.argv[1]}`) {
    seedHateProps().then(() => process.exit(0));
}

export { seedHateProps };
