require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const jokesHandler = require('./src/jokesHandler.js');
const feurHandler = require('./src/feurHandler.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.on('ready', () => console.log(`Connecté : ${client.user.tag}`));

client.on('messageCreate', (msg) => {
  if (msg.author.bot) return;

  // Les blagues sont prioritaires sur feur
  if (jokesHandler.handle(msg)) return;
  feurHandler.handle(msg);
});

client.login(process.env.DISCORD_TOKEN);