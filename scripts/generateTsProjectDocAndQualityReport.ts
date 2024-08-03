import * as fs from "fs-extra";
import * as path from "node:path";
import { exec, spawn } from "node:child_process";
import chalk from "chalk";
import { promisify } from "node:util";

// Types
export interface BiomeError {
	line: number;
	column: number;
	message: string;
}

export interface FileErrors {
	[filePath: string]: BiomeError[];
}

// Configuration
const filesToInclude: string[] = [
	// Add your initial file paths here
];

const projectRoot = process.cwd();
const sourceDir = "./src"; // This could be made configurable

// File description mapping
const fileDescriptions: { [key: string]: string } = {
	"src/promptManager.ts": "Main class for managing prompts",
	"src/promptModel.ts": "Model representation of a prompt",
	// Add more descriptions as needed
};

const execPromise = promisify(exec);

async function safeExecCommand(
	command: string,
	args: string[],
): Promise<{ stdout: string; stderr: string }> {
	const commandString = `${command} ${args.join(" ")}`;
	try {
		// Execute the command and return both stdout and stderr
		const { stdout, stderr } = await execPromise(commandString);
		return { stdout, stderr };
	} catch (error: any) {
		// Ensure that both stdout and stderr are returned even if an error occurs
		if (error.stdout || error.stderr) {
			return { stdout: error.stdout || "", stderr: error.stderr || "" };
		}
		throw error;
	}
}

// Helper Functions
function getFileDescription(filePath: string): string {
	return fileDescriptions[filePath] || "No description available";
}

export async function runBiomeCheck(): Promise<string> {
	console.log(chalk.blue("Running Biome check..."));
	try {
		// Await the execution and capture both stdout and stderr
		const { stdout, stderr } = await safeExecCommand("bunx", [
			"biome",
			"check",
			sourceDir,
		]);
		console.log(chalk.green("Biome check completed."));
		console.log(chalk.gray("Raw Biome output:"));
		console.log(stdout);

		// Optionally, handle stderr if you want to log warnings or non-critical errors
		if (stderr) {
			console.log(chalk.yellow("Biome stderr output:"));
			console.log(stderr);
		}

		return stderr + stdout;
	} catch (error) {
		if (error instanceof Error) {
			console.error(chalk.red("Error running Biome check:"), error.message);

			// Display both stdout and stderr from the error if they exist
			if ("stdout" in error || "stderr" in error) {
				console.log(chalk.yellow("Biome output (from error):"));
				console.log((error as any).stdout || "");
				console.log(chalk.yellow("Biome stderr (from error):"));
				console.log((error as any).stderr || "");
				return (error as any).stdout || "";
			}
		}
		return "";
	}
}

function validateFilePath(filePath: string, projectRoot: string): boolean {
	const normalizedPath = path.normalize(filePath);
	const resolvedPath = path.resolve(projectRoot, normalizedPath);

	if (!resolvedPath.startsWith(projectRoot)) {
		console.warn(
			chalk.yellow(`Invalid file path: ${filePath} (outside project root)`),
		);
		return false;
	}

	if (normalizedPath.includes("..")) {
		console.warn(
			chalk.yellow(`Invalid file path: ${filePath} (contains '..')`),
		);
		return false;
	}

	return true;
}

