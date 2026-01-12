
import { migrate } from 'drizzle-orm/neon-http/migrator';
import { db } from './index';
import path from 'path';
import fs from 'fs';

export async function runMigrations() {
    try {
        console.log("[Migration] Starting...");
        console.log(`[Migration] CWD: ${process.cwd()}`);
        console.log(`[Migration] __dirname: ${__dirname}`);

        // Try to find the drizzle folder
        const impossiblePaths = [
            path.join(process.cwd(), 'drizzle'),
            path.join(__dirname, '../../drizzle'),
            path.join(__dirname, '../drizzle'),
            path.join(process.cwd(), 'server/drizzle'), // Just in case
        ];

        let migrationFolder = '';
        for (const p of impossiblePaths) {
            if (fs.existsSync(p)) {
                console.log(`[Migration] Found drizzle folder at: ${p}`);
                migrationFolder = p;
                break;
            }
        }

        if (!migrationFolder) {
            console.error("[Migration] Could not find 'drizzle' folder in:", impossiblePaths);
            // Fallback to relative 'drizzle' and hope for the best if fs failed us
            migrationFolder = 'drizzle';
        }

        await migrate(db, { migrationsFolder: migrationFolder });
        console.log("[Migration] Completed successfully!");
    } catch (error) {
        console.error("[Migration] Failed:", error);
    }
}
