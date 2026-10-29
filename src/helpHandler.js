/**
 * Module d'aide
 * Liste les slash commands du bot via /help
 */

const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const configHandler = require('./configHandler.js');
const jokesHandler = require('./jokesHandler.js');

/**
 * Définition des slash commands du module
 */
const commands = [
  new SlashCommandBuilder()
    .setName('help')
    .setDescription('Liste les commandes du bot'),
];

/**
 * Construit le texte de /help à partir des définitions des commandes
 * Les commandes d'un module désactivé sur le serveur sont masquées
 * Les commandes réservées (permission par défaut définie) sont marquées "admin"
 * @param {string|null} guildId - Identifiant du serveur
 * @returns {string}
 */
function getHelp(guildId) {
  const allCommands = [
    ...(configHandler.isEnabled(guildId, 'jokes') ? jokesHandler.commands : []),
    ...configHandler.commands,
    ...commands,
  ];
  const lines = allCommands.map((builder) => {
    const command = builder.toJSON();
    const adminOnly = command.default_member_permissions ? ' *(admin)*' : '';
    return `\`/${command.name}\` : ${command.description}${adminOnly}`;
  });
  let help = `**Commandes**\n${lines.join('\n')}`;
  if (configHandler.isEnabled(guildId, 'feur')) {
    help += '\n\nLe bot répond aussi « feur » aux messages contenant « quoi » (module feur).';
  }
  if (configHandler.isEnabled(guildId, 'di')) {
    help += '\n\nLe bot répond aussi « vague » quand quelqu\'un dit « divague » (module di).';
  }
  if (configHandler.isEnabled(guildId, 'hein')) {
    help += '\n\nLe bot répond aussi « deux » aux messages contenant « hein » (module hein).';
  }
  return help;
}

/**
 * Traite la slash command /help
 * @param {import('discord.js').ChatInputCommandInteraction} interaction - L'interaction Discord
 * @returns {boolean} - true si l'interaction a été traitée
 */
function handleCommand(interaction) {
  if (interaction.commandName !== 'help') {
    return false;
  }
  interaction.reply({ content: getHelp(interaction.guildId), flags: MessageFlags.Ephemeral });
  return true;
}

module.exports = {
  commands,
  handleCommand,
  getHelp,
};
