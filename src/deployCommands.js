/**
 * Enregistre les slash commands du bot auprès de Discord (portée globale)
 * À relancer uniquement quand la définition d'une commande change (nom, description, options, permissions)
 * Le PUT remplace l'ensemble des commandes : une commande retirée d'ici disparaît de Discord
 */

require('dotenv').config();
const { REST, Routes } = require('discord.js');
const configHandler = require('./configHandler.js');
const jokesHandler = require('./jokesHandler.js');
const helpHandler = require('./helpHandler.js');

const { DISCORD_TOKEN, CLIENT_ID } = process.env;

if (!DISCORD_TOKEN || !CLIENT_ID) {
  console.error('DISCORD_TOKEN et CLIENT_ID doivent être définis dans .env');
  process.exit(1);
}

const commands = [...jokesHandler.commands, ...configHandler.commands, ...helpHandler.commands]
  .map((command) => command.toJSON());

const rest = new REST().setToken(DISCORD_TOKEN);

rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands })
  .then((data) => console.log(`${data.length} commandes enregistrées : ${data.map((c) => '/' + c.name).join(', ')}`))
  .catch((err) => {
    console.error('Erreur à l\'enregistrement des commandes:', err.message);
    process.exit(1);
  });