// Main Functions
async function getTreeStructure(): Promise<string> {
	try {
		return (await safeExecCommand("tree", ["-P", "*.ts", sourceDir])).stdout;
	} catch (error) {
		console.error(chalk.red("Error generating tree structure:"), error);
		return "Unable to generate tree structure";
	}
}
export function parseBiomeOutput(output: string): FileErrors {
	const fileErrors: FileErrors = {};
	const errorPattern = /(\.\/src\/.*\.[jt]sx?:\d+:\d+\s+.*\s+━+)\n\n/g;
	let match;
	let lastIndex = 0;

	while ((match = errorPattern.exec(output)) !== null) {
		const header = match[1];
		const [filePath, line, column] = header.split(":");
		const errorCodeMatch = header.match(/\s([\w/]+)\s/);
		const errorCode = errorCodeMatch ? errorCodeMatch[1] : "Unknown";

		const cleanFilePath = filePath.replace(/^\.\//, "");

		const errorMessage = output
			.slice(lastIndex + match[0].length, errorPattern.lastIndex)
			.trim();
		lastIndex = errorPattern.lastIndex;

		if (!fileErrors[cleanFilePath]) {
			fileErrors[cleanFilePath] = [];
		}

		fileErrors[cleanFilePath].push({
			line: Number.parseInt(line, 10),
			column: Number.parseInt(column, 10),
			message: `${errorCode}\n\n${errorMessage}`,
		});
	}

	return fileErrors;
}

export async function generateMarkdownDoc() {
	console.log(chalk.green("Starting documentation generation..."));
	let markdownContent = "# Project Documentation\n\n";

	// Validate and filter file paths
	const validFilesToInclude = filesToInclude.filter((file) =>
		validateFilePath(file, projectRoot),
	);
	if (validFilesToInclude.length !== filesToInclude.length) {
		console.warn(
			chalk.yellow(
				`Filtered out ${filesToInclude.length - validFilesToInclude.length} invalid file paths.`,
			),
		);
	}

	// Run Biome check
	const biomeOutput = await runBiomeCheck();
	const fileErrors = parseBiomeOutput(biomeOutput);

	// Update filesToInclude with new files from Biome check
	console.log(
		chalk.blue("\nUpdating filesToInclude with new files from Biome check..."),
	);
	let newFilesAdded = 0;
	for (const file of Object.keys(fileErrors)) {
		const relativePath = path.relative(projectRoot, file).replace(/^\.\//, "");
		if (
			!validFilesToInclude.includes(relativePath) &&
			validateFilePath(relativePath, projectRoot)
		) {
			validFilesToInclude.push(relativePath);
			newFilesAdded++;
			console.log(
				chalk.green(
					`Added new file to documentation: ${chalk.bold(relativePath)}`,
				),
			);
		}
	}
	console.log(
		chalk.cyan(`\nTotal new files added: ${chalk.bold(newFilesAdded)}`),
	);

	// Add project structure
	const treeStructure = await getTreeStructure();
	markdownContent +=
		"## Project Structure\n\n```\n" + treeStructure + "\n```\n\n";

	console.log("fileErrors", Object.keys(fileErrors));

	// Process each file
	for (const filePath of validFilesToInclude) {
		try {
			const fullPath = path.join(projectRoot, filePath);
			const fileContent = await fs.readFile(fullPath, "utf-8");
			const description = getFileDescription(filePath);

			markdownContent += `## ${filePath}\n\n`;
			markdownContent += `**Description:** ${description}\n\n`;
			markdownContent += "```typescript\n" + fileContent + "\n```\n\n";

			if (fileErrors[filePath] && fileErrors[filePath].length > 0) {
				markdownContent += "### Biome Errors\n\n";
				fileErrors[filePath].forEach((error) => {
					markdownContent += `- Line ${error.line}, Column ${error.column}: ${error.message}\n`;
				});
				markdownContent += "\n";
			} else {
				console.error(chalk.red(`No errors found for file ${filePath}`));
			}
		} catch (error) {
			console.error(chalk.red(`Error processing file ${filePath}:`), error);
		}
	}

	// Write documentation file
	try {
		await fs.writeFile("biome_errors.md", markdownContent);
		console.info(chalk.green("Documentation generated: biome_errors.md"));
	} catch (error) {
		console.error(chalk.red("Error writing documentation file:"), error);
	}

	// Log useful commands
	const filesList = validFilesToInclude.join(" ");
	console.info(chalk.green("\nUseful Commands:"));
	console.info(
		chalk.blue(`aider --sonnet --no-auto-commit --gui ${filesList}`),
	);
	console.info(chalk.blue(`aider --4o --no-auto-commit --gui ${filesList}`));
	console.info(
		chalk.blue(
			`aider --model deepseek/deepseek-coder --no-auto-commit --gui ${filesList}`,
		),
	);
}

// Main execution
generateMarkdownDoc().catch((error) => {
	console.error(
		chalk.red("An error occurred during documentation generation:"),
		error,
	);
	process.exit(1);
});