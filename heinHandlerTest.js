const { transformMessage } = require('./heinHandler.js');

// Tests pour chaque règle
const tests = [
  // 1. Simple quoi avec casse
  { input: 'hein', expected: 'deux' },
  { input: 'Hein', expected: 'Deux' },
  { input: 'HEIN', expected: 'DEUX' },  
  { input: 'hein ?', expected: 'deux' },  
];

console.log('Running heinHandler.js tests...\n');

let passed = 0;
let failed = 0;

tests.forEach((test, index) => {
  const result = transformMessage(test.input);
  const success = result === test.expected;
  
  if (success) {
    passed++;
    console.log(`✓ Test ${index + 1}: "${test.input}" -> "${result}"`);
  } else {
    failed++;
    console.log(`✗ Test ${index + 1} FAILED:`);
    console.log(`  Input:    "${test.input}"`);
    console.log(`  Expected: "${test.expected}"`);
    console.log(`  Got:      "${result}"`);
  }
});

console.log(`\nResults: ${passed} passed, ${failed} failed out of ${tests.length} tests`);

if (failed > 0) {
  process.exit(1);
}
