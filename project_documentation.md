# Project Documentation

## Project Structure

```
./src
├── cli
│   ├── aiHelpers.ts
│   ├── cli_generate.ts
│   ├── cli.ts
│   └── commands.ts
├── config
│   ├── constants.ts
│   └── PromptProjectConfigManager.ts
├── config.ts
├── generated
│   ├── index.ts
│   └── promptManagerBase.ts
├── generated.ts
├── index.ts
├── initializationManager.ts
├── promptFileSystem.ts
├── PromptManagerClientGenerator.ts
├── promptManager.ts
├── promptModel.ts
├── schemas
│   ├── config.ts
│   └── prompts.ts
├── scripts
│   └── generatePromptManager.ts
├── types
│   ├── index.ts
│   └── interfaces.ts
└── utils
    ├── cache.ts
    ├── fileUtils.ts
    ├── jsonSchemaToZod.ts
    └── versionUtils.ts

7 directories, 25 files
```

## src/promptManager.ts

**Description:** Main class for managing prompts

```typescript
import { IPromptCategory, IPrompt, IPromptInput, IPromptOutput } from './types/interfaces';
import { PromptModel } from './promptModel';
import { getFileSystemManager, PromptFileSystem } from './promptFileSystem';
import path from 'path';
import { incrementVersion } from './utils/versionUtils';
import { getConfigManager, PromptProjectConfigManager } from './config/PromptProjectConfigManager';

let fileSystem: PromptFileSystem;
let configManager: PromptProjectConfigManager;

/**
 * PromptManager is the central class for managing prompts.
 * It provides methods for creating, retrieving, updating, and deleting prompts,
 * as well as managing prompt versions and formatting.
 * 
 * This class serves as the main interface for interacting with prompts in the application.
 * It handles the in-memory storage of prompts and coordinates with the file system for persistence.
 */
export class PromptManager<
  TInput extends IPromptInput<Record<string, any>> = IPromptInput<Record<string, any>>,
  TOutput extends IPromptOutput<Record<string, any> & string> = IPromptOutput<Record<string, any> & string>
> {
  private static instance: PromptManager;
  // Store prompts in a nested structure: category -> prompt name -> PromptModel
  public prompts: Record<string, Record<string, PromptModel<any, any>>> = {};
  private initialized: boolean = false;

  private constructor() {
    // The initialization will be done in the initialize method
  }

  public static async getInstance(): Promise<PromptManager> {
    if (!PromptManager.instance) {
      PromptManager.instance = new PromptManager();
      await PromptManager.instance.initialize();
    }
    return PromptManager.instance;
  }

  /**
   * Initialize the PromptManager by loading all prompts from the file system.
   * This method is called automatically by getInstance().
   * 
   * Purpose: Set up the PromptManager with all existing prompts for further operations.
   * 
   * @throws Error if there's a failure in loading prompts from the file system
   */
  private async initialize(): Promise<void> {
    if (this.initialized) return;

    configManager = await getConfigManager();
    fileSystem = await getFileSystemManager();
    try {
      const prompts = await fileSystem.listPrompts();
      for (const prompt of prompts) {
        if (!this.prompts[prompt.category]) {
          this.prompts[prompt.category] = {};
        }
        try {
          const promptData = await fileSystem.loadPrompt({ category: prompt.category, promptName: prompt.name });
          this.prompts[prompt.category][prompt.name] = new PromptModel(promptData) as unknown as PromptModel<TInput, TOutput>;
        } catch (error) {
          console.error(`Failed to load prompt ${prompt.category}/${prompt.name}:`, error);
          // Continue loading other prompts even if one fails
        }
      }
      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize PromptManager:', error);
      throw new Error(`Failed to initialize PromptManager: ${error instanceof Error ? error.message : String(error)}`);
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
    if (!prompt.category || !prompt.name || prompt.category.trim() === '' || prompt.name.trim() === '') {
      throw new Error('Prompt category and name are required and cannot be empty');
    }
    if (!this.prompts[prompt.category]) {
      // Create the category if it doesn't exist
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
    await fileSystem.savePrompt({ promptData: newPrompt as IPrompt<Record<string, any>, Record<string, any>> });
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
    const { category, name, updates, bumpVersion } = props;
    const prompt = this.getPrompt({ category, name });
    Object.assign(prompt, updates);
    prompt.updateMetadata({ lastModified: new Date().toISOString() });

    if (bumpVersion) {
      prompt.version = this.incrementVersion(prompt.version);
    }

    await fileSystem.savePrompt({ promptData: prompt as IPrompt<Record<string, any>, Record<string, any>> });
  }

  /**
   * Delete a prompt from both the in-memory storage and the file system.
   * Purpose: Remove a prompt entirely from the manager and persistent storage.
   */
  async deletePrompt(props: { category: string; name: string }): Promise<void> {
    const { category, name } = props;
    if (!this.prompts[category] || !this.prompts[category][name]) {
      throw new Error(`Prompt "${name}" in category "${category}" does not exist`);
    }
    delete this.prompts[category][name];
    await fileSystem.deletePrompt({ category, promptName: name });
  }

  async listPrompts(props: { category?: string }): Promise<Array<IPrompt<IPromptInput, IPromptOutput> & { filePath: string }>> {
    const prompts = props.category
      ? Object.values(this.prompts[props.category] || {})
      : Object.values(this.prompts).flatMap(categoryPrompts => Object.values(categoryPrompts));

    return prompts.map(prompt => {
      const promptData = prompt as unknown as IPrompt<IPromptInput, IPromptOutput>;
      return {
        ...promptData,
        filePath: promptData.category && promptData.name
          ? path.join((fileSystem as any).basePath, promptData.category, promptData.name, 'prompt.json')
          : ''
      };
    });
  }

  /**
   * Manage prompt versions: list, create, or switch to a specific version.
   * Purpose: Provide version control functionality for prompts.
   */
  async versionPrompt(props: { action: 'list' | 'create' | 'switch'; category: string; name: string; version?: string }): Promise<void> {
    const { action, category, name, version } = props;
    const prompt = this.getPrompt({ category, name });

    switch (action) {
      case 'list':
        const versions = await prompt.versions();
        console.log(`Versions for ${category}/${name}:`, versions);
        break;
      case 'create':
        const newVersion = this.incrementVersion(prompt.version);
        prompt.version = newVersion;
        await fileSystem.savePrompt({ promptData: prompt as IPrompt<Record<string, any>, Record<string, any>> });
        console.log(`Created new version ${newVersion} for ${category}/${name}`);
        break;
      case 'switch':
        if (!version) {
          throw new Error(`Version is required for switch action`);
        }
        await prompt.switchVersion(version);
        await fileSystem.savePrompt({ promptData: prompt });
        console.log(`Switched ${category}/${name} to version ${version}`);
        break;
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

let promptManager;

(async () => {
  promptManager = await PromptManager.getInstance();
})();

export { promptManager };

```

