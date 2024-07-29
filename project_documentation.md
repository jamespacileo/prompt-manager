# Project Documentation

## Project Structure

```
./src
├── PromptManagerClientGenerator.ts
├── cli
│   ├── aiHelpers.ts
│   ├── cli.ts
│   ├── cli_generate.ts
│   └── commands.ts
├── config
│   ├── PromptProjectConfigManager.ts
│   └── constants.ts
├── config.ts
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
├── types
│   ├── index.ts
│   └── interfaces.ts
└── utils
    ├── __snapshots__
    ├── cache.ts
    ├── fileUtils.ts
    ├── jsonSchemaToZod.ts
    ├── promptManagerUtils.ts
    ├── typeGeneration.test.ts
    ├── typeGeneration.ts
    └── versionUtils.ts

9 directories, 29 files
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

@Service()
export class PromptManager<
  TInput extends IPromptInput<Record<string, any>> = IPromptInput<Record<string, any>>,
  TOutput extends IPromptOutput<Record<string, any> & string> = IPromptOutput<Record<string, any> & string>
> {
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
    } catch (error) {
      console.error('Failed to initialize PromptManager:', error);
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
    console.log(`Loading prompts from ${this.configManager.getPromptsDir()}`);
    // check if the prompts directory exists
    if (!fs.existsSync(this.configManager.getPromptsDir())) {
      console.log(`Prompts directory does not exist, creating it`);
      await fs.mkdir(this.configManager.getPromptsDir(), { recursive: true });
    }
    try {
      const prompts = await this.fileSystem.listPrompts();
      for (const prompt of prompts) {
        if (!prompt.category) {
          console.error(`Skipping malformed prompt without category: ${prompt.name}`);
          continue;
        }
        if (!this.prompts[prompt.category]) {
          this.prompts[prompt.category] = {};
        }
        try {
          const promptData = await this.fileSystem.loadPrompt({ category: prompt.category, promptName: prompt.name });
          this.prompts[prompt.category][prompt.name] = new PromptModel(promptData) as unknown as PromptModel<TInput, TOutput>;
        } catch (error) {
          console.error(`Failed to load prompt ${prompt.category}/${prompt.name}:`, error);
          // Continue loading other prompts even if one fails
        }
      }
    } catch (error) {
      console.error('Failed to load prompts:', error);
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

  /**
   * Create a new prompt and save it to the file system.
   * Purpose: Add a new prompt to the manager and persist it for future use.
   */
  async createPrompt(props: { prompt: Omit<IPrompt<IPromptInput, IPromptOutput>, 'versions'> }): Promise<void> {
    const { prompt } = props;
    validateCategoryAndName(prompt.category, prompt.name);

    if (!this.prompts[prompt.category]) {
      this.prompts[prompt.category] = {};
      console.log(`Created new category: ${prompt.category}`);
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
    console.log(`Created new prompt "${prompt.name}" in category "${prompt.category}" with TypeScript definitions.`);
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

    console.log('prompts', prompts);

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
    this.metadata = promptData.metadata || { created: new Date().toISOString(), lastModified: new Date().toISOString() };
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
      console.error(`Input validation error for prompt "${this.name}":`, error);
      console.error(`This could be because:
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
      console.error('Output validation error:', error);
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
      console.error('Error streaming prompt:', error);
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
      console.error('Error executing prompt:', error);
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

  async load(filePath: string): Promise<void> {
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
      console.info(`Rolled back prompt ${this.name} to version ${version}`);
    } catch (error) {
      console.error(`Failed to rollback prompt ${this.name} to version ${version}: ${error}`);
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
import debug from 'debug';

// const log = debug('fury:promptFileSystem');
import { PromptSchema } from './schemas/prompts';
import { PromptModel } from './promptModel';
import chalk from 'chalk';
import { z } from 'zod';
import lockfile from 'proper-lockfile';

export const DEFAULT_PROMPT_FILENAME = "prompt.json";
export const DEFAULT_TYPE_DEFINITION_FILENAME = "prompt.d.ts";
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
    console.log(`PromptFileSystem constructor called with basePath: ${basePath} and promptsDir: ${promptsDir}`);
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
    return path.join(this.getPromptsDir(), category, promptName, DEFAULT_PROMPT_FILENAME);
  }

  getVersionFilePath(props: { category: string; promptName: string; version: string }): string {
    const { category, promptName, version } = props;
    return path.join(this.getPromptsDir(), category, promptName, '.versions', `v${version}.json`);
  }

  private getCategoryDir(props: { category: string }): string {
    const { category } = props;
    return path.join(this.getPromptsDir(), category);
  }

  private getPromptDir(props: { category: string; promptName: string }): string {
    const { category, promptName } = props;
    return path.join(this.getPromptsDir(), category, promptName);
  }

  private getVersionsDir(props: { category: string; promptName: string }): string {
    const { category, promptName } = props;
    return path.join(this.getPromptDir({ category, promptName }), '.versions');
  }

  private getTypeDefinitionPath(props: { category: string; promptName: string }): string {
    const { category, promptName } = props;
    return path.join(this.getPromptDir({ category, promptName }), DEFAULT_TYPE_DEFINITION_FILENAME);
  }

  private getVersionsFilePath(props: { category: string; promptName: string }): string {
    const { category, promptName } = props;
    return path.join(this.getVersionsDir({ category, promptName }), 'versions.json');
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;
    const basePath = this.configManager.getBasePath();
    try {
      console.log(`Initializing PromptFileSystem with basePath: ${basePath}`);

      await fs.access(basePath);
      const stats = await fs.stat(basePath);
      if (!stats.isDirectory()) {
        throw new Error(`${basePath} is not a directory`);
      }

      await fs.mkdir(basePath, { recursive: true });
      await this.initializePromptsFolderConfig();
      const isValid = await this.validatePromptsFolderConfig();
      if (!isValid) {
        console.log('Prompts folder configuration is invalid. Reinitializing...');
        await this.initializePromptsFolderConfig();
      }
      this.initialized = true;
      console.log('PromptFileSystem initialization complete');
    } catch (error) {
      console.error('PromptFileSystem initialization failed:', error);
      throw new Error('Failed to initialize PromptFileSystem. Please check your configuration and try again.');
    }
  }

  private async initializePromptsFolderConfig(): Promise<void> {
    const configPath = this.configManager.getProjectConfigPath();
    try {
      await fs.access(configPath);
      console.log(chalk.green('✔ Prompts folder configuration already exists'));
    } catch (error) {
      console.log(chalk.yellow('⚠ Prompts folder configuration not found. Creating a new one...'));
      const initialConfig: IPromptsFolderConfig = {
        version: "1.0.0",
        lastUpdated: new Date().toISOString(),
        promptCount: 0
      };
      await fs.writeFile(configPath, JSON.stringify(initialConfig, null, 2));
      console.log(chalk.green('✔ Created new prompts folder configuration'));
    }
  }

  async validatePromptsFolderConfig(): Promise<boolean> {
    // const configPath = path.join(this.getBasePath(), DEFAULT_PROMPTS_FOLDER_CONFIG_FILENAME);
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
        console.log(chalk.green('✔ Prompts folder configuration is valid'));
      } else {
        console.warn(chalk.yellow('⚠ Invalid prompts folder configuration detected'));
      }
      return isValid;
    } catch (error) {
      console.error(chalk.red('Error validating prompts folder configuration:'), error);
      console.warn(chalk.yellow('Possible reasons for invalid prompts folder configuration:'));
      console.warn(chalk.yellow('• The configuration file might be corrupted or manually edited incorrectly'));
      console.warn(chalk.yellow('• The configuration file might be missing required fields'));
      console.warn(chalk.yellow('Actions to take:'));
      console.warn(chalk.yellow('• Check the file contents and ensure it\'s valid JSON'));
      console.warn(chalk.yellow('• Ensure all required fields (version, lastUpdated, promptCount) are present'));
      console.warn(chalk.yellow('• If issues persist, try reinitializing the configuration file'));
      return false;
    }
  }

  private async updatePromptsFolderConfig(updates: Partial<IPromptsFolderConfig>): Promise<void> {
    const configPath = this.configManager.getProjectConfigPath();
    const currentConfig = await this.getPromptsFolderConfig();
    const updatedConfig = { ...currentConfig, ...updates, lastUpdated: new Date().toISOString() };
    console.debug(`Updating prompts folder configuration at ${configPath}`);
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

      console.debug(`Saving prompt to ${filePath}`);
      await fs.writeFile(filePath, JSON.stringify(validatedPromptData, null, 2));

      console.debug(`Saving prompt version to ${versionFilePath}`);
      await fs.writeFile(versionFilePath, JSON.stringify(validatedPromptData, null, 2));

      const typeDefinitionPath = this.getTypeDefinitionPath({ category: validatedPromptData.category, promptName: validatedPromptData.name });
      console.debug(`Generating type definition file at ${typeDefinitionPath}`);
      await this.generateTypeDefinitionFile(validatedPromptData, typeDefinitionPath);

      const versionsDir = this.getVersionsDir({ category: validatedPromptData.category, promptName: validatedPromptData.name });
      console.debug(`Creating versions directory at ${versionsDir}`);
      await fs.mkdir(versionsDir, { recursive: true });

      const versions = await this.getPromptVersions({ category: validatedPromptData.category, promptName: validatedPromptData.name });
      if (!versions.includes(validatedPromptData.version)) {
        versions.push(validatedPromptData.version);
        versions.sort((a, b) => this.compareVersions(b, a));
      }
      console.debug(`Writing versions to ${this.getVersionsFilePath({ category: validatedPromptData.category, promptName: validatedPromptData.name })}`);
      await fs.writeFile(this.getVersionsFilePath({ category: validatedPromptData.category, promptName: validatedPromptData.name }), JSON.stringify(versions, null, 2));

    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('ENOSPC')) {
          throw new Error(`Insufficient disk space to save prompt: ${filePath}`);
        } else if (error.message.includes('EACCES')) {
          throw new Error(`Insufficient permissions to save prompt: ${filePath}`);
        } else if (error.message.includes('EBUSY')) {
          throw new Error(`File is locked or in use: ${filePath}`);
        } else {
          console.error(`Failed to save prompt: ${filePath}. Error: ${error.message}`, error);
          throw new Error(`Failed to save prompt: ${filePath}. Error: ${error.message}`);
        }
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
    console.log(`Listing prompts. Category: ${category || 'All'}`);
    console.log(`Base path: ${this.getBasePath()}`);

    const categories = await this.listCategories();
    console.log(`Categories: ${categories}`);
    const prompts: PromptModel[] = [];

    for (const category of categories) {
      console.log(`Processing category: ${category}`);

      const categoryDir = this.getCategoryDir({ category });
      console.log(`Category directory: ${categoryDir}`);

      // lists all folders that contain a prompt.json file, where folder name of prompt is name
      const promptDirs = await fs.readdir(categoryDir, { withFileTypes: true });
      console.log(`Prompt directories: ${promptDirs}`);


      console.log(`Prompts in category ${category}: ${promptDirs.length}`);
      for (const prompt of promptDirs) {
        const promptFilePath = this.getFilePath({ category, promptName: prompt.name });
        console.log(`Prompt file path: ${promptFilePath}`);
        const promptData = await this.loadPrompt({ category, promptName: prompt.name });
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
    const inputType = this.generateTypeFromSchema(promptData.inputSchema, 'Input');
    const outputType = this.generateTypeFromSchema(promptData.outputSchema, 'Output');

    const content = `
export interface ${promptData.name}Input ${inputType}

export interface ${promptData.name}Output ${outputType}
`;

    await fs.writeFile(filePath, content.trim());
  }

  private generateTypeFromSchema(schema: any, typeName: string): string {
    if (schema.type === 'object' && schema.properties) {
      const properties = Object.entries(schema.properties)
        .map(([key, value]: [string, any]) => `  ${key}: ${this.getTypeFromSchemaProperty(value)};`)
        .join('\n');
      return `{\n${properties}\n}`;
    }
    return '{}';
  }

  private getTypeFromSchemaProperty(property: any): string {
    switch (property.type) {
      case 'string':
        return 'string';
      case 'number':
        return 'number';
      case 'boolean':
        return 'boolean';
      case 'array':
        return `${this.getTypeFromSchemaProperty(property.items)}[]`;
      case 'object':
        return this.generateTypeFromSchema(property, '');
      default:
        return 'any';
    }
  }
}

