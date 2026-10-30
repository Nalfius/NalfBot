const fs = require('fs');
const path = require('path');
const { MessageFlags, PermissionFlagsBits } = require('discord.js');

// Les tests écrivent dans data/ (état, listes de blagues, config) :
// on sauvegarde les fichiers réels pour les restaurer à la fin
const DATA_DIR = path.join(__dirname, '..', 'data');
const FILES = ['jokes-state.json', 'jokes.json', 'config.json'].map((name) => path.join(DATA_DIR, name));
const originals = FILES.map((file) => [file, fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null]);

const {
  commands,
  handleCommand,
  handleAutocomplete,
  handleModalSubmit,
  getJokes,
  addJoke,
  removeJoke,
  getRandomJoke,
  getJokeChoices,
  DEFAULT_JOKES,
} = require('../src/jokesHandler.js');
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

/**
 * Fausse interaction Discord : enregistre les réponses, formulaires et choix d'autocomplétion
 */
function fakeInteraction({ commandName, subcommand, options = {}, focused = '', customId, fields = {} }, guildId = 'test-guild') {
  const interaction = {
    commandName,
    customId,
    guildId,
    replies: [],
    modals: [],
    choices: null,
    options: {
      getSubcommand: () => subcommand,
      getString: (name) => options[name] ?? null,
      getFocused: () => focused,
    },
    fields: { getTextInputValue: (id) => fields[id] },
  };
  interaction.reply = (response) => interaction.replies.push(response);
  interaction.showModal = (modal) => interaction.modals.push(modal.toJSON());
  interaction.respond = (choices) => { interaction.choices = choices; };
  return interaction;
}

console.log('Running jokes tests...\n');

// Blagues par défaut
check('les blagues par défaut ne sont pas vides', DEFAULT_JOKES.length > 0);
const duplicates = DEFAULT_JOKES.filter((joke, i) => DEFAULT_JOKES.indexOf(joke) !== i);
check('aucune blague par défaut en double', duplicates.length === 0, JSON.stringify(duplicates));
check('un serveur sans liste utilise les blagues par défaut', getJokes('serveur-neuf') === DEFAULT_JOKES);

// getRandomJoke
check('getRandomJoke() retourne une blague par défaut', DEFAULT_JOKES.includes(getRandomJoke()));
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
const blague = fakeInteraction({ commandName: 'blague' });
check('/blague est traitée', handleCommand(blague) === true);
check('/blague répond une blague publique', getJokes(guildId).includes(blague.replies[0]), JSON.stringify(blague.replies));
check('une autre commande est ignorée', handleCommand(fakeInteraction({ commandName: 'status' })) === false);
setEnabled(guildId, 'jokes', false);
const disabled = fakeInteraction({ commandName: 'blague' });
check('/blague module désactivé : interaction quand même traitée', handleCommand(disabled) === true);
check('/blague module désactivé : réponse éphémère', disabled.replies[0]?.flags === MessageFlags.Ephemeral, JSON.stringify(disabled.replies));
setEnabled(guildId, 'jokes', true);

// /edit_jokes : définition
const editJokesCommand = commands.find((c) => c.name === 'edit_jokes').toJSON();
check('/edit_jokes réservé à "Gérer le serveur"', editJokesCommand.default_member_permissions === PermissionFlagsBits.ManageGuild.toString());

// addJoke
const newJoke = 'Que dit une imprimante dans l\'eau ?\nJ\'ai papier.';
check('addJoke ajoute une blague', addJoke(guildId, newJoke) === 'added');
check('la blague est dans la liste du serveur', getJokes(guildId).includes(newJoke));
check('les blagues par défaut sont conservées dans la liste', DEFAULT_JOKES.every((joke) => getJokes(guildId).includes(joke)));
check('les blagues par défaut ne sont pas modifiées', !DEFAULT_JOKES.includes(newJoke));
check('les autres serveurs ne sont pas impactés', !getJokes('autre-guild').includes(newJoke));
check('addJoke refuse un doublon', addJoke(guildId, newJoke) === 'duplicate');
check('addJoke refuse un doublon à espaces près', addJoke(guildId, `  ${newJoke}  `) === 'duplicate');
check('addJoke refuse une blague vide', addJoke(guildId, '   \n ') === 'empty');
const savedJokes = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'jokes.json'), 'utf8'));
check('la liste est persistée dans data/jokes.json', savedJokes[guildId]?.includes(newJoke));

