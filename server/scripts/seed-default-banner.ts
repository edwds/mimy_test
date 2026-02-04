import { db } from '../db/index.js';
import { banners } from '../db/schema.js';

async function seedBanners() {
    try {
        // Insert default write banner
        await db.insert(banners).values({
            title: '{{name}}님,\n오늘 뭐 먹었어요?',
            description: '간단한 사진 한 장으로\n내 미식 취향을 완성하세요',
            action_type: 'write',
            action_value: null,
            background_gradient: 'linear-gradient(135deg, #FDFBF7 0%, #F5F3FF 100%)',
            icon_type: 'pen',
            icon_url: null,
            is_active: true,
            display_order: 0,
        });

        console.log('✅ Default banner seeded successfully');
    } catch (error) {
        console.error('❌ Failed to seed banners:', error);
    }

    process.exit(0);
}

seedBanners();
