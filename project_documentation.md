# Project Documentation

## Project Structure

```
./src
├── PromptManagerClientGenerator.ts
├── cli
│   ├── aiHelpers.ts
│   ├── atoms.ts
│   ├── cliPolyfills.ts
│   ├── cli_generate.ts
│   ├── commands.ts
│   ├── components
│   │   ├── _atoms
│   │   │   ├── types.ts
│   │   │   └── useOptionCardGrid.ts
│   │   ├── hooks
│   │   │   └── useOptionNavigation.ts
│   │   ├── prompt
│   │   ├── types.ts
│   │   ├── ui
│   │   └── utils
│   ├── screens
│   ├── uiConfig.ts
│   └── utils
├── client.ts
├── config
│   ├── PromptProjectConfigManager.ts
│   └── constants.ts
├── config.ts
├── fixtures
│   └── categories.ts
├── generated
│   ├── index.ts
│   └── promptManagerBase.ts
├── generated.ts
├── index.ts
├── initializationManager.ts
├── promptFileSystem.ts
├── promptManager.ts
├── promptModel.ts
├── promptModelService.ts
├── schemas
│   ├── config.ts
│   └── prompts.ts
├── scripts
│   └── generatePromptManager.ts
├── test
│   ├── PromptProjectConfigManager.test.d.ts
│   ├── PromptProjectConfigManager.test.ts
│   ├── __snapshots__
│   ├── commands.test.d.ts
│   ├── commands.test.ts
│   ├── index.test.d.ts
│   ├── index.test.ts
│   ├── promptFileSystem.test.d.ts
│   ├── promptFileSystem.test.ts
│   ├── promptManager.test.d.ts
│   ├── promptManager.test.ts
│   ├── promptManagerUtils.test.ts
│   ├── promptModel.test.d.ts
│   ├── promptModel.test.ts
│   ├── setup.d.ts
│   ├── setup.ts
│   ├── setupEnvs.d.ts
│   ├── setupEnvs.ts
│   ├── testsUnload.d.ts
│   └── testsUnload.ts
├── types
│   ├── index.ts
│   └── interfaces.ts
└── utils
    ├── __snapshots__
    ├── cache.ts
    ├── fileSystemUtils.ts
    ├── fileTransaction.ts
    ├── fileUtils.ts
    ├── jsonSchemaToZod.ts
    ├── lockUtils.ts
    ├── logger.ts
    ├── promptManagerUtils.ts
    ├── typeGeneration.test.ts
    ├── typeGeneration.ts
    └── versionUtils.ts

20 directories, 60 files
```

## src/promptManager.ts

**Description:** Main class for managing prompts

```typescript
import fs from "fs-extra";
import { Inject, Service } from "typedi";
import type { PromptProjectConfigManager } from "./config/PromptProjectConfigManager";
import type { PromptFileSystem } from "./promptFileSystem";
import { PromptModel } from "./promptModel";
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

@Service()
export class PromptManager<
	TInput extends IPromptInput<Record<string, any>> = IPromptInput<
		Record<string, any>
	>,
	TOutput extends IPromptOutput<Record<string, any> & string> = IPromptOutput<
		Record<string, any> & string
	>,
> {
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
	) {}

	async promptExists(props: {
		category: string;
		name: string;
	}): Promise<boolean> {
		const { category, name } = props;
		return !!this.prompts[category] && !!this.prompts[category][name];
	}

	async createCategory(categoryName: string): Promise<void> {
		if (!this.prompts[categoryName]) {
			this.prompts[categoryName] = {};
			await this.fileSystem.createCategory({ categoryName });
		}
	}

	async deleteCategory(categoryName: string): Promise<void> {
		if (this.prompts[categoryName]) {
			delete this.prompts[categoryName];
			await this.fileSystem.deleteCategory({ categoryName });
		}
	}

	async listCategories(): Promise<string[]> {
		return Object.keys(this.prompts);
	}

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
	async deletePrompt(props: { category: string; name: string }): Promise<void> {
		const { category, name } = props;
		if (!this.prompts[category] || !this.prompts[category][name]) {
			handlePromptNotFound(category, name);
		}
		delete this.prompts[category][name];
		await this.fileSystem.deletePrompt({ category, promptName: name });
	}

	async listPrompts(props: { category?: string }): Promise<
		Array<IPrompt<IPromptInput, IPromptOutput> & { filePath: string }>
	> {
		const prompts = props.category
			? Object.values(this.prompts[props.category] || {})
			: Object.values(this.prompts).flatMap((categoryPrompts) =>
					Object.values(categoryPrompts),
				);

		logger.debug("prompts", prompts);

		return prompts.map((prompt) =>
			mapPromptToFileInfo(prompt, this.configManager.getBasePath()),
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

```

