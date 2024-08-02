.PHONY: run run-list run-detail run-create run-status run-help run-amend run-import run-evaluate run-generate run-test run-wizard watch help

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
	chokidar 'src/**/*.{ts,tsx}' -c 'make $(filter-out $@,$(MAKECMDGOALS))'

help:
	@echo "Usage:"
	@echo "  make [target]"
	@echo ""
	@echo "Targets:"
	@echo "  run            - Run the CLI"
	@echo "  run-list       - Run the CLI with the list screen"
	@echo "  run-detail     - Run the CLI with the detail screen for writing category and generate_prompt name"
	@echo "  run-create     - Run the CLI with the create screen"
	@echo "  run-status     - Run the CLI with the status screen"
	@echo "  run-help       - Run the CLI with the help screen"
	@echo "  run-amend      - Run the CLI with the amend screen"
	@echo "  run-import     - Run the CLI with the import screen"
	@echo "  run-evaluate   - Run the CLI with the evaluate screen for writing category and generate_prompt name"
	@echo "  run-generate   - Run the CLI with the generate screen"
	@echo "  run-test       - Run the CLI with the test screen"
	@echo "  run-wizard     - Run the CLI with the test screen and wizard step 1"
	@echo "  watch          - Watch for changes in .tsx files and rerun the specified target(s)"
	@echo "  help           - Show this help message"

# Prevents make from trying to interpret the command line arguments as make targets
%:
	@: