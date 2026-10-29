/**
 * Module de configuration
 * Active/désactive les modules par serveur via les slash commands /module et /status
 */

const fs = require('fs');
const path = require('path');
const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  InteractionContextType,
  MessageFlags,
} = require('discord.js');

/**
 * Modules activables/désactivables
 */
const MODULES = ['feur', 'jokes', 'di'];

/**
 * Fichier de persistance de la configuration (non commité)
 */
const CONFIG_FILE = path.join(__dirname, '..', 'config.json');

/**
 * Configuration en mémoire par serveur (guildId -> { module: boolean })
 * Un module absent de la config est considéré comme activé
 * @type {Object.<string, Object.<string, boolean>>}
 */
let config = {};

/**
 * Charge la configuration depuis le fichier
 */
function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    }
  } catch (err) {
    console.error('[config] Erreur au chargement de la config:', err.message);
  }
}

/**
 * Sauvegarde la configuration dans le fichier
 */
function saveConfig() {
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
  } catch (err) {
    console.error('[config] Erreur à la sauvegarde de la config:', err.message);
  }
}

// Charger la config au démarrage
loadConfig();

/**
 * Indique si un module est activé sur un serveur
 * @param {string|null} guildId - Identifiant du serveur
 * @param {string} module - Nom du module
 * @returns {boolean} - true par défaut si rien n'est configuré
 */
function isEnabled(guildId, module) {
  return config[guildId]?.[module] !== false;
}

/**
 * Active ou désactive un module sur un serveur
 * @param {string} guildId - Identifiant du serveur
 * @param {string} module - Nom du module
 * @param {boolean} enabled - Nouvel état
 */
function setEnabled(guildId, module, enabled) {
  config[guildId] = { ...config[guildId], [module]: enabled };
  saveConfig();
}

/**
 * Définition des slash commands du module
 * /module est réservé aux membres ayant la permission "Gérer le serveur" (filtré par Discord)
 */
const commands = [
  new SlashCommandBuilder()
    .setName('module')
    .setDescription('Active ou désactive un module du bot sur ce serveur')
    .addStringOption((option) => option
      .setName('nom')
      .setDescription('Le module à configurer')
      .setRequired(true)
      .addChoices(...MODULES.map((module) => ({ name: module, value: module }))))
    .addStringOption((option) => option
      .setName('etat')
      .setDescription('Activer ou désactiver')
      .setRequired(true)
      .addChoices({ name: 'activer', value: 'on' }, { name: 'désactiver', value: 'off' }))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setContexts(InteractionContextType.Guild),
  new SlashCommandBuilder()
    .setName('status')
    .setDescription('Affiche l\'état des modules sur ce serveur')
    .setContexts(InteractionContextType.Guild),
];

/**
 * Construit le texte de /status
 * @param {string} guildId - Identifiant du serveur
 * @returns {string}
 */
function getStatus(guildId) {
  const lines = MODULES.map((module) => `${isEnabled(guildId, module) ? '🟢' : '🔴'} ${module}`);
  return `**État des modules**\n${lines.join('\n')}`;
}

/**
 * Traite les slash commands /module et /status
 * @param {import('discord.js').ChatInputCommandInteraction} interaction - L'interaction Discord
 * @returns {boolean} - true si l'interaction a été traitée
 */
function handleCommand(interaction) {
  if (interaction.commandName === 'module') {
    const module = interaction.options.getString('nom');
    const enabled = interaction.options.getString('etat') === 'on';
    setEnabled(interaction.guildId, module, enabled);
    interaction.reply(`Module ${module} ${enabled ? 'activé' : 'désactivé'}.`);
    return true;
  }
  if (interaction.commandName === 'status') {
    interaction.reply({ content: getStatus(interaction.guildId), flags: MessageFlags.Ephemeral });
    return true;
  }
  return false;
}

module.exports = {
  commands,
  handleCommand,
  isEnabled,
  setEnabled,
  getStatus,
  MODULES,
};
