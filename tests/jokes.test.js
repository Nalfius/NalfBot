const fs = require('fs');
const path = require('path');
const { handleJokeCommand, isJokeCommand, getRandomJoke, jokes } = require('../src/jokesHandler.js');

// getRandomJoke(guildId) écrit dans jokes-state.json : on sauvegarde l'état réel pour le restaurer à la fin
const STATE_FILE = path.join(__dirname, '..', 'jokes-state.json');
const originalState = fs.existsSync(STATE_FILE) ? fs.readFileSync(STATE_FILE, 'utf8') : null;

let passed = 0;
let failed = 0;

function check(name, condition, details = '') {
  if (condition) {
    passed++;
    console.log(`✓ ${name}`);
  } else {
    failed++;
    console.log(`✗ ${name} FAILED ${details}`);
  }
}

console.log('Running jokes tests...\n');

// isJokeCommand
check('"!blague" est une commande', isJokeCommand('!blague') === true);
check('"!joke" est une commande', isJokeCommand('!joke') === true);
check('"!blague " (espace) est une commande', isJokeCommand('!blague ') === true);
check('"test !blague" n\'est pas une commande', isJokeCommand('test !blague') === false);
check('"quoi" n\'est pas une commande', isJokeCommand('quoi') === false);

// Liste des blagues
check('la liste de blagues n\'est pas vide', jokes.length > 0);
const duplicates = jokes.filter((joke, i) => jokes.indexOf(joke) !== i);
check('aucune blague en double', duplicates.length === 0, JSON.stringify(duplicates));

// getRandomJoke sans serveur
check('getRandomJoke() retourne une blague de la liste', jokes.includes(getRandomJoke()));

// getRandomJoke avec serveur : jamais deux fois la même blague d'affilée
const guildId = 'test-guild';
let previous = getRandomJoke(guildId);
let repeated = false;
for (let i = 0; i < 100; i++) {
  const current = getRandomJoke(guildId);
  if (current === previous) {
    repeated = true;
    break;
  }
  previous = current;
}
check('pas de répétition consécutive sur un même serveur (100 tirages)', !repeated);

// handleJokeCommand
check('handleJokeCommand("!blague") retourne une blague', jokes.includes(handleJokeCommand('!blague')));
check('handleJokeCommand("!joke") retourne une blague', jokes.includes(handleJokeCommand('!joke')));
check('handleJokeCommand("test") retourne null', handleJokeCommand('test') === null);

// Restauration de l'état réel
if (originalState === null) {
  fs.rmSync(STATE_FILE, { force: true });
} else {
  fs.writeFileSync(STATE_FILE, originalState);
}

console.log(`\nResults: ${passed} passed, ${failed} failed out of ${passed + failed} tests`);

if (failed > 0) {
  process.exit(1);
}
