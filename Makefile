.PHONY: start test

# Lance le bot
start:
	node index.js

# Lance tous les tests, ou un seul avec t=<nom> (ex : make test t=feur)
test:
ifdef t
	node tests/$(t).test.js
else
	@for f in tests/*.test.js; do echo "== $$f"; node $$f || exit 1; done
endif
