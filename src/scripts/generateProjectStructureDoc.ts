import fs from "node:fs/promises";
import path from "node:path";
import { openai } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { Container } from "typedi";
import { z } from "zod";
import { PromptProjectConfigManager } from "../config/PromptProjectConfigManager";

async function getFileTree(dir: string): Promise<string> {
	const files = await fs.readdir(dir);
	let output = "";

	for (const file of files) {
		const filePath = path.join(dir, file);
		const stats = await fs.stat(filePath);

		if (stats.isDirectory()) {
			output += `${file}/\n`;
			output += (await getFileTree(filePath))
				.split("\n")
				.map((line) => `  ${line}`)
				.join("\n");
		} else if (path.extname(file) === ".ts") {
			output += `${file}\n`;
		}
	}

	return output;
}

async function getFileDescription(filePath: string): Promise<string> {
	const content = await fs.readFile(filePath, "utf-8");
	const prompt = `Analyze the following TypeScript file and provide a brief description of its content and purpose:

<file>
${content}
</file>

Description:`;

	const { object } = await generateObject({
		model: openai("gpt-4o-mini"),
		schema: z.object({
			description: z.string(),
		}),
		prompt,
	});

	return object.description;
}

async function generateMarkdownDoc() {
	const configManager = Container.get(PromptProjectConfigManager);
	const srcDir = path.join(configManager.getBasePath(), "src");

	let markdown = "# Project Structure and File Descriptions\n\n";
	markdown += "## Directory Structure\n\n```\n";
	markdown += await getFileTree(srcDir);
	markdown += "```\n\n## File Descriptions\n\n";

	const files = await fs.readdir(srcDir, { recursive: true });
	const tsFiles = files.filter(
		(file) => typeof file === "string" && file.endsWith(".ts"),
	);

	const descriptionPromises = tsFiles.map(async (file) => {
		const filePath = path.join(srcDir, file as string);
		const description = await getFileDescription(filePath);
		return `### ${file}\n\n${description}\n\n`;
	});

	const descriptions = await Promise.all(descriptionPromises);
	markdown += descriptions.join("");

	const outputPath = path.join(
		configManager.getBasePath(),
		"project_structure.md",
	);
	await fs.writeFile(outputPath, markdown);
	console.log(`Project structure document generated at ${outputPath}`);
}

generateMarkdownDoc().catch(console.error);
