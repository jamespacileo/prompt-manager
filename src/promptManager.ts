import "reflect-metadata";
import fs from "fs-extra";
import { Inject, Service } from "typedi";
// biome-ignore lint/style/useImportType: <explanation>
import { PromptProjectConfigManager } from "./config/PromptProjectConfigManager";
// biome-ignore lint/style/useImportType: <explanation>
import { PromptFileSystem } from "./promptFileSystem";
import { PromptModel } from "./promptModel";
import { PromptModelImporter } from "./promptModelImporter";
import type {
	IPrompt,
	IPromptCategory,
	IPromptInput,
	IPromptOutput,
} from "./types/interfaces";
import { logger } from "./utils/logger";
import {
	handlePromptNotFound,
	mapPromptToFileInfo,
	validateCategoryAndName,
} from "./utils/promptManagerUtils";
import { incrementVersion } from "./utils/versionUtils";

/**
 * @class PromptManager
 * @description Manages the lifecycle and operations of prompts in the system.
 *
 * @saga
 * PromptManager serves as the central hub for all prompt-related operations.
 * It orchestrates the creation, retrieval, updating, and deletion of prompts,
 * while also handling version control and generation of new prompts.
 *
 * @epicFeatures
 * - Prompt CRUD operations
 * - Version control for prompts
 * - Prompt generation and amendment
 * - Listing and searching prompts
 *
 * @alliances
 * - PromptFileSystem: Handles file operations for prompts
 * - PromptProjectConfigManager: Manages project-wide configurations
 *
 * @allies
 * - CLI commands: Use PromptManager to execute user requests
 * - API endpoints: Utilize PromptManager for prompt operations
 *
 * @epicTale
 * ```typescript
 * const promptManager = new PromptManager();
 * await promptManager.createPrompt({ prompt: newPromptData });
 * const prompts = await promptManager.listPrompts({});
 * ```
 *
 * @safeguards
 * - Ensures data integrity through validation before operations
 * - Implements version control to prevent data loss
 * - Logs operations for auditing and debugging purposes
 */
@Service()
export class PromptManager<
	TInput extends IPromptInput<Record<string, any>> = IPromptInput<
		Record<string, any>
	>,
	TOutput extends IPromptOutput<Record<string, any>> = IPromptOutput<
		Record<string, any>
	>,
