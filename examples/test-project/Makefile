.PHONY: run test prompt

run:
	bun run index.ts

test:
	bun test

prompt:
	@read -p "Enter prompt command: " cmd; \
	npm run prompt-manager -- $$cmd
