
import { migrate } from 'drizzle-orm/neon-http/migrator';
import { db } from './index';

export async function runMigrations() {
    try {
        console.log("Running migrations...");
        await migrate(db, { migrationsFolder: 'drizzle' });
        console.log("Migrations completed!");
    } catch (error) {
        console.error("Migration failed:", error);
        // Don't exit process, lety server try to start? 
        // If critical tables missing, it will fail anyway.
    }
}