> {
	private promptModelImporter: PromptModelImporter;
	/**
	 * Stream the execution of a prompt.
	 *
	 * @quest category - The category of the prompt
	 * @quest name - The name of the prompt
	 * @quest params - The parameters for prompt execution
	 * @reward An async iterable stream of the prompt execution result
	 * @peril Error - Thrown if streaming is not implemented
	 *
	 * @lore
	 * This method is intended to provide a streaming interface for prompt execution,
	 * allowing for real-time processing of prompt outputs.
	 *
	 * @epicDeed
	 * ```typescript
	 * const stream = await promptManager.streamPrompt({
	 *   category: "general",
	 *   name: "greeting",
	 *   params: { name: "World" }
	 * });
	 * for await (const chunk of stream) {
	 *   console.log(chunk);
	 * }
	 * ```
	 */
	streamPrompt(props: {
		category: string;
		name: string;
		params: Record<string, any>;
	}):
		| import("./types/interfaces").IAsyncIterableStream<string>
		| PromiseLike<import("./types/interfaces").IAsyncIterableStream<string>> {
		throw new Error("Method not implemented.");
	}

	/**
	 * Generate an amended version of a prompt based on a query or provided amendments.
	 *
	 * @quest category - The category of the prompt to amend
	 * @quest name - The name of the prompt to amend
	 * @quest amendQuery - Optional query describing desired changes
	 * @quest amendedPrompt - Optional partial prompt data with amendments
	 * @reward Partial<IPrompt<TInput, TOutput>> - The amended prompt data
	 * @peril Error - Thrown if amendment generation fails
	 *
	 * @lore
	 * This method allows for AI-assisted or manual amendments to existing prompts.
	 *
	 * @epicDeed
	 * ```typescript
	 * const amendedPrompt = await promptManager.generateAmendedPrompt({
	 *   category: "general",
	 *   name: "greeting",
	 *   amendQuery: "Make the greeting more formal"
	 * });
	 * ```
	 */
	async generateAmendedPrompt(props: {
		category: string;
		name: string;
		amendQuery?: string;
		amendedPrompt?: Partial<IPrompt<TInput, TOutput>>;
	}): Promise<Partial<IPrompt<TInput, TOutput>>> {
		throw new Error("Method not implemented.");
	}

	// Store prompts in a nested structure: category -> prompt name -> PromptModel
	public prompts: Record<string, Record<string, PromptModel<any, any>>> = {};
	private initialized = false;

	constructor(
		@Inject() private fileSystem: PromptFileSystem,
		@Inject() private configManager: PromptProjectConfigManager,
	) {
		this.promptModelImporter = new PromptModelImporter();
	}

	async importPrompts(source: {
		type: "url" | "text" | "file";
		content: string;
	}): Promise<PromptModel<TInput, TOutput>[]> {
		try {
			const importedPrompts =
				await this.promptModelImporter.importFromSource(source);
			for (const prompt of importedPrompts) {
				await this.createPrompt({ prompt });
			}
			return importedPrompts as unknown as Promise<
				PromptModel<TInput, TOutput>[]
			>;
		} catch (error) {
			logger.error("Failed to import prompts:", error);
			throw new Error(
				`Failed to import prompts: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}

	/**
	 * Check if a prompt exists.
	 *
	 * @quest category - The category of the prompt
	 * @quest name - The name of the prompt
	 * @reward boolean - True if the prompt exists, false otherwise
	 *
	 * @lore
	 * This method checks the in-memory prompt storage to determine if a prompt exists.
	 *
	 * @epicDeed
	 * ```typescript
	 * const exists = await promptManager.promptExists({ category: "general", name: "greeting" });
	 * ```
	 */
	async promptExists(props: {
		category: string;
		name: string;
	}): Promise<boolean> {
		const { category, name } = props;
		return !!this.prompts[category] && !!this.prompts[category][name];
	}

	/**
	 * Create a new category for prompts.
	 *
	 * @quest categoryName - The name of the category to create
	 * @peril Error - Thrown if category creation fails
	 *
	 * @lore
	 * This method creates a new category in both the in-memory storage and the file system.
	 *
	 * @epicDeed
	 * ```typescript
	 * await promptManager.createCategory("newCategory");
	 * ```
	 */
	async createCategory(categoryName: string): Promise<void> {
		if (!this.prompts[categoryName]) {
			this.prompts[categoryName] = {};
			await this.fileSystem.createCategory({ categoryName });
		}
	}

	/**
	 * Delete a category and all its prompts.
	 *
	 * @quest categoryName - The name of the category to delete
	 * @peril Error - Thrown if category deletion fails
	 *
	 * @lore
	 * This method removes a category and all its prompts from both in-memory storage and the file system.
	 *
	 * @epicDeed
	 * ```typescript
	 * await promptManager.deleteCategory("oldCategory");
	 * ```
	 */
	async deleteCategory(categoryName: string): Promise<void> {
		if (this.prompts[categoryName]) {
			delete this.prompts[categoryName];
			await this.fileSystem.deleteCategory({ categoryName });
		}
	}

	/**
	 * List all categories.
	 *
	 * @reward string[] - An array of category names
	 *
	 * @lore
	 * This method returns a list of all categories currently in the prompt manager.
	 *
	 * @epicDeed
	 * ```typescript
	 * const categories = await promptManager.listCategories();
	 * ```
	 */
	async listCategories(): Promise<string[]> {
		return Object.keys(this.prompts);
	}

	/**
	 * Execute a prompt with given parameters.
	 *
	 * @quest category - The category of the prompt
	 * @quest name - The name of the prompt
	 * @quest params - The input parameters for the prompt
	 * @reward TOutput - The result of the prompt execution
	 * @peril Error - Thrown if prompt execution fails
	 *
	 * @lore
	 * This method retrieves a prompt and executes it with the provided parameters.
	 *
	 * @epicDeed
	 * ```typescript
	 * const result = await promptManager.executePrompt({
	 *   category: "general",
	 *   name: "greeting",
	 *   params: { name: "World" }
	 * });
	 * ```
	 */
	async executePrompt(props: {
		category: string;
		name: string;
		params: TInput;
	}): Promise<TOutput> {
		const { category, name, params } = props;
		const prompt = this.getPrompt({ category, name });
		return prompt.execute(params);
	}

	/**
	 * Initialize the PromptManager by loading all prompts from the file system.
	 *
	 * Purpose: Set up the PromptManager with all existing prompts for further operations.
	 *
	 * @throws Error if there's a failure in loading prompts from the file system
	 */
	async initialize(): Promise<void> {
		if (this.initialized) return;

		try {
			await this.loadPrompts();
			this.initialized = true;
			logger.success("PromptManager initialized successfully");
		} catch (error: unknown) {
			logger.error("Failed to initialize PromptManager:", error);
			const errorMessage =
				error instanceof Error
					? `${error.message} ${error.stack}`
					: String(error);
			throw new Error(`Failed to initialize PromptManager: ${errorMessage}`);
		}
	}

	/**
	 * Load all prompts from the file system.
	 *
	 * Purpose: Load all existing prompts into the PromptManager.
	 *
	 * @throws Error if there's a failure in loading prompts from the file system
	 */
	async loadPrompts(): Promise<void> {
		logger.info(`Loading prompts from ${this.configManager.getPromptsDir()}`);
		if (!fs.existsSync(this.configManager.getPromptsDir())) {
			logger.warn("Prompts directory does not exist, creating it");
			await fs.mkdir(this.configManager.getPromptsDir(), { recursive: true });
		}
		try {
			const prompts = await this.fileSystem.listPrompts();
			for (const prompt of prompts) {
				if (!prompt.category) {
					logger.warn(
						`Skipping malformed prompt without category: ${prompt.name}`,
					);
					continue;
				}
				if (!this.prompts[prompt.category]) {
					this.prompts[prompt.category] = {};
				}
				try {
					const promptData = await this.fileSystem.loadPrompt({
						category: prompt.category,
						promptName: prompt.name,
					});
					this.prompts[prompt.category][prompt.name] = new PromptModel(
						promptData,
					) as PromptModel<TInput, TOutput>;
				} catch (error) {
					logger.error(
						`Failed to load prompt ${prompt.category}/${prompt.name}:`,
						error,
					);
					// Continue loading other prompts even if one fails
				}
			}
			logger.success(`Loaded ${prompts.length} prompts successfully`);
		} catch (error) {
			logger.error("Failed to load prompts:", error);
			throw new Error(
				`Failed to load prompts: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}

	private incrementVersion(version: string): string {
		return incrementVersion(version);
	}

	/**
	 * Retrieve a specific prompt by its category and name.
	 *
	 * Purpose: Fetch a single prompt for use or manipulation.
	 *
	 * @param props An object containing the category and name of the prompt
	 * @returns The PromptModel instance for the specified prompt
	 * @throws Error if the prompt does not exist in the specified category
	 */
	getPrompt(props: { category: string; name: string }): PromptModel<
		TInput,
		TOutput
	> {
		if (!this.prompts[props.category]) {
			throw new Error(`Category "${props.category}" does not exist`);
		}
		if (!this.prompts[props.category][props.name]) {
			throw new Error(
				`Prompt "${props.name}" in category "${props.category}" does not exist`,
			);
		}
		const prompt = this.prompts[props.category][props.name];
		return prompt;
	}

	async getPromptVersion({
		category,
		name,
		version,
	}: { category: string; name: string; version: string }): Promise<
		PromptModel<TInput, TOutput>
	> {
		const versionData = await this.fileSystem.loadPromptVersion({
			category,
			promptName: name,
			version,
		});
		return new PromptModel(versionData) as PromptModel<TInput, TOutput>;
	}

	/**
	 * Create a new prompt and save it to the file system.
	 * Purpose: Add a new prompt to the manager and persist it for future use.
	 */
	async createPrompt(props: {
		prompt: Omit<IPrompt<IPromptInput, IPromptOutput>, "versions">;
	}): Promise<void> {
		const { prompt } = props;
		validateCategoryAndName(prompt.category, prompt.name);

		if (!this.prompts[prompt.category]) {
			this.prompts[prompt.category] = {};
			logger.info(`Created new category: ${prompt.category}`);
		}

		if (this.prompts[prompt.category][prompt.name]) {
			throw new Error(`Prompt "${prompt.name}" already exists in category "${prompt.category}".
        To resolve this:
        - Choose a different name for your new prompt.
        - If you meant to update an existing prompt, use the 'update-prompt' command instead.
        - If you want to replace the existing prompt, delete it first with 'delete-prompt' command.`);
		}

		const newPrompt = new PromptModel(prompt) as PromptModel<TInput, TOutput>;
		this.prompts[prompt.category][prompt.name] = newPrompt;
		await this.fileSystem.savePrompt({
			promptData: newPrompt as IPrompt<
				Record<string, any>,
				Record<string, any>
			>,
		});
		logger.success(
			`Created new prompt "${prompt.name}" in category "${prompt.category}" with TypeScript definitions.`,
		);
	}

	/**
	 * Update an existing prompt with new data and save the changes.
	 * Purpose: Modify an existing prompt's properties and persist the changes.
	 * @param props An object containing the category, name, updates, and an optional flag to bump the version
	 */
	async updatePrompt(props: {
		category: string;
		name: string;
		updates: Partial<IPrompt<IPromptInput, IPromptOutput>>;
		bumpVersion?: boolean;
	}): Promise<void> {
		const { category, name, updates, bumpVersion = true } = props;
		const prompt = this.getPrompt({ category, name });
		Object.assign(prompt, updates);
		prompt.updateMetadata({ lastModified: new Date().toISOString() });

		if (bumpVersion) {
			prompt.version = this.incrementVersion(prompt.version);
		}

		await this.fileSystem.savePrompt({
			promptData: prompt as IPrompt<Record<string, any>, Record<string, any>>,
		});
	}

	/**
	 * Delete a prompt from both the in-memory storage and the file system.
	 * Purpose: Remove a prompt entirely from the manager and persistent storage.
	 */
	async deletePrompt(props: {
		category: string;
		name: string;
	}): Promise<void> {
		const { category, name } = props;
		if (!this.prompts[category] || !this.prompts[category][name]) {
			handlePromptNotFound(category, name);
		}
		delete this.prompts[category][name];
		await this.fileSystem.deletePrompt({ category, promptName: name });
	}

	async listPrompts(props: { category?: string }): Promise<
		Array<PromptModel<IPromptInput, IPromptOutput>>
	> {
		const prompts = props.category
			? Object.values(this.prompts[props.category] || {})
			: Object.values(this.prompts).flatMap((categoryPrompts) =>
					Object.values(categoryPrompts),
				);

		logger.debug("prompts", prompts);

		return prompts.map(
			(prompt) => new PromptModel(prompt) as PromptModel<TInput, TOutput>,
			// mapPromptToFileInfo(prompt, this.configManager.getBasePath()),
		);
	}

	/**
	 * Manage prompt versions: list, create, or switch to a specific version.
	 * Purpose: Provide version control functionality for prompts.
	 */
	async versionPrompt(props: {
		action: "list" | "create" | "switch";
		category: string;
		name: string;
		version?: string;
	}): Promise<{
		action: "list" | "create" | "switch";
		category: string;
		name: string;
		result: string[] | string;
	}> {
		const { action, category, name, version } = props;
		const prompt = this.getPrompt({ category, name });

		switch (action) {
			case "list": {
				const versions = await prompt.versions();
				return { action, category, name, result: versions };
			}
			case "create": {
				const newVersion = this.incrementVersion(prompt.version);
				prompt.version = newVersion;
				await this.fileSystem.savePrompt({
					promptData: prompt as IPrompt<
						Record<string, any>,
						Record<string, any>
					>,
				});
				return { action, category, name, result: newVersion };
			}
			case "switch":
				if (!version) {
					throw new Error("Version is required for switch action");
				}
				await prompt.switchVersion(version);
				await this.fileSystem.savePrompt({ promptData: prompt });
				return { action, category, name, result: version };
			default:
				throw new Error(`Invalid action: ${action}`);
		}
	}

	/**
	 * Format a prompt by replacing placeholders with provided parameters.
	 * Purpose: Prepare a prompt for use by inserting actual values into its template.
	 */
	formatPrompt(props: {
		category: string;
		name: string;
		params: TInput;
	}): string {
		const { category, name, params } = props;
		const prompt = this.getPrompt({ category, name });
		return prompt.format(params);
	}

	get categories(): {
		[category: string]: IPromptCategory<
			Record<string, PromptModel<TInput, TOutput>>
		>;
	} {
		return Object.fromEntries(
			Object.entries(this.prompts).map(([category, prompts]) => [
				category,
				Object.fromEntries(
					Object.entries(prompts).map(([name, prompt]) => [
						name,
						{
							raw: prompt.template,
							version: prompt.version,
							format: (inputs: TInput) => prompt.format(inputs),
						},
					]),
				),
			]),
		);
	}
}
