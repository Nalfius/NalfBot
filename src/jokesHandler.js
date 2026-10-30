/**
 * Module de blagues
 * Répond à la slash command /blague avec une blague aléatoire (chute éventuelle en spoiler)
 * Les admins gèrent la liste de leur serveur avec /edit_jokes ajouter et /edit_jokes supprimer
 */

const fs = require('fs');
const path = require('path');
const {
  SlashCommandBuilder,
  InteractionContextType,
  MessageFlags,
  PermissionFlagsBits,
  ModalBuilder,
  LabelBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require('discord.js');
const { isEnabled } = require('./configHandler.js');

/**
 * Une blague : un texte (souvent une question) et une chute facultative, affichée en spoiler
 * @typedef {{ text: string, punchline?: string }} Joke
 */

/**
 * Identifiants du formulaire d'ajout de blague
 */
const ADD_MODAL_ID = 'edit_jokes-ajouter';
const TEXT_INPUT_ID = 'texte';
const PUNCHLINE_INPUT_ID = 'chute';

/**
 * Limites Discord : 2000 caractères par message (texte + chute + spoiler), 100 par choix d'autocomplétion, 25 choix
 */
const MAX_TEXT_LENGTH = 1500;
const MAX_PUNCHLINE_LENGTH = 400;
const MAX_CHOICE_LENGTH = 100;
const MAX_CHOICES = 25;

/**
 * Convertit une ancienne blague (simple texte) en blague structurée
 * Heuristique : si la première ligne finit par "?" et qu'il y a une suite, la suite est la chute
 * @param {string|Joke} joke - Blague au format texte ou déjà structurée
 * @returns {Joke}
 */
function toJoke(joke) {
  if (typeof joke !== 'string') {
    return joke;
  }
  const [firstLine, ...rest] = joke.split('\n');
  const punchline = rest.join('\n').trim();
  if (firstLine.trim().endsWith('?') && punchline) {
    return { text: firstLine.trim(), punchline };
  }
  return { text: joke };
}

/**
 * Met en forme une blague pour Discord : la chute est masquée en spoiler (||chute||)
 * @param {Joke} joke
 * @returns {string}
 */
function formatJoke(joke) {
  return joke.punchline ? `${joke.text}\n||${joke.punchline}||` : joke.text;
}

/**
 * Blagues par défaut, utilisées par un serveur tant que ses admins n'ont pas modifié sa liste
 */
const DEFAULT_JOKES = Object.freeze(require('./defaultJokes.json'));

/**
 * Fichier de persistance des listes de blagues modifiées (guildId -> blagues)
 */
const JOKES_FILE = path.join(__dirname, '..', 'data', 'jokes.json');

/**
 * Fichier de persistance pour l'état des blagues par serveur
 */
const STATE_FILE = path.join(__dirname, '..', 'data', 'jokes-state.json');

/**
 * Listes de blagues modifiées par serveur (guildId -> Joke[])
 * Un serveur absent utilise DEFAULT_JOKES
 * @type {Object.<string, Joke[]>}
 */
let jokesByGuild = {};

/**
 * État en mémoire: dernière blague envoyée par serveur (guildId -> index)
 * @type {Object.<string, number>}
 */
let lastJokeIndexByGuild = {};

/**
 * Lit un fichier JSON, ou retourne {} s'il n'existe pas ou est invalide
 * @param {string} file - Chemin du fichier
 * @returns {Object}
 */
function readJson(file) {
  try {
    if (fs.existsSync(file)) {
      return JSON.parse(fs.readFileSync(file, 'utf8'));
    }
  } catch (err) {
    console.error(`[jokes] Erreur au chargement de ${path.basename(file)}:`, err.message);
  }
  return {};
}

/**
 * Écrit un objet dans un fichier JSON
 * @param {string} file - Chemin du fichier
 * @param {Object} data - Données à écrire
 */
function writeJson(file, data) {
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error(`[jokes] Erreur à la sauvegarde de ${path.basename(file)}:`, err.message);
  }
}

function loadState() {
  lastJokeIndexByGuild = readJson(STATE_FILE);
  // Les listes enregistrées avant le format structuré contiennent des textes : conversion au chargement
  jokesByGuild = Object.fromEntries(Object.entries(readJson(JOKES_FILE))
    .map(([guildId, jokes]) => [guildId, jokes.map(toJoke)]));
}

function saveState() {
  writeJson(STATE_FILE, lastJokeIndexByGuild);
}

function saveJokes() {
  writeJson(JOKES_FILE, jokesByGuild);
}

// Charger l'état au démarrage
loadState();

/**
 * Retourne la liste de blagues d'un serveur
 * @param {string|null} guildId - Identifiant du serveur
 * @returns {Joke[]}
 */
function getJokes(guildId) {
  return jokesByGuild[guildId] ?? DEFAULT_JOKES;
}

