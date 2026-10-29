const fs = require('fs');
const path = require('path');
const { MessageFlags } = require('discord.js');

// Les tests écrivent dans config.json : on sauvegarde la config réelle pour la restaurer à la fin
const CONFIG_FILE = path.join(__dirname, '..', 'config.json');
const originalConfig = fs.existsSync(CONFIG_FILE) ? fs.readFileSync(CONFIG_FILE, 'utf8') : null;

const { handleCommand, getHelp } = require('../src/helpHandler.js');
const { setEnabled } = require('../src/configHandler.js');

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

function fakeInteraction(commandName, guildId = 'test-guild') {
  const interaction = { commandName, guildId, replies: [] };
  interaction.reply = (response) => interaction.replies.push(response);
  return interaction;
}

console.log('Running help tests...\n');

// Tous les modules activés
const guildId = 'test-guild';
const help = getHelp(guildId);
for (const name of ['blague', 'module', 'status', 'help']) {
  check(`/help liste /${name}`, help.includes(`/${name}\``), help);
}
check('/help mentionne feur', help.includes('feur'), help);
check('/help mentionne di', help.includes('module di'), help);
check('/module marqué admin', /`\/module`.*\(admin\)/.test(help), help);
check('/blague non marqué admin', !/`\/blague`.*\(admin\)/.test(help), help);

// Modules désactivés
setEnabled(guildId, 'jokes', false);
check('jokes désactivé : /blague masqué', !getHelp(guildId).includes('/blague'), getHelp(guildId));
check('jokes désactivé : les autres commandes restent', getHelp(guildId).includes('/status'), getHelp(guildId));
check('jokes désactivé : autre serveur non impacté', getHelp('autre-guild').includes('/blague'));
setEnabled(guildId, 'feur', false);
check('feur désactivé : mention de feur masquée', !getHelp(guildId).includes('feur'), getHelp(guildId));
check('feur désactivé : mention de di conservée', getHelp(guildId).includes('module di'), getHelp(guildId));
setEnabled(guildId, 'di', false);
check('di désactivé : mention de di masquée', !getHelp(guildId).includes('module di'), getHelp(guildId));
check('di désactivé : mention de hein conservée', getHelp(guildId).includes('module hein'), getHelp(guildId));
setEnabled(guildId, 'hein', false);
check('hein désactivé : mention de hein masquée', !getHelp(guildId).includes('module hein'), getHelp(guildId));

// /help
const interaction = fakeInteraction('help');
check('/help est traitée', handleCommand(interaction) === true);
check('/help répond en éphémère', interaction.replies[0]?.flags === MessageFlags.Ephemeral, JSON.stringify(interaction.replies));
check('/help utilise la config du serveur', interaction.replies[0]?.content === getHelp(guildId), JSON.stringify(interaction.replies));
check('une autre commande est ignorée', handleCommand(fakeInteraction('status')) === false);

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
