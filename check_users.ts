
import { db } from './server/db/index';
import { users } from './server/db/schema';
import { eq } from 'drizzle-orm';

async function check() {
    try {
        const allUsers = await db.select().from(users);
        console.log('Total users:', allUsers.length);
        if (allUsers.length > 0) {
            console.log('Sample user:', allUsers[0]);
        }

        const adminUser = await db.select().from(users).where(eq(users.id, 320));
        console.log('User 320 exists:', adminUser.length > 0);
        if (adminUser.length > 0) {
            console.log('User 320 data:', adminUser[0]);
        }
    } catch (e) {
        console.error(e);
    }
}

check();
