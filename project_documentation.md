# Project Documentation

## Project Structure

```
./src
├── PromptManagerClientGenerator.ts
├── __tests__
│   └── client.test.ts
├── cli
│   ├── aiHelpers.ts
│   ├── atoms.ts
│   ├── cliPolyfills.ts
│   ├── cli_generate.ts
│   ├── commands.ts
│   ├── components
│   │   ├── prompt
│   │   ├── ui
│   │   └── utils
│   ├── screens
│   └── uiConfig.ts
├── client.ts
├── config
│   ├── PromptProjectConfigManager.ts
│   └── constants.ts
├── config.ts
├── generated
│   ├── index.ts
│   ├── promptManagerBase.ts
│   └── prompts.d.ts
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
│   ├── categories.ts
│   ├── index.ts
│   └── interfaces.ts
└── utils
    ├── __snapshots__
    ├── cache.ts
    ├── fileUtils.ts
    ├── jsonSchemaToZod.ts
    ├── logger.ts
    ├── promptManagerUtils.ts
    ├── typeGeneration.test.ts
    ├── typeGeneration.ts
    └── versionUtils.ts

17 directories, 55 files
```

## src/promptManager.ts

**Description:** Main class for managing prompts

```typescript
import { Service, Inject } from 'typedi';
import { IPromptCategory, IPrompt, IPromptInput, IPromptOutput } from './types/interfaces';
import { PromptModel } from './promptModel';
import { PromptFileSystem } from './promptFileSystem';
import { incrementVersion } from './utils/versionUtils';
import { PromptProjectConfigManager } from './config/PromptProjectConfigManager';
import { validateCategoryAndName, mapPromptToFileInfo, handlePromptNotFound } from './utils/promptManagerUtils';
import fs from 'fs-extra';
import { logger } from './utils/logger';

@Service()
export class PromptManager<
  TInput extends IPromptInput<Record<string, any>> = IPromptInput<Record<string, any>>,
  TOutput extends IPromptOutput<Record<string, any> & string> = IPromptOutput<Record<string, any> & string>
> {
  generateAmendedPrompt(props: { category: string; name: string; amendQuery?: string; amendedPrompt?: Partial<import("./types/interfaces").IPromptModel>; }): Partial<import("./types/interfaces").IPromptModel<any, any>> | PromiseLike<Partial<import("./types/interfaces").IPromptModel<any, any>>> {
    throw new Error("Method not implemented.");
  }
  // Store prompts in a nested structure: category -> prompt name -> PromptModel
  public prompts: Record<string, Record<string, PromptModel<any, any>>> = {};
  private initialized: boolean = false;

  constructor(
    @Inject() private fileSystem: PromptFileSystem,
    @Inject() private configManager: PromptProjectConfigManager
  ) {}

  async promptExists(props: { category: string; name: string }): Promise<boolean> {
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

  async executePrompt(props: { category: string; name: string; params: TInput }): Promise<TOutput> {
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
      logger.success('PromptManager initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize PromptManager:', error);
      throw new Error(`Failed to initialize PromptManager: ${error instanceof Error ? error.message : String(error)}`);
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
      logger.warn(`Prompts directory does not exist, creating it`);
      await fs.mkdir(this.configManager.getPromptsDir(), { recursive: true });
    }
    try {
      const prompts = await this.fileSystem.listPrompts();
      for (const prompt of prompts) {
        if (!prompt.category) {
          logger.warn(`Skipping malformed prompt without category: ${prompt.name}`);
          continue;
        }
        if (!this.prompts[prompt.category]) {
          this.prompts[prompt.category] = {};
        }
        try {
          const promptData = await this.fileSystem.loadPrompt({ category: prompt.category, promptName: prompt.name });
          this.prompts[prompt.category][prompt.name] = new PromptModel(promptData) as unknown as PromptModel<TInput, TOutput>;
        } catch (error) {
          logger.error(`Failed to load prompt ${prompt.category}/${prompt.name}:`, error);
          // Continue loading other prompts even if one fails
        }
      }
      logger.success(`Loaded ${prompts.length} prompts successfully`);
    } catch (error) {
      logger.error('Failed to load prompts:', error);
      throw new Error(`Failed to load prompts: ${error instanceof Error ? error.message : String(error)}`);
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
  getPrompt(props: { category: string; name: string }): PromptModel<TInput, TOutput> {
    if (!this.prompts[props.category]) {
      throw new Error(`Category "${props.category}" does not exist`);
    }
    if (!this.prompts[props.category][props.name]) {
      throw new Error(`Prompt "${props.name}" in category "${props.category}" does not exist`);
    }
    const prompt = this.prompts[props.category][props.name];
    return prompt as PromptModel<TInput, TOutput>;
  }

  async getPromptVersion({ category, name, version }: { category: string; name: string; version: string }): Promise<PromptModel<TInput, TOutput>> {
    const versionData = await this.fileSystem.loadPromptVersion({ category, promptName: name, version });
    return new PromptModel(versionData) as PromptModel<TInput, TOutput>;
  }

  /**
   * Create a new prompt and save it to the file system.
   * Purpose: Add a new prompt to the manager and persist it for future use.
   */
  async createPrompt(props: { prompt: Omit<IPrompt<IPromptInput, IPromptOutput>, 'versions'> }): Promise<void> {
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
    await this.fileSystem.savePrompt({ promptData: newPrompt as IPrompt<Record<string, any>, Record<string, any>> });
    logger.success(`Created new prompt "${prompt.name}" in category "${prompt.category}" with TypeScript definitions.`);
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

    await this.fileSystem.savePrompt({ promptData: prompt as IPrompt<Record<string, any>, Record<string, any>> });
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

  async listPrompts(props: { category?: string }): Promise<Array<IPrompt<IPromptInput, IPromptOutput> & { filePath: string }>> {
    const prompts = props.category
      ? Object.values(this.prompts[props.category] || {})
      : Object.values(this.prompts).flatMap(categoryPrompts => Object.values(categoryPrompts));

    logger.debug('prompts', prompts);

    return prompts.map(prompt => mapPromptToFileInfo(prompt, this.configManager.getBasePath()));
  }

  /**
   * Manage prompt versions: list, create, or switch to a specific version.
   * Purpose: Provide version control functionality for prompts.
   */
  async versionPrompt(props: { action: 'list' | 'create' | 'switch'; category: string; name: string; version?: string }): Promise<{
    action: 'list' | 'create' | 'switch';
    category: string;
    name: string;
    result: string[] | string;
  }> {
    const { action, category, name, version } = props;
    const prompt = this.getPrompt({ category, name });

    switch (action) {
      case 'list':
        const versions = await prompt.versions();
        return { action, category, name, result: versions };
      case 'create':
        const newVersion = this.incrementVersion(prompt.version);
        prompt.version = newVersion;
        await this.fileSystem.savePrompt({ promptData: prompt as IPrompt<Record<string, any>, Record<string, any>> });
        return { action, category, name, result: newVersion };
      case 'switch':
        if (!version) {
          throw new Error(`Version is required for switch action`);
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
  formatPrompt(props: { category: string; name: string; params: TInput }): string {
    const { category, name, params } = props;
    const prompt = this.getPrompt({ category, name });
    return prompt.format(params);
  }

  get categories(): { [category: string]: IPromptCategory<Record<string, PromptModel<TInput, TOutput>>> } {
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
          ])
        ),
      ])
    );
  }
}

```

## src/promptModel.ts

**Description:** Model representation of a prompt

