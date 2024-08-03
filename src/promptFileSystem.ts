import "reflect-metadata";
import path from "node:path";
import fs from "fs-extra";
import lockfile from "proper-lockfile";
import { Inject, Service } from "typedi";
import { z } from "zod";
// biome-ignore lint/style/useImportType: <explanation>
import { PromptProjectConfigManager } from "./config/PromptProjectConfigManager";
import { PromptModel } from "./promptModel";
import { PromptSchema } from "./schemas/prompts";
import type {
	IPrompt,
	IPromptFileSystem,
	IPromptInput,
	IPromptModelRequired,
	IPromptOutput,
	IPromptsFolderConfig,
} from "./types/interfaces";
import { checkDiskSpace } from "./utils/fileSystemUtils";
import { FileTransaction } from "./utils/fileTransaction";
import { retryLock, withLock } from "./utils/lockUtils";
import { logger } from "./utils/logger";
import { cleanName } from "./utils/promptManagerUtils";
import {
	generateExportableSchemaAndType,
	generatePromptTypeScript,
	generateTestInputs,
} from "./utils/typeGeneration";

export const DEFAULT_PROMPT_FILENAME = "prompt.json";
export const DEFAULT_TYPE_DEFINITION_FILENAME = "prompt.d.ts";
export const DEFAULT_TS_OUTPUT_FILENAME = "prompt.ts";
export const DEFAULT_TEST_INPUTS_FILENAME = "test-inputs.json";
export const DEFAULT_PROMPTS_FOLDER_CONFIG_FILENAME = "prompts-config.json";

/**
 * PromptFileSystem handles all file system operations related to prompts.
 *
 * Purpose: Provide a centralized interface for reading, writing, and managing prompt files.
 *
 * This class encapsulates all interactions with the file system for prompt-related operations,
 * including saving, loading, listing, and managing versions of prompts. It also handles
 * the generation of TypeScript definition files for prompts.
 */
@Service()
export class PromptFileSystem implements IPromptFileSystem {
	private initialized = false;

	constructor(
		@Inject()
		private configManager: PromptProjectConfigManager,
	) {
		const basePath = this.configManager.getBasePath();
		const promptsDir = this.configManager.getPromptsDir();
		logger.debug(
			`PromptFileSystem constructor called with basePath: ${basePath} and promptsDir: ${promptsDir}`,
		);
	}

	public isInitialized(): boolean {
		return this.initialized;
	}

	private getBasePath(): string {
		return this.configManager.getBasePath();
	}

	private getPromptsDir(): string {
		return this.configManager.getPromptsDir();
	}

	getFilePath(props: { category: string; promptName: string }): string {
		const { category, promptName } = props;
		return path.join(
			this.getPromptsDir(),
			cleanName(category),
			cleanName(promptName),
			DEFAULT_PROMPT_FILENAME,
		);
	}

	getVersionFilePath(props: {
		category: string;
		promptName: string;
		version: string;
	}): string {
		const { category, promptName, version } = props;
		return path.join(
			this.getPromptsDir(),
			cleanName(category),
			cleanName(promptName),
			".versions",
			`v${version}.json`,
		);
	}

	private getCategoryDir(props: { category: string }): string {
		const { category } = props;
		return path.join(this.getPromptsDir(), cleanName(category));
	}

	private getPromptDir(props: {
		category: string;
		promptName: string;
	}): string {
		const { category, promptName } = props;
		return path.join(
			this.getPromptsDir(),
			cleanName(category),
			cleanName(promptName),
		);
	}

	private getVersionsDir(props: {
		category: string;
		promptName: string;
	}): string {
		const { category, promptName } = props;
		return path.join(
			this.getPromptDir({
				category: cleanName(category),
				promptName: cleanName(promptName),
			}),
			".versions",
		);
	}