/**
 * Ajoute une blague à la liste d'un serveur
 * @param {string} guildId - Identifiant du serveur
 * @param {string} text - Le texte (ou la question)
 * @param {string} [punchline] - La chute, facultative
 * @returns {'added'|'duplicate'|'empty'} - Résultat de l'ajout
 */
function addJoke(guildId, text, punchline = '') {
  const joke = { text: text.trim() };
  if (punchline.trim()) {
    joke.punchline = punchline.trim();
  }
  if (!joke.text) {
    return 'empty';
  }
  const jokes = getJokes(guildId);
  if (jokes.some((existing) => formatJoke(existing) === formatJoke(joke))) {
    return 'duplicate';
  }
  jokesByGuild[guildId] = [...jokes, joke];
  saveJokes();
  return 'added';
}

/**
 * Supprime une blague de la liste d'un serveur
 * @param {string} guildId - Identifiant du serveur
 * @param {number} index - Position de la blague dans la liste
 * @returns {Joke|null} - La blague supprimée, ou null si l'index est invalide
 */
function removeJoke(guildId, index) {
  const jokes = getJokes(guildId);
  if (!Number.isInteger(index) || index < 0 || index >= jokes.length) {
    return null;
  }
  const removed = jokes[index];
  jokesByGuild[guildId] = jokes.filter((_, i) => i !== index);
  saveJokes();
  // Les index suivants sont décalés : on oublie la dernière blague envoyée
  delete lastJokeIndexByGuild[guildId];
  saveState();
  return removed;
}

/**
 * Retourne une blague aléatoire, en évitant la répétition consécutive par serveur
 * @param {string|null} guildId - Identifiant du serveur (optionnel)
 * @returns {Joke|null} - Une blague aléatoire ou null
 */
function getRandomJoke(guildId = null) {
  const jokes = getJokes(guildId);
  if (jokes.length === 0) {
    return null;
  }

  // Nettoyer l'état si l'index est invalide pour ce serveur
  if (guildId && lastJokeIndexByGuild[guildId] !== undefined) {
    if (lastJokeIndexByGuild[guildId] >= jokes.length) {
      delete lastJokeIndexByGuild[guildId];
      saveState();
    }
  }

  if (guildId && lastJokeIndexByGuild[guildId] !== undefined) {
    const lastIndex = lastJokeIndexByGuild[guildId];

    // S'il n'y a qu'une seule blague, on la retourne (impossible d'éviter la répétition)
    if (jokes.length === 1) {
      return jokes[0];
    }

    // Tirer une blague différente de la dernière
    let newIndex;
    do {
      newIndex = Math.floor(Math.random() * jokes.length);
    } while (newIndex === lastIndex);

    // Mettre à jour l'état
    lastJokeIndexByGuild[guildId] = newIndex;
    saveState();

    return jokes[newIndex];
  } else {
    // Première blague pour ce serveur ou pas de guildId
    const randomIndex = Math.floor(Math.random() * jokes.length);
    if (guildId) {
      lastJokeIndexByGuild[guildId] = randomIndex;
      saveState();
    }
    return jokes[randomIndex];
  }
}

/**
 * Normalise un texte pour la recherche (minuscules, sans accents)
 * @param {string} text
 * @returns {string}
 */
function normalize(text) {
  return text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
}

/**
 * Construit les choix d'autocomplétion de /edit_jokes supprimer
 * Valeur = index de la blague, nom = "texte → chute" sur une ligne, tronqué
 * @param {string|null} guildId - Identifiant du serveur
 * @param {string} search - Texte saisi par l'utilisateur
 * @returns {{name: string, value: string}[]}
 */
function getJokeChoices(guildId, search) {
  const query = normalize(search);
  return getJokes(guildId)
    .map((joke, index) => ({
      label: joke.punchline ? `${joke.text} → ${joke.punchline}` : joke.text,
      index,
    }))
    .filter(({ label }) => normalize(label).includes(query))
    .slice(0, MAX_CHOICES)
    .map(({ label, index }) => {
      const oneLine = label.replace(/\s+/g, ' ');
      const name = oneLine.length > MAX_CHOICE_LENGTH ? oneLine.slice(0, MAX_CHOICE_LENGTH - 1) + '…' : oneLine;
      return { name, value: String(index) };
    });
}

/**
 * Définition des slash commands du module
 * /edit_jokes est réservé aux membres ayant la permission "Gérer le serveur" (filtré par Discord)
 */
const commands = [
  new SlashCommandBuilder()
    .setName('blague')
    .setDescription('Raconte une blague')
    .setContexts(InteractionContextType.Guild),
  new SlashCommandBuilder()
    .setName('edit_jokes')
    .setDescription('Gère la liste des blagues du serveur')
    .addSubcommand((subcommand) => subcommand
      .setName('ajouter')
      .setDescription('Ajoute une blague'))
    .addSubcommand((subcommand) => subcommand
      .setName('supprimer')
      .setDescription('Supprime une blague')
      .addStringOption((option) => option
        .setName('blague')
        .setDescription('La blague à supprimer (tape pour chercher)')
        .setRequired(true)
        .setAutocomplete(true)))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setContexts(InteractionContextType.Guild),
];

