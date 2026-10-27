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
const jokes = [];

/**
 * Fichier de persistance pour l'état des blagues par serveur
 */
const STATE_FILE = path.join(__dirname, 'jokes-state.json');

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

module.exports = {
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