```

## src/config/PromptProjectConfigManager.ts

**Description:** Manages project configuration

```typescript
import { cosmiconfig, OptionsSync } from 'cosmiconfig';
import path from 'path';
import chalk from 'chalk';
import type { IPromptProjectConfigManager } from '../types/interfaces';
import debug from 'debug';
import { ensureDirectoryExists } from '../utils/fileUtils';
import { configSchema, DEFAULT_CONFIG, z } from '../schemas/config';
import type { Config } from '../schemas/config';
import { Service } from 'typedi';
import { fromError } from 'zod-validation-error';

const log = debug('fury:config');
const DEFAULT_PROMPTS_FOLDER_CONFIG_FILENAME = '.promptmanager.config.json';

export type { Config };

@Service()
export class PromptProjectConfigManager implements IPromptProjectConfigManager {
  private config: Config;
  private initialized: boolean = false;
  private explorer;
  private basePath: string;
  private configFilePath: string | undefined;

  constructor(

  ) {
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
      // Add these properties:
      mergeImportArrays: true,
      mergeSearchPlaces: true,
      searchStrategy: 'project',
    };
    this.explorer = cosmiconfig('promptmanager', explorerOptions);
    log(`Initializing PromptProjectConfigManager with basePath: ${this.basePath}`);
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
      console.warn(chalk.yellow('No configuration file found. Using default configuration.'));
      throw new Error('No configuration file found. Please set the configuration file in your project.');
    }
    return this.configFilePath; // || path.join(this.basePath, DEFAULT_PROMPTS_FOLDER_CONFIG_FILENAME);
  }

  public async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      await this.loadConfig();
      await this.ensureConfigDirectories();
      this.prettyPrintConfig();
      this.initialized = true;
    } catch (error: any) {
      console.error(chalk.red('Failed to initialize config:'), error.message);
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
        console.debug(`Found configuration file at ${result.filepath}`);
        this.configFilePath = result.filepath;
      } else {
        console.warn(chalk.yellow('No configuration file found. Using default configuration.'));
        this.config = { ...DEFAULT_CONFIG };
      }
      if (!this.configFilePath) {
        console.error(`No configuration file found at ${this.basePath}`);
        this.configFilePath = path.join(this.basePath, DEFAULT_PROMPTS_FOLDER_CONFIG_FILENAME);
      } else {
        console.debug(`😁😁😁 Configuration file found at ${this.configFilePath}`);
      }
      log('Configuration loaded successfully');
      log(`Prompts directory: ${this.config.promptsDir}`);
      log(`Output directory: ${this.config.outputDir}`);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const validationError = fromError(error);
        console.error(validationError.toString());
        console.error(chalk.red('Invalid configuration:'), error.errors);
        throw new Error(`Invalid configuration: ${error.message}`);
      } else {
        console.error(chalk.red('Error loading configuration:'), error);
        throw new Error('Failed to load configuration. Please check your configuration file.');
      }
    }
  }

  private async ensureConfigDirectories(): Promise<void> {
    try {
      await ensureDirectoryExists(this.config.promptsDir);
      console.log(chalk.green(`✔ Created prompts directory: ${this.config.promptsDir}`));
      await ensureDirectoryExists(this.config.outputDir);
      console.log(chalk.green(`✔ Created output directory: ${this.config.outputDir}`));
    } catch (error: any) {
      console.error(chalk.red('Error: Failed to create necessary directories.'));
      console.error(chalk.yellow('Please check that you have write permissions in the project directory.'));
      throw new Error(`Failed to create directories: ${error.message}`);
    }
  }

  private prettyPrintConfig(): void {
    if (this.config.verbosity > 99) {
      console.log(chalk.bold('\nLoaded Configuration:'));
      console.log(chalk.white('prompts_dir:      ') + chalk.cyan(this.config.promptsDir));
      console.log(chalk.white('output_dir:       ') + chalk.cyan(this.config.outputDir));
      console.log(chalk.white('preferredModels: ') + chalk.cyan(this.config.preferredModels.join(', ')));
      console.log(chalk.white('modelParams:'));
      Object.entries(this.config.modelParams).forEach(([model, params]) => {
        console.log(chalk.white(`  ${model}:`));
        Object.entries(params).forEach(([key, value]) => {
          console.log(chalk.white(`    ${key}: `) + chalk.cyan(value));
        });
      });
      console.log(chalk.white('verbosity:        ') + chalk.cyan(this.config.verbosity));
      console.log('\n');
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
        console.error("Validation error:", validationError.toString());
        console.error('Invalid configuration update:', error.errors);
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

## src/cli/cli.ts

**Description:** Command-line interface for the prompt manager

```typescript
#!/usr/bin/env bun

import 'reflect-metadata';
import { Command } from 'commander';
import { input, confirm, select, expand, search } from '@inquirer/prompts';
import chalk from 'chalk';
import { createPrompt, listPrompts, updatePrompt, generateTypes, getStatus, getPromptDetails, getGeneratedTypes, getDetailedStatus, deletePrompt, initializeContainer } from './commands.js';
import { Table } from 'console-table-printer';
import fs from 'fs-extra';
import { TextEncoder, TextDecoder } from 'util';
import { Container } from 'typedi';
import { PromptProjectConfigManager } from "../config/PromptProjectConfigManager";
import { PromptManager } from '../promptManager.js';
import { PromptFileSystem } from '../promptFileSystem.js';

// Add TextEncoder and TextDecoder to the global object
(global as any).TextEncoder = TextEncoder;
(global as any).TextDecoder = TextDecoder;

async function ensureInitialized() {
  const configManager = Container.get(PromptProjectConfigManager);
  await configManager.initialize();
  const fileSystem = Container.get(PromptFileSystem);
  await fileSystem.initialize();
  const promptManager = Container.get(PromptManager);
  await promptManager.initialize();
}

const log = {
  info: (message: string) => console.log(chalk.blue(message)),
  success: (message: string) => console.log(chalk.green(message)),
  error: (message: string) => console.log(chalk.red(message)),
  warn: (message: string) => console.log(chalk.yellow(message)),
  title: (message: string) => console.log(chalk.bold.underline(message)),
  debug: (message: string) => console.log(chalk.gray(message)),
};

const program = new Command();

program
  .version('1.0.0')
  .description('Prompt Manager CLI - A powerful tool for managing and generating prompts')
  .hook('preAction', async (thisCommand) => {
    if (thisCommand.name() !== 'init') {
      await ensureInitialized();
      // await ensureInitialized();
    }
  });

program
  .command('init')
  .description('Initialize a new Prompt Manager project')
  .action(async () => {
    log.title('Initializing a new Prompt Manager project');
    log.info('This command will set up your project structure and configuration.');

    const projectName = await input({ message: 'Enter project name:' });
    const promptsDir = await input({ message: 'Enter prompts directory:', default: '.prompts' });
    const outputDir = await input({ message: 'Enter output directory:', default: 'src/generated' });

    const config = {
      name: projectName,
      promptsDir,
      outputDir,
    };

    try {
      await fs.writeJSON('prompt-manager.json', config, { spaces: 2 });
      log.success('Configuration file created: prompt-manager.json');

      await fs.ensureDir(promptsDir);
      log.success(`Prompts directory created: ${promptsDir}`);

      await fs.ensureDir(outputDir);
      log.success(`Output directory created: ${outputDir}`);

      const configManager = Container.get(PromptProjectConfigManager);
      await configManager.initialize();

      const promptFileSystem = Container.get(PromptFileSystem);
      await promptFileSystem.initialize();

      log.success('Project initialized successfully!');
      log.info('You can now start creating prompts using the "create" command.');
    } catch (error) {
      log.error('Failed to initialize project:');
      console.error(error);
    }
  });

program
  .command('create')
  .description('Create a new prompt')
  .action(async () => {
    log.title('Creating a new prompt');
    log.info('Please describe the prompt you want to create. AI will generate a prompt based on your description.');

    try {
      await createPrompt();
      log.success('Prompt created successfully.');
      log.info('You can now use this prompt in your project.');
    } catch (error) {
      log.error('Failed to create prompt:');
      if (error instanceof Error) {
        log.error(error.message);
        if (error.stack) {
          log.debug(error.stack);
        }
      } else {
        log.error(String(error));
      }
    }
  });

program
  .command('list')
  .description('List all prompts')
  .action(async () => {
    log.title('Listing all prompts');
    log.info('Here are all the prompts currently available in your project:');

    try {
      while (true) {
        const prompts = await listPrompts();
        if (prompts.length === 0) {
          log.warn('No prompts found. Use the "create" command to add new prompts.');
          return;
        }

        const table = new Table({
          columns: [
            { name: 'category', alignment: 'left', color: 'cyan' },
            { name: 'name', alignment: 'left', color: 'green' },
            { name: 'version', alignment: 'left', color: 'yellow' },
          ],
        });

        prompts.forEach((prompt) => {
          table.addRow({
            category: prompt.category,
            name: prompt.name,
            version: prompt.version,
          });
        });

        table.printTable();

        const promptChoices = prompts.map((prompt) => ({
          name: `${prompt.category}/${prompt.name}`,
          value: prompt,
        }));

        const selectedPrompt = await search({
          message: 'Select a prompt to view details (type to search):',
          source: async (input, { signal }) => {
            return promptChoices.filter((choice) =>
              choice.name.toLowerCase().includes((input || '').toLowerCase())
            );
          },
        });

        const result = await displayPromptDetails(selectedPrompt);
        if (result === 'delete' || result === 'error') {
          break;
        }
      }
    } catch (error) {
      log.error('Failed to list prompts:');
      console.error(error);
    }
  });

async function displayPromptDetails(prompt: any): Promise<string> {
  while (true) {
    try {
      const promptDetails = await getPromptDetails({ category: prompt.category, name: prompt.name });
      log.info('\nPrompt Details:');
      const detailsTable = new Table({
        columns: [
          { name: 'property', alignment: 'left', color: 'cyan' },
          { name: 'value', alignment: 'left', color: 'green' },
        ],
      });

      Object.entries(promptDetails).forEach(([key, value]) => {
        detailsTable.addRow({ property: key, value: JSON.stringify(value ?? 'N/A', null, 2) });
      });

      detailsTable.printTable();

      const action = await expand({
        message: 'What would you like to do?',
        default: 'e',
        choices: [
          {
            key: 'e',
            name: 'Edit prompt',
            value: 'edit',
          },
          {
            key: 'd',
            name: 'Delete prompt',
            value: 'delete',
          },
          {
            key: 'b',
            name: 'Go back to list',
            value: 'back',
          },
          {
            key: 'x',
            name: 'Exit',
            value: 'exit',
          },
        ],
      });

      switch (action) {
        case 'edit':
          await updatePrompt({ category: prompt.category, name: prompt.name, updates: {} });
          break;
        case 'delete':
          await deletePrompt({ category: prompt.category, name: prompt.name });
          return 'delete';
        case 'back':
          return 'back';
        case 'exit':
          process.exit(0);
      }
    } catch (error) {
      log.error(`Failed to display prompt details: ${error instanceof Error ? error.message : String(error)}`);
      return 'error';
    }
  }
}

program
  .command('update <name>')
  .description('Update an existing prompt')
  .action(async (name: string) => {
    log.title(`Updating prompt: ${name}`);
    log.info('You can update various aspects of the prompt.');

    try {
      const [category, promptName] = name.split('/');
      if (!category || !promptName) {
        throw new Error('Invalid prompt name format. Please use "category/promptName".');
      }
      const promptManager = Container.get(PromptManager);
      const promptExists = await promptManager.promptExists({ category, name: promptName });
      if (!promptExists) {
        throw new Error(`Prompt "${name}" does not exist.`);
      }
      const promptDetails = await getPromptDetails({ category, name: promptName });
      log.info('Current prompt details:');
      Object.entries(promptDetails).forEach(([key, value]) => {
        log.info(`${key}: ${value}`);
      });

      const updateField = await select({
        message: 'Select a field to update:',
        choices: Object.keys(promptDetails).map(field => ({ name: field, value: field })),
      });

      const newValue = await input({ message: `Enter new value for ${updateField}:` });
      await updatePrompt({ category, name: promptName, updates: { [updateField]: newValue } });
      log.success(`Prompt "${name}" updated successfully.`);
      log.info('The new content has been saved and is ready to use.');
    } catch (error) {
      if (error instanceof Error) {
        log.error(`Failed to update prompt: ${error.message}`);
      } else {
        log.error('Failed to update prompt: An unknown error occurred');
      }
      console.error(error);
    }
  });

program
  .command('generate')
  .description('Generate TypeScript types for prompts')
  .action(async () => {
    log.title('Generating TypeScript types for prompts');
    log.info('This command will create type definitions based on your current prompts.');

    try {
      const shouldProceed = await confirm({ message: 'This action will overwrite existing type definitions. Continue?' });
      if (!shouldProceed) {
        log.info('Type generation cancelled.');
        return;
      }

      await generateTypes();
      log.success('Type definitions generated successfully.');
      log.info('You can now use these types in your TypeScript projects for better type safety and autocompletion.');

      const viewTypes = await confirm({ message: 'Would you like to view the generated types?' });
      if (viewTypes) {
        const types = await getGeneratedTypes();
        log.info('\nGenerated Types:');
        console.log(types);
      }
    } catch (error) {
      log.error('Failed to generate type definitions:');
      console.error(error);
    }
  });

program
  .command('status')
  .description('Display the current status of the Prompt Manager project')
  .action(async () => {
    log.title('Prompt Manager Status');
    log.info('Fetching current project status...');

    try {
      const status = await getStatus();
      log.info('Project Configuration:');
      log.info(`  Name: ${status.config.name}`);
      log.info(`  Prompts Directory: ${status.config.promptsDir}`);
      log.info(`  Output Directory: ${status.config.outputDir}`);

      log.info('\nPrompt Statistics:');
      log.info(`  Total Prompts: ${status.totalPrompts}`);
      log.info(`  Categories: ${status.categories.join(', ')}`);

      log.info('\nLast Generated:');
      log.info(`  ${status.lastGenerated || 'Types have not been generated yet'}`);

      if (status.warnings.length > 0) {
        log.warn('\nWarnings:');
        status.warnings.forEach(warning => log.warn(`  - ${warning}`));
      }

      const showDetails = await confirm({ message: 'Would you like to see detailed prompt information?' });
      if (showDetails) {
        const detailedStatus = await getDetailedStatus();
        log.info('\nDetailed Prompt Information:');
        detailedStatus.forEach(prompt => {
          log.info(`\n${prompt.category}/${prompt.name}:`);
          log.info(`  Version: ${prompt.version}`);
          log.info(`  Parameters: ${prompt.parameters?.join(', ')}`);
          log.info(`  Last Modified: ${prompt.metadata?.lastModified}`);
        });
      }
    } catch (error) {
      log.error('Failed to retrieve status:');
      console.error(error);
    }
  });

program.parse(process.argv);

```

## src/cli/commands.ts

**Description:** Command line commands

```typescript
import { Container } from 'typedi';
import { PromptManager } from '../promptManager';
import { PromptModel } from '../promptModel';
import fs from 'fs-extra';
import path from 'path';
import { input, confirm, select } from '@inquirer/prompts';
import { generatePromptWithAI, updatePromptWithAI, prettyPrintPrompt } from './aiHelpers';
import { IPrompt, IPromptInput, IPromptOutput } from '../types/interfaces';
import { PromptProjectConfigManager } from '../config/PromptProjectConfigManager';
import { PromptFileSystem } from '../promptFileSystem';
import { z } from 'zod';
import { PromptSchema } from '../schemas/prompts';
import { generateExportableSchemaAndType } from '../utils/typeGeneration';

export async function initializeContainer(): Promise<void> {
  const configManager = Container.get(PromptProjectConfigManager);
  await configManager.initialize();
  
  const promptManager = Container.get(PromptManager);
  await promptManager.initialize();

  const promptFileSystem = Container.get(PromptFileSystem);
  await promptFileSystem.initialize();
}

export async function createPrompt(): Promise<void> {
  const promptManager = Container.get(PromptManager);
  let promptData: Partial<IPrompt<IPromptInput, IPromptOutput>> = {};
  try {
    let accepted = false;

    const description = await input({ message: 'Describe the prompt you want to create:' });

    while (!accepted) {
      promptData = await generatePromptWithAI(description);
      prettyPrintPrompt(promptData);

      if (!promptData.name || !promptData.category) {
        console.log('The generated prompt is missing required fields (name or category). Regenerating...');
        continue;
      }

      accepted = await confirm({ message: 'Do you accept this prompt?' });

      if (!accepted) {
        const instruction = await input({ message: 'What changes would you like to make? (Type "quit" to cancel)' });
        if (instruction.toLowerCase() === 'quit') {
          console.log('Prompt creation cancelled.');
          return;
        }
        promptData = await updatePromptWithAI(promptData, instruction);
      }
    }

    const validatedPromptData: Omit<IPrompt<IPromptInput, IPromptOutput>, 'versions'> = {
      ...PromptSchema.parse(promptData),
      inputSchema: promptData.inputSchema || {}, // Add a default empty object if not present
      outputSchema: promptData.outputSchema || {} // Add a default empty object if not present
    };

    await promptManager.createPrompt({ prompt: validatedPromptData });
    console.log(`Prompt "${validatedPromptData.name}" created successfully.`);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error(`Failed to create prompt "${promptData.name}": Invalid prompt data`);
      console.error('Validation errors:', error.errors);
      console.error(`This could be because:
        1. The AI-generated prompt doesn't meet the required schema.
        2. Manual edits introduced invalid data.
        
        To resolve this:
        - Review the generated prompt data and ensure all required fields are present and valid.
        - Try regenerating the prompt with a more specific description.
        - If you made manual edits, double-check them against the prompt schema.`);
    } else if (error instanceof Error) {
      console.error(`Failed to create prompt "${promptData.name}": ${error.message}`);
      console.error(`This could be due to:
        1. File system issues (e.g., permissions, disk space).
        2. Conflicts with existing prompts.
        3. Unexpected data format issues.
        
        To resolve this:
        - Check your file system permissions and available disk space.
        - Ensure the prompt name and category are unique.
        - Try creating a simpler prompt to isolate the issue.
        - If the problem persists, run 'status' to check the overall project health.`);
    } else {
      console.error(`Failed to create prompt "${promptData.name}": Unknown error`);
      console.error('Error details:', error);
    }
    throw error;
  }
}

export async function listPrompts(): Promise<Array<{ name: string; category: string; version: string; filePath: string }>> {
  const promptManager = Container.get(PromptManager);
  const prompts = await promptManager.listPrompts({});

  if (prompts.length === 0) {
    console.log('No prompts found. Use the "create" command to add new prompts.');
  }

  return prompts.map(prompt => ({
    name: prompt.name,
    category: prompt.category,
    version: prompt.version || '1.0.0',
    filePath: prompt.filePath || ''
  }));
}

export async function getPromptDetails(props: { category: string; name: string }): Promise<Partial<IPrompt<IPromptInput, IPromptOutput>>> {
  const promptManager = Container.get(PromptManager);
  const prompt = promptManager.getPrompt(props);
  return {
    name: prompt.name,
    category: prompt.category,
    description: prompt.description,
    version: prompt.version,
    template: prompt.template,
    parameters: prompt.parameters,
    metadata: prompt.metadata,
  };
}

export async function updatePrompt(props: { category: string; name: string; updates: Partial<IPrompt<IPromptInput, IPromptOutput>> }): Promise<void> {
  const { category, name, updates } = props;

  if (!category || !name) {
    throw new Error('Category and name are required for updating a prompt');
  }

  if (Object.keys(updates).length === 0) {
    throw new Error('No updates provided');
  }

  if (updates.version && !/^\d+\.\d+\.\d+$/.test(updates.version)) {
    throw new Error('Invalid version format. Use semantic versioning (e.g., 1.0.0)');
  }

  try {
    const promptManager = Container.get(PromptManager);
    const currentPrompt = promptManager.getPrompt({ category, name });

    if (!currentPrompt) {
      throw new Error(`Prompt "${category}/${name}" not found.`);
    }

    const updateType = await select({
      message: 'What type of update is this?',
      choices: [
        { name: 'Patch (backwards-compatible bug fixes)', value: 'patch' },
        { name: 'Minor (backwards-compatible new features)', value: 'minor' },
        { name: 'Major (breaking changes)', value: 'major' },
      ],
    });

    if (updates.template) {
      const useAI = await confirm({ message: 'Do you want to use AI to refine the new content?' });
      if (useAI) {
        const query = 'Refine and improve this prompt content:';
        const refinedPrompt = await updatePromptWithAI({ ...currentPrompt, ...updates, category, name } as IPrompt<IPromptInput, IPromptOutput>, query);
        updates.template = refinedPrompt.template;
      }
    }

    updates.metadata = {
      ...currentPrompt.metadata,
      lastModified: new Date().toISOString()
    };

    const updatedPromptData = { ...currentPrompt, ...updates };
    const validatedPromptData = PromptSchema.parse(updatedPromptData);

    console.log('Proposed changes:');
    console.log(JSON.stringify(updates, null, 2));
    const confirmUpdate = await confirm({ message: 'Do you want to apply these changes?' });

    if (confirmUpdate) {
      const [major, minor, patch] = (currentPrompt.version || '1.0.0').split('.').map(Number);
      switch (updateType) {
        case 'major':
          validatedPromptData.version = `${major + 1}.0.0`;
          break;
        case 'minor':
          validatedPromptData.version = `${major}.${minor + 1}.0`;
          break;
        case 'patch':
          validatedPromptData.version = `${major}.${minor}.${patch + 1}`;
          break;
      }

      await promptManager.updatePrompt({ category, name, updates: validatedPromptData });
      console.log(`Prompt "${category}/${name}" updated successfully to version ${validatedPromptData.version}.`);
    } else {
      console.log('Update cancelled.');
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Invalid prompt data:', error.errors);
    } else if (error instanceof Error) {
      console.error('An error occurred while updating the prompt:', error.message);
      if (error.stack) {
        console.debug(error.stack);
      }
    } else {
      console.error('An unknown error occurred while updating the prompt:', String(error));
    }
  }
}

export async function generateTypes(): Promise<void> {
  const configManager = Container.get(PromptProjectConfigManager);
  const outputDir = configManager.getConfig('outputDir');
  const promptManager = Container.get(PromptManager);
  const prompts = await promptManager.listPrompts({});
  let typeDefs = 'declare module "prompt-manager" {\n';

  for (const prompt of prompts) {
    const inputTypes = await generateExportableSchemaAndType({ schema: prompt.inputSchema, name: `${prompt.category}/${prompt.name}Input` });
    const outputTypes = await generateExportableSchemaAndType({ schema: prompt.outputSchema, name: `${prompt.category}/${prompt.name}Output` });

    typeDefs += `  ${inputTypes.formattedSchemaTsNoImports};\n`;
    typeDefs += `  ${outputTypes.formattedSchemaTsNoImports};\n`;

    const promptData = prompt as IPrompt<IPromptInput, IPromptOutput>;
    typeDefs += `  export namespace ${promptData.category} {\n`;
    typeDefs += `    export const ${promptData.name}: {\n`;
    typeDefs += `      format: (inputs: ${promptData.name}Input) => ${promptData.name}Output;\n`;
    typeDefs += `      description: string;\n`;
    typeDefs += `      version: string;\n`;
    typeDefs += `    };\n`;
    typeDefs += `  }\n\n`;
  }

  typeDefs += '}\n';

  try {
    await fs.writeFile(path.join(outputDir, 'prompts.d.ts'), typeDefs);
    console.log(`Type definitions generated successfully at ${path.join(outputDir, 'prompts.d.ts')}`);
  } catch (error) {
    console.error('Failed to write type definitions file:', error);
    throw new Error(`Failed to generate type definitions: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// ... other helper functions (generateInputType, generateOutputType, getTypeFromSchema) remain the same

export async function getGeneratedTypes(): Promise<string> {
  const configManager = Container.get(PromptProjectConfigManager);
  const outputDir = configManager.getConfig('outputDir');
  return fs.readFile(path.join(outputDir, 'prompts.d.ts'), 'utf-8');
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
    promptsDir: configManager.getConfig('promptsDir'),
    outputDir: configManager.getConfig('outputDir'),
    preferredModels: configManager.getConfig('preferredModels'),
    modelParams: configManager.getConfig('modelParams')
  };
  
  const prompts = await promptManager.listPrompts({});
  const categories = [...new Set(prompts.map(prompt => prompt.category))];

  let lastGenerated = null;
  try {
    const stats = await fs.stat(path.join(config.outputDir, 'prompts.d.ts'));
    lastGenerated = stats.mtime.toISOString();
  } catch (error) {
    // File doesn't exist, which is fine
  }

  const warnings = [];
  if (prompts.length === 0) {
    warnings.push('No prompts found. Use the "create" command to add new prompts.');
  }
  if (!lastGenerated) {
    warnings.push('Type definitions have not been generated yet. Use the "generate" command to create them.');
  }

  return {
    config,
    totalPrompts: prompts.length,
    categories,
    lastGenerated,
    warnings
  };
}

export async function getDetailedStatus(): Promise<Partial<IPrompt<IPromptInput, IPromptOutput>>[]> {
  const promptManager = Container.get(PromptManager);
  const prompts = await promptManager.listPrompts({});

  return prompts.map(prompt => ({
    name: prompt.name,
    category: prompt.category,
    version: prompt.version,
    parameters: prompt.parameters,
    metadata: {
      created: prompt.metadata.created,
      lastModified: prompt.metadata.lastModified,
    },
  }));
}

export async function deletePrompt(props: { category: string; name: string }): Promise<void> {
  const promptManager = Container.get(PromptManager);
  await promptManager.deletePrompt(props);
  console.log(`Prompt "${props.category}/${props.name}" deleted successfully.`);
}

```

## test/commands.test.ts

**Description:** Tests for command line commands

```typescript
import { expect, test, describe, beforeAll, afterAll, beforeEach, jest, spyOn } from "bun:test";
import { Container } from 'typedi';
import * as commands from "../src/cli/commands";
import { PromptManager } from "../src/promptManager";
import { PromptProjectConfigManager } from "../src/config/PromptProjectConfigManager";
import { PromptFileSystem } from "../src/promptFileSystem";
import fs from 'fs/promises';
import path from 'path';
import { IPrompt } from "../src/types/interfaces";

describe.skip('CLI Commands', () => {
  let testDir: string;
  let originalPromptsDir: string | undefined;

  beforeAll(async () => {
    originalPromptsDir = process.env.PROMPTS_DIR;
    testDir = path.join(process.cwd(), 'test-prompts-cli');
    await fs.mkdir(testDir, { recursive: true });
    process.env.PROMPTS_DIR = testDir;
  });

  beforeEach(async () => {
    Container.reset();
    const configManager = new PromptProjectConfigManager();
    await configManager.initialize();
    await configManager.updateConfig({ promptsDir: testDir });
    Container.set(PromptProjectConfigManager, configManager);
    Container.set(PromptFileSystem, PromptFileSystem);
    Container.set(PromptManager, PromptManager);

    const files = await fs.readdir(testDir);
    for (const file of files) {
      await fs.rm(path.join(testDir, file), { recursive: true, force: true });
    }
  });

  afterAll(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
    if (originalPromptsDir) {
      process.env.PROMPTS_DIR = originalPromptsDir;
    } else {
      delete process.env.PROMPTS_DIR;
    }
  });

  test("createPrompt creates a new prompt", async () => {
    const promptData = {
      name: "stardustSymphony",
      category: "cosmicCompositions",
      description: "A prompt that composes melodies inspired by celestial bodies",
      version: "1.0.0",
      template: "Compose a {{genre}} melody inspired by the {{celestialBody}}",
      parameters: ["genre", "celestialBody"],
      inputSchema: {
        type: "object",
        properties: {
          genre: { type: "string" },
          celestialBody: { type: "string" },
        },
        required: ["genre", "celestialBody"],
      },
      outputSchema: {
        type: "object",
        properties: {
          melody: { type: "string" },
        },
        required: ["melody"],
      },
      outputType: "structured",
    };

    spyOn(console, 'log').mockImplementation(() => { });
    spyOn(console, 'error').mockImplementation(() => { });

    await commands.createPrompt();

    const manager = Container.get(PromptManager);
    const createdPrompt = manager.getPrompt({
      category: "cosmicCompositions",
      name: "stardustSymphony",
    });

    expect(createdPrompt).toMatchObject(promptData);
  });

  test("listPrompts returns a list of prompts", async () => {
    const result = await commands.listPrompts();

    const stardustSymphony = result.find(prompt => 
      prompt.category === "cosmicCompositions" && 
      prompt.name === "stardustSymphony"
    );

    expect(stardustSymphony).toBeDefined();
    expect(stardustSymphony).toEqual({
      category: "cosmicCompositions",
      name: "stardustSymphony",
      version: "1.0.0",
      filePath: expect.stringContaining("/test-prompts-cli/cosmicCompositions/stardustSymphony/prompt.json"),
    });
  });

  test("getPromptDetails returns prompt details", async () => {
    const result = await commands.getPromptDetails({
      category: "cosmicCompositions",
      name: "stardustSymphony",
    });

    expect(result).toEqual({
      name: "stardustSymphony",
      category: "cosmicCompositions",
      description: "A prompt that composes melodies inspired by celestial bodies",
      version: "1.0.0",
      template: "Compose a {{genre}} melody inspired by the {{celestialBody}}",
      parameters: ["genre", "celestialBody"],
      metadata: expect.any(Object),
    });
  });

  test("updatePrompt updates an existing prompt", async () => {
    const updatedPromptData: Partial<IPrompt<any, any>> = {
      name: "stardustSymphony",
      category: "cosmicCompositions",
      description: "An updated prompt that orchestrates cosmic melodies",
      version: "1.1.0",
      template: "Orchestrate a {{genre}} symphony inspired by the {{celestialEvent}}",
      parameters: ["genre", "celestialEvent"],
      inputSchema: {
        type: "object",
        properties: {
          genre: { type: "string" },
          celestialEvent: { type: "string" },
        },
        required: ["genre", "celestialEvent"],
      },
      outputSchema: {
        type: "object",
        properties: {
          symphony: { type: "string" },
        },
        required: ["symphony"],
      },
      outputType: "structured",
    };

    spyOn(console, 'log').mockImplementation(() => { });
    spyOn(console, 'error').mockImplementation(() => { });

    const manager = Container.get(PromptManager);
    await commands.updatePrompt({ category: "cosmicCompositions", name: "stardustSymphony", updates: updatedPromptData });

    const updatedPrompt = manager.getPrompt({
      category: "cosmicCompositions",
      name: "stardustSymphony",
    });

    expect(updatedPrompt).toMatchObject(updatedPromptData);
  });

  test("deletePrompt removes a prompt", async () => {
    spyOn(console, 'log').mockImplementation(() => { });
    spyOn(console, 'error').mockImplementation(() => { });

    await commands.deletePrompt({ category: "cosmicCompositions", name: "stardustSymphony" });

    const manager = Container.get(PromptManager);
    const prompts = await manager.listPrompts({});
    const deletedPrompt = prompts.find(p => p.name === "stardustSymphony" && p.category === "cosmicCompositions");

    expect(deletedPrompt).toBeUndefined();
  });

  test("createCategory creates a new category", async () => {
    const manager = Container.get(PromptManager);
    await manager.createCategory("quantumQueries");
    const categories = await manager.listCategories();

    expect(categories).toContain("quantumQueries");
  });
});