	private getTypeDefinitionPath(props: {
		category: string;
		promptName: string;
	}): string {
		const { category, promptName } = props;
		return path.join(
			this.getPromptDir({
				category: cleanName(category),
				promptName: cleanName(promptName),
			}),
			DEFAULT_TYPE_DEFINITION_FILENAME,
		);
	}

	private getVersionsFilePath(props: {
		category: string;
		promptName: string;
	}): string {
		const { category, promptName } = props;
		return path.join(
			this.getVersionsDir({
				category: cleanName(category),
				promptName: cleanName(promptName),
			}),
			"versions.json",
		);
	}

	private getTsOutputPath(props: {
		category: string;
		promptName: string;
	}): string {
		const { category, promptName } = props;
		return path.join(
			this.getPromptDir({
				category: cleanName(category),
				promptName: cleanName(promptName),
			}),
			DEFAULT_TS_OUTPUT_FILENAME,
		);
	}

	private getTestInputsPath(props: {
		category: string;
		promptName: string;
	}): string {
		const { category, promptName } = props;
		return path.join(
			this.getPromptDir({
				category: cleanName(category),
				promptName: cleanName(promptName),
			}),
			DEFAULT_TEST_INPUTS_FILENAME,
		);
	}

	private async generateTsOutputFile(
		promptData: IPrompt<IPromptInput, IPromptOutput>,
		// filePath: string,
	): Promise<void> {
		// const { formattedSchemaTs } = await generateExportableSchemaAndType({
		//   schema: promptData.inputSchema,
		//   name: `${cleanName(promptData.category)}${cleanName(promptData.name)}Input`
		// });
		const filePath = this.getTsOutputPath({
			category: promptData.category,
			promptName: promptData.name,
		});
		const formattedSchemaTs = await generatePromptTypeScript(promptData);
		await fs.writeFile(filePath, formattedSchemaTs);
	}

	private async generateTestInputsFile(
		promptData: IPrompt<IPromptInput, IPromptOutput>,
		// filePath: string,
	): Promise<void> {
		const filePath = this.getTestInputsPath({
			category: promptData.category,
			promptName: promptData.name,
		});
		const testInputs = generateTestInputs(promptData.inputSchema);
		await fs.writeFile(filePath, JSON.stringify(testInputs, null, 2));
	}

	async initialize(): Promise<void> {
		if (this.initialized) return;
		const basePath = this.configManager.getBasePath();
		try {
			logger.debug(`Initializing PromptFileSystem with basePath: ${basePath}`);

			await fs.access(basePath);
			const stats = await fs.stat(basePath);
			if (!stats.isDirectory()) {
				throw new Error(`${basePath} is not a directory`);
			}

			await fs.mkdir(basePath, { recursive: true });
			await this.initializePromptsFolderConfig();
			const isValid = await this.validatePromptsFolderConfig();
			if (!isValid) {
				logger.warn(
					"Prompts folder configuration is invalid. Reinitializing...",
				);
				await this.initializePromptsFolderConfig();
			}
			this.initialized = true;
			logger.success("PromptFileSystem initialization complete");
		} catch (error) {
			logger.error("PromptFileSystem initialization failed:", error);
			throw new Error(
				"Failed to initialize PromptFileSystem. Please check your configuration and try again.",
			);
		}
	}

	private getDetailedErrorMessage(error: Error, filePath: string): string {
		if (error.message.includes("ENOSPC")) {
			return `Insufficient disk space to save prompt: ${filePath}`;
		}
		if (error.message.includes("EACCES")) {
			return `Insufficient permissions to save prompt: ${filePath}`;
		}
		if (error.message.includes("EBUSY")) {
			return `File is locked or in use: ${filePath}`;
		}
		return `Failed to save prompt: ${filePath}. Error: ${error.message}`;
	}

