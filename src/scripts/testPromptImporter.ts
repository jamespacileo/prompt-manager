import { input, select } from "@inquirer/prompts";
import Container from "typedi";
import { PromptProjectConfigManager } from "../config/PromptProjectConfigManager";
import { PromptFileSystem } from "../promptFileSystem";
import { PromptManager } from "../promptManager";
import { PromptModelImporter } from "../promptModelImporter";

async function main() {
	const importer = new PromptModelImporter();
	const promptManager = Container.get(PromptManager);
	await Container.get(PromptProjectConfigManager).initialize();
	await Container.get(PromptFileSystem).initialize();
	await promptManager.initialize();

	const sourceType = await select<"url" | "text" | "file">({
		message: "Select the source type:",
		choices: [
			{ value: "url", name: "URL" },
			{ value: "text", name: "Text" },
			{ value: "file", name: "File" },
		],
	});

	const content = await input({
		message: `Enter the ${sourceType === "file" ? "file path" : "content"}:`,
	});

	try {
		const importedPrompts = await promptManager.importPrompts({
			type: sourceType,
			content: content,
		});
		console.log(`Successfully imported ${importedPrompts.length} prompts:`);
		importedPrompts.forEach((prompt, index) => {
			console.log(`${index + 1}. ${prompt.name} (${prompt.category})`);
		});
	} catch (error) {
		console.error("Error importing prompts:", error);
	}
}

main().catch(console.error);