```

## test/index.test.ts

**Description:** Index test file for initializing tests

```typescript
import { expect, test, describe } from "bun:test";
import * as index from '../src/index';
import { PromptManager } from '../src/promptManager';

describe.skip('index', () => {
  test('exports PromptManager', () => {
    expect(index.PromptManager).toBe(PromptManager);
  });

  test('exports generated content', () => {
    expect(index.PromptManager).toBeDefined();
  });
});

```

## test/promptFileSystem.test.ts

**Description:** Tests for prompt file system operations

```typescript
import { expect, test, beforeAll, afterAll, beforeEach, afterEach, describe } from "bun:test";
import { Container } from 'typedi';
import { PromptFileSystem } from "../src/promptFileSystem";
import { PromptProjectConfigManager } from "../src/config/PromptProjectConfigManager";
import { IPrompt, IPromptInput, IPromptOutput } from "../src/types/interfaces";
import fs from "fs/promises";
import path from "path";


const COSMIC_PROMPT: IPrompt<IPromptInput, IPromptOutput> = {
  name: "cosmicWhisper",
  category: "celestialMystery",
  description: "A prompt that echoes the secrets of the universe",
  version: "1.0.0",
  template: "In the vast expanse of cosmic wonder, {{celestialBody}} reveals its hidden truths",
  parameters: ["celestialBody"],
  metadata: {
    created: new Date().toISOString(),
    lastModified: new Date().toISOString(),
  },
  outputSchema: {
    type: "object",
    properties: {
      cosmicTruth: { type: "string" },
    },
    required: ["cosmicTruth"],
  },
  outputType: "structured",
  inputSchema: {
    type: "object",
    properties: {
      celestialBody: { type: "string" },
    },
    required: ["celestialBody"],
  },
  configuration: {
    modelName: "default-model",
    temperature: 0.7,
    maxTokens: 100,
    topP: 1,
    frequencyPenalty: 0,
    presencePenalty: 0,
    stopSequences: [],
  },
};

