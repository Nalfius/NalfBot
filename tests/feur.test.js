const { transformMessage, shouldRespond, COUBEH_PROBABILITY } = require('../src/feurHandler.js');

// Fausses sources d'aléatoire pour rendre les tests déterministes
// Par défaut, les tests utilisent NEVER_COUBEH pour ne pas échouer 1 fois sur 20
const ALWAYS_COUBEH = () => 0;
const NEVER_COUBEH = () => 0.99;

// Tests pour chaque règle
const tests = [
  // 1. Simple quoi avec casse
  { input: 'quoi', expected: 'feur' },
  { input: 'Quoi', expected: 'Feur' },
  { input: 'QUOI', expected: 'FEUR' },
  { input: 'Quoi ?', expected: 'Feur ?' },
  
  // 2. Pourquoi -> Pour feur (avec casse préservée)
  { input: 'Pourquoi', expected: 'Pour feur' },
  { input: 'pourquoi', expected: 'pour feur' },
  { input: 'POURQUOI', expected: 'POUR FEUR' },
  { input: 'Pourquoi ?', expected: 'Pour feur' },
  
  // 3. Pour quoi -> Pour feur (avec casse préservée)
  { input: 'Pour quoi', expected: 'Pour feur' },
  { input: 'pour quoi', expected: 'pour feur' },
  { input: 'POUR QUOI', expected: 'POUR FEUR' },
  { input: 'Pour quoi !', expected: 'Pour feur !' },
  
  // 4. Tu + [mot en f] + quoi (avec casse préservée)
  { input: 'Tu fais quoi', expected: 'Je fais feur' },
  { input: 'bonjour Tu fais quoi', expected: 'Je fais feur' },
  { input: 'Tu fais quoi bonjour', expected: 'Je fais feur' },
  { input: 'tu fais quoi ?', expected: 'je fais feur' },
  { input: 'TU FAIS QUOI', expected: 'JE FAIS FEUR' },
  { input: 'Tu fait quoi', expected: 'Je fait feur' },
  { input: 'tu feras quoi', expected: 'je feras feur' },
  { input: 'Tu fé quoi', expected: 'Je fé feur' },
  { input: 'tu fai quoi', expected: 'je fai feur' },
  { input: 'Tu forceras quoi', expected: 'Je forceras feur' },
  
  // 5. Il/elle/on/ça/y + [mot en f] + quoi (avec casse préservée)
  { input: 'Il fait quoi', expected: 'Il fait feur' },
  { input: 'il fait quoi ?', expected: 'il fait feur ?' },
  { input: 'IL FAIT QUOI', expected: 'IL FAIT FEUR' },
  { input: 'Y fait quoi', expected: 'Il fait feur' },
  { input: 'y fait quoi', expected: 'Il fait feur' },
  { input: 'Ça fait quoi', expected: 'Ça fait feur' },
  { input: 'ça fait quoi', expected: 'Ça fait feur' },
  { input: 'elle fé quoi', expected: 'elle fé feur' },
  { input: 'bonjour elle fé quoi', expected: 'elle fé feur' },
  { input: 'elle fé quoi bonjour', expected: 'elle fé feur' },
  { input: 'On forcerait quoi', expected: 'On forcerait feur' },
  { input: 'ON FORCERAIT QUOI', expected: 'ON FORCERAIT FEUR' },
  
  // 6. Règles de transformation de suffixe (XXX-quoi -> XXX-feur)
  { input: 'tra-quoi', expected: 'tra-feur' },
  { input: 'Le tra-quoi', expected: 'Le tra-feur' },
  { input: 'Tu tra-quoi', expected: 'Tu tra-feur' },
  { input: 'bonjour Le tra-quoi', expected: 'Le tra-feur' },
  { input: 'Le tra-quoi bonjour', expected: 'Le tra-feur' },
  { input: 'coucou-quoi', expected: 'coucou-feur' },
  { input: 'test-quoi?', expected: 'test-feur?' },
  { input: 'TRA-QUOI', expected: 'TRA-FEUR' },
  
  // 7. Règle générale
  { input: 'c est quoi ce truc', expected: 'c est feur ce truc' },
  { input: 'mais quoi', expected: 'mais feur' },
  { input: 'Quoi de neuf', expected: 'Feur de neuf' },
  { input: 'je sais pas quoi', expected: 'je sais pas feur' },
  { input: 'MAIS QUOI', expected: 'MAIS FEUR' },

  // 8. Coubeh : règle générale uniquement, quand le tirage tombe sous COUBEH_PROBABILITY
  { input: 'quoi', random: ALWAYS_COUBEH, expected: 'coubeh' },
  { input: 'Quoi ?', random: ALWAYS_COUBEH, expected: 'Coubeh ?' },
  { input: 'QUOI', random: ALWAYS_COUBEH, expected: 'COUBEH' },
  { input: 'c est quoi ce truc', random: ALWAYS_COUBEH, expected: 'c est coubeh ce truc' },
  { input: 'quoi quoi', random: ALWAYS_COUBEH, expected: 'coubeh coubeh' },
  // Limites du tirage : juste sous / pile sur la probabilité
  { input: 'quoi', random: () => COUBEH_PROBABILITY - 0.001, expected: 'coubeh' },
  { input: 'quoi', random: () => COUBEH_PROBABILITY, expected: 'feur' },
  // Les règles spécifiques ne sont jamais concernées
  { input: 'pourquoi', random: ALWAYS_COUBEH, expected: 'pour feur' },
  { input: 'Tu fais quoi', random: ALWAYS_COUBEH, expected: 'Je fais feur' },
  { input: 'coucou-quoi', random: ALWAYS_COUBEH, expected: 'coucou-feur' },
];

console.log('Running feur.js tests...\n');

let passed = 0;
let failed = 0;

tests.forEach((test, index) => {
  const result = transformMessage(test.input, test.random ?? NEVER_COUBEH);
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
