
import { db } from "./db/index.js";
import { users } from "./db/schema.js";

async function run() {
    const list = await db.select({ id: users.id, nickname: users.nickname }).from(users).limit(5);
    console.log("Users:", list);
    process.exit(0);
}
run();
