import "reflect-metadata";
import { input, select } from "@inquirer/prompts";
import Container from "typedi";
import { PromptProjectConfigManager } from "./config/PromptProjectConfigManager";
import { PromptFileSystem } from "./promptFileSystem";
import { PromptManager } from "./promptManager";
import { PromptModel } from "./promptModel";
import { PromptModelEvaluator } from "./promptModelEvaluator";
import { logger } from "./utils/logger";

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
	await ensureInitialized();

	const promptManager = Container.get(PromptManager);

	const categories = await promptManager.listCategories();
	const selectedCategory = await select({
		message: "Select a category:",
		choices: categories.map((cat) => ({ value: cat, name: cat })),
	});

	const prompts = await promptManager.listPrompts({
		category: selectedCategory,
	});
	const selectedPrompt = await select({
		message: "Select a prompt:",
		choices: prompts.map((prompt) => ({
			value: prompt.name,
			name: prompt.name,
		})),
	});

	const promptModel = await promptManager.getPrompt({
		category: selectedCategory,
		name: selectedPrompt,
	});
	const evaluator = new PromptModelEvaluator(promptModel);

	console.log("Generating test inputs...");
	await evaluator.generateTestInputs(5);

	console.log("Running evaluation...");
	const evaluationResults = await evaluator.runEvaluation();

	console.log("Evaluation Results:");
	console.log(JSON.stringify(evaluationResults, null, 2));

	console.log("Suggesting improvements...");
	const improvements = await evaluator.suggestImprovements();

	console.log("Suggested Improvements:");
	console.log(improvements.join("\n"));

	const shouldGenerateVariations = await select({
		message: "Generate prompt variations based on improvements?",
		choices: [
			{ value: true, name: "Yes" },
			{ value: false, name: "No" },
		],
	});

	if (shouldGenerateVariations) {
		console.log("Generating prompt variations...");
		const variations = await evaluator.generatePromptVariations(improvements);

		console.log("Prompt Variations:");
		variations.forEach((variation, index) => {
			console.log(`Variation ${index + 1}:`);
			console.log(variation.template);
			console.log("---");
		});
	}

	console.log("Test complete!");
}

main().catch(console.error);