	private async initializePromptsFolderConfig(): Promise<void> {
		const configPath = this.configManager.getProjectConfigPath();
		try {
			await fs.access(configPath);
			logger.success("Prompts folder configuration already exists");
		} catch (error) {
			logger.warn(
				"Prompts folder configuration not found. Creating a new one...",
			);
			const initialConfig: IPromptsFolderConfig = {
				version: "1.0.0",
				lastUpdated: new Date().toISOString(),
				promptCount: 0,
			};
			await fs.writeFile(configPath, JSON.stringify(initialConfig, null, 2));
			logger.success("Created new prompts folder configuration");
		}
	}

	private async validatePromptsFolderConfig(): Promise<boolean> {
		const configPath = this.configManager.getProjectConfigPath();
		try {
			await fs.access(configPath);
			const configData = await fs.readFile(configPath, "utf-8");
			const config: IPromptsFolderConfig = JSON.parse(configData);
			const isValid =
				typeof config.version === "string" &&
				typeof config.lastUpdated === "string" &&
				typeof config.promptCount === "number";
			if (isValid) {
				logger.success("Prompts folder configuration is valid");
			} else {
				logger.warn("Invalid prompts folder configuration detected");
			}
			return isValid;
		} catch (error) {
			logger.error("Error validating prompts folder configuration:", error);
			logger.warn("Possible reasons for invalid prompts folder configuration:");
			logger.warn(
				"• The configuration file might be corrupted or manually edited incorrectly",
			);
			logger.warn("• The configuration file might be missing required fields");
			logger.warn("Actions to take:");
			logger.warn("• Check the file contents and ensure it's valid JSON");
			logger.warn(
				"• Ensure all required fields (version, lastUpdated, promptCount) are present",
			);
			logger.warn(
				"• If issues persist, try reinitializing the configuration file",
			);
			return false;
		}
	}

	private async updatePromptsFolderConfig(
		updates: Partial<IPromptsFolderConfig>,
	): Promise<void> {
		const configPath = this.configManager.getProjectConfigPath();
		const currentConfig = await this.getPromptsFolderConfig();
		const updatedConfig = {
			...currentConfig,
			...updates,
			lastUpdated: new Date().toISOString(),
		};
		logger.debug(`Updating prompts folder configuration at ${configPath}`);
		await fs.writeFile(configPath, JSON.stringify(updatedConfig, null, 2));
	}

	private async getPromptsFolderConfig(): Promise<IPromptsFolderConfig> {
		const configPath = path.join(
			this.getBasePath(),
			DEFAULT_PROMPTS_FOLDER_CONFIG_FILENAME,
		);
		const configData = await fs.readFile(configPath, "utf-8");
		return JSON.parse(configData);
	}