describe("PromptFileSystem", () => {
  let promptFileSystem: PromptFileSystem;
  let testDir: string;
  let originalPromptsDir: string;
  let configManager: PromptProjectConfigManager;

  beforeAll(async () => {
    originalPromptsDir = process.env.PROMPTS_DIR || '';
    testDir = path.resolve(process.cwd(), 'test-prompts');
    await fs.mkdir(testDir, { recursive: true });
    process.env.PROMPTS_DIR = testDir;
  });

  beforeEach(async () => {
    Container.reset();

    configManager = Container.get(PromptProjectConfigManager);
    await configManager.initialize();
    await configManager.updateConfig({ promptsDir: testDir });

    promptFileSystem = Container.get(PromptFileSystem);
    await promptFileSystem.initialize();
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
    await fs.mkdir(testDir, { recursive: true });
  });

  afterAll(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
    if (originalPromptsDir) {
      process.env.PROMPTS_DIR = originalPromptsDir;
    } else {
      delete process.env.PROMPTS_DIR;
    }
  });

  test("savePrompt and loadPrompt", async () => {
    await promptFileSystem.savePrompt({ promptData: COSMIC_PROMPT });
    const loadedPrompt = await promptFileSystem.loadPrompt({
      category: "celestialMystery",
      promptName: "cosmicWhisper",
    });

    expect(loadedPrompt).toEqual(COSMIC_PROMPT);
  });

  test("promptExists", async () => {
    await promptFileSystem.savePrompt({ promptData: COSMIC_PROMPT });
    const exists = await promptFileSystem.promptExists({
      category: "celestialMystery",
      promptName: "cosmicWhisper",
    });
    expect(exists).toBe(true);

    const notExists = await promptFileSystem.promptExists({
      category: "celestialMystery",
      promptName: "nonExistentPrompt",
    });
    expect(notExists).toBe(false);
  });

  test("listPrompts", async () => {
    await promptFileSystem.savePrompt({ promptData: COSMIC_PROMPT });
    const stargazerPrompt = {
      ...COSMIC_PROMPT,
      name: "stargazerDreams",
      description: "A prompt that captures the essence of stargazing",
    };
    await promptFileSystem.savePrompt({ promptData: stargazerPrompt });

    const prompts = await promptFileSystem.listPrompts();
    expect(prompts.length).toBeGreaterThanOrEqual(2);
    // expect(prompts).toContainEqual(
    //   expect.objectContaining({
    //     name: "cosmicWhisper",
    //     category: "celestialMystery",
    //     filePath: expect.stringContaining(path.join("celestialMystery", "cosmicWhisper", "prompt.json"))
    //   })
    // );
    // expect(prompts).toContainEqual(
    //   expect.objectContaining({
    //     name: "stargazerDreams",
    //     category: "celestialMystery",
    //     filePath: expect.stringContaining(path.join("celestialMystery", "stargazerDreams", "prompt.json"))
    //   })
    // );

    const categoryPrompts = await promptFileSystem.listPrompts({ category: "celestialMystery" });
    expect(categoryPrompts).toMatchSnapshot()
    expect(categoryPrompts.length).toBeGreaterThanOrEqual(2);
  });

});

