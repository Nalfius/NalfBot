require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const { transformMessage, shouldRespond } = require('./feur.js');
const { handleJokeCommand } = require('./jokes.js');

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
  
  // Vérifie les commandes de blagues en premier
  const jokeResponse = handleJokeCommand(msg.content);
  if (jokeResponse) {
    msg.reply(jokeResponse);
    return;
  }
  
  // Vérifie si le message contient "quoi" (n'importe où)
  if (shouldRespond(msg.content)) {
    const response = transformMessage(msg.content);
    if (response) {
      msg.reply(response);
    }
  }
});

client.login(process.env.DISCORD_TOKEN);