	/**
	 * Save a prompt to the file system.
	 *
	 * Purpose: Persist prompt data and manage versioning.
	 *
	 * This method saves the prompt data to the main file and a versioned file,
	 * updates the list of versions, and generates a TypeScript definition file.
	 *
	 * @param props An object containing the prompt data to be saved
	 * @throws Error if the prompt data is invalid or if there's a file system error
	 */
	async savePrompt(props: {
		promptData: IPrompt<IPromptInput, IPromptOutput>;
	}): Promise<void> {
		const { promptData } = props;
		let validatedPromptData: IPrompt<IPromptInput, IPromptOutput>;
		try {
			validatedPromptData = PromptSchema.parse(promptData) as IPrompt<
				IPromptInput,
				IPromptOutput
			>;
		} catch (validationError) {
			if (validationError instanceof z.ZodError) {
				throw new Error(
					`Invalid prompt data: ${validationError.errors.map((e) => e.message).join(", ")}`,
				);
			}
			throw validationError;
		}

		const filePath = this.getFilePath({
			category: validatedPromptData.category,
			promptName: validatedPromptData.name,
		});

		await withLock(path.dirname(filePath), async () => {
			const transaction = new FileTransaction();

			try {
				await checkDiskSpace(path.dirname(filePath));
				await fs.mkdir(path.dirname(filePath), { recursive: true });

				const versionFilePath = this.getVersionFilePath({
					category: validatedPromptData.category,
					promptName: validatedPromptData.name,
					version: validatedPromptData.version,
				});
				await fs.mkdir(
					this.getVersionsDir({
						category: validatedPromptData.category,
						promptName: validatedPromptData.name,
					}),
					{ recursive: true },
				);

				const existingPrompt = await this.loadPrompt({
					category: validatedPromptData.category,
					promptName: validatedPromptData.name,
				}).catch(() => null);

				logger.debug(`Saving prompt to ${filePath}`);
				await transaction.write(
					filePath,
					JSON.stringify(validatedPromptData, null, 2),
				);

				logger.debug(`Saving prompt version to ${versionFilePath}`);
				await transaction.write(
					versionFilePath,
					JSON.stringify(validatedPromptData, null, 2),
				);

				const tsOutputPath = this.getTsOutputPath({
					category: validatedPromptData.category,
					promptName: validatedPromptData.name,
				});
				logger.debug(`Generating TS output file at ${tsOutputPath}`);
				await this.generateTsOutputFile(validatedPromptData);
				const tsOutput = await fs.readFile(tsOutputPath, "utf-8");
				await transaction.write(tsOutputPath, tsOutput);

				const testInputsPath = this.getTestInputsPath({
					category: validatedPromptData.category,
					promptName: validatedPromptData.name,
				});
				logger.debug(`Generating test inputs file at ${testInputsPath}`);
				const testInputs =
					await this.generateTestInputsFile(validatedPromptData);
				await transaction.write(
					testInputsPath,
					JSON.stringify(testInputs, null, 2),
				);

				const versionsDir = this.getVersionsDir({
					category: validatedPromptData.category,
					promptName: validatedPromptData.name,
				});
				logger.debug(`Creating versions directory at ${versionsDir}`);
				await fs.mkdir(versionsDir, { recursive: true });

				const versions = await this.getPromptVersions({
					category: validatedPromptData.category,
					promptName: validatedPromptData.name,
				});
				if (!versions.includes(validatedPromptData.version)) {
					versions.push(validatedPromptData.version);
					versions.sort((a, b) => this.compareVersions(b, a));
				}
				logger.debug(
					`Writing versions to ${this.getVersionsFilePath({ category: validatedPromptData.category, promptName: validatedPromptData.name })}`,
				);
				await transaction.write(
					this.getVersionsFilePath({
						category: validatedPromptData.category,
						promptName: validatedPromptData.name,
					}),
					JSON.stringify(versions, null, 2),
				);

				await transaction.commit();
			} catch (error) {
				if (error instanceof Error) {
					const errorMessage = this.getDetailedErrorMessage(error, filePath);
					logger.error(errorMessage, error);
					throw new Error(errorMessage);
				}
				throw new Error(`Unknown error while saving prompt: ${filePath}`);
			}
		});
	}

	/**
	 * Load a prompt from the file system.
	 * Purpose: Retrieve stored prompt data for use in the application.
	 */
	async loadPrompt(props: { category: string; promptName: string }): Promise<
		IPrompt<IPromptInput, IPromptOutput>
	> {
		const { category, promptName } = props;
		const filePath = this.getFilePath({ category, promptName });

		return withLock(path.dirname(filePath), async () => {
			try {
				await fs.access(filePath);
				const data = await fs.readFile(filePath, "utf-8");
				let parsedData: any;
				try {
					parsedData = JSON.parse(data);
				} catch (jsonError) {
					throw new Error(
						`Invalid JSON in prompt file: ${filePath}. Error: ${jsonError instanceof Error ? jsonError.message : String(jsonError)}`,
					);
				}
				try {
					const validatedData = PromptSchema.parse(parsedData);
					return validatedData as IPrompt<IPromptInput, IPromptOutput>;
				} catch (validationError) {
					if (validationError instanceof z.ZodError) {
						throw new Error(
							`Invalid prompt data structure in file: ${filePath}. Error: ${validationError.errors.map((e) => e.message).join(", ")}`,
						);
					}
					throw validationError;
				}
			} catch (error) {
				if (error instanceof Error) {
					if ("code" in error && error.code === "ENOENT") {
						throw new Error(
							`Prompt not found: ${filePath}. Category: ${category}, Name: ${promptName}`,
						);
					}
					throw new Error(
						`Failed to load prompt: ${filePath}. Error: ${error.message}`,
					);
				}
				throw new Error(`Unknown error while loading prompt: ${filePath}`);
			}
		});
	}