// removeJoke
const index = getJokes(guildId).indexOf(newJoke);
check('removeJoke retourne la blague supprimée', removeJoke(guildId, index) === newJoke);
check('la blague n\'est plus dans la liste', !getJokes(guildId).includes(newJoke));
check('removeJoke refuse un index trop grand', removeJoke(guildId, 999) === null);
check('removeJoke refuse un index négatif', removeJoke(guildId, -1) === null);

// Autocomplétion
const canards = getJokeChoices(guildId, 'canard');
check('recherche "canard" trouve la blague des canards', canards.length === 1 && canards[0].name.includes('canards'), JSON.stringify(canards));
check('la valeur du choix est l\'index de la blague', getJokes(guildId)[Number(canards[0].value)].includes('canards'));
check('le nom du choix tient sur une ligne', !canards[0].name.includes('\n'));
check('recherche insensible aux accents et à la casse', getJokeChoices(guildId, 'ELECTRICIEN').length === 1);
for (let i = 0; i < 30; i++) {
  addJoke('big-guild', `Blague n°${i} ${'x'.repeat(150)}`);
}
const allChoices = getJokeChoices('big-guild', '');
check('25 choix maximum', allChoices.length === 25, String(allChoices.length));
check('noms tronqués à 100 caractères', allChoices.every((choice) => choice.name.length <= 100));
const autocomplete = fakeInteraction({ commandName: 'edit_jokes', focused: 'canard' });
check('handleAutocomplete répond avec les choix', handleAutocomplete(autocomplete) === true && autocomplete.choices?.length === 1);
check('handleAutocomplete ignore les autres commandes', handleAutocomplete(fakeInteraction({ commandName: 'module' })) === false);

// /edit_jokes ajouter : formulaire
const add = fakeInteraction({ commandName: 'edit_jokes', subcommand: 'ajouter' });
check('/edit_jokes ajouter ouvre un formulaire', handleCommand(add) === true && add.modals[0]?.custom_id === 'edit_jokes-ajouter', JSON.stringify(add.modals));
const submit = fakeInteraction({ customId: 'edit_jokes-ajouter', fields: { texte: 'Nouvelle blague\nsur deux lignes' } });
check('envoi du formulaire traité', handleModalSubmit(submit) === true);
check('envoi du formulaire : blague ajoutée', getJokes(guildId).includes('Nouvelle blague\nsur deux lignes'));
check('envoi du formulaire : réponse éphémère', submit.replies[0]?.flags === MessageFlags.Ephemeral && submit.replies[0]?.content === 'Blague ajoutée.', JSON.stringify(submit.replies));
const resubmit = fakeInteraction({ customId: 'edit_jokes-ajouter', fields: { texte: 'Nouvelle blague\nsur deux lignes' } });
handleModalSubmit(resubmit);
check('envoi d\'un doublon : message d\'erreur', resubmit.replies[0]?.content === 'Cette blague existe déjà.', JSON.stringify(resubmit.replies));
check('un autre formulaire est ignoré', handleModalSubmit(fakeInteraction({ customId: 'autre' })) === false);

// /edit_jokes supprimer
const target = getJokes(guildId).indexOf('Nouvelle blague\nsur deux lignes');
const remove = fakeInteraction({ commandName: 'edit_jokes', subcommand: 'supprimer', options: { blague: String(target) } });
check('/edit_jokes supprimer est traitée', handleCommand(remove) === true);
check('/edit_jokes supprimer retire la blague', !getJokes(guildId).includes('Nouvelle blague\nsur deux lignes'));
check('/edit_jokes supprimer répond en éphémère', remove.replies[0]?.flags === MessageFlags.Ephemeral && remove.replies[0]?.content.startsWith('Blague supprimée'), JSON.stringify(remove.replies));
const count = getJokes(guildId).length;
const manual = fakeInteraction({ commandName: 'edit_jokes', subcommand: 'supprimer', options: { blague: 'canards' } });
handleCommand(manual);
check('texte saisi à la main (pas un index) : rien supprimé', getJokes(guildId).length === count);
check('texte saisi à la main : message d\'erreur', manual.replies[0]?.content.startsWith('Blague introuvable'), JSON.stringify(manual.replies));

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
