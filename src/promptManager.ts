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

  async promptExists(props: { category: string; name: string }): Promise<boolean> {
    const { category, name } = props;
    return !!this.prompts[category] && !!this.prompts[category][name];
  }

  async createCategory(categoryName: string): Promise<void> {
    if (!this.prompts[categoryName]) {
      this.prompts[categoryName] = {};
      await fileSystem.createCategory({ categoryName });
    }
  }

  async deleteCategory(categoryName: string): Promise<void> {
    if (this.prompts[categoryName]) {
      delete this.prompts[categoryName];
      await fileSystem.deleteCategory({ categoryName });
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
          this.prompts[prompt.category][prompt.name] = new PromptModel(promptData, fileSystem) as unknown as PromptModel<TInput, TOutput>;
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