```typescript
import Container, { Service, Inject } from 'typedi';
import { IPromptModel, IPromptInput, IPromptOutput, IAsyncIterableStream, IPrompt } from './types/interfaces';
import type { IPromptModelRequired, IPromptFileSystem } from './types/interfaces';
import { JSONSchema7 } from 'json-schema';
import { generateText, generateObject, streamText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';
import { jsonSchemaToZod } from './utils/jsonSchemaToZod';
import { incrementVersion, compareVersions } from './utils/versionUtils';
import path from 'path';
import { PromptProjectConfigManager } from './config/PromptProjectConfigManager';
import { PromptFileSystem } from './promptFileSystem';
import { logger } from './utils/logger';

export class PromptModel<
  TInput extends IPromptInput<Record<string, any>> = IPromptInput<Record<string, any>>,
  TOutput extends IPromptOutput<Record<string, any>> = IPromptOutput<Record<string, any>>
> implements IPromptModel<TInput, TOutput> {
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
  outputType: 'structured' | 'plain';
  inputSchema: JSONSchema7;
  outputSchema: JSONSchema7;
  private _isSaved: boolean = false;
  isLoadedFromStorage: boolean = false;
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
    if (!promptData.name || !promptData.category || !promptData.description || !promptData.template) {
      throw new Error('Invalid prompt data: missing required fields');
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
    this.version = promptData.version || '1.0.0';
    this.metadata = {
      ...promptData.metadata,
      created: promptData.metadata?.created || new Date().toISOString(),
      lastModified: promptData.metadata?.lastModified || new Date().toISOString(),
    };
    this.outputType = this.determineOutputType(promptData.outputSchema);
    this.defaultModelName = promptData.defaultModelName;
    this.configuration = this.initializeConfiguration();
  }

  async getFilePath(): Promise<string> {
    const promptsDir = this.configManager.getConfig('promptsDir');
    const filePath = path.join(promptsDir, this.category, this.name, 'prompt.json');
    this.filePath = filePath;
    return filePath;
  }

  private determineOutputType(outputSchema: JSONSchema7): 'structured' | 'plain' {
    if (outputSchema.type === 'object' && outputSchema.properties && Object.keys(outputSchema.properties).length > 0) {
      return 'structured';
    }
    return 'plain';
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
      modelName: this.defaultModelName || 'gpt-4o-mini',
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
      logger.error('Output validation error:', error);
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
      formattedContent = formattedContent.replace(new RegExp(`{{${key}}}`, 'g'), value as string);
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
        throw new Error('Invalid input');
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
        stopSequences: this.configuration.stopSequences
      });

      return textStream;
    } catch (error) {
      logger.error('Error streaming prompt:', error);
      throw new Error(`Failed to stream prompt: ${error instanceof Error ? error.message : String(error)}`);
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
        throw new Error('Invalid input');
      }
      if (this.outputType === 'structured') {
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
            presencePenalty: this.configuration.presencePenalty
          });
          const output = object as unknown as TOutput;
          if (!this.validateOutput(output)) {
            throw new Error('Invalid output');
          }
          return output;
        } catch (genError) {
          throw new Error(`Failed to generate structured output: ${genError instanceof Error ? genError.message : String(genError)}`);
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
            presencePenalty: this.configuration.presencePenalty
          });
          const output = { text } as unknown as TOutput;
          if (!this.validateOutput(output)) {
            throw new Error('Invalid output');
          }
          return output;
        } catch (genError) {
          throw new Error(`Failed to generate text output: ${genError instanceof Error ? genError.message : String(genError)}`);
        }
      }
    } catch (error) {
      logger.error('Error executing prompt:', error);
      throw new Error(`Failed to execute prompt: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  updateMetadata(metadata: Partial<IPromptModel['metadata']>): void {
    this.metadata = {
      ...this.metadata,
      ...metadata,
      lastModified: new Date().toISOString()
    };
  }

  updateConfiguration(config: Partial<IPromptModel['configuration']>): void {
    this.configuration = {
      ...this.configuration,
      ...config
    };
  }

  getSummary(): string {
    return `${this.name} (${this.category}): ${this.description || 'No description available'}`;
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
        const updatedPromptData = this as unknown as IPrompt<Record<string, any>, Record<string, any>>;
        const filePath = await this.getFilePath();
        await this.fileSystem.savePrompt({ promptData: updatedPromptData });
        this._isSaved = true;
        // Update the current instance with the saved data
        Object.assign(this, updatedPromptData);
        break;
      } catch (error) {
        if (error instanceof Error && error.message === 'VERSION_CONFLICT' && retries > 1) {
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
    const promptData = await this.fileSystem.loadPrompt({ category: this.category, promptName: this.name });
    Object.assign(this, promptData);
    this._isSaved = true;
  }

  async versions(): Promise<string[]> {
    return this.fileSystem.getPromptVersions({ category: this.category, promptName: this.name });
  }

  public async rollbackToVersion(version: string): Promise<void> {
    try {
      const versionData = await this.fileSystem.loadPromptVersion({ category: this.category, promptName: this.name, version });
      Object.assign(this, versionData);
      this.version = version;
      await this.save();
      logger.info(`Rolled back prompt ${this.name} to version ${version}`);
    } catch (error) {
      logger.error(`Failed to rollback prompt ${this.name} to version ${version}: ${error}`);
      throw error;
    }
  }
  async switchVersion(version: string): Promise<void> {
    const versionData = await this.fileSystem.loadPromptVersion({ category: this.category, promptName: this.name, version });
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
import { Service, Inject } from 'typedi';
import fs from 'fs/promises';
import path from 'path';
import { IPromptFileSystem, IPrompt, IPromptInput, IPromptOutput, IPromptModelRequired, IPromptsFolderConfig } from './types/interfaces';
import { PromptProjectConfigManager } from './config/PromptProjectConfigManager';
import { PromptSchema } from './schemas/prompts';
import { PromptModel } from './promptModel';
import { z } from 'zod';
import lockfile from 'proper-lockfile';
import { logger } from './utils/logger';
import { generateExportableSchemaAndType, generatePromptTypeScript, generateTestInputs } from './utils/typeGeneration';
import { cleanName } from './utils/promptManagerUtils';

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
  private initialized: boolean = false;

  constructor(
    @Inject() private configManager: PromptProjectConfigManager
  ) {
    const basePath = this.configManager.getBasePath();
    const promptsDir = this.configManager.getPromptsDir();
    logger.debug(`PromptFileSystem constructor called with basePath: ${basePath} and promptsDir: ${promptsDir}`);
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
    return path.join(this.getPromptsDir(), cleanName(category), cleanName(promptName), DEFAULT_PROMPT_FILENAME);
  }

  getVersionFilePath(props: { category: string; promptName: string; version: string }): string {
    const { category, promptName, version } = props;
    return path.join(this.getPromptsDir(), cleanName(category), cleanName(promptName), '.versions', `v${version}.json`);
  }

  private getCategoryDir(props: { category: string }): string {
    const { category } = props;
    return path.join(this.getPromptsDir(), cleanName(category));
  }

  private getPromptDir(props: { category: string; promptName: string }): string {
    const { category, promptName } = props;
    return path.join(this.getPromptsDir(), cleanName(category), cleanName(promptName));
  }

  private getVersionsDir(props: { category: string; promptName: string }): string {
    const { category, promptName } = props;
    return path.join(this.getPromptDir({ category: cleanName(category), promptName: cleanName(promptName) }), '.versions');
  }

  private getTypeDefinitionPath(props: { category: string; promptName: string }): string {
    const { category, promptName } = props;
    return path.join(this.getPromptDir({ category: cleanName(category), promptName: cleanName(promptName) }), DEFAULT_TYPE_DEFINITION_FILENAME);
  }

  private getVersionsFilePath(props: { category: string; promptName: string }): string {
    const { category, promptName } = props;
    return path.join(this.getVersionsDir({ category: cleanName(category), promptName: cleanName(promptName) }), 'versions.json');
  }

  private getTsOutputPath(props: { category: string; promptName: string }): string {
    const { category, promptName } = props;
    return path.join(this.getPromptDir({ category: cleanName(category), promptName: cleanName(promptName) }), DEFAULT_TS_OUTPUT_FILENAME);
  }

  private getTestInputsPath(props: { category: string; promptName: string }): string {
    const { category, promptName } = props;
    return path.join(this.getPromptDir({ category: cleanName(category), promptName: cleanName(promptName) }), DEFAULT_TEST_INPUTS_FILENAME);
  }

  private async generateTsOutputFile(promptData: IPrompt<IPromptInput, IPromptOutput>, filePath: string): Promise<void> {
    // const { formattedSchemaTs } = await generateExportableSchemaAndType({
    //   schema: promptData.inputSchema,
    //   name: `${cleanName(promptData.category)}${cleanName(promptData.name)}Input`
    // });
    const formattedSchemaTs = await generatePromptTypeScript(promptData);
    await fs.writeFile(filePath, formattedSchemaTs);
  }

  private async generateTestInputsFile(promptData: IPrompt<IPromptInput, IPromptOutput>, filePath: string): Promise<void> {
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
        logger.warn('Prompts folder configuration is invalid. Reinitializing...');
        await this.initializePromptsFolderConfig();
      }
      this.initialized = true;
      logger.success('PromptFileSystem initialization complete');
    } catch (error) {
      logger.error('PromptFileSystem initialization failed:', error);
      throw new Error('Failed to initialize PromptFileSystem. Please check your configuration and try again.');
    }
  }

  private getDetailedErrorMessage(error: Error, filePath: string): string {
    if (error.message.includes('ENOSPC')) {
      return `Insufficient disk space to save prompt: ${filePath}`;
    } else if (error.message.includes('EACCES')) {
      return `Insufficient permissions to save prompt: ${filePath}`;
    } else if (error.message.includes('EBUSY')) {
      return `File is locked or in use: ${filePath}`;
    } else {
      return `Failed to save prompt: ${filePath}. Error: ${error.message}`;
    }
  }

  private async initializePromptsFolderConfig(): Promise<void> {
    const configPath = this.configManager.getProjectConfigPath();
    try {
      await fs.access(configPath);
      logger.success('Prompts folder configuration already exists');
    } catch (error) {
      logger.warn('Prompts folder configuration not found. Creating a new one...');
      const initialConfig: IPromptsFolderConfig = {
        version: "1.0.0",
        lastUpdated: new Date().toISOString(),
        promptCount: 0
      };
      await fs.writeFile(configPath, JSON.stringify(initialConfig, null, 2));
      logger.success('Created new prompts folder configuration');
    }
  }

  private async validatePromptsFolderConfig(): Promise<boolean> {
    const configPath = this.configManager.getProjectConfigPath();
    try {
      await fs.access(configPath);
      const configData = await fs.readFile(configPath, 'utf-8');
      const config: IPromptsFolderConfig = JSON.parse(configData);
      const isValid = (
        typeof config.version === 'string' &&
        typeof config.lastUpdated === 'string' &&
        typeof config.promptCount === 'number'
      );
      if (isValid) {
        logger.success('Prompts folder configuration is valid');
      } else {
        logger.warn('Invalid prompts folder configuration detected');
      }
      return isValid;
    } catch (error) {
      logger.error('Error validating prompts folder configuration:', error);
      logger.warn('Possible reasons for invalid prompts folder configuration:');
      logger.warn('• The configuration file might be corrupted or manually edited incorrectly');
      logger.warn('• The configuration file might be missing required fields');
      logger.warn('Actions to take:');
      logger.warn('• Check the file contents and ensure it\'s valid JSON');
      logger.warn('• Ensure all required fields (version, lastUpdated, promptCount) are present');
      logger.warn('• If issues persist, try reinitializing the configuration file');
      return false;
    }
  }

  private async updatePromptsFolderConfig(updates: Partial<IPromptsFolderConfig>): Promise<void> {
    const configPath = this.configManager.getProjectConfigPath();
    const currentConfig = await this.getPromptsFolderConfig();
    const updatedConfig = { ...currentConfig, ...updates, lastUpdated: new Date().toISOString() };
    logger.debug(`Updating prompts folder configuration at ${configPath}`);
    await fs.writeFile(configPath, JSON.stringify(updatedConfig, null, 2));
  }

  private async getPromptsFolderConfig(): Promise<IPromptsFolderConfig> {
    const configPath = path.join(this.getBasePath(), DEFAULT_PROMPTS_FOLDER_CONFIG_FILENAME);
    const configData = await fs.readFile(configPath, 'utf-8');
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
  async savePrompt(props: { promptData: IPrompt<IPromptInput, IPromptOutput> }): Promise<void> {
    const { promptData } = props;
    let validatedPromptData: IPrompt<IPromptInput, IPromptOutput>;
    try {
      validatedPromptData = PromptSchema.parse(promptData) as IPrompt<IPromptInput, IPromptOutput>;
    } catch (validationError) {
      if (validationError instanceof z.ZodError) {
        throw new Error(`Invalid prompt data: ${validationError.errors.map(e => e.message).join(', ')}`);
      }
      throw validationError;
    }

    const filePath = this.getFilePath({ category: validatedPromptData.category, promptName: validatedPromptData.name });
    let release;
    try {
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      release = await lockfile.lock(path.dirname(filePath));

      const versionFilePath = this.getVersionFilePath({
        category: validatedPromptData.category, promptName: validatedPromptData.name, version: validatedPromptData.version
      });
      await fs.mkdir(this.getVersionsDir({ category: validatedPromptData.category, promptName: validatedPromptData.name }), { recursive: true });

      const existingPrompt = await this.loadPrompt({
        category: validatedPromptData.category, promptName: validatedPromptData.name
      }).catch(() => null);

      logger.debug(`Saving prompt to ${filePath}`);
      await fs.writeFile(filePath, JSON.stringify(validatedPromptData, null, 2));

      logger.debug(`Saving prompt version to ${versionFilePath}`);
      await fs.writeFile(versionFilePath, JSON.stringify(validatedPromptData, null, 2));

      // const typeDefinitionPath = this.getTypeDefinitionPath({ category: validatedPromptData.category, promptName: validatedPromptData.name });
      // logger.debug(`Generating type definition file at ${typeDefinitionPath}`);
      // await this.generateTypeDefinitionFile(validatedPromptData, typeDefinitionPath);

      const tsOutputPath = this.getTsOutputPath({ category: validatedPromptData.category, promptName: validatedPromptData.name });
      logger.debug(`Generating TS output file at ${tsOutputPath}`);
      await this.generateTsOutputFile(validatedPromptData, tsOutputPath);

      const testInputsPath = this.getTestInputsPath({ category: validatedPromptData.category, promptName: validatedPromptData.name });
      logger.debug(`Generating test inputs file at ${testInputsPath}`);
      await this.generateTestInputsFile(validatedPromptData, testInputsPath);

      const versionsDir = this.getVersionsDir({ category: validatedPromptData.category, promptName: validatedPromptData.name });
      logger.debug(`Creating versions directory at ${versionsDir}`);
      await fs.mkdir(versionsDir, { recursive: true });

      const versions = await this.getPromptVersions({ category: validatedPromptData.category, promptName: validatedPromptData.name });
      if (!versions.includes(validatedPromptData.version)) {
        versions.push(validatedPromptData.version);
        versions.sort((a, b) => this.compareVersions(b, a));
      }
      logger.debug(`Writing versions to ${this.getVersionsFilePath({ category: validatedPromptData.category, promptName: validatedPromptData.name })}`);
      await fs.writeFile(this.getVersionsFilePath({ category: validatedPromptData.category, promptName: validatedPromptData.name }), JSON.stringify(versions, null, 2));

    } catch (error) {
      if (error instanceof Error) {
        const errorMessage = this.getDetailedErrorMessage(error, filePath);
        logger.error(errorMessage, error);
        throw new Error(errorMessage);
      }
      throw new Error(`Unknown error while saving prompt: ${filePath}`);
    } finally {
      if (release) {
        await release();
      }
    }
  }

  /**
   * Load a prompt from the file system.
   * Purpose: Retrieve stored prompt data for use in the application.
   */
  async loadPrompt(props: { category: string; promptName: string }): Promise<IPrompt<IPromptInput, IPromptOutput>> {
    const { category, promptName } = props;
    const filePath = this.getFilePath({ category, promptName });

    let release;
    try {
      release = await lockfile.lock(path.dirname(filePath));
      await fs.access(filePath);
      const data = await fs.readFile(filePath, 'utf-8');
      let parsedData;
      try {
        parsedData = JSON.parse(data);
      } catch (jsonError) {
        throw new Error(`Invalid JSON in prompt file: ${filePath}. Error: ${jsonError instanceof Error ? jsonError.message : String(jsonError)}`);
      }
      try {
        const validatedData = PromptSchema.parse(parsedData);
        return validatedData as IPrompt<IPromptInput, IPromptOutput>;
      } catch (validationError) {
        if (validationError instanceof z.ZodError) {
          throw new Error(`Invalid prompt data structure in file: ${filePath}. Error: ${validationError.errors.map(e => e.message).join(', ')}`);
        }
        throw validationError;
      }
    } catch (error) {
      if (error instanceof Error) {
        if ('code' in error && error.code === 'ENOENT') {
          throw new Error(`Prompt not found: ${filePath}. Category: ${category}, Name: ${promptName}`);
        }
        throw new Error(`Failed to load prompt: ${filePath}. Error: ${error.message}`);
      }
      throw new Error(`Unknown error while loading prompt: ${filePath}`);
    } finally {
      if (release) {
        await release();
      }
    }
  }

  async promptExists(props: { category: string; promptName: string }): Promise<boolean> {
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
  async listPrompts({ category }: { category?: string } = {}): Promise<PromptModel[]> {
    if (!this.initialized) {
      throw new Error('PromptFileSystem is not initialized. Call initialize() first.');
    }
    logger.info(`Listing prompts. Category: ${category || 'All'}`);
    logger.debug(`Base path: ${this.getBasePath()}`);

    const categories = await this.listCategories();
    logger.debug(`Categories: ${categories.join(', ')}`);
    const prompts: PromptModel[] = [];

    for (const cat of categories) {
      if (category && cat !== category) continue;

      logger.debug(`Processing category: ${cat}`);
      const categoryDir = this.getCategoryDir({ category: cat });
      const promptDirs = await fs.readdir(categoryDir, { withFileTypes: true });

      logger.debug(`Prompts in category ${cat}: ${promptDirs.length}`);
      for (const prompt of promptDirs) {
        const promptData = await this.loadPrompt({ category: cat, promptName: prompt.name });
        const promptModel = new PromptModel(promptData as IPromptModelRequired);
        prompts.push(promptModel);
      }
    }

    return prompts;
  }

  async listCategories(): Promise<string[]> {
    const entries = await fs.readdir(this.configManager.getPromptsDir(), { withFileTypes: true });
    return entries.filter(entry => entry.isDirectory()).map(entry => entry.name);
  }

  async searchPrompts(props: { query: string }): Promise<PromptModel[]> {
    const { query } = props;
    const allPrompts = await this.listPrompts();
    return allPrompts.filter(prompt =>
      prompt.name.toLowerCase().includes(query.toLowerCase()) ||
      prompt.category.toLowerCase().includes(query.toLowerCase()) ||
      prompt.description.toLowerCase().includes(query.toLowerCase()) ||
      prompt.template.toLowerCase().includes(query.toLowerCase()) ||
      (prompt.metadata && Object.values(prompt.metadata).some(value =>
        typeof value === 'string' && value.toLowerCase().includes(query.toLowerCase())
      ))
    );
  }

  async searchCategories(props: { query: string }): Promise<string[]> {
    const { query } = props;
    const categories = await this.listCategories();
    const matchingCategories = categories.filter(category =>
      category.toLowerCase().includes(query.toLowerCase())
    );

    // If no exact matches, try to find partial matches
    if (matchingCategories.length === 0) {
      return categories.filter(category =>
        query.toLowerCase().split(' ').some(word =>
          category.toLowerCase().includes(word)
        )
      );
    }

    return matchingCategories;
  }

  async getPromptVersions(props: { category: string; promptName: string }): Promise<string[]> {
    const { category, promptName } = props;
    try {
      const versionsFile = this.getVersionsFilePath({ category, promptName });
      const versionsData = await fs.readFile(versionsFile, 'utf-8');
      return JSON.parse(versionsData);
    } catch {
      return [];
    }
  }

  private compareVersions(a: string, b: string): number {
    const partsA = a.split('.').map(Number);
    const partsB = b.split('.').map(Number);
    for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
      const partA = partsA[i] || 0;
      const partB = partsB[i] || 0;
      if (partA > partB) return 1;
      if (partA < partB) return -1;
    }
    return 0;
  }

  async deletePrompt({ category, promptName }: { category: string, promptName: string }): Promise<void> {
    const promptDir = this.getPromptDir({ category, promptName });
    let release;
    try {
      release = await lockfile.lock(promptDir);
      await fs.rm(promptDir, { recursive: true, force: true });
    } finally {
      if (release) {
        await release();
      }
    }
  }

  async renamePrompt(props: {
    currentCategory: string;
    currentName: string;
    newCategory: string;
    newName: string
  }): Promise<void> {
    const { currentCategory, currentName, newCategory, newName } = props;
    const oldPath = path.join(this.getPromptsDir(), currentCategory, currentName);
    const newPath = path.join(this.getPromptsDir(), newCategory, newName);

    let oldRelease, newRelease;
    try {
      oldRelease = await lockfile.lock(oldPath);
      newRelease = await lockfile.lock(path.dirname(newPath));

      // Ensure the new category directory exists
      await fs.mkdir(path.dirname(newPath), { recursive: true });

      // Rename (move) the directory
      await fs.rename(oldPath, newPath);

      // If the categories are different or the name has changed, we need to update the prompt data
      if (currentCategory !== newCategory || currentName !== newName) {
        const promptData = await this.loadPrompt({ category: newCategory, promptName: newName });
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
    const categoryPath = this.getPromptDir({ category: categoryName, promptName: '' });
    await fs.mkdir(categoryPath, { recursive: true });
  }

  async deleteCategory(props: { categoryName: string }): Promise<void> {
    const { categoryName } = props;
    const categoryPath = this.getPromptDir({ category: categoryName, promptName: '' });
    await fs.rm(categoryPath, { recursive: true, force: true });
  }

  async loadPromptVersion(props: { category: string; promptName: string; version: string }): Promise<IPrompt<IPromptInput, IPromptOutput>> {
    const { category, promptName, version } = props;
    const versionFilePath = this.getVersionFilePath({ category, promptName, version });
    const data = await fs.readFile(versionFilePath, 'utf-8');
    return JSON.parse(data);
  }

  async getCurrentVersion(prompt: IPrompt<IPromptInput, IPromptOutput>): Promise<string> {
    const versions = await this.getPromptVersions({ category: prompt.category, promptName: prompt.name });
    return versions.length > 0 ? versions[0] : '0.0.0';
  }

  private async generateTypeDefinitionFile(promptData: IPrompt<IPromptInput, IPromptOutput>, filePath: string): Promise<void> {

    const inputTypes = await generateExportableSchemaAndType({
      schema: promptData.inputSchema, name: `${cleanName(promptData.name)}Input`
    });
    const outputTypes = await generateExportableSchemaAndType({
      schema: promptData.outputSchema, name: `${cleanName(promptData.name)}Output`
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
import { cosmiconfig, OptionsSync } from 'cosmiconfig';
import path from 'path';
import type { IPromptProjectConfigManager } from '../types/interfaces';
import { ensureDirectoryExists } from '../utils/fileUtils';
import { configSchema, DEFAULT_CONFIG, z } from '../schemas/config';
import type { Config } from '../schemas/config';
import { Service } from 'typedi';
import { fromError } from 'zod-validation-error';
import { logger } from '../utils/logger';
import chalk from 'chalk';

const DEFAULT_PROMPTS_FOLDER_CONFIG_FILENAME = '.promptmanager.config.json';

export type { Config };

@Service()
export class PromptProjectConfigManager implements IPromptProjectConfigManager {
  private config: Config;
  private initialized: boolean = false;
  private explorer;
  private basePath: string;
  private configFilePath: string | undefined;

  constructor() {
    this.config = { ...DEFAULT_CONFIG };
    this.basePath = process.env.FURY_PROJECT_ROOT || process.cwd();
    const explorerOptions: OptionsSync = {
      searchPlaces: [
        'package.json',
        '.promptmanagerrc',
        '.promptmanagerrc.json',
        '.promptmanagerrc.yaml',
        '.promptmanagerrc.yml',
        '.promptmanagerrc.js',
        'promptmanager.config.js',
      ],
      loaders: {},
      transform: (result) => result,
      ignoreEmptySearchPlaces: true,
      cache: true,
      mergeImportArrays: true,
      mergeSearchPlaces: true,
      searchStrategy: 'project',
    };
    this.explorer = cosmiconfig('promptmanager', explorerOptions);
    logger.debug(`Initializing PromptProjectConfigManager with basePath: ${this.basePath}`);
  }

  public getBasePath(): string {
    return this.basePath;
  }

  public getPromptsDir(): string {
    if (!this.config.promptsDir) {
      throw new Error('Prompts directory not set. Please set the prompts directory in your configuration file.');
    }
    if (!path.isAbsolute(this.config.promptsDir)) {
      return path.join(this.basePath, this.config.promptsDir);
    }
    return this.config.promptsDir;
  }

  public getProjectConfigPath(): string {
    if (!this.configFilePath) {
      logger.warn('No configuration file found. Using default configuration.');
      throw new Error('No configuration file found. Please set the configuration file in your project.');
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
      logger.error('Failed to initialize config:', error.message);
      throw new Error('Failed to initialize PromptProjectConfigManager. Please check your configuration and try again.');
    }
  }

  public async isInitialized(): Promise<boolean> {
    return this.initialized;
  }

  private async loadConfig(): Promise<void> {
    try {
      const result = await this.explorer.search();
      if (result && result.config) {
        const validatedConfig = configSchema.parse({ ...DEFAULT_CONFIG, ...result.config });
        this.config = {
          ...validatedConfig,
          promptsDir: path.resolve(this.basePath, validatedConfig.promptsDir),
          outputDir: path.resolve(this.basePath, validatedConfig.outputDir),
        };
        logger.debug(`Found configuration file at ${result.filepath}`);
        this.configFilePath = result.filepath;
      } else {
        logger.warn('No configuration file found. Using default configuration.');
        this.config = { ...DEFAULT_CONFIG };
      }
      if (!this.configFilePath) {
        logger.error(`No configuration file found at ${this.basePath}`);
        this.configFilePath = path.join(this.basePath, DEFAULT_PROMPTS_FOLDER_CONFIG_FILENAME);
      } else {
        logger.debug(`Configuration file found at ${this.configFilePath}`);
      }
      logger.debug('Configuration loaded successfully');
      logger.debug(`Prompts directory: ${this.config.promptsDir}`);
      logger.debug(`Output directory: ${this.config.outputDir}`);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const validationError = fromError(error);
        logger.error(validationError.toString());
        logger.error('Invalid configuration:', error.errors);
        throw new Error(`Invalid configuration: ${error.message}`);
      } else {
        logger.error('Error loading configuration:', error);
        throw new Error('Failed to load configuration. Please check your configuration file.');
      }
    }
  }

  private async ensureConfigDirectories(): Promise<void> {
    try {
      await ensureDirectoryExists(this.config.promptsDir);
      logger.success(`Created prompts directory: ${chalk.yellow(this.config.promptsDir)}`);
      await ensureDirectoryExists(this.config.outputDir);
      logger.success(`Created output directory: ${chalk.yellow(this.config.outputDir)}`);
    } catch (error: any) {
      logger.error('Error: Failed to create necessary directories.');
      logger.warn('Please check that you have write permissions in the project directory.');
      throw new Error(`Failed to create directories: ${error.message}`);
    }
  }

  private prettyPrintConfig(): void {
    if (this.config.verbosity > 99) {
      logger.info(chalk.bold('\nLoaded Configuration:'));
      logger.info(`prompts_dir:      ${chalk.cyan(this.config.promptsDir)}`);
      logger.info(`output_dir:       ${chalk.cyan(this.config.outputDir)}`);
      logger.info(`preferredModels:  ${chalk.cyan(this.config.preferredModels.join(', '))}`);
      logger.info('modelParams:');
      Object.entries(this.config.modelParams).forEach(([model, params]) => {
        logger.info(`  ${model}:`);
        Object.entries(params).forEach(([key, value]) => {
          logger.info(`    ${key}: ${chalk.cyan(value)}`);
        });
      });
      logger.info(`verbosity:        ${chalk.cyan(this.config.verbosity)}`);
      logger.info('\n');
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
      const updatedConfig = configSchema.parse({ ...this.config, ...newConfig });
      this.config = updatedConfig;
      this.prettyPrintConfig();
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        const validationError = fromError(error);
        logger.error("Validation error:", validationError.toString());
        logger.error('Invalid configuration update:', error.errors);
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

## src/cli/cli.tsx

**Description:** No description available

```typescript
#!/usr/bin/env bun

import "reflect-metadata";
import "./cliPolyfills";

import { Container } from "typedi";
import { PromptFileSystem } from "../promptFileSystem";
import { PromptManager } from "../promptManager";
import PromptManagerUI from "./PromptManagerUI";
import { PromptProjectConfigManager } from "../config/PromptProjectConfigManager";
import React from "react";
import { logger } from "../utils/logger";
import { render } from "ink";

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
  await ensureInitialized();
  const { waitUntilExit, clear } = render(<PromptManagerUI />);

  const cleanup = () => {
    clear();
    logger.info("Exiting gracefully...");
    process.exit(0);
  };

  process.on("SIGINT", cleanup);
  process.on("SIGTERM", cleanup);

  try {
    await waitUntilExit();
  } finally {
    cleanup();
  }
}

await main().catch((error) => {
  console.error("An error occurred:", error);
  process.exit(1);
});
// await ensureInitialized();
// render(<PromptManagerUI />);

```

## src/cli/commands.ts

**Description:** Command line commands

```typescript
import { IPrompt, IPromptInput, IPromptModel, IPromptOutput } from "../types/interfaces";
import axios from "axios";

import { Container } from "typedi";
import { PromptManager } from "../promptManager";
import { PromptProjectConfigManager } from "../config/PromptProjectConfigManager";
import { PromptSchema } from "../schemas/prompts";
import fs from "fs-extra";
import { generateExportableSchemaAndType, generatePromptTypeScript } from "../utils/typeGeneration";
import path from "path";
import { cleanName } from "../utils/promptManagerUtils";

export const fetchContentFromUrl = async (url: string): Promise<string> => {
  const response = await axios.get(url);
  return response.data;
};

export const createPromptFromContent = async (content: string): Promise<Partial<IPromptModel>> => {
  // Implement the logic to send a request to the AI to create a prompt from the content
  // This is a placeholder implementation
  return {
    name: "Imported Prompt",
    category: "Imported",
    description: "This prompt was imported from external content.",
    template: content,
    version: "1.0",
    parameters: [],
    metadata: {
      created: new Date().toISOString(),
      lastModified: new Date().toISOString(),
    },
    outputType: "plain",
    inputSchema: {},
    outputSchema: {},
    configuration: {
      modelName: "default",
      temperature: 0.7,
      maxTokens: 100,
      topP: 1.0,
      frequencyPenalty: 0.0,
      presencePenalty: 0.0,
      stopSequences: [],
    },
  };
};

export async function createPrompt(
  promptData: Partial<Omit<IPrompt<IPromptInput, IPromptOutput>, "versions">>,
): Promise<void> {
  const promptManager = Container.get(PromptManager);
  const validatedPromptData = PromptSchema.parse(promptData);
  await promptManager.createPrompt({ prompt: validatedPromptData as any });
}

export async function listPrompts(): Promise<
  Array<
    {
      name: string;
      category: string;
      version: string;
      filePath: string;
    } & Partial<IPrompt<IPromptInput, IPromptOutput>>
  >
> {
  const promptManager = Container.get(PromptManager);
  const prompts = await promptManager.listPrompts({});
  return prompts;
  return prompts.map((prompt) => ({
    name: prompt.name,
    category: prompt.category,
    version: prompt.version || "1.0.0",
    filePath: prompt.filePath || "",
  }));
}

export async function getPromptDetails(props: {
  category: string;
  name: string;
  version?: string;
}): Promise<Partial<IPrompt<IPromptInput, IPromptOutput>>> {
  const promptManager = Container.get(PromptManager);

  if (props.version) {
    return await promptManager.getPromptVersion({ ...props, version: props.version });
  }
  return promptManager.getPrompt(props);
}

export async function updatePrompt(props: {
  category: string;
  name: string;
  updates: Partial<IPrompt<IPromptInput, IPromptOutput>>;
}): Promise<void> {
  const promptManager = Container.get(PromptManager);
  const validatedUpdates = PromptSchema.parse(props.updates);
  await promptManager.updatePrompt({ ...props, updates: validatedUpdates });
}

export async function generateTypes(): Promise<string> {
  const configManager = Container.get(PromptProjectConfigManager);
  const outputDir = configManager.getConfig("outputDir");
  const promptManager = Container.get(PromptManager);
  const prompts = await promptManager.listPrompts({});
  let typeDefs = 'import { IAsyncIterableStream } from "./types/interfaces";\n\n';
  typeDefs += 'declare module "prompt-manager" {\n';
  typeDefs += '  export class PromptManagerClient {\n';

  const categories = new Set<string>();

  for (const prompt of prompts) {
    categories.add(prompt.category);
    const inputTypes = await generateExportableSchemaAndType({
      schema: prompt.inputSchema,
      name: `${cleanName(prompt.category)}${cleanName(prompt.name)}Input`,
    });
    const outputTypes = await generateExportableSchemaAndType({
      schema: prompt.outputSchema,
      name: `${cleanName(prompt.category)}${cleanName(prompt.name)}Output`,
    });

    typeDefs += `    ${inputTypes.formattedSchemaTsNoImports}\n`;
    typeDefs += `    ${outputTypes.formattedSchemaTsNoImports}\n`;
  }

  for (const category of categories) {
    typeDefs += `    ${category}: {\n`;
    const categoryPrompts = prompts.filter(p => p.category === category);
    for (const prompt of categoryPrompts) {
      typeDefs += `      ${cleanName(prompt.name)}: {\n`;
      typeDefs += `        format: (inputs: ${cleanName(category)}${cleanName(prompt.name)}Input) => Promise<string>;\n`;
      typeDefs += `        execute: (inputs: ${cleanName(category)}${cleanName(prompt.name)}Input) => Promise<${cleanName(category)}${cleanName(prompt.name)}Output>;\n`;
      typeDefs += `        stream: (inputs: ${cleanName(category)}${cleanName(prompt.name)}Input) => Promise<IAsyncIterableStream<string>>;\n`;
      typeDefs += `        description: string;\n`;
      typeDefs += `        version: string;\n`;
      typeDefs += `      };\n`;
    }
    typeDefs += `    };\n`;
  }

  typeDefs += "  }\n\n";
  typeDefs += "  export const promptManager: PromptManagerClient;\n";
  typeDefs += "}\n";

  await fs.writeFile(path.join(outputDir, "prompts.d.ts"), typeDefs);
  return typeDefs;
}

export async function getStatus(): Promise<{
  config: any;
  totalPrompts: number;
  categories: string[];
  lastGenerated: string | null;
  warnings: string[];
}> {
  const configManager = Container.get(PromptProjectConfigManager);
  const promptManager = Container.get(PromptManager);

  const config = {
    promptsDir: configManager.getConfig("promptsDir"),
    outputDir: configManager.getConfig("outputDir"),
    preferredModels: configManager.getConfig("preferredModels"),
    modelParams: configManager.getConfig("modelParams"),
  };

  const prompts = await promptManager.listPrompts({});
  const categories = [...new Set(prompts.map((prompt) => prompt.category))];

  let lastGenerated = null;
  try {
    const stats = await fs.stat(path.join(config.outputDir, "prompts.d.ts"));
    lastGenerated = stats.mtime.toISOString();
  } catch (error) {
    // File doesn't exist, which is fine
  }

  const warnings = [];
  if (prompts.length === 0) {
    warnings.push(
      'No prompts found. Use the "create" command to add new prompts.',
    );
  }
  if (!lastGenerated) {
    warnings.push(
      'Type definitions have not been generated yet. Use the "generate" command to create them.',
    );
  }

  return {
    config,
    totalPrompts: prompts.length,
    categories,
    lastGenerated,
    warnings,
  };
}

export async function deletePrompt(props: {
  category: string;
  name: string;
}): Promise<void> {
  const promptManager = Container.get(PromptManager);
  await promptManager.deletePrompt(props);
}

export async function amendPrompt(props: {
  category: string;
  name: string;
  amendQuery?: string;
  amendedPrompt?: Partial<IPromptModel>;
}): Promise<Partial<IPromptModel>> {
  const promptManager = Container.get(PromptManager);
  if (props.amendQuery) {
    // Generate amended prompt based on the query
    return await promptManager.generateAmendedPrompt(props);
  } else if (props.amendedPrompt) {
    // Save the amended prompt
    await promptManager.updatePrompt({ ...props, updates: props.amendedPrompt, bumpVersion: true });
    return props.amendedPrompt;
  }
  throw new Error("Invalid amendment operation");
}

export async function listPromptVersions(props: {
  category: string;
  name: string;
}): Promise<string[]> {
  const promptManager = Container.get(PromptManager);
  const versions = await promptManager.versionPrompt({
    ...props,
    action: "list",
  });
  return (versions.result as string[]).sort((a, b) => {
    const [aMajor, aMinor, aPatch] = a.split(".").map(Number);
    const [bMajor, bMinor, bPatch] = b.split(".").map(Number);
    if (aMajor !== bMajor) return aMajor - bMajor;
    if (aMinor !== bMinor) return aMinor - bMinor;
    return aPatch - bPatch;
  });
}

export async function switchPromptVersion(props: {
  category: string;
  name: string;
  version: string;
}): Promise<void> {
  const promptManager = Container.get(PromptManager);
  await promptManager.versionPrompt({ ...props, action: "switch" });
}

export async function getGeneratedTypeScript(props: {
  category: string;
  name: string;
}): Promise<string> {
  const promptManager = Container.get(PromptManager);
  const prompt = await promptManager.getPrompt(props);
  return await generatePromptTypeScript(prompt);
}
export const importPrompt = async (promptData: any) => {
  // Implementation here
};

```

## src/types/interfaces.ts

**Description:** No description available

```typescript
import type { JSONSchema7 } from 'json-schema';
import { ZodObject, ZodType } from 'zod';
import { Config } from '../schemas/config';
/**
 * This file contains the core interfaces for the Prompt Manager project.
 * It serves as a single source of truth for the expected behavior of both
 * the CLI tool and the importable library.
 *
 * These interfaces should be used to guide the implementation of the project.
 * Any changes to the project's core functionality should be reflected here first.
 *
 * IMPORTANT: Do not delete the comments in this file. They provide crucial
 * information about the purpose and usage of each interface and type.
 */

/**
 * Represents the input structure for a prompt.
 * This can be extended to include any key-value pairs.
 */
type IPromptInput<T extends Record<string, any> = Record<string, any>> = T;

/**
 * Represents the output structure for a prompt.
 * This can be extended to include any key-value pairs.
 */
type IPromptOutput<T extends Record<string, any> = Record<string, any>> = T;

/**
 * Represents the structure of a single prompt.
 */
interface IPrompt<PromptInput extends IPromptInput<any>, PromptOutput extends IPromptOutput<any>> {
  /** Unique identifier for the prompt */
  name: string;
  /** Category the prompt belongs to */
  category: string;
  /** Brief description of the prompt's purpose */
  description: string;
  /** Current version of the prompt */
  version: string;
  /** The actual content of the prompt */
  template: string;
  /** List of parameter names expected by the prompt */
  parameters?: string[];
  /** Metadata associated with the prompt */
  metadata: {
    /** Timestamp of when the prompt was created */
    created: string;
    /** Timestamp of the last modification */
    lastModified: string;
  };

  /** Type of output expected from the model (structured or plain text) */
  outputType: 'structured' | 'plain';
  /** Default model name to use for this prompt */
  defaultModelName?: string;
  /** Optional list of models that can be used with this prompt */
  compatibleModels?: string[];
  /** Optional list of tags or keywords associated with this prompt */
  tags?: string[];
  /** Type of input expected by the prompt */
  inputSchema: JSONSchema7;
  /** Type of output expected by the prompt */
  outputSchema: JSONSchema7;
  /** Configuration for the AI model */
  configuration?: {
    modelName?: string;
    temperature?: number;
    maxTokens?: number;
    topP?: number;
    frequencyPenalty?: number;
    presencePenalty?: number;
    stopSequences?: string[];
  };
}

type IAsyncIterableStream<T> = AsyncIterable<T> & ReadableStream<T>;

export interface IPromptModelRequired {
  name: string;
  category: string;
  description: string;
  template: string;
  parameters?: string[];
  inputSchema: JSONSchema7;
  outputSchema: JSONSchema7;
  version: string;
  metadata: {
    created: string;
    lastModified: string;
    author?: string;
    sourceName?: string;
    sourceUrl?: string;
    license?: string;
  };
  defaultModelName?: string;
}

export interface IPromptModel<
  TInput extends IPromptInput<any> = IPromptInput<any>,
  TOutput extends IPromptOutput<any> = IPromptOutput<any>
> extends Omit<IPrompt<TInput, TOutput>, 'inputSchema' | 'outputSchema'>, IPromptModelRequired {
  version: string;
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
    modelName?: string;
    temperature?: number;
    maxTokens?: number;
    topP?: number;
    frequencyPenalty?: number;
    presencePenalty?: number;
    stopSequences?: string[];
  };
  outputType: 'structured' | 'plain';
  // fileSystem: IPromptFileSystem;
  isLoadedFromStorage: boolean;
  filePath?: string | undefined | null;

  validateInput(input: TInput): boolean;
  validateOutput(output: TOutput): boolean;
  format(inputs: TInput): string;
  stream(inputs: TInput): Promise<IAsyncIterableStream<string>>;
  execute(inputs: TInput): Promise<TOutput>;
  updateMetadata(metadata: Partial<IPromptModel['metadata']>): void;
  updateConfiguration(config: Partial<IPromptModel['configuration']>): void;
  getSummary(): string;
  save(): Promise<void>;
  load(filePath: string): Promise<void>;
  versions(): Promise<string[]>;
  switchVersion(version: string): Promise<void>;
  get isSaved(): boolean;
  get inputZodSchema(): ZodType<any>;
  get outputZodSchema(): ZodType<any>;
}

export interface IPromptModelStatic {
  loadPromptByName(name: string, fileSystem: IPromptFileSystem): Promise<IPromptModel>;
  promptExists(name: string, fileSystem: IPromptFileSystem): Promise<boolean>;
  listPrompts(category?: string, fileSystem?: IPromptFileSystem): Promise<Array<{ name: string; category: string; filePath: string }>>;
  deletePrompt(category: string, name: string, fileSystem?: IPromptFileSystem): Promise<void>;
}



/**
 * Defines the structure and behavior of the Prompt Manager CLI.
 */
interface IPromptManagerCLI {
  /**
   * Creates a new prompt.
   * @param props An object containing the name and options for the new prompt
   */
  create(props: {
    name: string;
    options: {
      category?: string;
      content?: string;
      parameters?: string[];
      description?: string;
    }
  }): Promise<void>;

  /**
   * Lists all available prompts.
   * @param props An object containing filtering and display options
   */
  list(props?: {
    options?: {
      category?: string;
      format?: 'json' | 'table';
    }
  }): Promise<void>;

  /**
   * Updates an existing prompt.
   * @param props An object containing the name of the prompt to update and update options
   */
  update(props: {
    name: string;
    options: {
      content?: string;
      parameters?: string[];
      description?: string;
    }
  }): Promise<void>;

  /**
   * Deletes a prompt.
   * @param props An object containing the name of the prompt to delete
   */
  delete(props: { name: string }): Promise<void>;

  /**
   * Manages versions of a prompt.
   * @param props An object containing the version management action, prompt name, and optional version
   */
  version(props: {
    action: 'list' | 'create' | 'switch';
    name: string;
    version?: string;
  }): Promise<void>;

  /**
   * Generates TypeScript types for all prompts.
   */
  generateTypes(): Promise<void>;

  /**
   * Performs a consistency check on all prompts.
   */
  check(): Promise<void>;
}

/**
 * Represents a category of prompts in the importable library.
 * NOTE: DO NOT DELETE THESE COMMENTS. THEY ARE USED BY THE DOCUMENTATION GENERATOR.
 */
interface IPromptCategory<T extends Record<string, IPrompt<IPromptInput, IPromptOutput>>> {
  [K: string]: {
    /** Returns the raw content of the prompt */
    raw: string;
    /** Returns the current version of the prompt */
    version: string;
    /**
     * Formats the prompt with given inputs
     * @param inputs Object containing the required parameters
     */
    format(inputs: IPromptInput): string;
  };
}

/**
 * Defines the structure and behavior of the importable Prompt Manager library.
 */
interface IPromptManagerLibrary<TInput extends IPromptInput<any> = IPromptInput<any>, TOutput extends IPromptOutput<any> = IPromptOutput<any>> {
  /**
   * Asynchronously initializes the Prompt Manager.
   * This must be called before using any other methods.
   */
  initialize(props: {}): Promise<void>;

  /**
   * Load all prompts from the file system.
   */
  loadPrompts(): Promise<void>;

  /**
   * Retrieves a specific prompt.
   * @param props An object containing the category and name of the prompt
   */
  getPrompt(props: { category: string; name: string }): IPrompt<IPromptInput, IPromptOutput>;

  /**
   * Creates a new prompt.
   * @param props An object containing the prompt to create
   */
  createPrompt(props: { prompt: Omit<IPrompt<IPromptInput, IPromptOutput>, 'versions'> }): Promise<void>;

  /**
   * Updates an existing prompt.
   * @param props An object containing the category, name of the prompt to update and the updates
   */
  updatePrompt(props: {
    category: string;
    name: string;
    updates: Partial<IPrompt<IPromptInput, IPromptOutput>>;
  }): Promise<void>;

  /**
   * Deletes a prompt.
   * @param props An object containing the category and name of the prompt to delete
   */
  deletePrompt(props: { category: string; name: string }): Promise<void>;

  /**
   * Lists all available prompts.
   * @param props An object containing an optional category to filter prompts
   */
  listPrompts(props: { category?: string }): Promise<IPromptModel<IPromptInput, IPromptOutput>[]>;

  /**
   * Manages versions of a prompt.
   * @param props An object containing the version management action, category, prompt name, and optional version
   */
  versionPrompt(props: {
    action: 'list' | 'create' | 'switch';
    category: string;
    name: string;
    version?: string;
  }): Promise<void>;

  /**
   * Formats a prompt with given parameters.
   * @param props An object containing the category, prompt name, and parameters
   */
  formatPrompt(props: {
    category: string;
    name: string;
    params: Record<string, any>;
  }): string;

  /**
   * Access to prompt categories.
   * This allows for dynamic access to categories and prompts.
   */
  categories: {
    [category: string]: IPromptCategory<Record<string, IPrompt<IPromptInput, IPromptOutput>>>;
  };

  /**
   * Checks if a prompt exists.
   * @param props An object containing the category and name of the prompt
   */
  promptExists(props: { category: string; name: string }): Promise<boolean>;

  /**
   * Creates a new category.
   * @param categoryName The name of the category to create
   */
  createCategory(categoryName: string): Promise<void>;

  /**
   * Deletes a category.
   * @param categoryName The name of the category to delete
   */
  deleteCategory(categoryName: string): Promise<void>;

  /**
   * Lists all categories.
   */
  listCategories(): Promise<string[]>;

  /**
   * Executes a prompt with given parameters.
   * @param props An object containing the category, prompt name, and parameters
   */
  executePrompt(props: { category: string; name: string; params: TInput }): Promise<TOutput>;
}

// Export the interfaces so they can be imported and used in other parts of the project
interface IPromptFileSystem {

  /**
   * Checks if the PromptFileSystem has been initialized.
   * @returns A boolean indicating whether the PromptFileSystem is initialized.
   */
  isInitialized(): boolean;

  /**
   * Gets the file path for a prompt.
   * @param props An object containing the category and name of the prompt.
   * @returns The file path for the prompt.
   */
  getFilePath(props: { category: string; promptName: string }): string;

  /**
   * Gets the file path for a specific version of a prompt.
   * @param props An object containing the category, name, and version of the prompt.
   * @returns The file path for the specific version of the prompt.
   */
  getVersionFilePath(props: { category: string; promptName: string; version: string }): string;

  /**
   * Saves a prompt to the file system.
   * @param props An object containing the prompt data to be saved.
   * @returns A promise that resolves when the prompt is saved.
   */
  savePrompt(props: { promptData: IPrompt<IPromptInput, IPromptOutput> }): Promise<void>;

  /**
   * Loads a prompt from the file system.
   * @param props An object containing the category and name of the prompt to load.
   * @returns A promise that resolves with the loaded prompt data.
   */
  loadPrompt(props: { category: string; promptName: string }): Promise<IPrompt<IPromptInput, IPromptOutput>>;

  /**
   * Deletes a prompt from the file system.
   * @param props An object containing the category and name of the prompt to delete.
   * @returns A promise that resolves when the prompt is deleted.
   */
  deletePrompt(props: { category: string; promptName: string }): Promise<void>;

  /**
   * Checks if a prompt exists in the file system.
   * @param props An object containing the category and name of the prompt to check.
   * @returns A promise that resolves with a boolean indicating if the prompt exists.
   */
  promptExists(props: { category: string; promptName: string }): Promise<boolean>;

  /**
   * Lists all prompts, optionally filtered by category.
   * @param props An object containing an optional category to filter prompts.
   * @returns A promise that resolves with an array of prompt names.
   */
  listPrompts(props?: { category?: string }): Promise<Array<IPromptModel>>;

  /**
   * Lists all categories in the file system.
   * @returns A promise that resolves with an array of category names.
   */
  listCategories(): Promise<string[]>;

  /**
   * Searches for prompts based on a query string.
   * @param props An object containing the search query.
   * @returns A promise that resolves with an array of objects containing category and name of matching prompts.
   */
  searchPrompts(props: { query: string }): Promise<Array<IPromptModel>>;

  /**
   * Searches for categories based on a query string.
   * @param props An object containing the search query.
   * @returns A promise that resolves with an array of matching category names.
   */
  searchCategories(props: { query: string }): Promise<string[]>;

  /**
   * Retrieves all versions of a specific prompt.
   * @param props An object containing the category and name of the prompt.
   * @returns A promise that resolves with an array of version strings.
   */
  getPromptVersions(props: { category: string; promptName: string }): Promise<string[]>;

  /**
   * Renames a prompt in the file system.
   * @param props An object containing the current category and name, and the new category and name.
   * @returns A promise that resolves when the prompt is renamed.
   */
  renamePrompt(props: {
    currentCategory: string;
    currentName: string;
    newCategory: string;
    newName: string
  }): Promise<void>;

  /**
   * Creates a new category in the file system.
   * @param props An object containing the name of the new category.
   * @returns A promise that resolves when the category is created.
   */
  createCategory(props: { categoryName: string }): Promise<void>;

  /**
   * Deletes a category and all its prompts from the file system.
   * @param props An object containing the name of the category to delete.
   * @returns A promise that resolves when the category and its prompts are deleted.
   */
  deleteCategory(props: { categoryName: string }): Promise<void>;

  /**
   * Loads a specific version of a prompt from the file system.
   * @param props An object containing the category, name, and version of the prompt to load.
   * @returns A promise that resolves with the loaded prompt data for the specified version.
   */
  loadPromptVersion(props: { category: string; promptName: string; version: string }): Promise<IPrompt<IPromptInput, IPromptOutput>>;
  getCurrentVersion(prompt: IPrompt<IPromptInput, IPromptOutput>): Promise<string>;
}

/**
 * Interface for managing the project configuration for the Prompt Manager.
 */
interface IPromptProjectConfigManager {

  /**
   * Checks if the configuration manager has been initialized.
   * @returns A boolean indicating whether the configuration manager is initialized.
   */
  isInitialized(): Promise<boolean>;

  /**
   * Retrieves the entire configuration object.
   * @returns The complete configuration object.
   */
  getAllConfig(): Config;

  /**
   * Retrieves a specific configuration value.
   * @param key The configuration key to retrieve.
   * @returns The value of the specified configuration key.
   */
  getConfig<K extends keyof Config>(key: K): Config[K];

  /**
   * Updates the configuration with new values.
   * @param newConfig Partial configuration object with updated values.
   */
  updateConfig(newConfig: Partial<Config>): Promise<void>;

  /**
   * Retrieves the base path for the project.
   * @returns The base path string.
   */
  getBasePath(): string;

  /**
   * Sets the verbosity level for the configuration manager.
   * @param level The verbosity level to set.
   */
  setVerbosity(level: number): void;

  /**
   * Gets the current verbosity level.
   * @returns The current verbosity level.
   */
  getVerbosity(): number;
}

export type {
  IAsyncIterableStream,
  IPromptInput,
  IPromptOutput,
  IPrompt,
  IPromptManagerCLI,
  IPromptCategory,
  IPromptManagerLibrary,
  IPromptFileSystem,
  IPromptProjectConfigManager
};

export interface IPromptManagerClientGenerator {
  generateClient(): Promise<void>;
  detectChanges(): Promise<boolean>;
}

export interface IPromptsFolderConfig {
  version: string;
  lastUpdated: string;
  promptCount: number;
}

```

## src/cli/PromptManagerUI.tsx

**Description:** No description available

```typescript
import React, { FC, useEffect } from "react";
import chalk from "chalk";
import { Box, Text, useApp, useInput } from "ink";
import { useAtom } from "jotai";
import Layout from "./components/ui/Layout";
import { logger } from "../utils/logger";
import { currentScreenAtom, selectedPromptAtom } from "./atoms";
import Footer from "./components/ui/Footer";
import Header from "./components/ui/Header";
import AlertMessage from "./components/ui/AlertMessage";
import HomeScreen from "./screens/HomeScreen";
import PromptCreateScreen from "./screens/PromptCreateScreen";
import PromptDetailScreen from "./screens/PromptDetailScreen";
import PromptListScreen from "./screens/PromptListScreen";
import StatusScreen from "./screens/StatusScreen";
import HelpScreen from "./screens/HelpScreen";
import PromptAmendScreen from "./screens/PromptAmendScreen";
import { clear } from "console";
import PromptImportScreen from "./screens/PromptImportScreen";
import PromptEvaluationScreen from "./screens/PromptEvaluationScreen";
import PromptGenerateScreen from "./screens/PromptGenerateScreen";

const PromptManagerUI: FC = () => {
  const { exit } = useApp();
  const [currentScreen, setCurrentScreen] = useAtom(currentScreenAtom);
  const [selectedPrompt] = useAtom(selectedPromptAtom);

  useEffect(() => {
    const cleanup = () => {
      logger.info("Cleaning up...");
    };
    return cleanup;
  }, []);

  useEffect(() => {
    // Clear the screen when the current screen changes
    clear();
  }, [currentScreen]);

  useInput((input, key) => {
    if (key.escape) {
      if (currentScreen !== "home") {
        setCurrentScreen("home");
      } else {
        exit();
      }
    }
  });

  const screenComponents = {
    home: <HomeScreen onNavigate={setCurrentScreen} />,
    list: <PromptListScreen />,
    detail: selectedPrompt ? (
      <PromptDetailScreen
        prompt={selectedPrompt}
        onBack={() => setCurrentScreen("list")}
      />
    ) : (
      <Text>No prompt selected. Please select a prompt from the list.</Text>
    ),
    create: <PromptCreateScreen />,
    status: <StatusScreen />,
    help: <HelpScreen />,
    amend: <PromptAmendScreen />,
    import: <PromptImportScreen />,
    evaluate: selectedPrompt ? (
      <PromptEvaluationScreen
        prompt={selectedPrompt}
        onBack={() => setCurrentScreen("detail")}
      />
    ) : (
      <Text>No prompt selected. Please select a prompt from the list.</Text>
    ),
    generate: <PromptGenerateScreen />,
  };

  const renderScreen = () =>
    screenComponents[currentScreen as keyof typeof screenComponents] ?? (
      <Text>Screen not found</Text>
    );

  return (
    <Layout>
      <Header title={`Prompt Manager - ${chalk.green(currentScreen)}`} />
      <Box flexGrow={1} flexDirection="column">
        {renderScreen()}
      </Box>
      <Footer>
        <Text>Press 'Esc' to go back, 'q' to quit</Text>
      </Footer>
    </Layout>
  );
};

export default PromptManagerUI;

```

## src/cli/screens/HomeScreen.tsx

**Description:** No description available

```typescript
import React, { FC } from "react";
import { Box, Text } from "ink";
import { ScreenWrapper } from "../components/utils/ScreenWrapper";
import { PaginatedList } from "../components/utils/PaginatedList";
import { THEME_COLORS } from "../uiConfig";

interface HomeScreenProps {
  onNavigate?: (screen: string) => void;
}

const menuItems = [
  { key: "l", name: "List Prompts", screen: "list" },
  { key: "c", name: "Create New Prompt", screen: "create" },
  { key: "s", name: "Status", screen: "status" },
  { key: "h", name: "Help", screen: "help" },
  { key: "a", name: "Amend Prompt", screen: "amend" }, // Added
  { key: "i", name: "Import Prompt", screen: "import" }, // Added
  { key: "e", name: "Evaluate Prompt", screen: "evaluate" }, // Added
  { key: "g", name: "Generate Prompt", screen: "generate" }, // Added
  { key: "q", name: "Quit", screen: "quit" },
];

const HomeScreen: FC<HomeScreenProps> = ({ onNavigate }) => {
  const handleSelectItem = (item: typeof menuItems[0]) => {
    if (item.screen === "quit") {
      process.exit(0);
    } else {
      void onNavigate?.(item.screen);
    }
  };

  const renderMenuItem = (item: typeof menuItems[0], index: number, isSelected: boolean) => (
    <Box>
      <Text color={isSelected ? THEME_COLORS.primary : THEME_COLORS.text}>
        {item.key}: {item.name}
      </Text>
    </Box>
  );

  return (
    <ScreenWrapper title="Welcome to Prompt Manager">
      <Box flexDirection="column">
        <Text bold>Welcome to Prompt Manager</Text>
        <Text>Use arrow keys to navigate, Enter to select</Text>
        <PaginatedList
          items={menuItems}
          itemsPerPage={menuItems.length}
          renderItem={renderMenuItem}
          onSelectItem={handleSelectItem}
        />
      </Box>
    </ScreenWrapper>
  );
};

export default HomeScreen;

```

## src/PromptManagerClientGenerator.ts

**Description:** No description available

```typescript
import fs from 'fs/promises';
import path from 'path';
import { PromptFileSystem } from './promptFileSystem';
import { PromptProjectConfigManager } from './config/PromptProjectConfigManager';
import { Container } from 'typedi';
import { logger } from './utils/logger';

const fileSystem = Container.get(PromptFileSystem);
const configManager = Container.get(PromptProjectConfigManager);

export class PromptManagerClientGenerator {
  private outputPath: string;

  constructor() {
    this.outputPath = path.join(configManager.getConfig('promptsDir'), '..', 'client.ts');
  }

  async generateClient(): Promise<void> {
    const categories = await fileSystem.listCategories();
    let clientCode = this.generateClientHeader();

    for (const category of categories) {
      const prompts = await fileSystem.listPrompts({ category });
      clientCode += this.generateCategoryCode(category, prompts.map(p => p.name));
    }

    clientCode += this.generateClientFooter();
    await this.writeClientFile(clientCode);
  }

  private generateClientHeader(): string {
    return `
import { IPromptManagerLibrary, IPrompt, IPromptInput, IPromptOutput } from './types/interfaces';
import { PromptFileSystem } from './promptFileSystem';

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

  async getPrompt(props: { category: string; name: string }): Promise<IPrompt<IPromptInput, IPromptOutput>> {
    return this.promptManager.getPrompt(props);
  }

  // Implement other IPromptManagerLibrary methods here

  categories: Record<string, Record<string, {
    format: (inputs: Record<string, any>) => Promise<string>;
    execute: (inputs: Record<string, any>) => Promise<Record<string, any>>;
    stream: (inputs: Record<string, any>) => Promise<IAsyncIterableStream<string>>;
    description: string;
    version: string;
  }>> = {
`;
  }

  private generateCategoryCode(category: string, prompts: string[]): string {
    let categoryCode = `    ${category}: {\n`;
    for (const prompt of prompts) {
      categoryCode += `      ${prompt}: {\n`;
      categoryCode += `        raw: async () => (await promptManager.getPrompt({ category: '${category}', name: '${prompt}' })).template,\n`;
      categoryCode += `        version: async () => (await promptManager.getPrompt({ category: '${category}', name: '${prompt}' })).version,\n`;
      categoryCode += `        format: async (inputs: Record<string, any>) => {\n`;
      categoryCode += `          const prompt = await promptManager.getPrompt({ category: '${category}', name: '${prompt}' });\n`;
      categoryCode += `          return prompt.template.replace(/\\{(\\w+)\\}/g, (_, key) => inputs[key] ?? '');\n`;
      categoryCode += `        },\n`;
      categoryCode += `      },\n`;
    }
    categoryCode += `    },\n`;
    return categoryCode;
  }

  private generateClientFooter(): string {
    return `  };
}

export const promptManager = new PromptManagerClient();
`;
  }

  private async writeClientFile(content: string): Promise<void> {
    await fs.writeFile(this.outputPath, content, 'utf8');
    logger.success(`Client file generated at ${this.outputPath}`);
  }

  async detectChanges(): Promise<boolean> {
    try {
      const currentContent = await fs.readFile(this.outputPath, 'utf8');
      const newContent = await this.generateClientContent();
      return currentContent !== newContent;
    } catch (error) {
      // If file doesn't exist, changes are needed
      return true;
    }
  }

  private async generateClientContent(): Promise<string> {
    const categories = await fileSystem.listCategories();
    let clientCode = this.generateClientHeader();

    for (const category of categories) {
      const prompts = await fileSystem.listPrompts({ category });
      clientCode += this.generateCategoryCode(category, prompts.map(p => p.name));
    }

    clientCode += this.generateClientFooter();
    return clientCode;
  }
}

```

## src/cli/aiHelpers.ts

**Description:** No description available

```typescript
import { generateObject, generateText, streamText } from "ai";

import { PromptSchema } from "../schemas/prompts";
import chalk from "chalk";
import { logger } from "../utils/logger";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";

/**
 * Pretty prints the given prompt to the console with color-coded output.
 *
 * @param prompt The prompt object to be printed
 */
export function prettyPrintPrompt(prompt: any): string {
  let output = '';
  output += chalk.bold.underline("\nGenerated Prompt:\n");
  output += chalk.cyan("Name: ") + prompt.name.toUpperCase().replace(/ /g, "_") + "\n";
  output += chalk.magenta("Category: ") + prompt.category.replace(/ /g, "") + "\n";
  output += chalk.yellow("Description: ") + prompt.description + "\n";
  output += chalk.green("Template:\n") + prompt.template + "\n";
  output += chalk.blue("Output Type: ") + prompt.outputType + "\n";
  if (prompt.tags && prompt.tags.length > 0) {
    output += chalk.red("Tags: ") + prompt.tags.join(", ") + "\n";
  }
  output += chalk.gray("\nInput Schema:\n");
  output += JSON.stringify(prompt.inputSchema, null, 2) + "\n";
  output += chalk.gray("\nOutput Schema:\n");
  output += JSON.stringify(prompt.outputSchema, null, 2) + "\n";
  return output;
}

/**
 * Generates a prompt using AI based on the given description.
 *
 * @param description A string describing the desired prompt
 * @returns A Promise that resolves to the generated prompt object
 */
export async function generatePromptWithAI(description: string): Promise<any> {
  const { object } = await generateObject({
    model: openai("gpt-4o-mini"),
    schema: PromptSchema,
    prompt: `Generate a prompt based on the following description: ${description}`,
  });

  return object;
}

export async function updatePromptWithAI({
  currentPrompt,
  instruction,
  updateTemplate = true,
  updateInputSchema = true,
  updateOutputSchema = true,
}: {
  currentPrompt: any;
  instruction: string;
  updateTemplate?: boolean;
  updateInputSchema?: boolean;
  updateOutputSchema?: boolean;
}): Promise<any> {
  const { object } = await generateObject({
    model: openai("gpt-4o-mini"),
    schema: PromptSchema,
    prompt: `Update the following prompt based on this instruction: ${instruction}
    ${updateTemplate ? 'Update the template.' : 'Do not change the template.'}
    ${updateInputSchema ? 'Update the input schema.' : 'Do not change the input schema.'}
    ${updateOutputSchema ? 'Update the output schema.' : 'Do not change the output schema.'}
    \n\nCurrent prompt:\n${JSON.stringify(currentPrompt, null, 2)}`,
  });

  if (!updateTemplate) {
    object.template = currentPrompt.template;
  }
  if (!updateInputSchema) {
    object.inputSchema = currentPrompt.inputSchema;
  }
  if (!updateOutputSchema) {
    object.outputSchema = currentPrompt.outputSchema;
  }

  return object;
}

/**
 * Generates auto-completion suggestions based on the given input and context.
 *
 * @param input The current user input
 * @param context Additional context to guide the AI
 * @returns A Promise that resolves to a string with auto-completion suggestions
 */
export async function generateAutoComplete({ input, context }: { input: string, context: string }): Promise<string> {
  const { text } = await generateText({
    model: openai("gpt-4o-mini"),
    prompt: `Given the following user input and context, provide a short auto-completion suggestion (max 50 tokens):
    
    Context: ${context}
    
    User input: ${input}
    
    Auto-completion (include the input text in the suggestion):

    Examples:
    Context: Writing a greeting email
    User input: Hi John,
    Auto-completion: Hi John, I hope this email finds you well. I wanted to discuss...

    Context: Coding a function
    User input: function add(a, b) {
    Auto-completion: function add(a, b) { return a + b; }

    Context: ${context}
    User input: ${input}
    Auto-completion:`,
    maxTokens: 50,
  });

  return text;
}

/**
 * Generates and validates test input data for a given prompt.
 *
 * @param prompt The prompt object containing input schema
 * @returns A Promise that resolves to the generated and validated test input data
 */
export async function generateTestInputData(prompt: any): Promise<any> {
  const { object } = await generateObject({
    model: openai("gpt-4o-mini"),
    schema: prompt.inputSchema,
    prompt: `Generate test input data for the following prompt:
    
    ${JSON.stringify(prompt, null, 2)}
    
    Ensure that the generated data adheres to the input schema.`,
  });

  // Validate the generated test input data
  try {
    const validationResult = PromptSchema.parse(object);
    return validationResult;
  } catch (error) {
    console.error("Generated test input data failed validation:", error);
    throw new Error("Failed to generate valid test input data");
  }
}

/**
 * Evaluates a prompt using AI and provides actionable advice.
 *
 * @param prompt The prompt object to evaluate
 * @returns A Promise that resolves to an evaluation object with scores and advice
 */
export async function evaluatePrompt(prompt: any): Promise<any> {
  const evaluationSchema = z.object({
    clarity: z.number().min(1).max(10),
    specificity: z.number().min(1).max(10),
    relevance: z.number().min(1).max(10),
    completeness: z.number().min(1).max(10),
    actionableAdvice: z.array(z.string()).min(3).max(5),
  });


  const { object } = await generateObject({
    model: openai("gpt-4o-mini"),
    schema: evaluationSchema,
    prompt: `Evaluate the following prompt and provide scores (1-10) for clarity, specificity, relevance, and completeness. Also, provide 3-5 actionable pieces of advice for improvement:
    
    ${JSON.stringify(prompt, null, 2)}`,
  });

  return object;
}


export async function generateUpdatedPrompt(currentPrompt: any, selectedAdvice: string): Promise<any> {
  const { object } = await generateObject({
    model: openai("gpt-4o-mini"),
    schema: PromptSchema,
    prompt: `Update the following prompt based on this advice: ${selectedAdvice}
    
    Current prompt:
    ${JSON.stringify(currentPrompt, null, 2)}
    
    Please provide an updated version of the prompt, focusing on improving the template and any relevant schemas.`,
  });

  return object;
}

```

## src/schemas/prompts.ts

**Description:** No description available

```typescript
import { z } from 'zod';
import type { JSONSchema7 } from 'json-schema';

export const PromptSchema = z.object({
    name: z.string().describe('Unique identifier for the prompt'),
    category: z.string().describe('Category the prompt belongs to'),
    description: z.string().describe('Brief description of the prompt\'s purpose'),
    version: z.string().describe('Version of the prompt'),
    template: z.string().describe('The actual content of the prompt'),
    parameters: z.array(z.string()).describe('List of parameter names expected by the prompt'),
    metadata: z.object({
        created: z.string(),
        lastModified: z.string()
    }).describe('Metadata associated with the prompt'),
    outputType: z.enum(['structured', 'plain']).describe('Type of output expected from the model'),
    defaultModelName: z.string().optional().describe('Default model name to use for this prompt'),
    compatibleModels: z.array(z.string()).optional().describe('Optional list of models that can be used with this prompt'),
    tags: z.array(z.string()).optional().describe('Optional list of tags or keywords associated with this prompt'),
    inputSchema: z.any().describe('JSON Schema defining the structure of the input expected by the prompt'),
    outputSchema: z.any().describe('JSON Schema defining the structure of the output produced by the prompt'),
    configuration: z.object({
        modelName: z.string(),
        temperature: z.number(),
        maxTokens: z.number(),
        topP: z.number(),
        frequencyPenalty: z.number(),
        presencePenalty: z.number(),
        stopSequences: z.array(z.string())
    }).describe('Configuration for the AI model'),
});

export type IPrompt<TInput = any, TOutput = any> = z.infer<typeof PromptSchema>;

```

## src/utils/typeGeneration.ts

**Description:** No description available

```typescript
import { JSONSchema7 } from 'json-schema';
import { jsonSchemaToZod } from "json-schema-to-zod";
import { format } from 'prettier';
import jsf from 'json-schema-faker';
import { IPrompt } from '../types/interfaces';
import { cleanName } from './promptManagerUtils';
import { zodToTs } from 'zod-to-ts';

export interface SchemaAndType {
    formattedSchemaTs: string;
    formattedSchemaTsNoImports: string;
}

/**
 * Generates TypeScript types from a JSON schema and formats them.
 * 
 * @param {Object} params - The parameters.
 * @param {JSONSchema7} params.schema - The JSON schema.
 * @param {string} params.name - The name for the generated type.
 * @returns {Promise<SchemaAndType>} The formatted TypeScript types.
 * 
 * @example
 * const schema = { type: "object", properties: { name: { type: "string" } } };
 * const result = await generateExportableSchemaAndType({ schema, name: "MyType" });
 * console.log(result.formattedSchemaTs);
 * // Output: "export const MyType = z.object({ name: z.string() });"
 */
export async function generateExportableSchemaAndType({ schema, name }: { schema: JSONSchema7, name: string }): Promise<SchemaAndType> {
    const zodSchemaString = jsonSchemaToZod(schema, { module: "esm", name: name, type: true });
    const formatted = await format(zodSchemaString, { parser: "typescript" });
    const zodSchemaNoImports = formatted.replace(/import { z } from "zod";/g, "");
    return {
        formattedSchemaTs: zodSchemaNoImports,
        formattedSchemaTsNoImports: zodSchemaNoImports
    };
}

/**
 * Generates TypeScript interfaces for a given prompt.
 * 
 * @param {IPrompt<any, any>} prompt - The prompt object containing input and output schemas.
 * @returns {Promise<string>} The generated TypeScript content.
 * 
 * @example
 * const prompt = { name: "ExamplePrompt", inputSchema: { type: "object", properties: { input: { type: "string" } } }, outputSchema: { type: "object", properties: { output: { type: "string" } } } };
 * const result = await generatePromptTypeScript(prompt);
 * console.log(result);
 * // Output:
 * // import {z} from "zod";
 * // export interface ExamplePromptInput { input: string; }
 * // export interface ExamplePromptOutput { output: string; }
 */
export async function generatePromptTypeScript(prompt: IPrompt<any, any>): Promise<string> {
    const inputTypes = await generateExportableSchemaAndType({
        schema: prompt.inputSchema, name: `${cleanName(prompt.category)}${cleanName(prompt.name)}Input`
    });
    const outputTypes = await generateExportableSchemaAndType({
        schema: prompt.outputSchema, name: `${cleanName(prompt.category)}${cleanName(prompt.name)}Output`
    });
    const content = `import { z } from "zod";
import { IAsyncIterableStream } from "../types/interfaces";

${inputTypes.formattedSchemaTsNoImports}

${outputTypes.formattedSchemaTsNoImports}

export interface ${cleanName(prompt.category)}${cleanName(prompt.name)}Prompt {
  format: (inputs: ${cleanName(prompt.category)}${cleanName(prompt.name)}Input) => Promise<string>;
  execute: (inputs: ${cleanName(prompt.category)}${cleanName(prompt.name)}Input) => Promise<${cleanName(prompt.category)}${cleanName(prompt.name)}Output>;
  stream: (inputs: ${cleanName(prompt.category)}${cleanName(prompt.name)}Input) => Promise<IAsyncIterableStream<string>>;
  description: string;
  version: string;
}
`;

    return content;
}

export async function generatePromptTypescriptDefinition(prompt: IPrompt<any, any>): Promise<string> {
    const zodInputSchema = eval(jsonSchemaToZod(prompt.inputSchema, { module: "esm" }));
    const inputDef = zodToTs(zodInputSchema, `${cleanName(prompt.name)}Input`)
    const zodOutputSchema = eval(jsonSchemaToZod(prompt.outputSchema, { module: "esm" }));
    const outputDef = zodToTs(zodOutputSchema, `${cleanName(prompt.name)}Output`)
    return `${inputDef}\n\n${outputDef}`
}

/**
 * Generates test inputs based on a JSON schema.
 * 
 * @param {JSONSchema7} schema - The JSON schema.
 * @param {number} [count=5] - The number of test inputs to generate.
 * @returns {any[]} The generated test inputs.
 * 
 * @example
 * const schema = { type: "object", properties: { name: { type: "string" } } };
 * const testInputs = generateTestInputs(schema, 3);
 * console.log(testInputs);
 * // Output: [{ name: "John Doe" }, { name: "Jane Doe" }, { name: "Jim Doe" }]
 */
export function generateTestInputs(schema: JSONSchema7, count: number = 5): any[] {
    jsf.option({
        alwaysFakeOptionals: true,
        useDefaultValue: true,
    });
    
    const testInputs = [];
    for (let i = 0; i < count; i++) {
        testInputs.push(jsf.generate(schema));
    }
    return testInputs;
}

```

