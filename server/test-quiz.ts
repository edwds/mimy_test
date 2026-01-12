
import { QuizManager } from './utils/quiz';

async function testQuiz() {
    console.log("Loading data...");
    const quizManager = QuizManager.getInstance();
    await quizManager.loadData();

    // Test Case 1: All 1s (Should map to -2 for all axes)
    // -2,-2,-2,-2,-2,-2,-2 -> Cluster 2
    const answers1: Record<number, number> = {};
    for (let i = 1; i <= 21; i++) answers1[i] = 1;

    console.log("Testing Case 1 (All 1s)...");
    const result1 = quizManager.calculate(answers1);
    console.log(`Scores: ${JSON.stringify(result1.scores)}`);
    console.log(`Cluster ID: ${result1.clusterId}`);

    if (result1.clusterId === 2) {
        console.log("PASS: Cluster ID is 2");
    } else {
        console.error(`FAIL: Expected 2, got ${result1.clusterId}`);
    }

    // Test Case 2: Mixed
    // Q1-3=5 (+2) -> Boldness +2
    // Q4-6=5 (+2) -> Acidity +2
    // Rest 3 (0)
    // Vector: 2, 2, 0, 0, 0, 0, 0
    // Check match.tsv for 2,2,0,0,0,0,0
    // I don't know the exact match line but I can check if it returns a valid cluster.
    const answers2: Record<number, number> = {};
    for (let i = 1; i <= 21; i++) answers2[i] = 3;
    answers2[1] = 5; answers2[2] = 5; answers2[3] = 5;
    answers2[4] = 5; answers2[5] = 5; answers2[6] = 5;

    console.log("Testing Case 2 (Bold/Acid High)...");
    const result2 = quizManager.calculate(answers2);
    console.log(`Scores: ${JSON.stringify(result2.scores)}`);
    console.log(`Cluster ID: ${result2.clusterId}`);
    console.log(`Cluster Name: ${result2.clusterData?.cluster_name}`);

    if (result2.clusterData) {
        console.log("PASS: Got cluster data");
    } else {
        console.error("FAIL: No cluster data found");
    }
}

testQuiz();
