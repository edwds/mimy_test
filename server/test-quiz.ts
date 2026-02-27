
import { QuizManager } from './utils/quiz';

async function testQuiz() {
    console.log("Loading data...");
    const quizManager = QuizManager.getInstance();
    await quizManager.checkAndSeed();

    // Test Case 1: All +1 (좋아요)
    // Sum per axis = +2 -> Vector: 2,2,2,2,2,2,2
    const answers1: Record<number, number> = {};
    for (let i = 1; i <= 14; i++) answers1[i] = 1;

    console.log("Testing Case 1 (All +1)...");
    const result1 = await quizManager.calculate(answers1);
    console.log(`Scores: ${JSON.stringify(result1.scores)}`);
    console.log(`Cluster ID: ${result1.clusterId}`);
    console.log(`Taste Type: ${result1.tasteType.fullType}`);

    // Test Case 2: All -1 (싫어요)
    // Sum per axis = -2 -> Vector: -2,-2,-2,-2,-2,-2,-2
    const answers2: Record<number, number> = {};
    for (let i = 1; i <= 14; i++) answers2[i] = -1;

    console.log("\nTesting Case 2 (All -1)...");
    const result2 = await quizManager.calculate(answers2);
    console.log(`Scores: ${JSON.stringify(result2.scores)}`);
    console.log(`Cluster ID: ${result2.clusterId}`);
    console.log(`Taste Type: ${result2.tasteType.fullType}`);

    // Test Case 3: Mixed - Bold/Acid high, rest neutral
    // Q1-2 = +1 (boldness +2), Q3-4 = +1 (acidity +2), rest = 0
    const answers3: Record<number, number> = {};
    for (let i = 1; i <= 14; i++) answers3[i] = 0;
    answers3[1] = 1; answers3[2] = 1;   // boldness
    answers3[3] = 1; answers3[4] = 1;   // acidity

    console.log("\nTesting Case 3 (Bold/Acid High)...");
    const result3 = await quizManager.calculate(answers3);
    console.log(`Scores: ${JSON.stringify(result3.scores)}`);
    console.log(`Cluster ID: ${result3.clusterId}`);
    console.log(`Cluster Name: ${result3.clusterData?.cluster_name}`);
    console.log(`Taste Type: ${result3.tasteType.fullType}`);
}

testQuiz();
