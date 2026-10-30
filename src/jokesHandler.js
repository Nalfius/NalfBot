/**
 * Module de blagues
 * Répond à la slash command /blague avec une blague aléatoire
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
 * Identifiants du formulaire d'ajout de blague
 */
const ADD_MODAL_ID = 'edit_jokes-ajouter';
const ADD_INPUT_ID = 'texte';

/**
 * Limites Discord : 2000 caractères par message, 100 par choix d'autocomplétion, 25 choix maximum
 */
const MAX_JOKE_LENGTH = 2000;
const MAX_CHOICE_LENGTH = 100;
const MAX_CHOICES = 25;

/**
 * Listes de blagues modifiées par serveur (guildId -> string[])
 * Un serveur absent utilise DEFAULT_JOKES
 * @type {Object.<string, string[]>}
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
  jokesByGuild = readJson(JOKES_FILE);
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
 * @returns {string[]}
 */
function getJokes(guildId) {
  return jokesByGuild[guildId] ?? DEFAULT_JOKES;
}

/**
 * Ajoute une blague à la liste d'un serveur
 * @param {string} guildId - Identifiant du serveur
 * @param {string} text - La blague
 * @returns {'added'|'duplicate'|'empty'} - Résultat de l'ajout
 */
function addJoke(guildId, text) {
  const joke = text.trim();
  if (!joke) {
    return 'empty';
  }
  const jokes = getJokes(guildId);
  if (jokes.includes(joke)) {
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
 * @returns {string|null} - La blague supprimée, ou null si l'index est invalide
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
 * @returns {string|null} - Une blague aléatoire ou null
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
 * Valeur = index de la blague, nom = blague sur une ligne, tronquée
 * @param {string|null} guildId - Identifiant du serveur
 * @param {string} search - Texte saisi par l'utilisateur
 * @returns {{name: string, value: string}[]}
 */
function getJokeChoices(guildId, search) {
  const query = normalize(search);
  return getJokes(guildId)
    .map((joke, index) => ({ joke, index }))
    .filter(({ joke }) => normalize(joke).includes(query))
    .slice(0, MAX_CHOICES)
    .map(({ joke, index }) => {
      const oneLine = joke.replace(/\s+/g, ' ');
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
    .addLabelComponents(new LabelBuilder()
      .setLabel('Blague')
      .setDescription('Retours à la ligne autorisés (question, puis réponse)')
      .setTextInputComponent(new TextInputBuilder()
        .setCustomId(ADD_INPUT_ID)
        .setStyle(TextInputStyle.Paragraph)
        .setMaxLength(MAX_JOKE_LENGTH)
        .setRequired(true)));
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
    interaction.reply(joke);
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
        ? `Blague supprimée :\n> ${removed.replace(/\n/g, '\n> ')}`
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
  const result = addJoke(interaction.guildId, interaction.fields.getTextInputValue(ADD_INPUT_ID));
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
  DEFAULT_JOKES,
};
