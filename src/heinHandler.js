/**
 * Module "hein"
 * Quand un message contient le mot "hein", répond "deux" (casse préservée), sans le reste de la phrase
 */

const { isEnabled } = require('./configHandler.js');
const { preserveCase } = require('./feurHandler.js');

/**
 * Mot "hein" isolé : ni précédé ni suivi d'une lettre (ignore "Rhein", "sheinz"...)
 */
const HEIN_WORD = /(?<!\p{L})hein(?!\p{L})/iu;

/**
 * Transforme un message en réponse "deux"
 * @param {string} message - Le message à analyser
 * @returns {string|null} - "deux" avec la casse du "hein" trouvé, ou null
 */
function transformMessage(message) {
  const match = message.normalize('NFC').match(HEIN_WORD);
  if (!match) {
    return null;
  }
  return preserveCase(match[0], 'deux');
}

/**
 * Répond "deux" au message Discord s'il contient "hein"
 * @param {import('discord.js').Message} msg - Le message Discord
 * @returns {boolean} - true si le message a été traité
 */
function handle(msg) {
  if (!isEnabled(msg.guildId, 'hein')) {
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
};
