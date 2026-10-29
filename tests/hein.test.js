const { transformMessage } = require('../src/heinHandler.js');

// Ajoute ici les cas à affiner : expected = null quand le bot ne doit pas répondre
const tests = [
  // 1. Cas de base avec casse
  { input: 'hein', expected: 'deux' },
  { input: 'Hein', expected: 'Deux' },
  { input: 'HEIN', expected: 'DEUX' },
  { input: 'hein ?', expected: 'deux' },

  // 2. Dans une phrase : seulement "deux", sans le reste
  { input: 'tu viens hein', expected: 'deux' },
  { input: 'Hein, quoi ?', expected: 'Deux' },
  { input: 'hein hein', expected: 'deux' },

  // 3. "hein" à l'intérieur d'un autre mot
  { input: 'Rhein', expected: null },
  { input: 'sheinz', expected: null },

  // 4. Pas de "hein"
  { input: 'salut', expected: null },
  { input: '', expected: null },
];

console.log('Running hein tests...\n');

let passed = 0;
let failed = 0;

tests.forEach((test, index) => {
  const result = transformMessage(test.input);
  const success = result === test.expected;

  if (success) {
    passed++;
    console.log(`✓ Test ${index + 1}: "${test.input}" -> ${JSON.stringify(result)}`);
  } else {
    failed++;
    console.log(`✗ Test ${index + 1} FAILED:`);
    console.log(`  Input:    "${test.input}"`);
    console.log(`  Expected: ${JSON.stringify(test.expected)}`);
    console.log(`  Got:      ${JSON.stringify(result)}`);
  }
});

console.log(`\nResults: ${passed} passed, ${failed} failed out of ${tests.length} tests`);

if (failed > 0) {
  process.exit(1);
}
