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
