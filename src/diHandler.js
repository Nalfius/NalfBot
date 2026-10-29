/**
 * Module "di"
 * Quand un message contient un mot en "di" (ex : "divague"), répond la suite du mot ("vague")
 * Seul le premier mot éligible est utilisé, sans le reste de la phrase
 */

const { isEnabled } = require('./configHandler.js');
const { preserveCase } = require('./feurHandler.js');

/**
 * Longueur minimale du mot complet (préfixe "di" inclus) pour déclencher une réponse
 * Évite les mots courts sans intérêt (ex : "disent" -> "sent")
 */
const MIN_LENGTH = 7;

/**
 * Mot commençant par "di" : non précédé d'une lettre, suivi de lettres (accents compris)
 */
const DI_WORD = /(?<!\p{L})di(\p{L}+)/giu;

/**
 * Transforme un message en réponse "di"
 * @param {string} message - Le message à analyser
 * @returns {string|null} - La suite du premier mot éligible (casse préservée), ou null
 */
function transformMessage(message) {
  // NFC recompose les accents envoyés en deux caractères (ex : "i" + "̂"), sinon \p{L} coupe le mot
  for (const match of message.normalize('NFC').matchAll(DI_WORD)) {
    const [word, rest] = match;
    if (word.length >= MIN_LENGTH) {
      return preserveCase(word, rest);
    }
  }
  return null;
}

/**
 * Répond la suite du mot en "di" au message Discord
 * @param {import('discord.js').Message} msg - Le message Discord
 * @returns {boolean} - true si le message a été traité
 */
function handle(msg) {
  if (!isEnabled(msg.guildId, 'di')) {
    return false;
  }
  const response = transformMessage(msg.content);
  if (!response) {
    return false;
  }
  msg.reply(response);
  return true;
}

module.exports = {
  handle,
  transformMessage,
  MIN_LENGTH,
};
