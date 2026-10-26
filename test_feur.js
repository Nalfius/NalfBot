const { transformMessage, shouldRespond } = require('./feur.js');

// Tests pour chaque règle
const tests = [
  // 1. Simple quoi avec casse
  { input: 'quoi', expected: 'feur' },
  { input: 'Quoi', expected: 'Feur' },
  { input: 'QUOI', expected: 'FEUR' },
  { input: 'Quoi ?', expected: 'Feur ?' },
  
  // 2. Pourquoi/Pour quoi -> Pour feur (avec espace)
  { input: 'Pourquoi', expected: 'Pour feur' },
  { input: 'pourquoi', expected: 'pour feur' },
  { input: 'POURQUOI', expected: 'Pour feur' },
  { input: 'Pourquoi ?', expected: 'Pour feur ?' },
  { input: 'Pour quoi', expected: 'Pour feur' },
  { input: 'pour quoi', expected: 'pour feur' },
  { input: 'POUR QUOI', expected: 'Pour feur' },
  { input: 'Pour quoi !', expected: 'Pour feur !' },
  
  // 3. Tu + [mot commençant par f] + quoi
  { input: 'Tu fais quoi', expected: 'Je fais feur' },
  { input: 'tu fais quoi ?', expected: 'Je fais feur ?' },
  { input: 'Tu fait quoi', expected: 'Je fait feur' },
  { input: 'tu feras quoi', expected: 'Je feras feur' },
  { input: 'Tu fé quoi', expected: 'Je fé feur' },
  { input: 'Tu fai quoi', expected: 'Je fai feur' },
  { input: 'Tu forceras quoi', expected: 'Je forceras feur' },
  
  // 4. Il/elle/on/ça/y + [mot commençant par f] + quoi
  { input: 'Il fait quoi', expected: 'Il fait feur' },
  { input: 'il fait quoi ?', expected: 'Il fait feur ?' },
  { input: 'Y fait quoi', expected: 'Il fait feur' },
  { input: 'ça fait quoi', expected: 'Ça fait feur' },
  { input: 'elle fé quoi', expected: 'Elle fé feur' },
  { input: 'On forcerait quoi', expected: 'On forcerait feur' },
  
  // 5. Règles de transformation de suffixe (XXX-quoi -> XXX-feur)
  { input: 'tra-quoi', expected: 'tra-feur' },
  { input: 'La tra-quoi', expected: 'La tra-feur' },
  { input: 'coucou-quoi', expected: 'coucou-feur' },
  { input: 'test-quoi?', expected: 'test-feur?' },
  
  // 6. Règle générale
  { input: 'c est quoi ce truc', expected: 'c est feur ce truc' },
  { input: 'mais quoi', expected: 'mais feur' },
  { input: 'Quoi de neuf', expected: 'Feur de neuf' },
  { input: 'je sais pas quoi', expected: 'je sais pas feur' },
  
  // Cas complexes
  { input: 'Il fait quoi à la tra-quoi', expected: 'Il fait feur à la tra-feur' },
  { input: 'Pourquoi tu fais quoi', expected: 'Pour feur Je fais feur' },
];

console.log('Running feur.js tests...\n');

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
