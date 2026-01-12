
import fs from 'fs';
import path from 'path';




interface ClusterData {
    cluster_id: string;
    cluster_medoid_value: string;
    cluster_name: string;
    cluster_tagline: string;
    // Add other fields if necessary from cluster.json
}

export interface QuizResult {
    clusterId: number;
    clusterData: ClusterData | null;
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
    private lookupTable: Map<string, number> = new Map(); // "v1,v2,v3,v4,v5,v6,v7" -> clusterId
    private clusterData: Map<number, ClusterData> = new Map();
    private isLoaded: boolean = false;

    private constructor() { }

    public static getInstance(): QuizManager {
        if (!QuizManager.instance) {
            QuizManager.instance = new QuizManager();
        }
        return QuizManager.instance;
    }

    public async loadData() {
        if (this.isLoaded) return;

        try {
            // Paths are relative to the project root when running via tsx/node from root
            // Or we can try to find them relative to this file
            // Assuming the server process starts from project root.
            const projectRoot = process.cwd();
            const matchPath = path.join(projectRoot, 'match.tsv');
            const clusterPath = path.join(projectRoot, 'cluster.json');

            // Load Match TSV
            // Format: value\tcluster_id
            // -2,-2,-2,-2,-2,-2,-2\t2
            if (fs.existsSync(matchPath)) {
                const matchContent = await fs.promises.readFile(matchPath, 'utf-8');
                const lines = matchContent.split('\n');
                let count = 0;
                for (const line of lines) {
                    if (!line.trim() || line.startsWith('value')) continue; // Skip header and empty lines
                    const parts = line.split('\t');
                    if (parts.length >= 2) {
                        const vector = parts[0].trim();
                        const clusterId = parseInt(parts[1].trim(), 10);
                        this.lookupTable.set(vector, clusterId);
                        count++;
                    }
                }
                console.log(`[QuizManager] Loaded ${count} match rows.`);
            } else {
                console.error(`[QuizManager] match.tsv not found at ${matchPath}`);
            }

            // Load Cluster JSON
            if (fs.existsSync(clusterPath)) {
                const clusterContent = await fs.promises.readFile(clusterPath, 'utf-8');
                const clusters: ClusterData[] = JSON.parse(clusterContent);
                for (const c of clusters) {
                    this.clusterData.set(parseInt(c.cluster_id), c);
                }
                console.log(`[QuizManager] Loaded ${clusters.length} clusters.`);
            } else {
                console.error(`[QuizManager] cluster.json not found at ${clusterPath}`);
            }

            this.isLoaded = true;
            console.log(`[QuizManager] Initialization complete. Loaded: ${this.isLoaded}`);

        } catch (error) {
            console.error('[QuizManager] Failed to load data:', error);
        }
    }

    public calculate(answers: Record<number, number>): QuizResult {
        if (!this.isLoaded) {
            console.warn('[QuizManager] Data not loaded, attempting to load now...');
            // In a synch call we can't await, but hopefully it was loaded on startup.
            // If strictly needed, we throw or handle async differently.
            // For now assuming loadData() was called on server start.
        }

        // 1. Calculate Averages
        // Group answers by axis (3 questions per axis)
        const sums: Record<string, number> = {};
        const counts: Record<string, number> = {};

        // Helper: Map question ID to Axis Index (0-6) based on 3 questions per axis
        // Q1-3 -> Index 0
        // Q4-6 -> Index 1
        // ...
        for (let qId = 1; qId <= 21; qId++) {
            const axisIndex = Math.ceil(qId / 3) - 1;
            const axisName = AXIS_ORDER[axisIndex];

            const rawVal = answers[qId] || 3; // Default to neutral if missing
            // Map 1..5 to -2..2
            // 1->-2, 2->-1, 3->0, 4->1, 5->2
            const score = rawVal - 3;

            sums[axisName] = (sums[axisName] || 0) + score;
            counts[axisName] = (counts[axisName] || 0) + 1;
        }

        const scoreVector: number[] = [];
        const scoresMap: Record<string, number> = {};

        for (const axis of AXIS_ORDER) {
            const sum = sums[axis] || 0;
            const count = counts[axis] || 3; // Should be 3
            // Float Average
            const avg = sum / count;
            // Round to integer -2..2
            const rounded = Math.round(avg);
            // Clamp just in case
            const clamped = Math.max(-2, Math.min(2, rounded));

            scoreVector.push(clamped);
            scoresMap[axis] = clamped;
        }

        // 2. Create Lookup Key
        const lookupKey = scoreVector.join(',');

        // 3. Find Cluster
        // Default to cluster 1 or logical fallback if not found (though match.tsv should be exhaustive)
        let clusterId = this.lookupTable.get(lookupKey);

        if (clusterId === undefined) {
            console.warn(`[QuizManager] No match found for vector: ${lookupKey}. Defaulting to 1.`);
            clusterId = 1;
        }

        // 4. Get Data
        const clusterData = this.clusterData.get(clusterId) || null;

        if (!clusterData) {
            console.error(`[QuizManager] key matched to ID ${clusterId} but no cluster data found.`);
        } else {
            console.log(`[QuizManager] Calculation success: Vector=${lookupKey} -> ID=${clusterId} -> Name=${clusterData.cluster_name}`);
        }

        return {
            clusterId,
            clusterData,
            scores: scoresMap
        };
    }
}
