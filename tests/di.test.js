const { transformMessage } = require('../src/diHandler.js');

// Ajoute ici les cas à affiner : expected = null quand le bot ne doit pas répondre
const tests = [
  // 1. Cas de base
  { input: 'divague', expected: 'vague' },
  { input: 'tu divagues complètement', expected: 'vagues' },
  { input: 'Il divague.', expected: 'vague' },
  { input: 'dimanche', expected: 'manche' },

  // 2. Casse préservée
  { input: 'Divague', expected: 'Vague' },
  { input: 'DIVAGUE', expected: 'VAGUE' },

  // 3. Accents
  { input: 'divagué', expected: 'vagué' },
  // Accent décomposé (i + accent combinant), envoyé par certains claviers mobiles
  { input: 'Disparaître'.normalize('NFD'), expected: 'Sparaître' },

  // 4. Mots trop courts (moins de 7 lettres)
  { input: 'disent', expected: null },
  { input: 'dis-moi', expected: null },
  { input: 'dire', expected: null },
  { input: 'di', expected: null },

  // 5. "di" pas en début de mot
  { input: 'paradis', expected: null },
  { input: 'mardi soir', expected: null },
  { input: 'interdiction', expected: null },

  // 6. Plusieurs mots : le premier mot éligible gagne
  { input: 'ils disent que tu divagues', expected: 'vagues' },
  { input: 'divague dimanche', expected: 'vague' },

  // 7. Pas de mot en "di"
  { input: 'salut', expected: null },
  { input: '', expected: null },
];

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
