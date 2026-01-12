
import { db } from './index';
import { clusters, quiz_matches } from './schema';
import CLUSTER_DATA from '../data/cluster.json';
import { MATCH_DATA } from '../data/matchData';
import { sql } from 'drizzle-orm';

async function seedQuizData() {
    console.log("Starting Quiz Data Seeding...");

    // 1. Seed Clusters
    console.log("Seeding Clusters...");
    for (const c of CLUSTER_DATA) {
        await db.insert(clusters)
            .values({
                cluster_id: parseInt(c.cluster_id),
                name: c.cluster_name,
                tagline: c.cluster_tagline,
                medoid_value: c.cluster_medoid_value
            })
            .onConflictDoUpdate({
                target: clusters.cluster_id,
                set: {
                    name: c.cluster_name,
                    tagline: c.cluster_tagline,
                    medoid_value: c.cluster_medoid_value,
                    updated_at: new Date()
                }
            });
    }
    console.log(`Seeded ${CLUSTER_DATA.length} clusters.`);

    // 2. Seed Matches
    console.log("Parsing Match Data...");
    const lines = MATCH_DATA.split('\n');
    const matchesToInsert: { vector: string; cluster_id: number }[] = [];

    for (const line of lines) {
        if (!line.trim() || line.startsWith('value')) continue;
        const parts = line.split('\t');
        if (parts.length >= 2) {
            matchesToInsert.push({
                vector: parts[0].trim(),
                cluster_id: parseInt(parts[1].trim(), 10)
            });
        }
    }

    console.log(`Seeding ${matchesToInsert.length} matches (this may take a while)...`);

    // Batch Insert (Chunking to avoid query limit)
    const BATCH_SIZE = 1000;
    for (let i = 0; i < matchesToInsert.length; i += BATCH_SIZE) {
        const batch = matchesToInsert.slice(i, i + BATCH_SIZE);
        await db.insert(quiz_matches)
            .values(batch)
            .onConflictDoNothing(); // Static data, skip if exists

        if (i % 5000 === 0) console.log(`Processed ${i} / ${matchesToInsert.length}`);
    }

    console.log("Seeding Complete!");
}

seedQuizData()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(() => process.exit(0));
