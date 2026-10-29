.PHONY: start deploy test

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
