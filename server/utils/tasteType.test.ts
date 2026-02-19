/**
 * Unit Tests for Taste Type Conversion
 *
 * Run with: npx tsx server/utils/tasteType.test.ts
 */

import { calculateTasteType, getAllTasteTypes, isValidTasteType, STABILITY_THRESHOLD } from './tasteType.js';

// Test utilities
let passed = 0;
let failed = 0;

function assertEquals<T>(actual: T, expected: T, message: string): void {
    if (JSON.stringify(actual) === JSON.stringify(expected)) {
        passed++;
        console.log(`  ✓ ${message}`);
    } else {
        failed++;
        console.log(`  ✗ ${message}`);
        console.log(`    Expected: ${JSON.stringify(expected)}`);
        console.log(`    Actual:   ${JSON.stringify(actual)}`);
    }
}

function assertTrue(condition: boolean, message: string): void {
    if (condition) {
        passed++;
        console.log(`  ✓ ${message}`);
    } else {
        failed++;
        console.log(`  ✗ ${message}`);
    }
}

// ============================================
// Test Cases
// ============================================

console.log('\n=== Taste Type Conversion Tests ===\n');

// Test 1: Sample input from requirements
console.log('Test 1: Sample input (HASP-A expected)');
{
    const scores = {
        boldness: 2,
        spiciness: 1,
        acidity: 2,
        richness: -1,
        sweetness: 1,
        umami: -1,
        experimental: 2
    };
    const result = calculateTasteType(scores);

    assertEquals(result.fullType, 'HASP-A', 'Full type should be HASP-A');
    assertEquals(result.baseCode, 'HASP', 'Base code should be HASP');
    assertEquals(result.subtype, 'A', 'Subtype should be A (Assertive)');
    assertEquals(result.axes.intensity, 'H', 'Intensity should be H');
    assertEquals(result.axes.flavor, 'A', 'Flavor should be A');
    assertEquals(result.axes.pleasure, 'S', 'Pleasure should be S');
    assertEquals(result.axes.exploration, 'P', 'Exploration should be P');

    // Verify stability calculation: (2+1+2+1+1+1+2)/7 = 10/7 ≈ 1.43
    assertTrue(result.stabilityScore >= 1.2, `Stability ${result.stabilityScore} should be >= ${STABILITY_THRESHOLD}`);
}

// Test 2: Opposite extreme - LDUF-T
console.log('\nTest 2: Opposite extreme (LDUF-T expected)');
{
    const scores = {
        boldness: -1,
        spiciness: -1,
        acidity: -1,
        richness: 1,
        sweetness: -1,
        umami: 1,
        experimental: -1
    };
    const result = calculateTasteType(scores);

    assertEquals(result.fullType, 'LDUF-T', 'Full type should be LDUF-T');
    assertEquals(result.axes.intensity, 'L', 'Intensity should be L');
    assertEquals(result.axes.flavor, 'D', 'Flavor should be D');
    assertEquals(result.axes.pleasure, 'U', 'Pleasure should be U');
    assertEquals(result.axes.exploration, 'F', 'Exploration should be F');

    // Stability: (1+1+1+1+1+1+1)/7 = 1.0 < 1.2
    assertEquals(result.subtype, 'T', 'Subtype should be T (Turbulent)');
}

// Test 3: All zeros - neutral preferences
console.log('\nTest 3: All zeros (LDUF-T expected)');
{
    const scores = {
        boldness: 0,
        spiciness: 0,
        acidity: 0,
        richness: 0,
        sweetness: 0,
        umami: 0,
        experimental: 0
    };
    const result = calculateTasteType(scores);

    assertEquals(result.fullType, 'LDUF-T', 'All zeros should produce LDUF-T');
    assertEquals(result.stabilityScore, 0, 'Stability should be 0');
    assertEquals(result.subtype, 'T', 'Subtype should be T (zero < 1.2)');
}

// Test 4: Boundary test - exactly 0 values (should go to negative letter)
console.log('\nTest 4: Boundary at exactly 0');
{
    // Intensity = 0 → L
    // Flavor = 0 → D
    // Pleasure = 0 → U
    // Exploration = 0 → F
    const scores = {
        boldness: 1,    // intensity = (1 + -1) / 2 = 0 → L
        spiciness: -1,
        acidity: 1,     // flavor = 1 - 1 = 0 → D
        richness: 1,
        sweetness: 1,   // pleasure = 1 - 1 = 0 → U
        umami: 1,
        experimental: 0 // exploration = 0 → F
    };
    const result = calculateTasteType(scores);

    assertEquals(result.axes.intensity, 'L', 'Intensity 0 should be L');
    assertEquals(result.axes.flavor, 'D', 'Flavor 0 should be D');
    assertEquals(result.axes.pleasure, 'U', 'Pleasure 0 should be U');
    assertEquals(result.axes.exploration, 'F', 'Exploration 0 should be F');
}

