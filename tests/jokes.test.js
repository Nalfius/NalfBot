const fs = require('fs');
const path = require('path');

// getRandomJoke(guildId) écrit dans jokes-state.json et /blague peut écrire dans config.json :
// on sauvegarde les fichiers réels pour les restaurer à la fin
const STATE_FILE = path.join(__dirname, '..', 'data', 'jokes-state.json');
const CONFIG_FILE = path.join(__dirname, '..', 'data', 'config.json');
const originals = [STATE_FILE, CONFIG_FILE].map((file) => [file, fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null]);

const { handleCommand, getRandomJoke, jokes } = require('../src/jokesHandler.js');
const { setEnabled } = require('../src/configHandler.js');

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

function fakeInteraction(commandName, guildId = 'test-guild') {
  const interaction = { commandName, guildId, replies: [] };
  interaction.reply = (response) => interaction.replies.push(response);
  return interaction;
}

console.log('Running jokes tests...\n');

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

// /blague
const blague = fakeInteraction('blague');
check('/blague est traitée', handleCommand(blague) === true);
check('/blague répond une blague publique', jokes.includes(blague.replies[0]), JSON.stringify(blague.replies));
check('une autre commande est ignorée', handleCommand(fakeInteraction('status')) === false);

setEnabled(guildId, 'jokes', false);
const disabled = fakeInteraction('blague');
check('/blague module désactivé : interaction quand même traitée', handleCommand(disabled) === true);
check('/blague module désactivé : réponse éphémère', disabled.replies[0]?.flags !== undefined && !jokes.includes(disabled.replies[0]?.content), JSON.stringify(disabled.replies));

// Restauration des fichiers réels
for (const [file, content] of originals) {
  if (content === null) {
    fs.rmSync(file, { force: true });
  } else {
    fs.writeFileSync(file, content);
  }
}

console.log(`\nResults: ${passed} passed, ${failed} failed out of ${passed + failed} tests`);

if (failed > 0) {
  process.exit(1);
}
