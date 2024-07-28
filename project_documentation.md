# Project Documentation

## src/promptManager.ts

**Description:** Main class for managing prompts

```typescript
import { IPromptCategory, IPrompt, IPromptInput, IPromptOutput } from './types/interfaces';
import { PromptModel } from './promptModel';
import { PromptFileSystem } from './promptFileSystem';
import path from 'path';

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
  // Store prompts in a nested structure: category -> prompt name -> PromptModel
  public prompts: Record<string, Record<string, PromptModel<any, any>>> = {};
  private fileSystem: PromptFileSystem;

  constructor() {
    this.fileSystem = new PromptFileSystem();
  }

  /**
   * Initialize the PromptManager by loading all prompts from the file system.
   * This method must be called before using any other methods of the PromptManager.
   * 
   * Purpose: Set up the PromptManager with all existing prompts for further operations.
   * 
   * @throws Error if there's a failure in loading prompts from the file system
   */
  async initialize(): Promise<void> {
    try {
      const prompts = await this.fileSystem.listPrompts();
      for (const prompt of prompts) {
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
      console.error('Failed to initialize PromptManager:', error);
      throw new Error('Failed to initialize PromptManager');
    }
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
    return this.prompts[props.category][props.name] as PromptModel<TInput, TOutput>;
  }

  /**
   * Create a new prompt and save it to the file system.
   * Purpose: Add a new prompt to the manager and persist it for future use.
   */
  async createPrompt(props: { prompt: Omit<IPrompt<IPromptInput, IPromptOutput>, 'versions'> }): Promise<void> {
    const { prompt } = props;
    if (!prompt.category || !prompt.name) {
      throw new Error('Prompt category and name are required');
    }
    if (!this.prompts[prompt.category]) {
      this.prompts[prompt.category] = {};
    }
    if (this.prompts[prompt.category][prompt.name]) {
      throw new Error(`Prompt "${prompt.name}" already exists in category "${prompt.category}"`);
    }
    const newPrompt = new PromptModel(prompt) as PromptModel<TInput, TOutput>;
    this.prompts[prompt.category][prompt.name] = newPrompt;
    await this.fileSystem.savePrompt({ promptData: newPrompt as IPrompt<Record<string, any>, Record<string, any>> });
    console.log(`Created new prompt "${prompt.name}" in category "${prompt.category}" with TypeScript definitions.`);
  }

  /**
   * Update an existing prompt with new data and save the changes.
   * Purpose: Modify an existing prompt's properties and persist the changes.
   */
  async updatePrompt(props: { category: string; name: string; updates: Partial<IPrompt<IPromptInput, IPromptOutput>> }): Promise<void> {
    const { category, name, updates } = props;
    const prompt = this.getPrompt({ category, name });
    Object.assign(prompt, updates);
    prompt.updateMetadata({ lastModified: new Date().toISOString() });
    await this.fileSystem.savePrompt({ promptData: prompt as IPrompt<Record<string, any>, Record<string, any>> });
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
    await this.fileSystem.deletePrompt({ category, promptName: name });
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
          ? path.join((this.fileSystem as any).basePath, promptData.category, promptData.name, 'prompt.json')
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
        await this.fileSystem.savePrompt({ promptData: prompt as IPrompt<Record<string, any>, Record<string, any>> });
        console.log(`Created new version ${newVersion} for ${category}/${name}`);
        break;
      case 'switch':
        if (!version) {
          throw new Error(`Version is required for switch action`);
        }
        await prompt.switchVersion(version);
        await this.fileSystem.savePrompt({ promptData: prompt });
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

  private incrementVersion(version: string): string {
    const parts = version.split('.').map(Number);
    parts[parts.length - 1]++;
    return parts.join('.');
  }
}

export function getPromptManager(): PromptManager {
  return new PromptManager();
}

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

// Create a singleton instance of PromptFileSystem
const fileSystem = new PromptFileSystem();

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
import { configManager } from './config/PromptProjectConfigManager';

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
  private fileSystem: IPromptFileSystem;

  get filePath(): string {
    const promptsDir = configManager.getConfig('promptsDir');
    return path.join(promptsDir, this.category, this.name, 'prompt.json');
  }

  /**
   * Create a new PromptModel instance.
   * 
   * Purpose: Initialize a new prompt with all necessary data and optional file system access.
   * 
   * @param promptData Required data to initialize the prompt
   * @param fileSystem Optional PromptFileSystem instance for file operations
   * @throws Error if required fields are missing in promptData or if FileSystem is not initialized
   */
  constructor(promptData: IPromptModelRequired, fileSystem?: IPromptFileSystem) {
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
    this.fileSystem = fileSystem || new PromptFileSystem();
    this.version = promptData.version || '1.0.0';
    this.metadata = promptData.metadata || { created: new Date().toISOString(), lastModified: new Date().toISOString() };
    this.outputType = this.determineOutputType(promptData.outputSchema);
    this.configuration = this.initializeConfiguration();

    if (!this.fileSystem) {
      throw new Error('FileSystem is not initialized. Cannot create PromptModel.');
    }
  }

  private determineOutputType(outputSchema: JSONSchema7): 'structured' | 'plain' {
    return Object.keys(outputSchema).length > 0 ? 'structured' : 'plain';
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
    try {
      this.inputZodSchema.parse(input);
      return true;
    } catch (error) {
      console.error('Input validation error:', error);
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
        presencePenalty: this.configuration.presencePenalty
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
      } else {
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
    return `${this.name} (${this.category}): ${this.description}`;
  }

  async save(): Promise<void> {
    if (!this.fileSystem) {
      throw new Error('FileSystem is not initialized. Cannot save prompt.');
    }
    const updatedPromptData = this as unknown as IPrompt<Record<string, any>, Record<string, any>>;
    await this.fileSystem.savePrompt({ promptData: updatedPromptData });
    this._isSaved = true;

    // Update the current instance with the saved data
    Object.assign(this, updatedPromptData);
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

  static async deletePrompt(category: string, name: string, fileSystem?: IPromptFileSystem): Promise<void> {
    const fs = fileSystem || new PromptFileSystem();
    if (!fs) throw Error(`No file system provided`);
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
import { configManager } from './config/PromptProjectConfigManager';
import { PromptSchema } from './schemas/prompts';
import { PromptModel } from './promptModel';
import chalk from 'chalk';

export const PROMPT_FILENAME = "prompt.json";
export const TYPE_DEFINITION_FILENAME = "prompt.d.ts";
export const PROMPTS_FOLDER_CONFIG_FILENAME = "prompts-config.json";

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
  private basePath: string;

  constructor() {
    this.basePath = path.resolve(configManager.getConfig('promptsDir'));
  }

  public async initialize(): Promise<void> {
    this.basePath = path.resolve(configManager.getConfig('promptsDir'));
    await fs.mkdir(this.basePath, { recursive: true });
    await this.initializePromptsFolderConfig();
    const isValid = await this.validatePromptsFolderConfig();
    if (!isValid) {
      console.error('Prompts folder configuration is invalid. Reinitializing...');
      await this.initializePromptsFolderConfig();
    }
  }

  private async initializePromptsFolderConfig(): Promise<void> {
    const configPath = path.join(this.basePath, PROMPTS_FOLDER_CONFIG_FILENAME);
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
    const configPath = path.join(this.basePath, PROMPTS_FOLDER_CONFIG_FILENAME);
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
    const configPath = path.join(this.basePath, PROMPTS_FOLDER_CONFIG_FILENAME);
    const currentConfig = await this.getPromptsFolderConfig();
    const updatedConfig = { ...currentConfig, ...updates, lastUpdated: new Date().toISOString() };
    await fs.writeFile(configPath, JSON.stringify(updatedConfig, null, 2));
  }

  private async getPromptsFolderConfig(): Promise<IPromptsFolderConfig> {
    const configPath = path.join(this.basePath, PROMPTS_FOLDER_CONFIG_FILENAME);
    const configData = await fs.readFile(configPath, 'utf-8');
    return JSON.parse(configData);
  }

  private getFilePath({ category, promptName }: { category: string, promptName: string }): string {
    return path.join(this.basePath, category, promptName, 'prompt.json');
  }

  private getVersionFilePath({ category, promptName, version }: { category: string, promptName: string, version: string }): string {
    return path.join(this.basePath, category, promptName, '.versions', `v${version}.json`);
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
    const validatedPromptData = PromptSchema.parse(promptData) as IPrompt<IPromptInput, IPromptOutput>;
    const filePath = this.getFilePath({ category: validatedPromptData.category, promptName: validatedPromptData.name });

    try {
      const versionFilePath = this.getVersionFilePath({
        category: validatedPromptData.category,
        promptName: validatedPromptData.name,
        version: validatedPromptData.version
      });

      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.mkdir(path.dirname(versionFilePath), { recursive: true });

      await fs.writeFile(filePath, JSON.stringify(validatedPromptData, null, 2));
      await fs.writeFile(versionFilePath, JSON.stringify(validatedPromptData, null, 2));

      const typeDefinitionPath = path.join(path.dirname(filePath), TYPE_DEFINITION_FILENAME);
      await this.generateTypeDefinitionFile(validatedPromptData, typeDefinitionPath);

      const versionsPath = path.join(this.basePath, validatedPromptData.category, validatedPromptData.name, '.versions');
      const versions = await this.getPromptVersions({ category: validatedPromptData.category, promptName: validatedPromptData.name });
      if (!versions.includes(validatedPromptData.version)) {
        versions.push(validatedPromptData.version);
        versions.sort((a, b) => this.compareVersions(b, a));
      }
      await fs.writeFile(path.join(versionsPath, 'versions.json'), JSON.stringify(versions, null, 2));

      const config = await this.getPromptsFolderConfig();
      await this.updatePromptsFolderConfig({ promptCount: config.promptCount + 1 });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('ENOSPC')) {
          throw new Error(`Failed to save prompt due to insufficient disk space. Please free up some space and try again.`);
        } else if (error.message.includes('EACCES')) {
          throw new Error(`Failed to save prompt due to insufficient permissions. Please check your file system permissions and try again.`);
        } else if (error.message.includes('EBUSY')) {
          throw new Error(`Failed to save prompt because the file is locked or in use. Please close any other applications that might be using the file and try again.`);
        }
      }
      console.error('Error saving prompt:', error);
      throw new Error(`Failed to save prompt to ${filePath}: ${error instanceof Error ? error.message : String(error)}. Please check the console for more details.`);
    }
  }
  
  /**
   * Load a prompt from the file system.
   * Purpose: Retrieve stored prompt data for use in the application.
   */
  async loadPrompt(props: { category: string; promptName: string }): Promise<IPrompt<IPromptInput, IPromptOutput>> {
    const { category, promptName } = props;
    const filePath = this.getFilePath({ category, promptName });

    try {
      const data = await fs.readFile(filePath, 'utf-8');
      const parsedData = JSON.parse(data);
      const validatedData = PromptSchema.parse(parsedData);
      return validatedData as IPrompt<IPromptInput, IPromptOutput>;
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
        throw new Error(`Prompt not found at ${filePath}. Please verify that the prompt exists and the category (${category}) and promptName (${promptName}) are correct.`);
      }
      if (error instanceof SyntaxError) {
        throw new Error(`Invalid JSON in prompt file: ${filePath}. The file may be corrupted or incorrectly edited. Please check the file contents or restore from a backup.`);
      }
      if (error instanceof z.ZodError) {
        throw new Error(`Invalid prompt data structure in file: ${filePath}. The prompt data does not match the expected schema. Please check the file contents or recreate the prompt.`);
      }
      throw new Error(`Failed to load prompt from ${filePath}: ${error instanceof Error ? error.message : String(error)}. Please check file permissions and system integrity.`);
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
    try {
      const searchPath = category ? path.join(this.basePath, category) : this.basePath;
      const entries = await fs.readdir(searchPath, { withFileTypes: true });

      const prompts: PromptModel[] = [];
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const categoryPath = category ? category : entry.name;
          const promptDir = path.join(this.basePath, categoryPath);
          try {
            const promptEntries = await fs.readdir(promptDir, { withFileTypes: true });

            for (const promptEntry of promptEntries) {
              if (promptEntry.isDirectory()) {
                const promptJsonPath = path.join(promptDir, promptEntry.name, PROMPT_FILENAME);
                try {
                  await fs.access(promptJsonPath);
                  const promptData = await this.loadPrompt({ category: categoryPath, promptName: promptEntry.name });
                  const promptModel = new PromptModel(promptData as IPromptModelRequired);
                  prompts.push(promptModel);
                } catch (error) {
                  const promptPath = path.join(promptDir, promptEntry.name, PROMPT_FILENAME);
                  console.warn(`Failed to load prompt from ${promptPath}: ${error instanceof Error ? error.message : String(error)}. 
                    This prompt will be skipped. If this is unexpected, please check the file permissions and contents. 
                    You may need to manually review and potentially recreate this prompt.`);
                }
              }
            }
          } catch (error) {
            console.warn(`Failed to read prompt directory at ${promptDir}: ${error instanceof Error ? error.message : String(error)}. 
              This directory will be skipped. Please check if the directory exists and you have the necessary permissions. 
              If this is a critical directory, you may need to manually recreate it or restore from a backup.`);
          }
        }
      }
      return prompts;
    } catch (error) {
      console.error(`Failed to list prompts: ${error instanceof Error ? error.message : String(error)}`);
      return [];
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
      prompt.description.toLowerCase().includes(query.toLowerCase())
    );
  }

  async searchCategories(props: { query: string }): Promise<string[]> {
    const { query } = props;
    const categories = await this.listCategories();
    return categories.filter(category => category.toLowerCase().includes(query.toLowerCase()));
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
    await fs.rm(promptDir, { recursive: true, force: true });
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
import fs from 'fs/promises';
import path from 'path';
import chalk from 'chalk';
import { IPromptProjectConfigManager } from '../types/interfaces';
import { getDefaultPromptsPath } from './constants';
import { ensureDirectoryExists } from '../utils/fileUtils';
import { configSchema, DEFAULT_CONFIG, z } from '../schemas/config';
import type { Config } from '../schemas/config';
import { PromptFileSystem } from '../promptFileSystem';

export type { Config };

/**
 * PromptProjectConfigManager is responsible for managing the configuration of the prompt project.
 * It implements the Singleton pattern to ensure only one instance of the configuration manager exists.
 */
export class PromptProjectConfigManager implements IPromptProjectConfigManager {
  private static instance: PromptProjectConfigManager;
  private configPath: string;
  private config: Config;

  /**
   * Private constructor to prevent direct construction calls with the `new` operator.
   * @param configPath Optional path to the configuration file
   */
  private constructor(configPath?: string) {
    const configFileName = process.env.FURY_PROJECT_CONFIG_FILENAME || process.env.FURY_CONFIG_FILENAME || 'fury-config.json';
    const projectRoot = process.env.FURY_PROJECT_ROOT || process.cwd();
    this.configPath = configPath || path.join(projectRoot, configFileName);
    this.config = { ...DEFAULT_CONFIG };
    this.performIntegrityCheck();
  }

  public static getInstance(configPath?: string): PromptProjectConfigManager {
    if (!PromptProjectConfigManager.instance) {
      PromptProjectConfigManager.instance = new PromptProjectConfigManager(configPath);
    }
    return PromptProjectConfigManager.instance;
  }

  /**
   * Initialize the configuration manager.
   * This method loads the configuration, ensures necessary directories exist, and prints the loaded configuration.
   */
  public async initialize(): Promise<void> {
    try {
      await this.loadConfig();
      await this.ensureConfigDirectories();
      await this.validatePromptsFolder();
      this.prettyPrintConfig();
    } catch (error: any) {
      console.error(chalk.red('Failed to initialize config:'), error.message);
      throw error;
    }
  }

  private async performIntegrityCheck(): Promise<void> {
    try {
      await this.loadConfig();
      await this.ensureConfigDirectories();
      console.log(chalk.green('✔ Configuration integrity check passed'));
    } catch (error: any) {
      if (error instanceof Error && error.message.includes('Project not initialized')) {
        console.warn(chalk.yellow('⚠ Configuration file not found. Project needs to be initialized.'));
        throw error;
      } else if (error instanceof z.ZodError) {
        console.error(chalk.red('Invalid configuration file:'), error.errors);
        throw new Error(`Invalid configuration file. Please check the file contents and ensure it matches the expected schema.`);
      } else {
        console.warn(chalk.yellow('⚠ Configuration integrity check failed:'), error.message);
        console.log(chalk.yellow('Attempting to create necessary directories...'));
        try {
          await this.ensureConfigDirectories();
        } catch (dirError) {
          console.error(chalk.red('Failed to create necessary directories:'), dirError);
          throw new Error(`Failed to create necessary directories. Please check your file system permissions.`);
        }
      }
    }
  }

  private async validatePromptsFolder(): Promise<void> {
    const promptsDir = path.resolve(process.env.FURY_PROJECT_ROOT || process.cwd(), this.config.promptsDir);
    const promptFileSystem = new PromptFileSystem();
    await promptFileSystem.initialize();

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
      console.log(chalk.blue(`Loading configuration from ${this.configPath}`));
      const configData = await fs.readFile(this.configPath, 'utf-8');
      const parsedConfig = JSON.parse(configData);

      const validatedConfig = configSchema.parse(parsedConfig);
      this.config = {
        ...validatedConfig,
        promptsDir: path.relative(process.cwd(), path.resolve(process.env.FURY_PROJECT_ROOT || process.cwd(), validatedConfig.promptsDir)),
        outputDir: path.relative(process.cwd(), path.resolve(process.env.FURY_PROJECT_ROOT || process.cwd(), validatedConfig.outputDir)),
      };
      console.log(chalk.green('✔ Configuration loaded successfully'));
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        console.error(chalk.red('Configuration file not found. Project needs to be initialized.'));
        throw new Error(`Project not initialized. Configuration file not found at ${this.configPath}. Please run the initialization command first.`);
      } else if (error instanceof z.ZodError) {
        console.error(chalk.red('Invalid configuration file:'), error.errors);
        throw new Error(`Invalid configuration file at ${this.configPath}: ${error.message}. Please check the file contents and ensure it matches the expected schema.`);
      } else {
        console.error(chalk.red('Failed to load configuration:'), error);
        throw new Error(`Failed to load configuration from ${this.configPath}: ${error.message}. This could be due to a corrupted configuration file.`);
      }
    }
  }

  private prettyPrintConfig(): void {
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
    console.log('\n');
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
      const updatedConfig = configSchema.parse({
        ...this.config,
        ...newConfig,
        modelParams: {
          ...this.config.modelParams,
          ...newConfig.modelParams,
        },
      });

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

export const configManager = PromptProjectConfigManager.getInstance();

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
import path from 'path';
import { TextEncoder, TextDecoder } from 'util';
import {configManager} from "../config/PromptProjectConfigManager"

// Add TextEncoder and TextDecoder to the global object
(global as any).TextEncoder = TextEncoder;
(global as any).TextDecoder = TextDecoder;

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
  .description('Prompt Manager CLI - A powerful tool for managing and generating prompts');

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
      const prompts = await listPrompts();
      if (prompts.length === 0) {
        log.warn('No prompts found. Use the "create" command to add new prompts.');
      } else {
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

        await displayPromptDetails(selectedPrompt);
      }
    } catch (error) {
      log.error('Failed to list prompts:');
      console.error(error);
    }
  });

async function displayPromptDetails(prompt: any) {
  const promptDetails = await getPromptDetails({ category: prompt.category, name: prompt.name });
  log.info('\nPrompt Details:');
  const detailsTable = new Table({
    columns: [
      { name: 'property', alignment: 'left', color: 'cyan' },
      { name: 'value', alignment: 'left', color: 'green' },
    ],
  });

  Object.entries(promptDetails).forEach(([key, value]) => {
    detailsTable.addRow({ property: key, value: JSON.stringify(value, null, 2) });
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
      break;
    case 'back':
      const listCommand = program.commands.find((cmd) => cmd.name() === 'list');
      if (listCommand && typeof listCommand.action === 'function') {
        await listCommand.action(async () => {
          // Implement list command logic here
        });
      } else {
        log.error('List command not found or is not a function');
      }
      break;
    case 'exit':
      process.exit(0);
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
      await updatePrompt({ category: promptDetails.category!, name, updates: { [updateField]: newValue } });
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
import { input, confirm } from '@inquirer/prompts';
import { generatePromptWithAI, updatePromptWithAI, prettyPrintPrompt } from './aiHelpers';
import { IPrompt, IPromptInput, IPromptOutput } from '../types/interfaces';
import { configManager } from '../config/PromptProjectConfigManager';

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
  try {
    let promptData: Partial<IPrompt<IPromptInput, IPromptOutput>> = {};
    let accepted = false;

    const description = await input({ message: 'Describe the prompt you want to create:' });

    while (!accepted) {
      promptData = await generatePromptWithAI(description);
      prettyPrintPrompt(promptData);

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

    const manager = new PromptManager();
    await manager.initialize();

    // Validate the AI-generated prompt data
    const validatedPromptData = PromptSchema.parse(promptData);

    const prompt = new PromptModel({
      ...validatedPromptData,
      name: validatedPromptData.name || '',
      category: validatedPromptData.category || '',
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

    await manager.createPrompt({ prompt });
    console.log(`Prompt "${prompt.name}" created successfully.`);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Invalid prompt data generated:', error.errors);
    } else {
      console.error('An error occurred while creating the prompt:', error);
    }
  }
}

/**
 * List all available prompts.
 * Purpose: Provide an overview of all prompts in the system for user reference.
 */
export async function listPrompts(): Promise<Array<{ name: string; category: string; version: string; filePath: string }>> {
  const manager = new PromptManager();
  await manager.initialize();
  const prompts = await manager.listPrompts({});
  
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
  const manager = new PromptManager();
  await manager.initialize();
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
  try {
    const manager = new PromptManager();
    await manager.initialize();

    // Fetch the current prompt
    const currentPrompt = await manager.getPrompt({ category: props.category, name: props.name });

    if (!currentPrompt) {
      console.error(`Prompt "${props.category}/${props.name}" not found.`);
      return;
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

    // Update the version
    const [major, minor, patch] = (currentPrompt.version || '1.0.0').split('.').map(Number);
    switch (updateType) {
      case 'major':
        props.updates.version = `${major + 1}.0.0`;
        break;
      case 'minor':
        props.updates.version = `${major}.${minor + 1}.0`;
        break;
      case 'patch':
        props.updates.version = `${major}.${minor}.${patch + 1}`;
        break;
    }

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

    await manager.updatePrompt(props);
    console.log(`Prompt "${props.category}/${props.name}" updated successfully to version ${props.updates.version}.`);
  } catch (error) {
    console.error('An error occurred while updating the prompt:', error);
  }
}

/**
 * Generate TypeScript type definitions for all prompts.
 * Purpose: Create type-safe interfaces for using prompts in TypeScript projects.
 */
export async function generateTypes(): Promise<void> {
  const outputDir = configManager.getConfig('outputDir');
  const manager = new PromptManager();
  await manager.initialize();
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

  await fs.writeFile(path.join(outputDir, 'prompts.d.ts'), typeDefs);
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
  switch (schema.type) {
    case 'string':
      return 'string';
    case 'number':
      return 'number';
    case 'boolean':
      return 'boolean';
    case 'array':
      return `Array<${getTypeFromSchema(schema.items)}>`;
    case 'object':
      if (schema.properties) {
        const props = Object.entries(schema.properties)
          .map(([key, value]: [string, any]) => `${key}: ${getTypeFromSchema(value)}`)
          .join('; ');
        return `{ ${props} }`;
      }
      return 'Record<string, any>';
    default:
      return 'any';
  }
}

export async function getGeneratedTypes(): Promise<string> {
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
  const config = {
    promptsDir: configManager.getConfig('promptsDir'),
    outputDir: configManager.getConfig('outputDir'),
    preferredModels: configManager.getConfig('preferredModels'),
    modelParams: configManager.getConfig('modelParams')
  };
  const manager = new PromptManager();
  await manager.initialize();
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
  const manager = new PromptManager();
  await manager.initialize();
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
  const manager = new PromptManager();
  await manager.initialize();
  await manager.deletePrompt(props);
  console.log(`Prompt "${props.category}/${props.name}" deleted successfully.`);
}

```

