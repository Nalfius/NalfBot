require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const configHandler = require('./src/configHandler.js');
const jokesHandler = require('./src/jokesHandler.js');
const helpHandler = require('./src/helpHandler.js');
const feurHandler = require('./src/feurHandler.js');
const diHandler = require('./src/diHandler.js');
const heinHandler = require('./src/heinHandler.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.on('ready', () => console.log(`Connecté : ${client.user.tag}`));

// Messages : réactions "feur", "di" puis "hein" (une seule réponse par message)
client.on('messageCreate', (msg) => {
  if (msg.author.bot) return;

  if (feurHandler.handle(msg)) return;
  if (diHandler.handle(msg)) return;
  heinHandler.handle(msg);
});

// Slash commands
client.on('interactionCreate', (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (configHandler.handleCommand(interaction)) return;
  if (jokesHandler.handleCommand(interaction)) return;
  helpHandler.handleCommand(interaction);
});

client.login(process.env.DISCORD_TOKEN);
