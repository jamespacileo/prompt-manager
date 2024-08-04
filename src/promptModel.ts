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

interface CamelCaseProps {
	initialInput?: string;
	initialCapFirst?: boolean;
	examples?: string[];
}

function toCamelCase({
	str,
	capFirst = true,
}: { str: string; capFirst: boolean }): string {
	const words = str.replace(/[^\w\s-]/g, "").split(/[\s_-]+/);

	return words
		.map((word, index) => {
			if (index === 0) {
				return capFirst
					? word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
					: word.toLowerCase();
			}
			return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
		})
		.join("");
}

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

	get cleanName(): string {
		// camelCase
		return toCamelCase({
			str: this.name,
			capFirst: true,
		});
	}

	get cleanCategory(): string {
		// camelCase
		return toCamelCase({
			str: this.category,
			capFirst: true,
		});
	}

	get id(): string {
		// slug with category and name
		return `${this.className}`;
	}

	get key(): string {
		return this.id;
	}

	get inputTypeName(): string {
		return toCamelCase({
			str: `${this.className} Input`,
			capFirst: true,
		});
	}

	get outputTypeName(): string {
		return toCamelCase({
			str: `${this.className} Output`,
			capFirst: true,
		});
	}

	get className(): string {
		return `${this.cleanCategory}${this.cleanName}`;
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
