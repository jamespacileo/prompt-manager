import { IPromptCategory, IPrompt, IPromptInput, IPromptOutput } from './types/interfaces';
import { PromptModel } from './promptModel';
import { PromptFileSystem } from './promptFileSystem';

/**
 * PromptManager is the central class for managing prompts.
 * It provides methods for creating, retrieving, updating, and deleting prompts,
 * as well as managing prompt versions and formatting.
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
   * Purpose: Set up the PromptManager with all existing prompts for further operations.
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
          this.prompts[prompt.category][prompt.name] = new PromptModel(promptData as IPromptModelRequired) as unknown as PromptModel<TInput, TOutput>;
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
   * Purpose: Fetch a single prompt for use or manipulation.
   * @throws Error if the prompt does not exist
   */
  getPrompt(props: { category: string; name: string }): PromptModel<TInput, TOutput> {
    if (!this.prompts[props.category] || !this.prompts[props.category][props.name]) {
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
    const newPrompt = new PromptModel(prompt) as PromptModel<TInput, TOutput>;
    this.prompts[prompt.category][prompt.name] = newPrompt;
    await this.fileSystem.savePrompt({ promptData: newPrompt as unknown as IPrompt<any, any> });
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
    await this.fileSystem.savePrompt({ promptData: prompt as unknown as IPrompt<any, any> });
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

    return prompts.map(prompt => ({
      ...prompt,
      filePath: prompt.category && prompt.name ? path.join(this.fileSystem.basePath, prompt.category, prompt.name, 'prompt.json') : ''
    }));
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
        await this.fileSystem.savePrompt({ promptData: prompt });
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
