/**
 * Migration Script: Migrate catchtable.co.kr users to '캐치테이블' group
 * Run: npx tsx server/scripts/migrate-catchtable-users.ts
 */
import { db } from '../db/index.js';
import { users, groups } from '../db/schema.js';
import { eq, like } from 'drizzle-orm';
import { LeaderboardService } from '../services/LeaderboardService.js';

async function migrateUsers() {
    console.log('[Migration] Starting catchtable.co.kr user migration...\n');

    try {
        // 1. Create '캐치테이블' group if not exists
        console.log('[Migration] Checking for existing 캐치테이블 group...');

        const existingGroup = await db.select().from(groups)
            .where(eq(groups.name, '캐치테이블'))
            .limit(1);

        let groupId: number;

        if (existingGroup.length === 0) {
            console.log('[Migration] Creating 캐치테이블 group...');

            const [newGroup] = await db.insert(groups).values({
                name: '캐치테이블',
                type: 'COMPANY',
                allowed_domains: ['catchtable.co.kr'],
                is_active: true,
            }).returning();

            groupId = newGroup.id;
            console.log(`[Migration] Created 캐치테이블 group with ID: ${groupId}`);
        } else {
            groupId = existingGroup[0].id;
            console.log(`[Migration] Found existing 캐치테이블 group with ID: ${groupId}`);

            // Update allowed_domains if needed
            if (!existingGroup[0].allowed_domains?.includes('catchtable.co.kr')) {
                await db.update(groups)
                    .set({
                        allowed_domains: [...(existingGroup[0].allowed_domains || []), 'catchtable.co.kr'],
                        updated_at: new Date(),
                    })
                    .where(eq(groups.id, groupId));
                console.log('[Migration] Updated allowed_domains to include catchtable.co.kr');
            }
        }

        // 2. Find all users with @catchtable.co.kr email
        console.log('\n[Migration] Finding users with @catchtable.co.kr email...');

        const catchtableUsers = await db.select({
            id: users.id,
            email: users.email,
            nickname: users.nickname,
            group_id: users.group_id,
        }).from(users)
            .where(like(users.email, '%@catchtable.co.kr'));

        console.log(`[Migration] Found ${catchtableUsers.length} users with @catchtable.co.kr email`);

        if (catchtableUsers.length === 0) {
            console.log('[Migration] No users to migrate.');
            process.exit(0);
        }

        // 3. Update users who don't have a group yet
        const usersToMigrate = catchtableUsers.filter(u => !u.group_id);
        const alreadyMigrated = catchtableUsers.filter(u => u.group_id);

        console.log(`[Migration] ${alreadyMigrated.length} users already have a group assigned`);
        console.log(`[Migration] ${usersToMigrate.length} users will be migrated\n`);

        if (usersToMigrate.length > 0) {
            let migratedCount = 0;

            for (const user of usersToMigrate) {
                await db.update(users)
                    .set({
                        group_id: groupId,
                        group_email: user.email,
                        group_joined_at: new Date(),
                        updated_at: new Date(),
                    })
                    .where(eq(users.id, user.id));

                migratedCount++;
                console.log(`  [${migratedCount}/${usersToMigrate.length}] Migrated: ${user.nickname || 'Unknown'} (${user.email})`);
            }

            console.log(`\n[Migration] Successfully migrated ${migratedCount} users to 캐치테이블 group`);
        }

        // 4. Refresh leaderboard
        console.log('\n[Migration] Refreshing leaderboard...');
        await LeaderboardService.refresh();

        console.log('\n[Migration] Migration complete!');
        console.log('\nSummary:');
        console.log(`  - Group: 캐치테이블 (ID: ${groupId})`);
        console.log(`  - Total catchtable.co.kr users: ${catchtableUsers.length}`);
        console.log(`  - Already migrated: ${alreadyMigrated.length}`);
        console.log(`  - Newly migrated: ${usersToMigrate.length}`);

    } catch (error) {
        console.error('[Migration] Error:', error);
        process.exit(1);
    }

    process.exit(0);
}

migrateUsers();