/**
 * Construit le formulaire d'ajout de blague
 * @returns {ModalBuilder}
 */
function buildAddModal() {
  return new ModalBuilder()
    .setCustomId(ADD_MODAL_ID)
    .setTitle('Nouvelle blague')
    .addLabelComponents(
      new LabelBuilder()
        .setLabel('Blague / question')
        .setTextInputComponent(new TextInputBuilder()
          .setCustomId(TEXT_INPUT_ID)
          .setStyle(TextInputStyle.Paragraph)
          .setMaxLength(MAX_TEXT_LENGTH)
          .setRequired(true)),
      new LabelBuilder()
        .setLabel('Chute (facultative)')
        .setDescription('Affichée en spoiler, à révéler d\'un clic')
        .setTextInputComponent(new TextInputBuilder()
          .setCustomId(PUNCHLINE_INPUT_ID)
          .setStyle(TextInputStyle.Paragraph)
          .setMaxLength(MAX_PUNCHLINE_LENGTH)
          .setRequired(false)),
    );
}

/**
 * Traite les slash commands /blague et /edit_jokes
 * @param {import('discord.js').ChatInputCommandInteraction} interaction - L'interaction Discord
 * @returns {boolean} - true si l'interaction a été traitée
 */
function handleCommand(interaction) {
  if (interaction.commandName === 'blague') {
    // Discord exige une réponse à chaque interaction, même quand le module est désactivé
    if (!isEnabled(interaction.guildId, 'jokes')) {
      interaction.reply({ content: 'Le module jokes est désactivé sur ce serveur.', flags: MessageFlags.Ephemeral });
      return true;
    }
    const joke = getRandomJoke(interaction.guildId);
    if (!joke) {
      interaction.reply({ content: 'Aucune blague disponible.', flags: MessageFlags.Ephemeral });
      return true;
    }
    interaction.reply(formatJoke(joke));
    return true;
  }

  if (interaction.commandName === 'edit_jokes') {
    // La gestion de la liste reste possible module désactivé (pour la préparer avant de l'activer)
    if (interaction.options.getSubcommand() === 'ajouter') {
      interaction.showModal(buildAddModal());
      return true;
    }
    // La valeur est l'index proposé par l'autocomplétion ; un texte saisi à la main n'est pas un index valide
    const value = interaction.options.getString('blague');
    const removed = /^\d+$/.test(value) ? removeJoke(interaction.guildId, Number(value)) : null;
    interaction.reply({
      content: removed
        ? `Blague supprimée :\n> ${formatJoke(removed).replace(/\n/g, '\n> ')}`
        : 'Blague introuvable : choisis-la dans la liste proposée.',
      flags: MessageFlags.Ephemeral,
    });
    return true;
  }

  return false;
}

/**
 * Traite l'autocomplétion de /edit_jokes supprimer
 * @param {import('discord.js').AutocompleteInteraction} interaction - L'interaction Discord
 * @returns {boolean} - true si l'interaction a été traitée
 */
function handleAutocomplete(interaction) {
  if (interaction.commandName !== 'edit_jokes') {
    return false;
  }
  interaction.respond(getJokeChoices(interaction.guildId, interaction.options.getFocused()));
  return true;
}

/**
 * Traite l'envoi du formulaire d'ajout de blague
 * @param {import('discord.js').ModalSubmitInteraction} interaction - L'interaction Discord
 * @returns {boolean} - true si l'interaction a été traitée
 */
function handleModalSubmit(interaction) {
  if (interaction.customId !== ADD_MODAL_ID) {
    return false;
  }
  const messages = {
    added: 'Blague ajoutée.',
    duplicate: 'Cette blague existe déjà.',
    empty: 'La blague est vide.',
  };
  // getTextInputValue lève une erreur si le champ est absent de l'envoi : la chute étant facultative, on s'en protège
  let punchline = '';
  try {
    punchline = interaction.fields.getTextInputValue(PUNCHLINE_INPUT_ID) ?? '';
  } catch {
    punchline = '';
  }
  const result = addJoke(interaction.guildId, interaction.fields.getTextInputValue(TEXT_INPUT_ID), punchline);
  interaction.reply({ content: messages[result], flags: MessageFlags.Ephemeral });
  return true;
}

module.exports = {
  commands,
  handleCommand,
  handleAutocomplete,
  handleModalSubmit,
  getJokes,
  addJoke,
  removeJoke,
  getRandomJoke,
  getJokeChoices,
  formatJoke,
  toJoke,
  DEFAULT_JOKES,
};