	async promptExists(props: {
		category: string;
		promptName: string;
	}): Promise<boolean> {
		const { category, promptName } = props;
		const filePath = this.getFilePath({ category, promptName });
		try {
			await fs.access(filePath);
			return true;
		} catch {
			return false;
		}
	}

	/**
	 * List all prompts, optionally filtered by category.
	 * Purpose: Provide an overview of available prompts for management and selection.
	 */
	async listPrompts({
		category,
	}: { category?: string } = {}): Promise<PromptModel[]> {
		if (!this.initialized) {
			throw new Error(
				"PromptFileSystem is not initialized. Call initialize() first.",
			);
		}
		logger.info(`Listing prompts. Category: ${category || "All"}`);
		logger.debug(`Base path: ${this.getBasePath()}`);

		const categories = await this.listCategories();
		logger.debug(`Categories: ${categories.join(", ")}`);
		const prompts: PromptModel[] = [];

		for (const cat of categories) {
			if (category && cat !== category) continue;

			logger.debug(`Processing category: ${cat}`);
			const categoryDir = this.getCategoryDir({ category: cat });
			const promptDirs = await fs.readdir(categoryDir, {
				withFileTypes: true,
			});

			logger.debug(`Prompts in category ${cat}: ${promptDirs.length}`);
			for (const prompt of promptDirs) {
				const promptData = await this.loadPrompt({
					category: cat,
					promptName: prompt.name,
				});
				const promptModel = new PromptModel(promptData as IPromptModelRequired);
				prompts.push(promptModel);
			}
		}

		return prompts;
	}

	async listCategories(): Promise<string[]> {
		const entries = await fs.readdir(this.configManager.getPromptsDir(), {
			withFileTypes: true,
		});
		return entries
			.filter((entry) => entry.isDirectory())
			.map((entry) => entry.name);
	}

	async searchPrompts(props: { query: string }): Promise<PromptModel[]> {
		const { query } = props;
		const allPrompts = await this.listPrompts();
		return allPrompts.filter(
			(prompt) =>
				prompt.name.toLowerCase().includes(query.toLowerCase()) ||
				prompt.category.toLowerCase().includes(query.toLowerCase()) ||
				prompt.description.toLowerCase().includes(query.toLowerCase()) ||
				prompt.template.toLowerCase().includes(query.toLowerCase()) ||
				(prompt.metadata &&
					Object.values(prompt.metadata).some(
						(value) =>
							typeof value === "string" &&
							value.toLowerCase().includes(query.toLowerCase()),
					)),
		);
	}

	async searchCategories(props: { query: string }): Promise<string[]> {
		const { query } = props;
		const categories = await this.listCategories();
		const matchingCategories = categories.filter((category) =>
			category.toLowerCase().includes(query.toLowerCase()),
		);

		// If no exact matches, try to find partial matches
		if (matchingCategories.length === 0) {
			return categories.filter((category) =>
				query
					.toLowerCase()
					.split(" ")
					.some((word) => category.toLowerCase().includes(word)),
			);
		}

		return matchingCategories;
	}

	async getPromptVersions(props: {
		category: string;
		promptName: string;
	}): Promise<string[]> {
		const { category, promptName } = props;
		try {
			const versionsFile = this.getVersionsFilePath({ category, promptName });
			const versionsData = await fs.readFile(versionsFile, "utf-8");
			return JSON.parse(versionsData);
		} catch {
			return [];
		}
	}

