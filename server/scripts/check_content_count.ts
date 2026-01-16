
import { db } from '../db';
import { content } from '../db/schema';
import { sql } from 'drizzle-orm';

async function main() {
    const result = await db.execute(sql`SELECT count(*) FROM content`);
    console.log('Content count:', result.rows[0].count);
}
main().catch(console.error);