## src/promptModel.ts

**Description:** Model representation of a prompt

```typescript
import { IPromptModel, IPromptModelRequired, IPromptModelStatic, IPromptInput, IPromptOutput, IAsyncIterableStream, IPromptFileSystem, IPrompt } from './types/interfaces';
import { JSONSchema7 } from 'json-schema';
import { generateText, generateObject, streamText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';
import { PromptFileSystem } from './promptFileSystem';
import { jsonSchemaToZod } from './utils/jsonSchemaToZod';
import { incrementVersion, compareVersions } from './utils/versionUtils';

// Declare fileSystem variable
let fileSystem: PromptFileSystem;

// Initialize fileSystem in an async function
async function initializeFileSystem() {
  fileSystem = await PromptFileSystem.getInstance();
}

// Call the initialization function
initializeFileSystem().catch(error => {
  console.error('Failed to initialize PromptFileSystem:', error);
});

/**
 * Represents a single prompt model with all its properties and methods.
 * 
 * Purpose: Encapsulate all data and behavior related to a specific prompt,
 * including validation, formatting, and execution.
 * 
 * This class is the core representation of a prompt in the system, handling
 * all operations specific to an individual prompt, such as formatting,
 * validation, execution, and version management.
 */
import path from 'path';
import { getConfigManager } from './config/PromptProjectConfigManager';

const configManager = await getConfigManager();

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

  get filePath(): string {
    const promptsDir = configManager.getConfig('promptsDir');
    return path.join(promptsDir, this.category, this.name, 'prompt.json');
  }

  /**
   * Create a new PromptModel instance.
   * 
   * Purpose: Initialize a new prompt with all necessary data.
   * 
   * @param promptData Required data to initialize the prompt
   * @throws Error if required fields are missing in promptData
   */
  constructor(promptData: IPromptModelRequired) {
    if (!promptData.name || !promptData.category || !promptData.description || !promptData.template) {
      throw new Error('Invalid prompt data: missing required fields');
    }
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
    this.configuration = this.initializeConfiguration();
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
    if (!fileSystem) {
      throw new Error('FileSystem is not initialized. Cannot save prompt.');
    }
    let retries = 3;
    while (retries > 0) {
      try {
        const currentVersion = await fileSystem.getCurrentVersion(this);
        if (compareVersions(currentVersion, this.version) > 0) {
          // Merge logic here
          // For now, we'll just increment the version
          this.version = incrementVersion(currentVersion);
        }
        const updatedPromptData = this as unknown as IPrompt<Record<string, any>, Record<string, any>>;
        await fileSystem.savePrompt({ promptData: updatedPromptData });
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
    const promptData = await fileSystem.loadPrompt({ category: this.category, promptName: this.name });
    Object.assign(this, promptData);
    this._isSaved = true;
  }

  async versions(): Promise<string[]> {
    return fileSystem.getPromptVersions({ category: this.category, promptName: this.name });
  }

  public async rollbackToVersion(version: string): Promise<void> {
    try {
      const versionData = await fileSystem.loadPromptVersion({ category: this.category, promptName: this.name, version });
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
    const versionData = await fileSystem.loadPromptVersion({ category: this.category, promptName: this.name, version });
    Object.assign(this, versionData);
    this._isSaved = true;
  }

  get isSaved(): boolean {
    return this._isSaved;
  }

  static async loadPromptByName(name: string): Promise<PromptModel> {
    const [category, promptName] = name.split('/');
    const promptData = await fileSystem.loadPrompt({ category, promptName });
    const prompt = new PromptModel(promptData as IPromptModelRequired);
    prompt.isLoadedFromStorage = true;
    return prompt;
  }

  static async promptExists(name: string): Promise<boolean> {
    const [category, promptName] = name.split('/');
    return fileSystem.promptExists({ category, promptName });
  }

  static async listPrompts(category?: string): Promise<Array<{ name: string; category: string; filePath: string }>> {
    return await fileSystem.listPrompts({ category });
  }

  static async deletePrompt(category: string, name: string): Promise<void> {
    const fs = await PromptFileSystem.getInstance();
    await fs.deletePrompt({ category, promptName: name });
  }
}

```

