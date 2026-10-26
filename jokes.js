/**
 * Module de blagues
 * Répond aux commandes !blague ou !joke avec une blague aléatoire
 */

/**
 * Liste des blagues (vide pour l'instant)
 * Format: tableau de strings
 */
const jokes = [];

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
 * Retourne une blague aléatoire ou null si aucune blague n'est disponible
 * @returns {string|null} - Une blague aléatoire ou null
 */
function getRandomJoke() {
  if (jokes.length === 0) {
    return null;
  }
  const randomIndex = Math.floor(Math.random() * jokes.length);
  return jokes[randomIndex];
}

/**
 * Traite une commande de blague
 * @param {string} message - Le message à traiter
 * @returns {string|null} - La blague ou null si pas de blague disponible
 */
function handleJokeCommand(message) {
  if (isJokeCommand(message)) {
    return getRandomJoke();
  }
  return null;
}

module.exports = {
  jokes,
  isJokeCommand,
  getRandomJoke,
  handleJokeCommand
};