```

## test/promptManager.test.ts

**Description:** Tests for the prompt manager class

```typescript
import { expect, test, describe, beforeAll, afterAll, beforeEach, afterEach } from "bun:test";
import { Container } from 'typedi';
import { PromptManager } from '../src/promptManager';
import { PromptFileSystem } from '../src/promptFileSystem';
import { PromptProjectConfigManager } from "../src/config/PromptProjectConfigManager";
import fs from 'fs/promises';
import path from 'path';
import { IPrompt, IPromptInput, IPromptOutput } from "../src/types/interfaces";

const getRandomElement = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];

const categories = [
  'test_NaturalLanguageProcessing_1',
  'test_MachineLearning_2',
  'test_ComputerVision_3',
  'test_DataAnalysis_4',
  'test_ArtificialIntelligence_5',
  'test_DeepLearning_6',
  'test_RoboticProcess_7',
  'test_SpeechRecognition_8',
  'test_TextGeneration_9',
  'test_SentimentAnalysis_10'
];

const promptNames = [
  'test_LanguageModel_A',
  'test_ImageClassifier_B',
  'test_SentimentAnalyzer_C',
  'test_TextSummarizer_D',
  'test_NamedEntityRecognizer_E',
  'test_QuestionAnswering_F',
  'test_MachineTranslation_G',
  'test_SpeechToText_H',
  'test_TextToSpeech_I',
  'test_AnomalyDetection_J'
];

