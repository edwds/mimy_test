import { db } from '../db/index.js';
import { clusters, quiz_matches } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { MATCH_DATA } from '../data/matchData.js';
import CLUSTER_DATA from '../data/cluster.json' with { type: "json" };
// Note: JSON import in ESM might require assertions or just default import if handled by node. 
// Standard Node ESM for JSON: import data from './data.json' with { type: 'json' };
// But TS might complain. 
// Actually, with "moduleResolution": "Bundler", it might be fine.
// But mostly safer to just require or keep as is if TS handles it?
// Node requires "with { type: 'json' }" for JSON modules in ESM.
// Let's stick to standard imports first. If it breaks, we fix.
// Wait, `import CLUSTER_DATA from '../data/cluster.json';`
// In native Node ESM, this throws "TypeError: ... needs an import assertion of type 'json'".
// Let's use `createRequire` or `with { type: 'json' }`.
// Since we are targeting Node 22 (or modern), `with` is the standard.
// But let's check matches first.
// `../data/matchData` is likely a TS file?





interface ClusterData {
    cluster_id: string | number; // or number, json has string
    medoid_value: string;
    name: string;
    tagline: string;
}

export interface QuizResult {
    clusterId: number;
    clusterData: {
        cluster_id: string; // Keep string for compatibility if needed, but DB is int
        cluster_name: string;
        cluster_tagline: string;
    } | null;
    scores: Record<string, number>;
}

// Axis mapping based on frontend questions
// 1-3: boldness
// 4-6: acidity
// 7-9: richness
// 10-12: experimental
// 13-15: spiciness
// 16-18: sweetness
// 19-21: umami
const AXIS_ORDER = [
    'boldness',
    'acidity',
    'richness',
    'experimental',
    'spiciness',
    'sweetness',
    'umami'
];

export class QuizManager {
    private static instance: QuizManager;
    private isLoaded: boolean = false;

    private constructor() { }

    public static getInstance(): QuizManager {
        if (!QuizManager.instance) {
            QuizManager.instance = new QuizManager();
        }
        return QuizManager.instance;
    }

    public async checkAndSeed() {
        if (this.isLoaded) return;

        try {
            console.log("[QuizManager] Checking if seeding is needed...");
            // Check if matches exist
            const existingMatch = await db.select().from(quiz_matches).limit(1);
            if (existingMatch.length > 0) {
                console.log("[QuizManager] DB already seeded.");
                this.isLoaded = true;
                return;
            }

            console.log("[QuizManager] Seeding DB from memory...");

            // 1. Seed Clusters
            for (const c of CLUSTER_DATA) {
                await db.insert(clusters)
                    .values({
                        cluster_id: parseInt(c.cluster_id),
                        name: c.cluster_name,
                        tagline: c.cluster_tagline,
                        medoid_value: c.cluster_medoid_value
                    })
                    .onConflictDoNothing();
            }

            // 2. Seed Matches
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

            // Batch Insert
            const BATCH_SIZE = 1000;
            for (let i = 0; i < matchesToInsert.length; i += BATCH_SIZE) {
                const batch = matchesToInsert.slice(i, i + BATCH_SIZE);
                await db.insert(quiz_matches)
                    .values(batch)
                    .onConflictDoNothing();
                if (i % 5000 === 0) console.log(`[QuizManager] Seeded ${i} rows...`);
            }

            this.isLoaded = true;
            console.log(`[QuizManager] Seeding complete.`);

        } catch (error) {
            console.error('[QuizManager] Failed to seed data:', error);
        }
    }

    public async calculate(answers: Record<number, number>): Promise<QuizResult> {
        // Ensure data is loaded/seeded
        if (!this.isLoaded) {
            await this.checkAndSeed();
        }

        // ... calculation strictly same as before ...
        // 1. Calculate Averages
        const sums: Record<string, number> = {};
        const counts: Record<string, number> = {};

        for (let qId = 1; qId <= 21; qId++) {
            const axisIndex = Math.ceil(qId / 3) - 1;
            const axisName = AXIS_ORDER[axisIndex];
            const rawVal = answers[qId] || 3;
            const score = rawVal - 3;
            sums[axisName] = (sums[axisName] || 0) + score;
            counts[axisName] = (counts[axisName] || 0) + 1;
        }

        const scoreVector: number[] = [];
        const scoresMap: Record<string, number> = {};

        for (const axis of AXIS_ORDER) {
            const sum = sums[axis] || 0;
            const count = counts[axis] || 3;
            const avg = sum / count;
            const rounded = Math.round(avg);
            const clamped = Math.max(-2, Math.min(2, rounded));
            scoreVector.push(clamped);
            scoresMap[axis] = clamped;
        }

        // 2. Lookup Key
        const lookupKey = scoreVector.join(',');

        // 3. Find Cluster from DB
        let clusterId = 1;
        const match = await db.select().from(quiz_matches).where(eq(quiz_matches.vector, lookupKey)).limit(1);

        if (match.length > 0) {
            clusterId = match[0].cluster_id;
        } else {
            console.warn(`[QuizManager] No match found for vector: ${lookupKey}. Defaulting to 1.`);
        }

        // 4. Get Data from DB
        const cluster = await db.select().from(clusters).where(eq(clusters.cluster_id, clusterId)).limit(1);
        let clusterInfo = null;

        if (cluster.length > 0) {
            clusterInfo = {
                cluster_id: cluster[0].cluster_id.toString(),
                cluster_name: cluster[0].name,
                cluster_tagline: cluster[0].tagline || ""
            };
            console.log(`[QuizManager] Calculation success: Vector=${lookupKey} -> ID=${clusterId} -> Name=${cluster[0].name}`);
        } else {
            console.error(`[QuizManager] ID ${clusterId} has no cluster data in DB.`);
        }

        return {
            clusterId,
            clusterData: clusterInfo,
            scores: scoresMap
        };
    }
}