## src/promptFileSystem.ts

**Description:** Handles file system operations for prompts

```typescript
import fs from 'fs/promises';
import path from 'path';
import { IPromptFileSystem, IPrompt, IPromptInput, IPromptOutput, IPromptModelRequired, IPromptsFolderConfig } from './types/interfaces';
import { getConfigManager } from './config/PromptProjectConfigManager';
import debug from 'debug';

const log = debug('fury:promptFileSystem');
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
export class PromptFileSystem implements IPromptFileSystem {
  private static instance: PromptFileSystem;
  private basePath: string = '';
  private initialized: boolean = false;

  private constructor() {
    log(`PromptFileSystem constructor called`);
  }

  public isInitialized(): boolean {
    return this.initialized;
  }

  getFilePath(props: { category: string; promptName: string }): string {
    const { category, promptName } = props;
    return path.join(this.basePath, category, promptName, DEFAULT_PROMPT_FILENAME);
  }

  getVersionFilePath(props: { category: string; promptName: string; version: string }): string {
    const { category, promptName, version } = props;
    return path.join(this.basePath, category, promptName, '.versions', `v${version}.json`);
  }

  public static async getInstance(): Promise<PromptFileSystem> {
    if (!PromptFileSystem.instance) {
      PromptFileSystem.instance = new PromptFileSystem();
      await PromptFileSystem.instance.initialize();
    }
    return PromptFileSystem.instance;
  }

  public static async getInitializedInstance(): Promise<PromptFileSystem> {
    const instance = await PromptFileSystem.getInstance();
    await instance.initialize();
    return instance;
  }

  private async initialize(): Promise<void> {
    if (this.initialized) return;

    const configManager = await getConfigManager();
    this.basePath = configManager.getConfig('promptsDir');
    log(`Initializing PromptFileSystem with basePath: ${this.basePath}`);

    try {
      await fs.access(this.basePath);
      const stats = await fs.stat(this.basePath);
      if (!stats.isDirectory()) {
        throw new Error(`${this.basePath} is not a directory`);
      }
    } catch (error) {
      log(`Error accessing prompts directory: ${error instanceof Error ? error.message : String(error)}`);
      throw new Error(`Invalid prompts directory: ${this.basePath}. Please check your configuration.`);
    }

    await fs.mkdir(this.basePath, { recursive: true });
    await this.initializePromptsFolderConfig();
    const isValid = await this.validatePromptsFolderConfig();
    if (!isValid) {
      log('Prompts folder configuration is invalid. Reinitializing...');
      await this.initializePromptsFolderConfig();
    }
    this.initialized = true;
    log('PromptFileSystem initialization complete');
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      const timeout = 30000; // 30 seconds timeout
      const startTime = Date.now();
      while (!this.initialized && Date.now() - startTime < timeout) {
        await new Promise(resolve => setTimeout(resolve, 100)); // Wait for 100ms
      }
      if (!this.initialized) {
        throw new Error('PromptFileSystem initialization timed out. Please check for any issues preventing initialization.');
      }
    }
  }

  private async initializePromptsFolderConfig(): Promise<void> {
    const configPath = path.join(this.basePath, DEFAULT_PROMPTS_FOLDER_CONFIG_FILENAME);
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
    const configPath = path.join(this.basePath, DEFAULT_PROMPTS_FOLDER_CONFIG_FILENAME);
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
    const configPath = path.join(this.basePath, DEFAULT_PROMPTS_FOLDER_CONFIG_FILENAME);
    const currentConfig = await this.getPromptsFolderConfig();
    const updatedConfig = { ...currentConfig, ...updates, lastUpdated: new Date().toISOString() };
    await fs.writeFile(configPath, JSON.stringify(updatedConfig, null, 2));
  }

  private async getPromptsFolderConfig(): Promise<IPromptsFolderConfig> {
    const configPath = path.join(this.basePath, DEFAULT_PROMPTS_FOLDER_CONFIG_FILENAME);
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

    const filePath = path.join(this.basePath, validatedPromptData.category, validatedPromptData.name, DEFAULT_PROMPT_FILENAME);
    let release;
    try {
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      release = await lockfile.lock(path.dirname(filePath));

      const versionFilePath = path.join(this.basePath, validatedPromptData.category, validatedPromptData.name, '.versions', `v${validatedPromptData.version}.json`);
      await fs.mkdir(path.dirname(versionFilePath), { recursive: true });

      const existingPrompt = await this.loadPrompt({ category: validatedPromptData.category, promptName: validatedPromptData.name }).catch(() => null);

      await fs.writeFile(filePath, JSON.stringify(validatedPromptData, null, 2));
      await fs.writeFile(versionFilePath, JSON.stringify(validatedPromptData, null, 2));

      const typeDefinitionPath = path.join(path.dirname(filePath), DEFAULT_TYPE_DEFINITION_FILENAME);
      await this.generateTypeDefinitionFile(validatedPromptData, typeDefinitionPath);

      const versionsPath = path.join(this.basePath, validatedPromptData.category, validatedPromptData.name, '.versions');
      await fs.mkdir(versionsPath, { recursive: true });
      const versions = await this.getPromptVersions({ category: validatedPromptData.category, promptName: validatedPromptData.name });
      if (!versions.includes(validatedPromptData.version)) {
        versions.push(validatedPromptData.version);
        versions.sort((a, b) => this.compareVersions(b, a));
      }
      await fs.writeFile(path.join(versionsPath, 'versions.json'), JSON.stringify(versions, null, 2));

      if (!existingPrompt) {
        const config = await this.getPromptsFolderConfig();
        await this.updatePromptsFolderConfig({ promptCount: config.promptCount + 1 });
      }
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('ENOSPC')) {
          throw new Error(`Insufficient disk space to save prompt: ${filePath}`);
        } else if (error.message.includes('EACCES')) {
          throw new Error(`Insufficient permissions to save prompt: ${filePath}`);
        } else if (error.message.includes('EBUSY')) {
          throw new Error(`File is locked or in use: ${filePath}`);
        } else {
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
    const filePath = path.join(this.basePath, category, promptName, DEFAULT_PROMPT_FILENAME);

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
    this.ensureInitialized();
    log(`Listing prompts. Category: ${category || 'All'}`);
    log(`Base path: ${this.basePath}`);

    try {
      const searchPath = category ? path.join(this.basePath, category) : this.basePath;
      log(`Search path: ${searchPath}`);

      const entries = await fs.readdir(searchPath, { withFileTypes: true });
      log(`Found ${entries.length} entries in search path`);

      const prompts: PromptModel[] = [];
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const categoryPath = category ? category : entry.name;
          const promptDir = path.join(this.basePath, categoryPath);
          log(`Processing category: ${categoryPath}`);
          try {
            const promptEntries = await fs.readdir(promptDir, { withFileTypes: true });
            log(`Found ${promptEntries.length} entries in category ${categoryPath}`);

            for (const promptEntry of promptEntries) {
              if (promptEntry.isDirectory()) {
                const promptJsonPath = path.join(promptDir, promptEntry.name, DEFAULT_PROMPT_FILENAME);
                log(`Processing prompt: ${promptEntry.name}`);
                try {
                  await fs.access(promptJsonPath);
                  const promptData = await this.loadPrompt({ category: categoryPath, promptName: promptEntry.name });
                  const promptModel = new PromptModel(promptData as IPromptModelRequired);
                  prompts.push(promptModel);
                  log(`Successfully loaded prompt: ${promptEntry.name}`);
                } catch (error) {
                  const promptPath = path.join(promptDir, promptEntry.name, DEFAULT_PROMPT_FILENAME);
                  log(`Failed to load prompt from ${promptPath}: ${error instanceof Error ? error.message : String(error)}`);
                  console.warn(`Failed to load prompt from ${promptPath}: ${error instanceof Error ? error.message : String(error)}. 
                    This prompt will be skipped. This could be due to:
                    1. Corrupted prompt file.
                    2. Incompatible prompt structure from an older version.
                    
                    To resolve this:
                    - Check the contents of ${promptPath} for any obvious issues.
                    - Try running the 'validate-prompts' command to identify and fix structural issues.
                    - If the prompt is important, consider manually recreating it using the 'create' command.
                    - Remove this prompt file if it's no longer needed.`);
                }
              }
            }
          } catch (error) {
            log(`Failed to read prompt directory at ${promptDir}: ${error instanceof Error ? error.message : String(error)}`);
            console.warn(`Failed to read prompt directory at ${promptDir}: ${error instanceof Error ? error.message : String(error)}. 
              This directory will be skipped. Please check if the directory exists and you have the necessary permissions. 
              If this is a critical directory, you may need to manually recreate it or restore from a backup.`);
          }
        }
      }
      log(`Successfully listed ${prompts.length} prompts`);
      return prompts;
    } catch (error) {
      log(`Failed to list prompts: ${error instanceof Error ? error.message : String(error)}`);
      console.error(`Failed to list prompts: ${error instanceof Error ? error.message : String(error)}`);
      throw new Error(`Failed to list prompts: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async listCategories(): Promise<string[]> {
    const entries = await fs.readdir(this.basePath, { withFileTypes: true });
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
    const versionsPath = path.join(this.basePath, category, promptName, '.versions');
    try {
      const versionsFile = path.join(versionsPath, 'versions.json');
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
    const promptDir = path.join(this.basePath, category, promptName);
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
    const oldPath = path.join(this.basePath, currentCategory, currentName);
    const newPath = path.join(this.basePath, newCategory, newName);

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
    const categoryPath = path.join(this.basePath, categoryName);
    await fs.mkdir(categoryPath, { recursive: true });
  }

  async deleteCategory(props: { categoryName: string }): Promise<void> {
    const { categoryName } = props;
    const categoryPath = path.join(this.basePath, categoryName);
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

export const getFileSystemManager = async (): Promise<PromptFileSystem> => {
  return PromptFileSystem.getInstance();
};

```

## src/config/PromptProjectConfigManager.ts

**Description:** Manages project configuration

```typescript
import fs from 'fs/promises';
import path from 'path';
import chalk from 'chalk';
import { IPromptProjectConfigManager, IPromptsFolderConfig } from '../types/interfaces';
import { getDefaultPromptsPath, getProjectRoot } from './constants';
import debug from 'debug';

const log = debug('fury:config');
import { ensureDirectoryExists } from '../utils/fileUtils';
import { configSchema, DEFAULT_CONFIG, z } from '../schemas/config';
import type { Config } from '../schemas/config';
import { PromptFileSystem, DEFAULT_PROMPTS_FOLDER_CONFIG_FILENAME } from '../promptFileSystem';

export type { Config };

/**
 * PromptProjectConfigManager is responsible for managing the configuration of the prompt project.
 * It implements the Singleton pattern to ensure only one instance of the configuration manager exists.
 */
// Helper function for deep merging objects
function deepMerge(target: any, source: any): any {
  if (typeof target !== 'object' || target === null) {
    return source;
  }

  Object.keys(source).forEach(key => {
    if (source[key] instanceof Object) {
      target[key] = deepMerge(target[key] || {}, source[key]);
    } else {
      target[key] = source[key];
    }
  });

  return target;
}

export class PromptProjectConfigManager implements IPromptProjectConfigManager {
  private configPath: string;
  private config: Config;
  private initialized: boolean = false;
  private static instance: PromptProjectConfigManager;
  private basePath: string;
  private verbosity: number = 0;

  /**
   * Constructor for PromptProjectConfigManager.
   * @param configPath Optional path to the configuration file
   */
  constructor(configPath?: string) {
    const configFileName = process.env.FURY_PROJECT_CONFIG_FILENAME || process.env.FURY_CONFIG_FILENAME || 'fury-config.json';
    this.basePath = getProjectRoot();
    this.configPath = configPath || path.resolve(this.basePath, configFileName);
    this.config = { ...DEFAULT_CONFIG };
    log(`Initializing PromptProjectConfigManager with basePath: ${this.basePath}`);
    log(`Config path: ${this.configPath}`);
    this.performIntegrityCheck();
  }

  public getBasePath(): string {
    return this.basePath;
  }

  public setVerbosity(level: number): void {
    this.verbosity = level;
  }

  public getVerbosity(): number {
    return this.verbosity;
  }

  public static async getInstance(configPath?: string): Promise<PromptProjectConfigManager> {
    if (!PromptProjectConfigManager.instance) {
      PromptProjectConfigManager.instance = new PromptProjectConfigManager(configPath);
      await PromptProjectConfigManager.instance.initialize();
    }
    return PromptProjectConfigManager.instance;
  }


  /**
   * Initialize the configuration manager.
   * This method loads the configuration, ensures necessary directories exist, and prints the loaded configuration.
   */
  private async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      await this.loadConfig();
      await this.ensureConfigDirectories();
      await this.initializePromptsFolderConfig();
      await this.validatePromptsFolder();
      this.prettyPrintConfig();
      this.initialized = true;
    } catch (error: any) {
      console.error(chalk.red('Failed to initialize config:'), error.message);
      throw error;
    }
  }

  /**
   * Checks if the configuration manager has been initialized.
   * @returns A promise that resolves to true if initialized, false otherwise.
   */
  public async isInitialized(): Promise<boolean> {
    const timeout = 30000; // 30 seconds timeout
    const startTime = Date.now();
    while (!this.initialized && Date.now() - startTime < timeout) {
      await new Promise(resolve => setTimeout(resolve, 100)); // Wait for 100ms
    }
    return this.initialized;
  }

  private async ensureInitialized(): Promise<void> {
    if (!await this.isInitialized()) {
      throw new Error('PromptProjectConfigManager is not initialized. Please check for any issues preventing initialization.');
    }
  }

  private async performIntegrityCheck(): Promise<void> {
    try {
      await this.loadConfig();
      const result = configSchema.safeParse(this.config);
      if (!result.success) {
        throw new Error(`Config validation failed: ${result.error.message}`);
      }
      await this.ensureConfigDirectories();
      console.log(chalk.green('✔ Configuration integrity check passed'));
    } catch (error: any) {
      if (error instanceof Error && error.message.includes('Project not initialized')) {
        console.warn(chalk.yellow('⚠ Configuration file not found. Project needs to be initialized.'));
        throw error;
      } else if (error instanceof z.ZodError || error.message.includes('Config validation failed')) {
        console.error(chalk.red('Invalid configuration file:'), error.message);
        throw new Error(`Invalid configuration file. This could be due to:
          1. Manual edits that introduced errors.
          2. Partial updates that left the config in an inconsistent state.
          
          To resolve this:
          - Review your fury-config.json file for any obvious mistakes.
          - Run the 'config --reset' command to restore default settings.
          - If you need to keep your current settings, use 'config --validate' to get more details on the specific issues.`);
      } else {
        console.error(chalk.red('Configuration integrity check failed:'), error.message);
        throw error;
      }
    }
  }

  private async initializePromptsFolderConfig(): Promise<void> {
    const configPath = path.join(this.basePath, DEFAULT_PROMPTS_FOLDER_CONFIG_FILENAME);
    try {
      await fs.access(configPath);
      console.log(chalk.green('✔ Prompts folder configuration already exists'));
    } catch (error) {
      console.log(chalk.yellow('⚠ Prompts folder configuration not found. Creating a default one...'));
      const defaultConfig: IPromptsFolderConfig = {
        version: "1.0.0",
        lastUpdated: new Date().toISOString(),
        promptCount: 0
      };
      await fs.writeFile(configPath, JSON.stringify(defaultConfig, null, 2));
      console.log(chalk.green('✔ Created default prompts folder configuration'));
    }
  }

  private async validatePromptsFolder(): Promise<void> {
    const promptFileSystem = await PromptFileSystem.getInstance();

    const isValid = await promptFileSystem.validatePromptsFolderConfig();
    if (!isValid) {
      console.error(chalk.red('Error: Prompts folder is not properly initialized or has an invalid configuration.'));
      console.error(chalk.yellow('Please make sure you have run the initialization command for your prompts folder.'));
      console.error(chalk.yellow('If you believe this is an error, check that the promptsDir path in your configuration is correct.'));
      throw new Error('Invalid prompts folder configuration');
    }
  }

  private async ensureConfigDirectories(): Promise<void> {
    const projectRoot = process.env.FURY_PROJECT_ROOT || process.cwd();
    try {
      await ensureDirectoryExists(path.resolve(projectRoot, this.config.promptsDir));
      console.log(chalk.green(`✔ Created prompts directory: ${this.config.promptsDir}`));
      await ensureDirectoryExists(path.resolve(projectRoot, this.config.outputDir));
      console.log(chalk.green(`✔ Created output directory: ${this.config.outputDir}`));
    } catch (error: any) {
      console.error(chalk.red('Error: Failed to create necessary directories.'));
      console.error(chalk.yellow('Please check that you have write permissions in the project directory.'));
      throw new Error(`Failed to create directories: ${error.message}`);
    }
  }

  private async loadConfig(): Promise<void> {
    try {
      log(`Loading configuration from ${this.configPath}`);
      const configData = await fs.readFile(this.configPath, 'utf-8');
      const parsedConfig = JSON.parse(configData);

      // Merge parsed config with default config to ensure all required fields are present
      const mergedConfig = deepMerge(DEFAULT_CONFIG, parsedConfig);

      const validatedConfig = configSchema.parse(mergedConfig);
      this.config = {
        ...validatedConfig,
        promptsDir: path.resolve(this.basePath, validatedConfig.promptsDir),
        outputDir: path.resolve(this.basePath, validatedConfig.outputDir),
      };
      log('Configuration loaded successfully');
      log(`Prompts directory: ${this.config.promptsDir}`);
      log(`Output directory: ${this.config.outputDir}`);
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        console.error(chalk.red('Configuration file not found. Project needs to be initialized.'));
        throw new Error(`Project not initialized. Configuration file not found at ${this.configPath}. Please run the initialization command first.`);
      } else if (error instanceof z.ZodError) {
        console.error(chalk.red('Invalid configuration file:'), error.errors);
        const invalidFields = error.errors.map(err => err.path.join('.'));
        throw new Error(`Invalid configuration file at ${this.configPath}: ${error.message}. Invalid fields: ${invalidFields.join(', ')}. Please check these fields and ensure they match the expected schema.`);
      } else if (error instanceof SyntaxError) {
        console.error(chalk.red('Invalid JSON in configuration file:'), error);
        throw new Error(`Invalid JSON in configuration file at ${this.configPath}: ${error.message}. Please check the file contents and ensure it is valid JSON.`);
      } else {
        console.error(chalk.red('Failed to load configuration:'), error);
        throw new Error(`Failed to load configuration from ${this.configPath}: ${error instanceof Error ? error.message : String(error)}. This could be due to a corrupted configuration file or insufficient permissions.`);
      }
    }
  }

  private prettyPrintConfig(): void {
    if (this.verbosity > 0) {
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
      console.log(chalk.white('verbosity:        ') + chalk.cyan(this.verbosity));
      console.log('\n');
    }
  }

  private async saveConfig(): Promise<void> {
    try {
      const configData = JSON.stringify(this.config, null, 2);
      await fs.writeFile(this.configPath, configData, 'utf-8');
      console.log('Configuration saved successfully.');
    } catch (error: any) {
      console.error('Failed to save configuration:', error);
      throw new Error(`Failed to save configuration to ${this.configPath}: ${error.message}. 
        This could be due to insufficient permissions or disk space. 
        Please check your file system permissions and available storage. 
        If the issue persists, try saving to a different location or contact your system administrator.`);
    }
  }

  public async updateConfig(newConfig: Partial<Config>): Promise<void> {
    try {
      const updatedConfig = configSchema.parse(deepMerge(this.config, newConfig));

      this.config = updatedConfig;
      await this.saveConfig();
      await this.ensureConfigDirectories();
      this.prettyPrintConfig();
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        console.error('Invalid configuration update:', error.errors);
        throw new Error(`Invalid configuration update: ${error.message}`);
      }
      throw error;
    }
  }

  public getConfig<K extends keyof Config>(key: K): Config[K] {
    return this.config[key];
  }

  public getConfigTyped<K extends keyof Config>(key: K): Config[K] {
    return this.config[key];
  }

  public getAllConfig(): Config {
    return { ...this.config };
  }

  public async setConfig<K extends keyof Config>(key: K, value: Config[K]): Promise<void> {
    try {
      const updatedConfig = { ...this.config, [key]: value };
      const validatedConfig = configSchema.parse(updatedConfig);
      this.config = validatedConfig;
      await this.saveConfig();
      await this.ensureConfigDirectories();
      this.prettyPrintConfig();
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        console.error('Invalid configuration update:', error.errors);
        throw new Error(`Invalid configuration update: ${error.message}`);
      }
      throw error;
    }
  }
}

export const getConfigManager = () => PromptProjectConfigManager.getInstance();

```

## src/cli/cli.ts

**Description:** Command-line interface for the prompt manager

```typescript
#!/usr/bin/env bun

import { Command } from 'commander';
import { input, confirm, select, expand, search } from '@inquirer/prompts';
import chalk from 'chalk';
import { createPrompt, listPrompts, updatePrompt, generateTypes, getStatus, getPromptDetails, getGeneratedTypes, getDetailedStatus, deletePrompt } from './commands.js';
import { Table } from 'console-table-printer';
import fs from 'fs-extra';
import { TextEncoder, TextDecoder } from 'util';
import { getConfigManager } from "../config/PromptProjectConfigManager"
import { PromptModel } from '../promptModel.js';

// Add TextEncoder and TextDecoder to the global object
(global as any).TextEncoder = TextEncoder;
(global as any).TextDecoder = TextDecoder;

async function initializeConfig() {
  try {
    // check if all deps are initialized
    if (!(await getConfigManager()).isInitialized()) {
      log.error('Project is not initialized. Please run the "init" command first.');
      process.exit(1);
    }
  } catch (error) {
    log.error('Failed to initialize configuration:');
    console.error(error);
    process.exit(1);
  }
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
  .hook('preAction', async () => {
    await initializeConfig();
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
      const configManager = await getConfigManager();
      // Check if the project is initialized
      if (!await configManager.isInitialized()) {
        throw new Error('Project is not initialized. Please run the "init" command first.');
      }

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
      const promptExists = await PromptModel.promptExists(name);
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
import { PromptManager } from '../promptManager';
import { PromptModel } from '../promptModel';
import fs from 'fs-extra';
import path from 'path';
import { input, confirm, select } from '@inquirer/prompts';
import { generatePromptWithAI, updatePromptWithAI, prettyPrintPrompt } from './aiHelpers';
import { IPrompt, IPromptInput, IPromptOutput } from '../types/interfaces';
import { getConfigManager } from '../config/PromptProjectConfigManager';
import { z } from 'zod';
import { PromptSchema } from '../schemas/prompts';

let promptManager: PromptManager;

/**
 * This file contains the implementation of various CLI commands for the Prompt Manager.
 * Each function represents a different command that can be executed from the command line.
 */

/**
 * Create a new prompt with AI assistance.
 * Purpose: Guide the user through creating a new prompt, leveraging AI for content generation and refinement.
 * @returns A Promise that resolves when the prompt creation process is complete.
 */
export async function createPrompt(): Promise<void> {
  promptManager = await PromptManager.getInstance();
  let promptData: Partial<IPrompt<IPromptInput, IPromptOutput>> = {};
  try {
    let accepted = false;

    const description = await input({ message: 'Describe the prompt you want to create:' });

    while (!accepted) {
      promptData = await generatePromptWithAI(description);
      prettyPrintPrompt(promptData);

      // Validate required fields before asking for acceptance
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

    // Validate the AI-generated prompt data
    const validatedPromptData = PromptSchema.parse(promptData);

    const prompt = new PromptModel({
      ...validatedPromptData,
      name: validatedPromptData.name,
      category: validatedPromptData.category,
      description: validatedPromptData.description || '',
      template: validatedPromptData.template || '',
      parameters: validatedPromptData.parameters || [],
      inputSchema: validatedPromptData.inputSchema || {},
      outputSchema: validatedPromptData.outputSchema || {},
      version: validatedPromptData.version || '1.0.0',
      metadata: {
        created: new Date().toISOString(),
        lastModified: new Date().toISOString(),
      }
    });

    await promptManager.createPrompt({ prompt });
    console.log(`Prompt "${prompt.name}" created successfully.`);
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
    throw error; // Re-throw the error to be caught by the caller
  }
}

/**
 * List all available prompts.
 * Purpose: Provide an overview of all prompts in the system for user reference.
 */
export async function listPrompts(): Promise<Array<{ name: string; category: string; version: string; filePath: string }>> {
  const prompts = await promptManager.listPrompts({});

  if (prompts.length === 0) {
    console.log('No prompts found. Use the "create" command to add new prompts.');
  }

  return prompts.map(prompt => ({
    name: prompt.name,
    category: prompt.category,
    version: prompt.version || '1.0.0', // Default to '1.0.0' if version is not available
    filePath: prompt.filePath || ''
  }));
}

/**
 * Retrieve detailed information about a specific prompt.
 * Purpose: Allow users to inspect the properties and content of a particular prompt.
 */
export async function getPromptDetails(props: { category: string; name: string }): Promise<Partial<IPrompt<IPromptInput, IPromptOutput>>> {
  const manager = await PromptManager.getInstance();
  const prompt = await manager.getPrompt(props);
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

/**
 * Update an existing prompt, optionally using AI for content refinement.
 * Purpose: Allow users to modify prompt properties and content, with AI assistance if desired.
 */
export async function updatePrompt(props: { category: string; name: string; updates: Partial<IPrompt<IPromptInput, IPromptOutput>> }): Promise<void> {
  const { category, name, updates } = props;

  if (!category || !name) {
    throw new Error('Category and name are required for updating a prompt');
  }

  if (Object.keys(updates).length === 0) {
    throw new Error('No updates provided');
  }

  // Validate specific fields in updates
  if (updates.version && !/^\d+\.\d+\.\d+$/.test(updates.version)) {
    throw new Error('Invalid version format. Use semantic versioning (e.g., 1.0.0)');
  }

  try {
    const manager = await PromptManager.getInstance();

    // Fetch the current prompt
    const currentPrompt = await manager.getPrompt({ category: props.category, name: props.name });

    if (!currentPrompt) {
      throw new Error(`Prompt "${props.category}/${props.name}" not found.`);
    }

    // Determine the type of update (major, minor, or patch)
    const updateType = await select({
      message: 'What type of update is this?',
      choices: [
        { name: 'Patch (backwards-compatible bug fixes)', value: 'patch' },
        { name: 'Minor (backwards-compatible new features)', value: 'minor' },
        { name: 'Major (breaking changes)', value: 'major' },
      ],
    });

    if (props.updates.template) {
      const useAI = await confirm({ message: 'Do you want to use AI to refine the new content?' });
      if (useAI) {
        const query = 'Refine and improve this prompt content:';
        const refinedPrompt = await updatePromptWithAI({ ...currentPrompt, ...props.updates, category: props.category, name: props.name } as IPrompt<IPromptInput, IPromptOutput>, query);
        props.updates.template = refinedPrompt.template;
      }
    }

    // Update the lastModified metadata
    props.updates.metadata = {
      ...currentPrompt.metadata,
      lastModified: new Date().toISOString()
    };

    // Validate the updated prompt data
    const updatedPromptData = { ...currentPrompt, ...props.updates };
    const validatedPromptData = PromptSchema.parse(updatedPromptData);

    // Confirm changes with the user
    console.log('Proposed changes:');
    console.log(JSON.stringify(props.updates, null, 2));
    const confirmUpdate = await confirm({ message: 'Do you want to apply these changes?' });

    if (confirmUpdate) {
      // Update the version only if the user confirms the changes
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

      await manager.updatePrompt({ category: props.category, name: props.name, updates: validatedPromptData });
      console.log(`Prompt "${props.category}/${props.name}" updated successfully to version ${validatedPromptData.version}.`);
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

/**
 * Generate TypeScript type definitions for all prompts.
 * Purpose: Create type-safe interfaces for using prompts in TypeScript projects.
 */
export async function generateTypes(): Promise<void> {
  const configManager = await getConfigManager();
  const outputDir = configManager.getConfig('outputDir');
  const manager = await PromptManager.getInstance();
  const prompts = await manager.listPrompts({});
  let typeDefs = 'declare module "prompt-manager" {\n';

  for (const prompt of prompts) {
    const promptData = prompt as IPrompt<IPromptInput, IPromptOutput>;
    typeDefs += `  export namespace ${promptData.category} {\n`;
    typeDefs += `    export const ${promptData.name}: {\n`;
    typeDefs += `      format: (inputs: ${generateInputType(promptData.inputSchema)}) => ${generateOutputType(promptData.outputSchema)};\n`;
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

function generateInputType(schema: any): string {
  if (schema.type === 'object' && schema.properties) {
    const props = Object.entries(schema.properties)
      .map(([key, value]: [string, any]) => `${key}: ${getTypeFromSchema(value)}`)
      .join('; ');
    return `{ ${props} }`;
  }
  return 'any';
}

function generateOutputType(schema: any): string {
  return getTypeFromSchema(schema);
}

function getTypeFromSchema(schema: any): string {
  if (schema.type === 'object' && schema.properties) {
    const props = Object.entries(schema.properties)
      .map(([key, value]: [string, any]) => `${key}${schema.required?.includes(key) ? '' : '?'}: ${getTypeFromSchema(value)}`)
      .join('; ');
    return `{ ${props} }`;
  }
  if (schema.type === 'array') {
    return `Array<${getTypeFromSchema(schema.items)}>`;
  }
  if (schema.enum) {
    return schema.enum.map((v: any) => JSON.stringify(v)).join(' | ');
  }
  // Add more cases for other complex types
  return schema.type || 'any';
}

export async function getGeneratedTypes(): Promise<string> {
  const configManager = await getConfigManager();
  const outputDir = configManager.getConfig('outputDir');
  return fs.readFile(path.join(outputDir, 'prompts.d.ts'), 'utf-8');
}

/**
 * Retrieve the current status of the prompt management system.
 * Purpose: Provide an overview of the system's configuration, prompt count, and potential issues.
 */
export async function getStatus(): Promise<{
  config: any;
  totalPrompts: number;
  categories: string[];
  lastGenerated: string | null;
  warnings: string[];
}> {
  const configManager = await getConfigManager();
  const config = {
    promptsDir: configManager.getConfig('promptsDir'),
    outputDir: configManager.getConfig('outputDir'),
    preferredModels: configManager.getConfig('preferredModels'),
    modelParams: configManager.getConfig('modelParams')
  };
  const manager = await PromptManager.getInstance();
  const prompts = await manager.listPrompts({});

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
  const manager = await PromptManager.getInstance();
  const prompts = await manager.listPrompts({});

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
  const manager = await PromptManager.getInstance();
  await manager.deletePrompt(props);
  console.log(`Prompt "${props.category}/${props.name}" deleted successfully.`);
}

```

