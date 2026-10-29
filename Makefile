.PHONY: start deploy test install build up down logs deploy-docker

# Lance le bot
start:
	node index.js

# Enregistre les slash commands auprès de Discord (à relancer quand une commande change)
deploy:
	node src/deployCommands.js

# Lance tous les tests, ou un seul avec t=<nom> (ex : make test t=feur)
test:
ifdef t
	node tests/$(t).test.js
else
	@for f in tests/*.test.js; do echo "== $$f"; node $$f || exit 1; done
endif

# Installe l'environnement local
install:
	npm ci

# --- Docker ---

# Construit l'image du bot
build:
	docker compose build

# (Re)construit l'image et lance le bot en arrière-plan
up:
	docker compose up -d --build

# Arrête le bot (le volume de données est conservé)
down:
	docker compose down

# Affiche les logs du bot en continu
logs:
	docker compose logs -f

# Enregistre les slash commands depuis le conteneur (pas besoin de Node sur l'hôte)
deploy-docker:
	docker compose run --rm bot-feur node src/deployCommands.js
