/**
 * Module de blagues
 * Répond aux commandes !blague ou !joke avec une blague aléatoire
 */

const fs = require('fs');
const path = require('path');

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
const STATE_FILE = path.join(__dirname, '..', 'jokes-state.json');

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
    fs.writeFileSync(STATE_FILE, JSON.stringify(lastJokeIndexByGuild, null, 2));
  } catch (err) {
    console.error('[jokes] Erreur à la sauvegarde de l\'état:', err.message);
  }
}

// Charger l'état au démarrage
loadState();

/**
 * Vérifie si un message est une commande de blague
 * @param {string} message - Le message à vérifier
 * @returns {boolean} - true si le message est !blague ou !joke
 */
function isJokeCommand(message) {
  const trimmed = message.trim();
  return trimmed === '!blague' || trimmed === '!joke';
}

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
 * Traite une commande de blague
 * @param {string} message - Le message à traiter
 * @param {string|null} guildId - Identifiant du serveur (optionnel)
 * @returns {string|null} - La blague ou null si pas de blague disponible
 */
function handleJokeCommand(message, guildId = null) {
  if (isJokeCommand(message)) {
    return getRandomJoke(guildId);
  }
  return null;
}

/**
 * Répond au message Discord s'il s'agit d'une commande de blague
 * @param {import('discord.js').Message} msg - Le message Discord
 * @returns {boolean} - true si le message a été traité
 */
function handle(msg) {
  const joke = handleJokeCommand(msg.content, msg.guildId);
  if (!joke) {
    return false;
  }
  msg.reply(joke);
  return true;
}

module.exports = {
  handle,
  jokes,
  isJokeCommand,
  getRandomJoke,
  handleJokeCommand,
  // Fonctions utilitaires pour la gestion de l'état (pour tests/debug)
  resetJokeState: () => {
    lastJokeIndexByGuild = {};
    saveState();
  },
  loadJokeState: loadState,
  saveJokeState: saveState
};
