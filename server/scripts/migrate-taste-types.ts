/**
 * Migration Script: Add tasteType to existing users
 *
 * This script calculates and adds the 32-type MBTI-style tasteType
 * to all existing users who have taste_result.scores.
 *
 * Run with: npx tsx server/scripts/migrate-taste-types.ts
 */

import { db } from '../db/index.js';
import { users } from '../db/schema.js';
import { isNotNull, eq } from 'drizzle-orm';
import { calculateTasteType } from '../utils/tasteType.js';

async function migrateTasteTypes() {
    console.log('=== Taste Type Migration ===\n');

    // Get all users with taste_result
    const allUsers = await db
        .select({
            id: users.id,
            nickname: users.nickname,
            taste_result: users.taste_result
        })
        .from(users)
        .where(isNotNull(users.taste_result));

    console.log(`Found ${allUsers.length} users with taste_result\n`);

    let updated = 0;
    let skipped = 0;
    let errors = 0;

    for (const user of allUsers) {
        try {
            const tasteResult = user.taste_result as any;

            // Skip if no scores
            if (!tasteResult?.scores) {
                console.log(`  [SKIP] User ${user.id} (${user.nickname}): No scores`);
                skipped++;
                continue;
            }

            // Skip if already has tasteType
            if (tasteResult.tasteType) {
                console.log(`  [SKIP] User ${user.id} (${user.nickname}): Already has tasteType ${tasteResult.tasteType.fullType}`);
                skipped++;
                continue;
            }

            // Calculate new taste type
            const tasteType = calculateTasteType(tasteResult.scores);

            // Update user record with new tasteType
            const updatedResult = {
                ...tasteResult,
                tasteType
            };

            await db
                .update(users)
                .set({ taste_result: updatedResult })
                .where(eq(users.id, user.id));

            console.log(`  [OK] User ${user.id} (${user.nickname}): ${tasteType.fullType}`);
            updated++;
        } catch (error) {
            console.error(`  [ERROR] User ${user.id} (${user.nickname}):`, error);
            errors++;
        }
    }

    console.log('\n=== Migration Complete ===');
    console.log(`Updated: ${updated}`);
    console.log(`Skipped: ${skipped}`);
    console.log(`Errors: ${errors}`);
    console.log(`Total: ${allUsers.length}`);
}

migrateTasteTypes()
    .then(() => {
        console.log('\nDone!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('Migration failed:', error);
        process.exit(1);
    });
