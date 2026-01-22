
import { db } from '../db/index.js';
import { users } from '../db/schema.js';
import { gte, lte, and, asc } from 'drizzle-orm';

async function main() {
    const allUsers = await db.select({ id: users.id })
        .from(users)
        .where(and(gte(users.id, 191), lte(users.id, 1318)))
        .orderBy(asc(users.id));

    console.log(`Found ${allUsers.length} users.`);
    let gap = false;
    for (let i = 0; i < allUsers.length; i++) {
        if (allUsers[i].id !== 191 + i) {
            console.log(`Gap found at index ${i}. Expected ${191 + i}, got ${allUsers[i].id}`);
            gap = true;
            break;
        }
    }
    if (!gap) console.log("IDs are contiguous from 191 to 1318.");
    process.exit(0);
}
main();
