/**
 * Module de blagues
 * Répond à la slash command /blague avec une blague aléatoire
 */

const fs = require('fs');
const path = require('path');
const { SlashCommandBuilder, InteractionContextType, MessageFlags } = require('discord.js');
const { isEnabled } = require('./configHandler.js');

/**
 * Liste des blagues (vide pour l'instant)
 * Format: tableau de strings
 */
const jokes = [
  "Pourquoi les plongeurs plongent-ils toujours en arrière et jamais en avant ?\nParce que sinon ils tombent dans le bateau.",
  "Que fait mozart dans sa tombe ?\nIl décompose",
  "Pourquoi les canards sont toujours à l'heure ?\nParce qu'ils sont dans l'étang.",
  "Qu'est-ce qui est jaune et qui attend ?\nJonathan.",
  "Qu'est-ce qui fait 999 fois tic et 1 fois toc ?\nUn mille-pattes avec une jambe de bois.",
  "Comment appelle-t-on un bébé éléphant prématuré ?\nUn éléphanteau.",
  "Que font deux guitares qui dépriment ?\nUn coup de blues.",
  "C'est l'histoire d'un ptit pois qui fait du sport, et il se dit : \"il me faudrait des petits pois\"",
  "Deux anges font la causette :\n\"Quel temps fait-il demain ?\"\n\"Nuageux\"\n\"Parfait on pourra s'assoir\"",
  "Quel est le jeu préféré des supers-héros ?\nLe cap ou pas cap.",
  "Quel est le comble pour un électricien ?\nAvoir un coup de foudre",
  "Pourquoi Hulk a un beau jardin ?\nParce qu'il a la main verte.",
  "Où l'homme invisible part-il en vacances ?\nChez ces transparents.",
  "Quelle est l'expression préférée des vampires ?\nBon sang",
  "Quel est le comble pour un fantôme ?\nEtre dans de beaux draps.",
];

/**
 * Fichier de persistance pour l'état des blagues par serveur
 */
const STATE_FILE = path.join(__dirname, '..', 'data', 'jokes-state.json');

/**
 * État en mémoire: dernière blague envoyée par serveur (guildId -> index)
 * @type {Object.<string, number>}
 */
let lastJokeIndexByGuild = {};

/**
 * Charge l'état depuis le fichier
 */
function loadState() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      const data = fs.readFileSync(STATE_FILE, 'utf8');
      lastJokeIndexByGuild = JSON.parse(data);
    }
  } catch (err) {
    console.error('[jokes] Erreur au chargement de l\'état:', err.message);
  }
}

/**
 * Sauvegarde l'état dans le fichier
 */
function saveState() {
  try {
    fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
    fs.writeFileSync(STATE_FILE, JSON.stringify(lastJokeIndexByGuild, null, 2));
  } catch (err) {
    console.error('[jokes] Erreur à la sauvegarde de l\'état:', err.message);
  }
}

// Charger l'état au démarrage
loadState();

/**
 * Retourne une blague aléatoire, en évitant la répétition consécutive par serveur
 * @param {string|null} guildId - Identifiant du serveur (optionnel)
 * @returns {string|null} - Une blague aléatoire ou null
 */
function getRandomJoke(guildId = null) {
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
 * Définition des slash commands du module
 */
const commands = [
  new SlashCommandBuilder()
    .setName('blague')
    .setDescription('Raconte une blague')
    .setContexts(InteractionContextType.Guild),
];

/**
 * Traite la slash command /blague
 * @param {import('discord.js').ChatInputCommandInteraction} interaction - L'interaction Discord
 * @returns {boolean} - true si l'interaction a été traitée
 */
function handleCommand(interaction) {
  if (interaction.commandName !== 'blague') {
    return false;
  }
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

module.exports = {
  commands,
  handleCommand,
  jokes,
  getRandomJoke,
  // Fonctions utilitaires pour la gestion de l'état (pour tests/debug)
  resetJokeState: () => {
    lastJokeIndexByGuild = {};
    saveState();
  },
  loadJokeState: loadState,
  saveJokeState: saveState
};
