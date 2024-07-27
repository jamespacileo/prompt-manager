import { IPromptManagerLibrary, IPromptCategory, IPrompt, IPromptInput, IPromptOutput } from './types/interfaces';
import { PromptModel } from './promptModel';
import { PromptFileSystem } from './promptFileSystem';

export class PromptManager implements IPromptManagerLibrary {
  private prompts: Record<string, Record<string, PromptModel>> = {};
  private fileSystem: PromptFileSystem;

  constructor(promptsPath: string) {
    this.fileSystem = new PromptFileSystem();
  }

  async initialize(): Promise<void> {
    const prompts = await this.fileSystem.listPrompts();
    for (const prompt of prompts) {
      if (!this.prompts[prompt.category]) {
        this.prompts[prompt.category] = {};
      }
      const promptData = await this.fileSystem.loadPrompt({ category: prompt.category, promptName: prompt.name });
      this.prompts[prompt.category][prompt.name] = new PromptModel(promptData);
    }
  }

  getPrompt(props: { category: string; name: string }): IPrompt<IPromptInput, IPromptOutput> {
    if (!this.prompts[props.category] || !this.prompts[props.category][props.name]) {
      throw new Error(`Prompt "${props.name}" in category "${props.category}" does not exist`);
    }
    return this.prompts[props.category][props.name];
  }

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

  async updatePrompt(props: { name: string; updates: Partial<IPrompt<IPromptInput, IPromptOutput>> }): Promise<void> {
    const [category, promptName] = props.name.split('/');
    const prompt = this.getPrompt(category, promptName);
    Object.assign(prompt, props.updates);
    prompt.updateMetadata({ metadata: { lastModified: new Date().toISOString() } });
    await this.fileSystem.savePrompt({ promptData: prompt });
  }

  async deletePrompt(props: { name: string }): Promise<void> {
    const [category, promptName] = props.name.split('/');
    if (!this.prompts[category] || !this.prompts[category][promptName]) {
      throw new Error(`Prompt "${props.name}" does not exist`);
    }
    delete this.prompts[category][promptName];
    await this.fileSystem.deletePrompt({ category, promptName });
  }

  async listPrompts(props?: { category?: string }): Promise<IPrompt<IPromptInput, IPromptOutput>[]> {
    if (props?.category) {
      return Object.values(this.prompts[props.category] || {});
    }
    return Object.values(this.prompts).flatMap(categoryPrompts => Object.values(categoryPrompts));
  }

  async versionPrompt(props: { action: 'list' | 'create' | 'switch'; name: string; version?: string }): Promise<void> {
    const [category, promptName] = props.name.split('/');
    const prompt = this.getPrompt(category, promptName);

    switch (props.action) {
      case 'list':
        const versions = await prompt.versions();
        console.log(`Versions for ${props.name}:`, versions);
        break;
      case 'create':
        const newVersion = this.incrementVersion(prompt.version);
        prompt.version = newVersion;
        await this.fileSystem.savePrompt({ promptData: prompt });
        console.log(`Created new version ${newVersion} for ${props.name}`);
        break;
      case 'switch':
        const availableVersions = await prompt.versions();
        if (!props.version || !availableVersions.includes(props.version)) {
          throw new Error(`Invalid version ${props.version} for ${props.name}`);
        }
        await prompt.switchVersion({ version: props.version });
        await this.fileSystem.savePrompt({ promptData: prompt });
        console.log(`Switched ${props.name} to version ${props.version}`);
        break;
    }
  }

  formatPrompt(props: { category: string; promptName: string; params: Record<string, any> }): string {
    const prompt = this.getPrompt(props.category, props.promptName);
    return prompt.format(props.params);
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

export function getPromptManager(promptsPath: string): PromptManager {
  return new PromptManager(promptsPath);
}
