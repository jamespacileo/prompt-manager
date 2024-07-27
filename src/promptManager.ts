import { IPromptManagerLibrary, IPromptCategory, IPrompt, IPromptInput, IPromptOutput } from './types/interfaces';
import { PromptModel } from './promptModel';
import { PromptFileSystem } from './promptFileSystem';

export class PromptManager implements IPromptManagerLibrary {
  // Store prompts in a nested structure: category -> prompt name -> PromptModel
  private prompts: Record<string, Record<string, PromptModel>> = {};
  private fileSystem: PromptFileSystem;

  constructor() {
    this.fileSystem = new PromptFileSystem();
  }

  /**
   * Initialize the PromptManager by loading all prompts from the file system.
   * This method should be called before using any other methods of the PromptManager.
   */
  async initialize(props: {}): Promise<void> {
    const prompts = await this.fileSystem.listPrompts();
    for (const prompt of prompts) {
      if (!this.prompts[prompt.category]) {
        this.prompts[prompt.category] = {};
      }
      const promptData = await this.fileSystem.loadPrompt({ category: prompt.category, promptName: prompt.name });
      this.prompts[prompt.category][prompt.name] = new PromptModel(promptData);
    }
  }

  /**
   * Retrieve a specific prompt by its category and name.
   * @throws Error if the prompt does not exist
   */
  getPrompt(props: { category: string; name: string }): PromptModel {
    if (!this.prompts[props.category] || !this.prompts[props.category][props.name]) {
      throw new Error(`Prompt "${props.name}" in category "${props.category}" does not exist`);
    }
    return this.prompts[props.category][props.name];
  }

  /**
   * Create a new prompt and save it to the file system.
   */
  async createPrompt(props: { prompt: Omit<IPrompt<IPromptInput, IPromptOutput>, 'versions'> }): Promise<void> {
    const { prompt } = props;
    if (!prompt.category || !prompt.name) {
      throw new Error('Prompt category and name are required');
    }
    if (!this.prompts[prompt.category]) {
      this.prompts[prompt.category] = {};
    }
    const newPrompt = new PromptModel(prompt);
    this.prompts[prompt.category][prompt.name] = newPrompt;
    await this.fileSystem.savePrompt({ promptData: newPrompt });
  }

  /**
   * Update an existing prompt with new data and save the changes.
   */
  async updatePrompt(props: { category: string; name: string; updates: Partial<IPrompt<IPromptInput, IPromptOutput>> }): Promise<void> {
    const { category, name, updates } = props;
    const prompt = this.getPrompt({ category, name });
    Object.assign(prompt, updates);
    prompt.updateMetadata({ metadata: { lastModified: new Date().toISOString() } });
    await this.fileSystem.savePrompt({ promptData: prompt });
  }

  /**
   * Delete a prompt from both the in-memory storage and the file system.
   */
  async deletePrompt(props: { category: string; name: string }): Promise<void> {
    const { category, name } = props;
    if (!this.prompts[category] || !this.prompts[category][name]) {
      throw new Error(`Prompt "${name}" in category "${category}" does not exist`);
    }
    delete this.prompts[category][name];
    await this.fileSystem.deletePrompt({ category, promptName: name });
  }

  async listPrompts(props: { category?: string }): Promise<IPrompt<IPromptInput, IPromptOutput>[]> {
    if (props.category) {
      return Object.values(this.prompts[props.category] || {});
    }
    return Object.values(this.prompts).flatMap(categoryPrompts => Object.values(categoryPrompts));
  }

  /**
   * Manage prompt versions: list, create, or switch to a specific version.
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
        const availableVersions = await prompt.versions();
        if (!version || !availableVersions.includes(version)) {
          throw new Error(`Invalid version ${version} for ${category}/${name}`);
        }
        await prompt.switchVersion({ version });
        await this.fileSystem.savePrompt({ promptData: prompt });
        console.log(`Switched ${category}/${name} to version ${version}`);
        break;
    }
  }

  /**
   * Format a prompt by replacing placeholders with provided parameters.
   */
  formatPrompt(props: { category: string; name: string; params: Record<string, any> }): string {
    const { category, name, params } = props;
    const prompt = this.getPrompt({ category, name });
    return prompt.format(params);
  }

  get categories(): { [category: string]: IPromptCategory<Record<string, PromptModel>> } {
    return Object.fromEntries(
      Object.entries(this.prompts).map(([category, prompts]) => [
        category,
        Object.fromEntries(
          Object.entries(prompts).map(([name, prompt]) => [
            name,
            {
              raw: prompt.template,
              version: prompt.version,
              format: (inputs: Record<string, string>) => prompt.format(inputs),
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