describe('PromptManager', () => {
  let manager: PromptManager;
  let fileSystem: PromptFileSystem;
  let configManager: PromptProjectConfigManager;
  let testDir: string;

  beforeAll(async () => {
    testDir = path.join(process.cwd(), 'test-prompts-manager');
    await fs.mkdir(testDir, { recursive: true });
  });

  beforeEach(async () => {
    Container.reset();

    configManager = Container.get(PromptProjectConfigManager);
    await configManager.initialize();
    await configManager.updateConfig({
      promptsDir: testDir,
      outputDir: path.join(testDir, 'output'),
    });

    fileSystem = Container.get(PromptFileSystem);
    await fileSystem.initialize();

    manager = Container.get(PromptManager);
    await manager.initialize();
  });

  afterAll(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  const getRandomPrompt = (): IPrompt<IPromptInput, IPromptOutput> => ({
    name: getRandomElement(promptNames),
    category: getRandomElement(categories),
    description: `A test prompt for ${getRandomElement(categories).replace('test_', '')}`,
    version: '1.0.0',
    template: 'Process {{input}} using {{algorithm}}',
    parameters: ['input', 'algorithm'],
    defaultModelName: 'gpt-4o-mini',
    inputSchema: {
      type: 'object',
      properties: {
        input: { type: 'string' },
        algorithm: { type: 'string' },
      },
      required: ['input', 'algorithm'],
    },
    outputSchema: {
      type: 'object',
      properties: {
        result: { type: 'string' },
      },
      required: ['result'],
    },
    outputType: 'structured',
    metadata: {
      created: new Date().toISOString(),
      lastModified: new Date().toISOString(),
    },
    configuration: {
      modelName: 'gpt-4o-mini',
      temperature: 0.7,
      maxTokens: 100,
      topP: 1,
      frequencyPenalty: 0,
      presencePenalty: 0,
      stopSequences: [],
    },
  });

  test('Create and retrieve prompt', async () => {
    const testPrompt = getRandomPrompt();
    await manager.createPrompt({ prompt: testPrompt });

    const retrievedPrompt = manager.getPrompt({
      category: testPrompt.category,
      name: testPrompt.name,
    });

    const { name, category, description, version, template, parameters, inputSchema, outputSchema, outputType, configuration } = retrievedPrompt;

    expect({ name, category, description, version, template, parameters, inputSchema, outputSchema, outputType, configuration }).toMatchObject({
      name: testPrompt.name,
      category: testPrompt.category,
      description: testPrompt.description,
      version: testPrompt.version,
      template: testPrompt.template,
      parameters: testPrompt.parameters,
      inputSchema: testPrompt.inputSchema,
      outputSchema: testPrompt.outputSchema,
      outputType: testPrompt.outputType,
      configuration: testPrompt.configuration,
    });
  });

  test('List all prompts', async () => {
    const testPrompt = getRandomPrompt();
    await manager.createPrompt({ prompt: testPrompt });
    const allPrompts = await manager.listPrompts({});
    const createdPrompt = allPrompts.find(p => p.name === testPrompt.name && p.category === testPrompt.category);
    expect(createdPrompt).toBeDefined();
    expect(createdPrompt).toMatchObject({
      name: testPrompt.name,
      category: testPrompt.category,
    });
  });

  test('List prompts by category', async () => {
    const testPrompt = getRandomPrompt();
    await manager.createPrompt({ prompt: testPrompt });
    const categoryPrompts = await manager.listPrompts({ category: testPrompt.category });
    const createdPrompt = categoryPrompts.find(p => p.name === testPrompt.name);
    expect(createdPrompt).toBeDefined();
    expect(createdPrompt?.name).toBe(testPrompt.name);
  });

  test('Update prompt', async () => {
    const testPrompt = getRandomPrompt();
    await manager.createPrompt({ prompt: testPrompt });

    const updatedPrompt: Partial<IPrompt<IPromptInput, IPromptOutput>> = {
      description: `An updated prompt for ${testPrompt.category.replace('test_', '')}`,
      version: '1.1.0',
      template: 'Updated process {{input}} using {{algorithm}}',
    };

    await manager.updatePrompt({
      category: testPrompt.category,
      name: testPrompt.name,
      updates: updatedPrompt,
    });

    const retrievedPrompt = manager.getPrompt({
      category: testPrompt.category,
      name: testPrompt.name,
    });

    expect(retrievedPrompt.description).toBe(updatedPrompt.description!);
    expect(retrievedPrompt.version).toBe("1.1.1");
    expect(retrievedPrompt.template).toBe(updatedPrompt.template!);
  });

  test('Delete prompt', async () => {
    const testPrompt = getRandomPrompt();
    await manager.createPrompt({ prompt: testPrompt });

    await manager.deletePrompt({
      category: testPrompt.category,
      name: testPrompt.name,
    });

    expect(() => manager.getPrompt({
      category: testPrompt.category,
      name: testPrompt.name,
    })).toThrow();
  });

  test('Create and delete category', async () => {
    const testCategory = "testCategory_Unique";
    await manager.createCategory(testCategory);

    let categories = Object.keys(manager.categories);
    expect(categories).toContain(testCategory);

    await manager.deleteCategory(testCategory);

    categories = Object.keys(manager.categories);
    expect(categories).not.toContain(testCategory);
  });

  test('Format prompt', async () => {
    const testPrompt = getRandomPrompt();
    await manager.createPrompt({ prompt: testPrompt });
    const formattedPrompt = manager.formatPrompt({
      category: testPrompt.category,
      name: testPrompt.name,
      params: { input: 'test data', algorithm: 'test algorithm' },
    });
    expect(formattedPrompt).toBe('Process test data using test algorithm');
  });

  test('Execute prompt', async () => {
    const testPrompt = getRandomPrompt();
    await manager.createPrompt({ prompt: testPrompt });
    const result = await manager.executePrompt({
      category: testPrompt.category,
      name: testPrompt.name,
      params: { input: 'test data', algorithm: 'test algorithm' },
    });
    expect(result).toHaveProperty('result');
    expect(typeof result.result).toBe('string');
  });

  test('Version prompt', async () => {
    const testPrompt = getRandomPrompt();
    await manager.createPrompt({ prompt: testPrompt });

    // List versions
    let versions = await manager.versionPrompt({
      action: 'list',
      category: testPrompt.category,
      name: testPrompt.name,
    });
    // expect(versions).toEqual({})

    // check if versions is an array
    expect(Array.isArray(versions.result)).toBe(true);

    expect(versions.result).toContain('1.0.0');

    // Create new version
    await manager.versionPrompt({
      action: 'create',
      category: testPrompt.category,
      name: testPrompt.name,
    });

    versions = await manager.versionPrompt({
      action: 'list',
      category: testPrompt.category,
      name: testPrompt.name,
    });
    expect(Array.isArray(versions.result)).toBe(true);

    expect(versions.result).toContain('1.0.1');

    // Switch version
    await manager.versionPrompt({
      action: 'switch',
      category: testPrompt.category,
      name: testPrompt.name,
      version: '1.0.0',
    });

    const prompt = manager.getPrompt({
      category: testPrompt.category,
      name: testPrompt.name,
    });
    expect(prompt.version).toBe('1.0.0');
  });

  test('Error handling - non-existent prompt', () => {
    expect(() => manager.getPrompt({
      category: 'test_NonExistent',
      name: 'test_NonExistentPrompt',
    })).toThrow();
  });

  test('Error handling - invalid prompt data', async () => {
    const invalidPrompt = { ...getRandomPrompt(), name: '' };
    await expect(manager.createPrompt({ prompt: invalidPrompt as any })).rejects.toThrow();
  });
});

```

## test/promptModel.test.ts

**Description:** Tests for the prompt model representation

```typescript
import { expect, test, describe, beforeAll, afterAll, beforeEach, afterEach, jest } from "bun:test";
import { Container } from 'typedi';
import { PromptManager } from "../src/promptManager";
import { PromptFileSystem } from "../src/promptFileSystem";
import { PromptProjectConfigManager } from "../src/config/PromptProjectConfigManager";
import fs from "fs/promises";
import path from "path";
import { IPrompt, IPromptInput, IPromptOutput } from "../src/types/interfaces";

// Function to create a unique dummy prompt for each test
const createUniqueDummyPrompt = (testName: string): IPrompt<IPromptInput, IPromptOutput> => ({
  name: `testPrompt_${testName}`,
  category: `testCategory_${testName}`,
  description: "A test prompt",
  version: "1.0.0",
  template: "This is a {{test}} prompt",
  parameters: ["test"],
  defaultModelName: "test-model",
  metadata: {
    created: new Date().toISOString(),
    lastModified: new Date().toISOString(),
  },
  configuration: {
    modelName: "test-model",
    temperature: 0.7,
    maxTokens: 100,
    topP: 1,
    frequencyPenalty: 0,
    presencePenalty: 0,
    stopSequences: [],
  },
  outputType: "plain",
  inputSchema: {
    type: "object",
    properties: {
      test: { type: "string" },
    },
    required: ["test"],
  },
  outputSchema: {
    type: "object",
    properties: {
      text: { type: "string" },
    },
    required: ["text"],
  },
});

describe("PromptModel", () => {
  const testProjectDir = path.join(process.cwd(), "test-project")
  const TEST_PROMPTS_PATH = path.join(testProjectDir, "test_prompts");
  let promptManager: PromptManager;
  let fileSystem: PromptFileSystem;
  let configManager: PromptProjectConfigManager;


  beforeAll(async () => {
    process.cwd = jest.fn().mockReturnValue(testProjectDir);
    await fs.mkdir(testProjectDir, { recursive: true });
  });

  beforeEach(async () => {
    Container.reset();

    configManager = Container.get(PromptProjectConfigManager);
    await configManager.initialize();
    await configManager.updateConfig({
      promptsDir: "test_prompts",
      outputDir: path.join(TEST_PROMPTS_PATH, 'output'),
    });

    fileSystem = Container.get(PromptFileSystem);
    await fileSystem.initialize();

    console.log(`Config manager initialized`);

    promptManager = Container.get(PromptManager);
    await promptManager.initialize();

    console.log(`Prompt manager initialized`);
  });

  afterAll(async () => {
    await fs.rm(TEST_PROMPTS_PATH, { recursive: true, force: true });
  });

  test("create and retrieve prompt", async () => {
    const dummyPrompt = createUniqueDummyPrompt("createAndRetrieve");
    console.log(`Creating prompt ${dummyPrompt.name} in category ${dummyPrompt.category}`);
    await promptManager.createPrompt({ prompt: dummyPrompt });
    console.log(`Prompt created`);
    const retrievedPrompt = promptManager.getPrompt({ category: dummyPrompt.category, name: dummyPrompt.name });
    expect(retrievedPrompt.name).toBe(dummyPrompt.name);
    expect(retrievedPrompt.template).toBe(dummyPrompt.template);
  });

  test("format prompt", async () => {
    const dummyPrompt = createUniqueDummyPrompt("format");
    await promptManager.createPrompt({ prompt: dummyPrompt });
    const prompt = promptManager.getPrompt({ category: dummyPrompt.category, name: dummyPrompt.name });
    const formatted = prompt.format({ test: "formatted" });
    expect(formatted).toBe("This is a formatted prompt");
  });

  test("execute prompt", async () => {
    const dummyPrompt = createUniqueDummyPrompt("execute");
    await promptManager.createPrompt({ prompt: dummyPrompt });
    const prompt = promptManager.getPrompt({ category: dummyPrompt.category, name: dummyPrompt.name });
    const result = await prompt.execute({ test: "executed" });
    expect(result).toHaveProperty("text");
    expect(typeof result.text).toBe("string");
  });

  test("stream prompt", async () => {
    const dummyPrompt = createUniqueDummyPrompt("stream");
    await promptManager.createPrompt({ prompt: dummyPrompt });
    const prompt = promptManager.getPrompt({ category: dummyPrompt.category, name: dummyPrompt.name });
    const stream = await prompt.stream({ test: "streamed" });
    let result = "";
    for await (const chunk of stream) {
      result += chunk;
    }
    expect(result).toBeTruthy();
    expect(typeof result).toBe("string");
  });

  test("list prompts", async () => {
    const dummyPrompt1 = createUniqueDummyPrompt("list1");
    const dummyPrompt2 = createUniqueDummyPrompt("list2");
    await promptManager.createPrompt({ prompt: dummyPrompt1 });
    await promptManager.createPrompt({ prompt: dummyPrompt2 });

    const prompts = await promptManager.listPrompts({ category: dummyPrompt1.category });

    const filteredPrompt1 = prompts.find(p => p.name === dummyPrompt1.name && p.category === dummyPrompt1.category);
    expect(filteredPrompt1).toBeTruthy();

    const allPrompts = await promptManager.listPrompts({});
    const filteredPrompt2 = allPrompts.find(p => p.name === dummyPrompt2.name && p.category === dummyPrompt2.category);
    expect(filteredPrompt2).toBeTruthy();
  });

  test("update prompt", async () => {
    const dummyPrompt = createUniqueDummyPrompt("update");
    await promptManager.createPrompt({ prompt: dummyPrompt });
    await promptManager.updatePrompt({
      category: dummyPrompt.category,
      name: dummyPrompt.name,
      updates: { description: "Updated description" }
    });

    const updatedPrompt = promptManager.getPrompt({ category: dummyPrompt.category, name: dummyPrompt.name });
    expect(updatedPrompt.description).toBe("Updated description");
  });

  test("delete prompt", async () => {
    const dummyPrompt = createUniqueDummyPrompt("delete");
    await promptManager.createPrompt({ prompt: dummyPrompt });
    await promptManager.deletePrompt({ category: dummyPrompt.category, name: dummyPrompt.name });

    const prompts = await promptManager.listPrompts({});
    const deletedPrompt = prompts.find(p => p.name === dummyPrompt.name && p.category === dummyPrompt.category);
    expect(deletedPrompt).toBeUndefined();
  });

  test("version management", async () => {
    const dummyPrompt = createUniqueDummyPrompt("versionManagement");
    await promptManager.createPrompt({ prompt: dummyPrompt });
    const prompt = promptManager.getPrompt({ category: dummyPrompt.category, name: dummyPrompt.name });

    const initialVersion = prompt.version;
    await promptManager.updatePrompt({
      category: dummyPrompt.category,
      name: dummyPrompt.name,
      updates: { template: "Updated template" }
    });

    const updatedPrompt = promptManager.getPrompt({ category: dummyPrompt.category, name: dummyPrompt.name });
    expect(updatedPrompt.version).not.toBe(initialVersion);

    const versions = await updatedPrompt.versions();
    expect(versions).toContain(initialVersion);
    expect(versions).toContain(updatedPrompt.version);
    expect(versions.length).toBe(2);

    await updatedPrompt.switchVersion(initialVersion);
    expect(updatedPrompt.template).toBe(dummyPrompt.template);
  });

  test("error handling - retrieve non-existent prompt", () => {
    expect(() =>
      promptManager.getPrompt({ category: "nonexistent", name: "nonexistent" })
    ).toThrow();
  });

  test("error handling - create prompt with invalid data", async () => {
    const dummyPrompt = createUniqueDummyPrompt("invalidData");
    const invalidPrompt = { ...dummyPrompt, name: "" };
    await expect(
      promptManager.createPrompt({ prompt: invalidPrompt as any })
    ).rejects.toThrow();
  });
});

```

## test/PromptProjectConfigManager.test.ts

**Description:** Tests for project configuration manager

```typescript
import { expect, test, beforeEach, afterEach, beforeAll, afterAll, describe } from "bun:test";
import { Container } from 'typedi';
import { PromptProjectConfigManager } from "../src/config/PromptProjectConfigManager";
import type { Config } from "../src/schemas/config";
import fs from "fs/promises";
import path from "path";
import { PromptFileSystem } from "../src";


describe("PromptProjectConfigManager", () => {
  let promptFileSystem: PromptFileSystem;
  let testProjectFolder: string = path.join(process.cwd(), "test-project");
  const mockConfigPath = path.join(testProjectFolder, "mock-fury-config.json");
  let originalPromptsDir: string;
  let configManager: PromptProjectConfigManager;

  beforeAll(async () => {
    const defaultConfig = {
      promptsDir: "prompts",
      outputDir: "output",
      preferredModels: ["gpt-4"],
      modelParams: {}
    };
    // await fs.writeFile(mockConfigPath, JSON.stringify(defaultConfig, null, 2));
    await fs.mkdir(testProjectFolder, { recursive: true });
    await fs.writeFile(mockConfigPath, JSON.stringify(defaultConfig, null, 2));
    await fs.mkdir(path.join(testProjectFolder, "test-prompts-2"), { recursive: true });
  });

  afterAll(async () => {
    try {
      await fs.unlink(mockConfigPath);
    } catch (error) {
      // Ignore errors if the file doesn't exist
    }
  });

  beforeEach(async () => {
    Container.reset();

    configManager = Container.get(PromptProjectConfigManager);
    await configManager.initialize();
    await configManager.updateConfig({ promptsDir: "test-prompts-2" });

    promptFileSystem = Container.get(PromptFileSystem);
    await promptFileSystem.initialize();
  });

  afterEach(async () => {
    const defaultConfig = {
      promptsDir: "prompts",
      outputDir: "output",
      preferredModels: ["gpt-4"],
      modelParams: {}
    };
    await fs.writeFile(mockConfigPath, JSON.stringify(defaultConfig, null, 2));
  });

  test("PromptProjectConfigManager initialization", async () => {
    const configManager = Container.get(PromptProjectConfigManager);

    const config = configManager.getAllConfig();
    expect(config).toBeDefined();
    expect(config.promptsDir).toBeDefined();
    expect(config.outputDir).toBeDefined();
    expect(config.preferredModels).toBeInstanceOf(Array);
    expect(config.modelParams).toBeDefined();
  });

  test("PromptProjectConfigManager updates and retrieves config", async () => {
    const configManager = Container.get(PromptProjectConfigManager);

    const newConfig: Partial<Config> = {
      promptsDir: "/new/prompts/dir",
      preferredModels: ["gpt-5", "gpt-4"],
    };

    await configManager.updateConfig(newConfig);

    expect(configManager.getConfig("promptsDir")).toBe("/new/prompts/dir");
    expect(configManager.getConfig("preferredModels")).toEqual(["gpt-5", "gpt-4"]);
  });

  test("PromptProjectConfigManager creates default config if file doesn't exist", async () => {
    await fs.unlink(mockConfigPath).catch(() => {});
    
    const configManager = Container.get(PromptProjectConfigManager);

    const config = configManager.getAllConfig();
    expect(config.promptsDir).toBeDefined();
    expect(config.outputDir).toBeDefined();
    expect(config.preferredModels).toBeInstanceOf(Array);
    expect(config.modelParams).toBeDefined();

    const fileExists = await fs.access(mockConfigPath).then(() => true).catch(() => false);
    expect(fileExists).toBe(true);
  });
});

```

## test/setupEnvs.ts

**Description:** No description available

```typescript
import fs from 'fs/promises';
import path from 'path';
// import 'reflect-metadata';


const TEST_CONFIG = {
  promptsDir: "test_prompts",
  outputDir: "test_output",
  preferredModels: ["test-model"],
  modelParams: {
    "test-model": {
      temperature: 0.5,
      maxTokens: 100
    }
  },
  version: "1.0.0",
  verbosity: 1
};

async function setupTestEnvironment() {
  const testConfigPath = path.join(process.cwd(), 'test-fury-config.json');
  await fs.writeFile(testConfigPath, JSON.stringify(TEST_CONFIG, null, 2), 'utf8');

  const testPromptsDir = path.join(process.cwd(), TEST_CONFIG.promptsDir);
  await fs.mkdir(testPromptsDir, { recursive: true });

  const testPromptsConfig = {
    version: "1.0.0",
    lastUpdated: new Date().toISOString(),
    promptCount: 0
  };
  await fs.writeFile(path.join(testPromptsDir, 'prompts-config.json'), JSON.stringify(testPromptsConfig, null, 2), 'utf8');

  process.env.FURY_PROJECT_CONFIG_FILENAME = "prompts-config.json";
  process.env.PROMPTS_DIR = TEST_CONFIG.promptsDir;
  process.env.PROMPT_MANAGER_VERBOSE = "true";
  process.env.FURY_VERBOSITY = "1"; // Add this line to set verbosity
}

setupTestEnvironment().catch(console.error);

```

## test/testsUnload.ts

**Description:** Tests for unloading modules

```typescript
import fs from 'fs/promises';
import path from 'path';

async function cleanup() {
  const dirsToRemove = ['test_prompts', 'test_output'];
  const filesToRemove = ['test-fury-config.json'];

  for (const dir of dirsToRemove) {
    await fs.rm(dir, { recursive: true, force: true })
      .then(() => console.log(`Removed ${dir}`))
      .catch(console.error);
  }

  for (const file of filesToRemove) {
    await fs.unlink(file)
      .then(() => console.log(`Removed ${file}`))
      .catch(console.error);
  }
}

// cleanup().then(() => console.log('Cleanup complete'));

```

