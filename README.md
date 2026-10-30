# NalfBot

Bot Discord parfaitement inutile, mais plutôt marrant.

## Modules

Chaque module s'active ou se désactive par serveur avec `/module` (tous activés par défaut).

| Module | Déclencheur | Réponse |
|---|---|---|
| `feur` | un message contenant « quoi » | `feur` (1 fois sur 20 : `coubeh`), avec quelques règles spéciales : `pourquoi` → `pour feur`, `tu fais quoi` → `je fais feur`… |
| `jokes` | `/blague` | une blague aléatoire, jamais deux fois la même d'affilée sur un serveur. Chaque serveur a sa propre liste, gérée par ses admins avec `/edit_jokes` |
| `di` | un mot de 7 lettres ou plus commençant par « di » | la suite du mot : `divague` → `vague` |
| `hein` | le mot « hein » | `deux` |

Le bot répond au plus une fois par message (priorité : feur, di, hein). La casse est conservée : `QUOI` → `FEUR`.

## Commandes

| Commande | Accès | Description |
|---|---|---|
| `/blague` | tout le monde | raconte une blague |
| `/edit_jokes ajouter` | admins | ouvre un formulaire pour ajouter une blague (multiligne) à la liste du serveur |
| `/edit_jokes supprimer blague` | admins | supprime une blague, choisie par autocomplétion (tape pour chercher) |
| `/module nom etat` | admins (permission « Gérer le serveur ») | active ou désactive un module sur le serveur |
| `/status` | tout le monde | état des modules sur le serveur (réponse visible par soi seul) |
| `/help` | tout le monde | liste des commandes (masque celles des modules désactivés) |

## Installation

### 1. Application Discord

Sur le [portail développeur Discord](https://discord.com/developers/applications) :

- **Bot** → activer l'intent **Message Content** (nécessaire pour lire les messages : feur, di, hein).
- **Invitation** : scopes `bot` et `applications.commands`, avec les permissions *Voir les salons*, *Envoyer des messages* et *Voir l'historique des messages*.

> Dans un salon privé, le bot doit être ajouté explicitement : sans accès au salon, les slash commands fonctionnent mais il ne voit pas les messages.

### 2. Configuration

```bash
cp .env.dist .env
```

Renseigner dans `.env` :

| Variable | Où la trouver |
|---|---|
| `DISCORD_TOKEN` | portail développeur → Bot → Token |
| `CLIENT_ID` | portail développeur → General Information → Application ID |

### 3a. Lancement en local (Node)

```bash
make install  # installe les dépendances (versions exactes du package-lock.json)
make deploy   # enregistre les slash commands auprès de Discord
make start    # lance le bot
```

### 3b. Lancement avec Docker

```bash
make up             # construit l'image et lance le bot en arrière-plan
make deploy-docker  # enregistre les slash commands depuis le conteneur
make logs           # suit les logs
```

`.env` n'est pas copié dans l'image : il est injecté au lancement par `env_file`. Le dossier `data/` est un volume Docker (`nalfbot-data`), conservé entre deux rebuilds. Le conteneur tourne avec l'utilisateur `node`, pas en root.

> `make deploy` / `make deploy-docker` ne sont à relancer que lorsque la définition d'une commande change (nom, description, options, permissions), par exemple quand un module est ajouté aux choix de `/module`.

## Commandes make

| Commande | Description |
|---|---|
| `make install` | installe les dépendances (`npm ci`) |
| `make start` | lance le bot |
| `make deploy` | enregistre les slash commands (portée globale) |
| `make test` | lance tous les tests |
| `make test t=<nom>` | lance un seul fichier de test, ex. `make test t=feur` |
| `make build` | construit l'image Docker |
| `make up` | (re)construit l'image et lance le bot en arrière-plan |
| `make down` | arrête le bot (le volume de données est conservé) |
| `make logs` | suit les logs du bot |
| `make deploy-docker` | enregistre les slash commands depuis le conteneur |

Les commandes Node existent aussi en scripts npm (`npm start`, `npm run deploy`, `npm test`, `npm run test:feur`…).

## Structure

```
index.js              point d'entrée : branche les handlers sur les événements Discord
src/
  configHandler.js    config des modules par serveur, /module et /status
  feurHandler.js      module feur
  jokesHandler.js     module jokes, /blague et /edit_jokes
  defaultJokes.json   blagues par défaut d'un serveur
  diHandler.js        module di
  heinHandler.js      module hein
  helpHandler.js      /help
  deployCommands.js   enregistrement des slash commands
tests/                un fichier <module>.test.js par module
data/                 état généré à l'exécution (non commité, volume Docker)
Dockerfile, docker-compose.yml, .dockerignore
```

Fichiers générés à l'exécution dans `data/` :

- `config.json` : modules activés/désactivés par serveur
- `jokes.json` : listes de blagues modifiées par serveur (un serveur absent utilise `src/defaultJokes.json`)
- `jokes-state.json` : dernière blague envoyée par serveur

## Ajouter un module

1. Créer `src/<nom>Handler.js` exposant :
   - `handle(msg)` pour réagir aux messages, et/ou
   - `commands` (définitions `SlashCommandBuilder`) + `handleCommand(interaction)` pour les slash commands ;
   - si besoin, `handleAutocomplete(interaction)` / `handleModalSubmit(interaction)` (voir `jokesHandler.js`).

   Chaque fonction retourne `true` si elle a traité l'événement, et vérifie `isEnabled(guildId, '<nom>')` de `configHandler`.
2. Ajouter le nom du module dans `MODULES` (`src/configHandler.js`).
3. Brancher le handler dans `index.js` (et ses `commands` dans `deployCommands.js` et `helpHandler.js` le cas échéant).
4. Ajouter `tests/<nom>.test.js` (et le script dans `package.json`).
5. `make test`, puis `make deploy` (ou `make deploy-docker`) pour mettre à jour les choix de `/module`.

## Tests

Tests maison sans framework : chaque fichier affiche ses résultats et sort en erreur en cas d'échec. Les cas de `feur`, `di` et `hein` sont des tableaux `{ input, expected }` faciles à compléter pour affiner les règles.

Les tests qui écrivent dans `data/` sauvegardent et restaurent ces fichiers. L'aléatoire de feur est injecté (`transformMessage(message, random)`) pour garder des tests déterministes.
