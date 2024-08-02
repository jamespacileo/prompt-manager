.PHONY: run run-list run-detail run-create run-status run-help run-amend run-import run-evaluate run-generate run-test

run:
	bun run src/cli/cli.tsx

run-list:
	bun run src/cli/cli.tsx --screen list

run-detail:
	bun run src/cli/cli.tsx --screen detail --category writing --name generate_prompt

run-create:
	bun run src/cli/cli.tsx --screen create

run-status:
	bun run src/cli/cli.tsx --screen status

run-help:
	bun run src/cli/cli.tsx --screen help

run-amend:
	bun run src/cli/cli.tsx --screen amend

run-import:
	bun run src/cli/cli.tsx --screen import

run-evaluate:
	bun run src/cli/cli.tsx --screen evaluate --category writing --name generate_prompt

run-generate:
	bun run src/cli/cli.tsx --screen generate

run-test:
	bun run src/cli/cli.tsx --screen test

run-wizard:
	bun run src/cli/cli.tsx --screen test --wizard-step 1

watch:
	nodemon
