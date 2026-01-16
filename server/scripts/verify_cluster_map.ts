
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

try {
    const clusterPath = path.join(__dirname, '../data/cluster.json');
    console.log(`Reading from ${clusterPath}`);
    const clusterData = JSON.parse(fs.readFileSync(clusterPath, 'utf-8'));

    console.log(`Loaded ${clusterData.length} clusters.`);

    const clusterMap = new Map(clusterData.map((c: any) => [c.cluster_id, c.cluster_name]));

    const testId = "1";
    console.log(`Mapping ID "${testId}" -> "${clusterMap.get(testId)}"`);

    if (clusterMap.get(testId) === "침착한 중용자") {
        console.log("SUCCESS: Mapping works.");
    } else {
        console.error("FAILURE: Mapping mismatch.");
    }

} catch (e) {
    console.error("Error:", e);
}