## src/promptModel.ts

**Description:** Model representation of a prompt

```typescript
import path from "node:path";
import { openai } from "@ai-sdk/openai";
import { generateObject, generateText, streamText } from "ai";
import type { JSONSchema7 } from "json-schema";
import Container, { Service, Inject } from "typedi";
import type { z } from "zod";
import { PromptProjectConfigManager } from "./config/PromptProjectConfigManager";
import { PromptFileSystem } from "./promptFileSystem";
import type {
	IAsyncIterableStream,
	IPrompt,
	IPromptInput,
	IPromptModel,
	IPromptOutput,
} from "./types/interfaces";
import type {
	IPromptFileSystem,
	IPromptModelRequired,
} from "./types/interfaces";
import { jsonSchemaToZod } from "./utils/jsonSchemaToZod";
import { logger } from "./utils/logger";
import { compareVersions, incrementVersion } from "./utils/versionUtils";

export class PromptModel<
	TInput extends IPromptInput<Record<string, any>> = IPromptInput<
		Record<string, any>
	>,
	TOutput extends IPromptOutput<Record<string, any>> = IPromptOutput<
		Record<string, any>
	>,
> implements IPromptModel<TInput, TOutput>
{
	name: string;
	category: string;
	description: string;
	version: string;
	template: string;
	parameters: string[];
	defaultModelName?: string;
	metadata: {
		created: string;
		lastModified: string;
		author?: string;
		sourceName?: string;
		sourceUrl?: string;
		license?: string;
	};
	configuration: {
		modelName: string;
		temperature: number;
		maxTokens: number;
		topP: number;
		frequencyPenalty: number;
		presencePenalty: number;
		stopSequences: string[];
	};
	outputType: "structured" | "plain";
	inputSchema: JSONSchema7;
	outputSchema: JSONSchema7;
	private _isSaved = false;
	isLoadedFromStorage = false;
	filePath: string | undefined | null = undefined;

	fileSystem: PromptFileSystem;
	configManager: PromptProjectConfigManager;

	constructor(
		promptData: IPromptModelRequired,
		// @Inject()
		// public fileSystem: PromptFileSystem,
		// @Inject()
		// public configManager: PromptProjectConfigManager,
	) {
		if (
			!promptData.name ||
			!promptData.category ||
			!promptData.description ||
			!promptData.template
		) {
			throw new Error("Invalid prompt data: missing required fields");
		}
		this.fileSystem = Container.get(PromptFileSystem);
		this.configManager = Container.get(PromptProjectConfigManager);
		this.name = promptData.name;
		this.category = promptData.category;
		this.description = promptData.description;
		this.template = promptData.template;
		this.parameters = promptData.parameters || [];
		this.inputSchema = promptData.inputSchema || {};
		this.outputSchema = promptData.outputSchema || {};
		this.version = promptData.version || "1.0.0";
		this.metadata = {
			...promptData.metadata,
			created: promptData.metadata?.created || new Date().toISOString(),
			lastModified:
				promptData.metadata?.lastModified || new Date().toISOString(),
		};
		this.outputType = this.determineOutputType(promptData.outputSchema);
		this.defaultModelName = promptData.defaultModelName;
		this.configuration = this.initializeConfiguration();
	}

	async getFilePath(): Promise<string> {
		const promptsDir = this.configManager.getConfig("promptsDir");
		const filePath = path.join(
			promptsDir,
			this.category,
			this.name,
			"prompt.json",
		);
		this.filePath = filePath;
		return filePath;
	}

	private determineOutputType(
		outputSchema: JSONSchema7,
	): "structured" | "plain" {
		if (
			outputSchema.type === "object" &&
			outputSchema.properties &&
			Object.keys(outputSchema.properties).length > 0
		) {
			return "structured";
		}
		return "plain";
	}

	private initializeConfiguration(): {
		modelName: string;
		temperature: number;
		maxTokens: number;
		topP: number;
		frequencyPenalty: number;
		presencePenalty: number;
		stopSequences: string[];
	} {
		return {
			modelName: this.defaultModelName || "gpt-4o-mini",
			temperature: 0.7,
			maxTokens: 100,
			topP: 1,
			frequencyPenalty: 0,
			presencePenalty: 0,
			stopSequences: [],
		};
	}

	/**
	 * Validate the input against the input schema.
	 * Purpose: Ensure that the provided input matches the expected schema before processing.
	 * @param input The input to validate
	 * @returns True if the input is valid, false otherwise
	 */
	validateInput(input: TInput): boolean {
		if (!this.inputZodSchema) {
			throw new Error(`Input schema is not defined for prompt "${this.name}".
        This could be because:
        1. The prompt was created without an input schema.
        2. The schema failed to load correctly.
        
        To resolve this:
        - Review the prompt definition and ensure it includes an input schema.
        - If the schema exists, try regenerating the Zod schemas using the 'generate-schemas' command.
        - If the issue persists, consider recreating the prompt with a valid input schema.`);
		}
		try {
			this.inputZodSchema.parse(input);
			return true;
		} catch (error) {
			logger.error(`Input validation error for prompt "${this.name}":`, error);
			logger.error(`This could be because:
        1. The input doesn't match the expected schema.
        2. The input schema might be outdated or incorrect.
        
        To resolve this:
        - Check the input data against the schema definition.
        - Review and update the input schema if necessary using the 'update-prompt' command.
        - If the schema is correct, adjust your input to match the required format.`);
			return false;
		}
	}

	/**
	 * Validate the output against the output schema.
	 * Purpose: Verify that the generated output conforms to the expected schema.
	 * @param output The output to validate
	 * @returns True if the output is valid, false otherwise
	 */
	validateOutput(output: TOutput): boolean {
		try {
			this.outputZodSchema.parse(output);
			return true;
		} catch (error) {
			logger.error("Output validation error:", error);
			return false;
		}
	}

	/**
	 * Format the prompt template by replacing placeholders with input values.
	 * Purpose: Prepare the prompt for execution by inserting actual values into the template.
	 * @param inputs The input values to use for formatting
	 * @returns The formatted prompt string
	 */
	format(inputs: TInput): string {
		let formattedContent = this.template;
		for (const [key, value] of Object.entries(inputs)) {
			formattedContent = formattedContent.replace(
				new RegExp(`{{${key}}}`, "g"),
				value as string,
			);
		}
		return formattedContent;
	}

	/**
	 * Stream the prompt execution results.
	 * Purpose: Execute the prompt and provide results as a stream for real-time processing.
	 * @param inputs The input values for the prompt
	 * @returns An async iterable stream of the generated text
	 */
	async stream(inputs: TInput): Promise<IAsyncIterableStream<string>> {
		try {
			if (!this.validateInput(inputs)) {
				throw new Error("Invalid input");
			}
			const formattedPrompt = this.format(inputs);
			const { textStream } = await streamText({
				model: openai(this.configuration.modelName),
				prompt: formattedPrompt,
				temperature: this.configuration.temperature,
				maxTokens: this.configuration.maxTokens,
				topP: this.configuration.topP,
				frequencyPenalty: this.configuration.frequencyPenalty,
				presencePenalty: this.configuration.presencePenalty,
				stopSequences: this.configuration.stopSequences,
			});

			return textStream;
		} catch (error) {
			logger.error("Error streaming prompt:", error);
			throw new Error(
				`Failed to stream prompt: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}

	/**
	 * Execute the prompt and return the result.
	 * Purpose: Process the prompt with given inputs and generate the final output.
	 * @param inputs The input values for the prompt
	 * @returns The execution result, either structured or plain text
	 */
	async execute(inputs: TInput): Promise<TOutput> {
		try {
			if (!this.validateInput(inputs)) {
				throw new Error("Invalid input");
			}
			if (this.outputType === "structured") {
				const formattedPrompt = this.format(inputs);
				const schema = this.outputZodSchema;
				try {
					const { object } = await generateObject({
						model: openai(this.configuration.modelName),
						schema,
						prompt: formattedPrompt,
						temperature: this.configuration.temperature,
						maxTokens: this.configuration.maxTokens,
						topP: this.configuration.topP,
						frequencyPenalty: this.configuration.frequencyPenalty,
						presencePenalty: this.configuration.presencePenalty,
					});
					const output = object as unknown as TOutput;
					if (!this.validateOutput(output)) {
						throw new Error("Invalid output");
					}
					return output;
				} catch (genError) {
					throw new Error(
						`Failed to generate structured output: ${genError instanceof Error ? genError.message : String(genError)}`,
					);
				}
			} else {
				try {
					const { text } = await generateText({
						model: openai(this.configuration.modelName),
						prompt: this.format(inputs),
						temperature: this.configuration.temperature,
						maxTokens: this.configuration.maxTokens,
						topP: this.configuration.topP,
						frequencyPenalty: this.configuration.frequencyPenalty,
						presencePenalty: this.configuration.presencePenalty,
					});
					const output = { text } as unknown as TOutput;
					if (!this.validateOutput(output)) {
						throw new Error("Invalid output");
					}
					return output;
				} catch (genError) {
					throw new Error(
						`Failed to generate text output: ${genError instanceof Error ? genError.message : String(genError)}`,
					);
				}
			}
		} catch (error) {
			logger.error("Error executing prompt:", error);
			throw new Error(
				`Failed to execute prompt: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}

	updateMetadata(metadata: Partial<IPromptModel["metadata"]>): void {
		this.metadata = {
			...this.metadata,
			...metadata,
			lastModified: new Date().toISOString(),
		};
	}

	updateConfiguration(config: Partial<IPromptModel["configuration"]>): void {
		this.configuration = {
			...this.configuration,
			...config,
		};
	}

	getSummary(): string {
		return `${this.name} (${this.category}): ${this.description || "No description available"}`;
	}

	async save(): Promise<void> {
		let retries = 3;
		while (retries > 0) {
			try {
				const currentVersion = await this.fileSystem.getCurrentVersion(this);
				if (compareVersions(currentVersion, this.version) > 0) {
					// Merge logic here
					// For now, we'll just increment the version
					this.version = incrementVersion(currentVersion);
				}
				const updatedPromptData = this as unknown as IPrompt<
					Record<string, any>,
					Record<string, any>
				>;
				const filePath = await this.getFilePath();
				await this.fileSystem.savePrompt({ promptData: updatedPromptData });
				this._isSaved = true;
				// Update the current instance with the saved data
				Object.assign(this, updatedPromptData);
				break;
			} catch (error) {
				if (
					error instanceof Error &&
					error.message === "VERSION_CONFLICT" &&
					retries > 1
				) {
					retries--;
					continue;
				}
				throw error;
			}
		}
	}

	private _inputZodSchema: z.ZodType<any> | null = null;
	private _outputZodSchema: z.ZodType<any> | null = null;

	get inputZodSchema(): z.ZodType<any> {
		if (!this._inputZodSchema) {
			this._inputZodSchema = jsonSchemaToZod(this.inputSchema);
		}
		return this._inputZodSchema;
	}

	get outputZodSchema(): z.ZodType<any> {
		if (!this._outputZodSchema) {
			this._outputZodSchema = jsonSchemaToZod(this.outputSchema);
		}
		return this._outputZodSchema;
	}

	async load(): Promise<void> {
		const promptData = await this.fileSystem.loadPrompt({
			category: this.category,
			promptName: this.name,
		});
		Object.assign(this, promptData);
		this._isSaved = true;
	}

	async versions(): Promise<string[]> {
		return this.fileSystem.getPromptVersions({
			category: this.category,
			promptName: this.name,
		});
	}

	public async rollbackToVersion(version: string): Promise<void> {
		try {
			const versionData = await this.fileSystem.loadPromptVersion({
				category: this.category,
				promptName: this.name,
				version,
			});
			Object.assign(this, versionData);
			this.version = version;
			await this.save();
			logger.info(`Rolled back prompt ${this.name} to version ${version}`);
		} catch (error) {
			logger.error(
				`Failed to rollback prompt ${this.name} to version ${version}: ${error}`,
			);
			throw error;
		}
	}
	async switchVersion(version: string): Promise<void> {
		const versionData = await this.fileSystem.loadPromptVersion({
			category: this.category,
			promptName: this.name,
			version,
		});
		Object.assign(this, versionData);
		this._isSaved = true;
	}

	get isSaved(): boolean {
		return this._isSaved;
	}
}

```

## src/promptFileSystem.ts

**Description:** Handles file system operations for prompts

```typescript
import path from "node:path";
import fs from "fs-extra";
import lockfile from "proper-lockfile";
import { Inject, Service } from "typedi";
import { z } from "zod";
import type { PromptProjectConfigManager } from "./config/PromptProjectConfigManager";
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

	constructor(@Inject() private configManager: PromptProjectConfigManager) {
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
			const promptDirs = await fs.readdir(categoryDir, { withFileTypes: true });

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

```

## src/config/PromptProjectConfigManager.ts

**Description:** Manages project configuration

```typescript
import path from "node:path";
import chalk from "chalk";
import { type OptionsSync, cosmiconfig } from "cosmiconfig";
import { Service } from "typedi";
import { fromError } from "zod-validation-error";
import { DEFAULT_CONFIG, configSchema, z } from "../schemas/config";
import type { Config } from "../schemas/config";
import type { IPromptProjectConfigManager } from "../types/interfaces";
import { ensureDirectoryExists } from "../utils/fileUtils";
import { logger } from "../utils/logger";

const DEFAULT_PROMPTS_FOLDER_CONFIG_FILENAME = ".promptmanager.config.json";

export type { Config };

@Service()
export class PromptProjectConfigManager implements IPromptProjectConfigManager {
	private config: Config;
	private initialized = false;
	private explorer;
	private basePath: string;
	private configFilePath: string | undefined;

	constructor() {
		this.config = { ...DEFAULT_CONFIG };
		this.basePath = process.env.FURY_PROJECT_ROOT || process.cwd();
		const explorerOptions: OptionsSync = {
			searchPlaces: [
				"package.json",
				".promptmanagerrc",
				".promptmanagerrc.json",
				".promptmanagerrc.yaml",
				".promptmanagerrc.yml",
				".promptmanagerrc.js",
				"promptmanager.config.js",
			],
			loaders: {},
			transform: (result) => result,
			ignoreEmptySearchPlaces: true,
			cache: true,
			mergeImportArrays: true,
			mergeSearchPlaces: true,
			searchStrategy: "project",
		};
		this.explorer = cosmiconfig("promptmanager", explorerOptions);
		logger.debug(
			`Initializing PromptProjectConfigManager with basePath: ${this.basePath}`,
		);
	}

	public getBasePath(): string {
		return this.basePath;
	}

	public getPromptsDir(): string {
		if (!this.config.promptsDir) {
			throw new Error(
				"Prompts directory not set. Please set the prompts directory in your configuration file.",
			);
		}
		if (!path.isAbsolute(this.config.promptsDir)) {
			return path.join(this.basePath, this.config.promptsDir);
		}
		return this.config.promptsDir;
	}

	public getProjectConfigPath(): string {
		if (!this.configFilePath) {
			logger.warn("No configuration file found. Using default configuration.");
			throw new Error(
				"No configuration file found. Please set the configuration file in your project.",
			);
		}
		return this.configFilePath;
	}

	public async initialize(): Promise<void> {
		if (this.initialized) return;

		try {
			await this.loadConfig();
			await this.ensureConfigDirectories();
			this.prettyPrintConfig();
			this.initialized = true;
		} catch (error: any) {
			logger.error("Failed to initialize config:", error.message, error.stack);
			throw new Error(
				"Failed to initialize PromptProjectConfigManager. Please check your configuration and try again.",
				error.stack,
			);
		}
	}

	public async isInitialized(): Promise<boolean> {
		return this.initialized;
	}

	private async loadConfig(): Promise<void> {
		try {
			const result = await this.explorer.search();
			if (result?.config) {
				const validatedConfig = configSchema.parse({
					...DEFAULT_CONFIG,
					...result.config,
				});
				this.config = {
					...validatedConfig,
					promptsDir: path.resolve(this.basePath, validatedConfig.promptsDir),
					outputDir: path.resolve(this.basePath, validatedConfig.outputDir),
				};
				logger.debug(`Found configuration file at ${result.filepath}`);
				this.configFilePath = result.filepath;
			} else {
				logger.warn(
					"No configuration file found. Using default configuration.",
				);
				this.config = { ...DEFAULT_CONFIG };
			}
			if (!this.configFilePath) {
				logger.error(`No configuration file found at ${this.basePath}`);
				this.configFilePath = path.join(
					this.basePath,
					DEFAULT_PROMPTS_FOLDER_CONFIG_FILENAME,
				);
			} else {
				logger.debug(`Configuration file found at ${this.configFilePath}`);
			}
			logger.debug("Configuration loaded successfully");
			logger.debug(`Prompts directory: ${this.config.promptsDir}`);
			logger.debug(`Output directory: ${this.config.outputDir}`);
		} catch (error) {
			if (error instanceof z.ZodError) {
				const validationError = fromError(error);
				logger.error(validationError.toString());
				logger.error("Invalid configuration:", error.errors);
				throw new Error(`Invalid configuration: ${error.message}`);
			}
			logger.error("Error loading configuration:", error);
			throw new Error(
				"Failed to load configuration. Please check your configuration file.",
			);
		}
	}

	private async ensureConfigDirectories(): Promise<void> {
		try {
			await ensureDirectoryExists(this.config.promptsDir);
			logger.success(
				`Created prompts directory: ${chalk.yellow(this.config.promptsDir)}`,
			);
			await ensureDirectoryExists(this.config.outputDir);
			logger.success(
				`Created output directory: ${chalk.yellow(this.config.outputDir)}`,
			);
		} catch (error: any) {
			logger.error("Error: Failed to create necessary directories.");
			logger.warn(
				"Please check that you have write permissions in the project directory.",
			);
			throw new Error(`Failed to create directories: ${error.message}`);
		}
	}

	private prettyPrintConfig(): void {
		if (this.config.verbosity > 99) {
			logger.info(chalk.bold("\nLoaded Configuration:"));
			logger.info(`prompts_dir:      ${chalk.cyan(this.config.promptsDir)}`);
			logger.info(`output_dir:       ${chalk.cyan(this.config.outputDir)}`);
			logger.info(
				`preferredModels:  ${chalk.cyan(this.config.preferredModels.join(", "))}`,
			);
			logger.info("modelParams:");
			Object.entries(this.config.modelParams).forEach(([model, params]) => {
				logger.info(`  ${model}:`);
				Object.entries(params).forEach(([key, value]) => {
					logger.info(`    ${key}: ${chalk.cyan(value)}`);
				});
			});
			logger.info(`verbosity:        ${chalk.cyan(this.config.verbosity)}`);
			logger.info("\n");
		}
	}

	public getConfig<K extends keyof Config>(key: K): Config[K] {
		return this.config[key];
	}

	public getAllConfig(): Config {
		return { ...this.config };
	}

	public async updateConfig(newConfig: Partial<Config>): Promise<void> {
		try {
			const updatedConfig = configSchema.parse({
				...this.config,
				...newConfig,
			});
			this.config = updatedConfig;
			this.prettyPrintConfig();
		} catch (error: any) {
			if (error instanceof z.ZodError) {
				const validationError = fromError(error);
				logger.error("Validation error:", validationError.toString());
				logger.error("Invalid configuration update:", error.errors);
				throw new Error(`Invalid configuration update: ${error.message}`);
			}
			throw error;
		}
	}
	setVerbosity(level: number): void {
		this.config.verbosity = level;
	}

	getVerbosity(): number {
		return this.config.verbosity;
	}
}

```

## src/client.ts

**Description:** No description available

```typescript
import path from "node:path";
import fs from "fs-extra";
import { PromptFileSystem } from "./promptFileSystem";
import { PromptManager } from "./promptManager";
import type {
	IAsyncIterableStream,
	IPrompt,
	IPromptInput,
	IPromptManagerLibrary,
	IPromptOutput,
} from "./types/interfaces";

export class PromptManagerClient implements IPromptManagerLibrary {
	private promptFileSystem: PromptFileSystem;
	private promptManager: PromptManager;

	constructor() {
		this.promptFileSystem = new PromptFileSystem();
		this.promptManager = new PromptManager();
	}

	async initialize(): Promise<void> {
		await this.promptFileSystem.initialize();
		await this.promptManager.initialize();
	}

	async getPrompt(props: { category: string; name: string }): Promise<
		IPrompt<IPromptInput, IPromptOutput>
	> {
		return this.promptManager.getPrompt(props);
	}

	async createPrompt(props: {
		prompt: Omit<IPrompt<IPromptInput, IPromptOutput>, "versions">;
	}): Promise<void> {
		await this.promptManager.createPrompt(props);
	}

	async updatePrompt(props: {
		category: string;
		name: string;
		updates: Partial<IPrompt<IPromptInput, IPromptOutput>>;
	}): Promise<void> {
		await this.promptManager.updatePrompt(props);
	}

	async deletePrompt(props: { category: string; name: string }): Promise<void> {
		await this.promptManager.deletePrompt(props);
	}

	async listPrompts(props: { category?: string }): Promise<
		IPrompt<IPromptInput, IPromptOutput>[]
	> {
		return this.promptManager.listPrompts(props);
	}

	async versionPrompt(props: {
		action: "list" | "create" | "switch";
		category: string;
		name: string;
		version?: string;
	}): Promise<void> {
		await this.promptManager.versionPrompt(props);
	}

	async formatPrompt(props: {
		category: string;
		name: string;
		params: Record<string, any>;
	}): Promise<string> {
		return this.promptManager.formatPrompt(props);
	}

	async executePrompt(props: {
		category: string;
		name: string;
		params: Record<string, any>;
	}): Promise<any> {
		const prompt = await this.getPrompt(props);
		return prompt.execute(props.params);
	}

	async streamPrompt(props: {
		category: string;
		name: string;
		params: Record<string, any>;
	}): Promise<IAsyncIterableStream<string>> {
		const prompt = await this.getPrompt(props);
		return prompt.stream(props.params);
	}

	get categories(): {
		[category: string]: {
			[prompt: string]: IPrompt<IPromptInput, IPromptOutput>;
		};
	} {
		return new Proxy(
			{},
			{
				get: (target, category: string) => {
					return new Proxy(
						{},
						{
							get: (innerTarget, promptName: string) => {
								return {
									format: async (inputs: Record<string, any>) =>
										this.formatPrompt({
											category,
											name: promptName,
											params: inputs,
										}),
									execute: async (inputs: Record<string, any>) =>
										this.executePrompt({
											category,
											name: promptName,
											params: inputs,
										}),
									stream: async (inputs: Record<string, any>) =>
										this.streamPrompt({
											category,
											name: promptName,
											params: inputs,
										}),
									description: async () => {
										const prompt = await this.getPrompt({
											category,
											name: promptName,
										});
										return prompt.description;
									},
									version: async () => {
										const prompt = await this.getPrompt({
											category,
											name: promptName,
										});
										return prompt.version;
									},
								};
							},
						},
					);
				},
			},
		);
	}
}

export const promptManager = new PromptManagerClient();

```

