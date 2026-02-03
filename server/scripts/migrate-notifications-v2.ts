import { db } from '../db/index.js';
import { sql } from 'drizzle-orm';
import * as fs from 'fs';

async function runMigration() {
    try {
        const migrationSQL = fs.readFileSync('drizzle/0010_common_night_nurse.sql', 'utf-8');

        // Split by statement-breakpoint
        const statements = migrationSQL
            .split('--> statement-breakpoint')
            .map(s => s.trim())
            .filter(s => s.length > 0);

        console.log(`Running ${statements.length} statements...`);

        for (const statement of statements) {
            console.log('Executing:', statement.substring(0, 100) + '...');
            try {
                await db.execute(sql.raw(statement));
                console.log('✅ Success');
            } catch (error: any) {
                if (error.message?.includes('already exists')) {
                    console.log('⚠️ Already exists, skipping');
                } else {
                    console.error('❌ Error:', error.message);
                    throw error;
                }
            }
        }

        console.log('✅ Migration completed');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

runMigration();
