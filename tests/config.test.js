const fs = require('fs');
const path = require('path');
const { PermissionFlagsBits, MessageFlags } = require('discord.js');

// Les tests écrivent dans config.json : on sauvegarde la config réelle pour la restaurer à la fin
const CONFIG_FILE = path.join(__dirname, '..', 'config.json');
const originalConfig = fs.existsSync(CONFIG_FILE) ? fs.readFileSync(CONFIG_FILE, 'utf8') : null;

const { commands, handleCommand, isEnabled, setEnabled, getStatus } = require('../src/configHandler.js');
const feurHandler = require('../src/feurHandler.js');

let passed = 0;
let failed = 0;

function check(name, condition, details = '') {
  if (condition) {
    passed++;
    console.log(`✓ ${name}`);
  } else {
    failed++;
    console.log(`✗ ${name} FAILED ${details}`);
  }
}

function fakeInteraction(commandName, options = {}, guildId = 'test-guild') {
  const interaction = {
    commandName,
    guildId,
    replies: [],
    options: { getString: (name) => options[name] ?? null },
  };
  interaction.reply = (response) => interaction.replies.push(response);
  return interaction;
}

function fakeMessage(content, guildId = 'test-guild') {
  const msg = { content, guildId, replies: [] };
  msg.reply = (text) => msg.replies.push(text);
  return msg;
}

console.log('Running config tests...\n');

// Définition des commandes
const moduleCommand = commands.find((c) => c.name === 'module').toJSON();
check('/module réservé à "Gérer le serveur"', moduleCommand.default_member_permissions === PermissionFlagsBits.ManageGuild.toString());
check('/status accessible à tous', commands.find((c) => c.name === 'status').toJSON().default_member_permissions == null);

// isEnabled / setEnabled
const guildId = 'test-guild';
check('module activé par défaut', isEnabled('serveur-inconnu', 'feur') === true);
setEnabled(guildId, 'feur', false);
check('feur désactivé après setEnabled(false)', isEnabled(guildId, 'feur') === false);
check('jokes non impacté', isEnabled(guildId, 'jokes') === true);
check('autre serveur non impacté', isEnabled('autre-guild', 'feur') === true);
setEnabled(guildId, 'feur', true);
check('feur réactivé après setEnabled(true)', isEnabled(guildId, 'feur') === true);

// /module
const off = fakeInteraction('module', { nom: 'feur', etat: 'off' });
check('/module est traitée', handleCommand(off) === true);
check('/module répond', off.replies[0] === 'Module feur désactivé.', JSON.stringify(off.replies));
check('/module feur off désactive feur', isEnabled(guildId, 'feur') === false);
check('feur désactivé : pas de réponse à "quoi"', feurHandler.handle(fakeMessage('quoi')) === false);
handleCommand(fakeInteraction('module', { nom: 'feur', etat: 'on' }));
check('/module feur on réactive feur', isEnabled(guildId, 'feur') === true);
check('feur réactivé : répond à "quoi"', feurHandler.handle(fakeMessage('quoi')) === true);

// /status
setEnabled(guildId, 'jokes', false);
check('getStatus affiche feur activé', getStatus(guildId).includes('🟢 feur'), getStatus(guildId));
check('getStatus affiche jokes désactivé', getStatus(guildId).includes('🔴 jokes'), getStatus(guildId));
const status = fakeInteraction('status');
check('/status est traitée', handleCommand(status) === true);
check('/status répond en éphémère', status.replies[0]?.flags === MessageFlags.Ephemeral && status.replies[0]?.content === getStatus(guildId), JSON.stringify(status.replies));

check('une autre commande est ignorée', handleCommand(fakeInteraction('blague')) === false);

// Restauration de la config réelle
if (originalConfig === null) {
  fs.rmSync(CONFIG_FILE, { force: true });
} else {
  fs.writeFileSync(CONFIG_FILE, originalConfig);
}

console.log(`\nResults: ${passed} passed, ${failed} failed out of ${passed + failed} tests`);

if (failed > 0) {
  process.exit(1);
}
