#!/usr/bin/env bun

import "reflect-metadata";
import "./cliPolyfills";

import { Command } from "commander";
import { RenderOptions, render } from "ink";
import React from "react";
import { Container } from "typedi";
import { PromptProjectConfigManager } from "../config/PromptProjectConfigManager";
import { PromptFileSystem } from "../promptFileSystem";
import { PromptManager } from "../promptManager";
import { logger } from "../utils/logger";
import { renderFullScreen } from "./Fullscreen";
import PromptManagerUI from "./PromptManagerUI";

//you need this
process.stdin.resume();

async function ensureInitialized() {
	const configManager = Container.get(PromptProjectConfigManager);
	await configManager.initialize();
	const fileSystem = Container.get(PromptFileSystem);
	await fileSystem.initialize();
	const promptManager = Container.get(PromptManager);
	await promptManager.initialize();
	logger.info("Initialized");
}

async function main() {
	const program = new Command();

	program
		.option(
			"-s, --screen <screen>",
			"Initial screen to open (e.g., home, list, detail, create, status, help, amend, import, evaluate, generate, test)",
			"home",
		)
		.option(
			"-c, --category <category>",
			"Prompt category (required for detail and evaluate screens)",
		)
		.option(
			"-n, --name <name>",
			"Prompt name (required for detail and evaluate screens)",
		)
		.option(
			"-v, --version <version>",
			"Prompt version (optional for detail screen)",
		)
		.option("-w, --wizard-step <step>", "Wizard step (for test screen)", "1")
		.parse(process.argv);

	const options = program.opts();

	await ensureInitialized();
	await renderFullScreen(
		<PromptManagerUI
			initialScreen={options.screen}
			initialPrompt={
				options.category && options.name
					? { category: options.category, name: options.name }
					: undefined
			}
			initialVersion={options.version}
			initialWizardStep={Number.parseInt(options.wizardStep, 10)}
		/>,
	);

	// const cleanup = () => {
	//   clear();
	//   logger.info("Exiting gracefully...");
	//   process.exit(0);
	// };

	// process.on("SIGINT", cleanup);
	// process.on("SIGTERM", cleanup);

	// try {
	//   await waitUntilExit();
	// } finally {
	//   cleanup();
	// }
}

await main().catch((error) => {
	logger.error("An error occurred:", error);
	process.exit(1);
});
