import { db } from '../db/index.js';
import { banners } from '../db/schema.js';

async function seedExampleBanners() {
    try {
        // Example banner 2: Quiz retake
        await db.insert(banners).values({
            title: '미식 성향 테스트\n다시 해보기',
            description: '나의 미식 취향을 재발견하세요',
            action_type: 'navigate',
            action_value: '/quiz',
            background_gradient: 'linear-gradient(135deg, #E6F3FF 0%, #F0F8FF 100%)',
            icon_type: 'custom',
            icon_url: null,
            is_active: true,
            display_order: 1,
        });

        // Example banner 3: Event (with date range)
        await db.insert(banners).values({
            title: '🎉 2월 특별 이벤트\n지금 참여하세요!',
            description: '리뷰 작성하고 경품 받기',
            action_type: 'write',
            action_value: null,
            background_gradient: 'linear-gradient(135deg, #FFF5E1 0%, #FFE4E1 100%)',
            icon_type: 'pen',
            icon_url: null,
            is_active: true,
            display_order: 2,
            start_date: new Date('2026-02-01'),
            end_date: new Date('2026-02-28'),
        });

        console.log('✅ Example banners seeded successfully');
    } catch (error) {
        console.error('❌ Failed to seed example banners:', error);
    }

    process.exit(0);
}

seedExampleBanners();