// Test 5: Assertive threshold boundary
console.log('\nTest 5: Stability threshold boundary');
{
    // Need stability >= 1.2 for A
    // 7 scores averaging to exactly 1.2: sum of abs = 8.4
    // Example: 6 scores of 1 and 1 score of 2.4 (but we use integers)
    // Let's use: 2,2,1,1,1,1,0 → sum = 8, avg = 8/7 ≈ 1.14 < 1.2 → T
    const scoresJustBelow = {
        boldness: 2, spiciness: 2, acidity: 1, richness: 1,
        sweetness: 1, umami: 1, experimental: 0
    };
    const resultBelow = calculateTasteType(scoresJustBelow);
    assertTrue(resultBelow.subtype === 'T', `Stability ${resultBelow.stabilityScore} < 1.2 should be T`);

    // 2,2,2,1,1,1,0 → sum = 9, avg = 9/7 ≈ 1.29 >= 1.2 → A
    const scoresAbove = {
        boldness: 2, spiciness: 2, acidity: 2, richness: 1,
        sweetness: 1, umami: 1, experimental: 0
    };
    const resultAbove = calculateTasteType(scoresAbove);
    assertTrue(resultAbove.subtype === 'A', `Stability ${resultAbove.stabilityScore} >= 1.2 should be A`);
}

// Test 6: Missing/undefined scores should default to 0
console.log('\nTest 6: Missing scores default to 0');
{
    const partial = { boldness: 2, spiciness: 2 }; // Only 2 scores
    const result = calculateTasteType(partial);

    assertEquals(result.axes.intensity, 'H', 'Intensity with bold+spicy should be H');
    assertEquals(result.axes.flavor, 'D', 'Missing acidity/richness should default to D');
    assertEquals(result.axes.pleasure, 'U', 'Missing sweetness/umami should default to U');
    assertEquals(result.axes.exploration, 'F', 'Missing experimental should default to F');
}

// Test 7: getAllTasteTypes returns exactly 32 unique types
console.log('\nTest 7: getAllTasteTypes returns 32 unique types');
{
    const allTypes = getAllTasteTypes();
    assertEquals(allTypes.length, 32, 'Should return exactly 32 types');

    const uniqueTypes = new Set(allTypes);
    assertEquals(uniqueTypes.size, 32, 'All 32 types should be unique');

    // Verify some expected types exist
    assertTrue(allTypes.includes('LDUF-A'), 'Should include LDUF-A');
    assertTrue(allTypes.includes('LDUF-T'), 'Should include LDUF-T');
    assertTrue(allTypes.includes('HASP-A'), 'Should include HASP-A');
    assertTrue(allTypes.includes('HASP-T'), 'Should include HASP-T');
}

// Test 8: isValidTasteType validation
console.log('\nTest 8: Type validation');
{
    assertTrue(isValidTasteType('HASP-A'), 'HASP-A should be valid');
    assertTrue(isValidTasteType('LDUF-T'), 'LDUF-T should be valid');
    assertTrue(!isValidTasteType('XXXX-X'), 'XXXX-X should be invalid');
    assertTrue(!isValidTasteType('HASP'), 'HASP without subtype should be invalid');
    assertTrue(!isValidTasteType(''), 'Empty string should be invalid');
}

// Test 9: Verify each axis can produce both letters
console.log('\nTest 9: Each axis can produce both letters');
{
    // All positive extreme
    const allPositive = {
        boldness: 2, spiciness: 2, acidity: 2, richness: -2,
        sweetness: 2, umami: -2, experimental: 2
    };
    const posResult = calculateTasteType(allPositive);
    assertEquals(posResult.baseCode, 'HASP', 'Max positive should be HASP');

    // All negative extreme
    const allNegative = {
        boldness: -2, spiciness: -2, acidity: -2, richness: 2,
        sweetness: -2, umami: 2, experimental: -2
    };
    const negResult = calculateTasteType(allNegative);
    assertEquals(negResult.baseCode, 'LDUF', 'Max negative should be LDUF');
}

// ============================================
// Results Summary
// ============================================
console.log('\n=== Test Results ===');
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
console.log(`Total:  ${passed + failed}`);

if (failed > 0) {
    console.log('\n❌ Some tests failed!');
    process.exit(1);
} else {
    console.log('\n✅ All tests passed!');
    process.exit(0);
}