	private compareVersions(a: string, b: string): number {
		const partsA = a.split(".").map(Number);
		const partsB = b.split(".").map(Number);
		for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
			const partA = partsA[i] || 0;
			const partB = partsB[i] || 0;
			if (partA > partB) return 1;
			if (partA < partB) return -1;
		}
		return 0;
	}

	async deletePrompt({
		category,
		promptName,
	}: { category: string; promptName: string }): Promise<void> {
		const promptDir = this.getPromptDir({ category, promptName });
		await withLock(promptDir, async () => {
			await fs.rm(promptDir, { recursive: true, force: true });
		});
	}

	async renamePrompt(props: {
		currentCategory: string;
		currentName: string;
		newCategory: string;
		newName: string;
	}): Promise<void> {
		const { currentCategory, currentName, newCategory, newName } = props;
		const oldPath = path.join(
			this.getPromptsDir(),
			currentCategory,
			currentName,
		);
		const newPath = path.join(this.getPromptsDir(), newCategory, newName);

		let oldRelease: (() => Promise<void>) | undefined;
		let newRelease: (() => Promise<void>) | undefined;
		try {
			oldRelease = await lockfile.lock(oldPath);
			newRelease = await lockfile.lock(path.dirname(newPath));

			// Ensure the new category directory exists
			await fs.mkdir(path.dirname(newPath), { recursive: true });

			// Rename (move) the directory
			await fs.rename(oldPath, newPath);

			// If the categories are different or the name has changed, we need to update the prompt data
			if (currentCategory !== newCategory || currentName !== newName) {
				const promptData = await this.loadPrompt({
					category: newCategory,
					promptName: newName,
				});
				promptData.category = newCategory;
				promptData.name = newName;
				await this.savePrompt({ promptData });
			}
		} finally {
			if (oldRelease) {
				await oldRelease();
			}
			if (newRelease) {
				await newRelease();
			}
		}
	}

	async createCategory(props: { categoryName: string }): Promise<void> {
		const { categoryName } = props;
		const categoryPath = this.getPromptDir({
			category: categoryName,
			promptName: "",
		});
		await fs.mkdir(categoryPath, { recursive: true });
	}

	async deleteCategory(props: { categoryName: string }): Promise<void> {
		const { categoryName } = props;
		const categoryPath = this.getPromptDir({
			category: categoryName,
			promptName: "",
		});
		await fs.rm(categoryPath, { recursive: true, force: true });
	}

	async loadPromptVersion(props: {
		category: string;
		promptName: string;
		version: string;
	}): Promise<IPrompt<IPromptInput, IPromptOutput>> {
		const { category, promptName, version } = props;
		const versionFilePath = this.getVersionFilePath({
			category,
			promptName,
			version,
		});
		const data = await fs.readFile(versionFilePath, "utf-8");
		return JSON.parse(data);
	}

	async getCurrentVersion(
		prompt: IPrompt<IPromptInput, IPromptOutput>,
	): Promise<string> {
		const versions = await this.getPromptVersions({
			category: prompt.category,
			promptName: prompt.name,
		});
		return versions.length > 0 ? versions[0] : "0.0.0";
	}

	private async generateTypeDefinitionFile(
		promptData: IPrompt<IPromptInput, IPromptOutput>,
		filePath: string,
	): Promise<void> {
		const inputTypes = await generateExportableSchemaAndType({
			schema: promptData.inputSchema,
			name: `${cleanName(promptData.name)}Input`,
		});
		const outputTypes = await generateExportableSchemaAndType({
			schema: promptData.outputSchema,
			name: `${cleanName(promptData.name)}Output`,
		});
		const content = `import {z} from "zod";
export interface ${promptData.name}Input ${inputTypes.formattedSchemaTsNoImports}

export interface ${promptData.name}Output ${outputTypes.formattedSchemaTsNoImports}
`;

		await fs.writeFile(filePath, content.trim());
	}
}
