import { Prompt, PromptManagerLibrary, PromptCategory } from './types/interfaces';
import fs from 'fs/promises';
import path from 'path';

export class PromptManager implements PromptManagerLibrary {
  private prompts: Record<string, Record<string, Prompt>> = {};
  private promptsPath: string;

  constructor(promptsPath: string) {
    this.promptsPath = promptsPath;
  }

  async initialize(): Promise<void> {
    const categories = await fs.readdir(this.promptsPath);
    for (const category of categories) {
      const categoryPath = path.join(this.promptsPath, category);
      const stats = await fs.stat(categoryPath);
      if (stats.isDirectory()) {
        this.prompts[category] = {};
        const promptFiles = await fs.readdir(categoryPath);
        for (const file of promptFiles) {
          if (file.endsWith('.txt')) {
            const promptName = path.basename(file, '.txt');
            const content = await fs.readFile(path.join(categoryPath, file), 'utf-8');
            this.prompts[category][promptName] = {
              name: promptName,
              category,
              version: '1.0.0',
              content,
              parameters: [], // This should be parsed from the content
              metadata: {
                description: '', // This should be parsed from the content
                created: new Date().toISOString(),
                lastModified: new Date().toISOString(),
              },
              versions: ['1.0.0'],
            };
          }
        }
      }
    }
  }

  getPrompt(category: string, name: string): Prompt {
    if (!this.prompts[category] || !this.prompts[category][name]) {
      throw new Error(`Prompt "${name}" in category "${category}" does not exist`);
    }
    return this.prompts[category][name];
  }

  async createPrompt(prompt: Omit<Prompt, 'versions'>): Promise<void> {
    if (!this.prompts[prompt.category]) {
      this.prompts[prompt.category] = {};
    }
    this.prompts[prompt.category][prompt.name] = {
      ...prompt,
      versions: [prompt.version],
    };
    await this.savePrompt(prompt.category, prompt.name);
  }

  async updatePrompt(name: string, updates: Partial<Prompt>): Promise<void> {
    const [category, promptName] = name.split('/');
    if (!this.prompts[category] || !this.prompts[category][promptName]) {
      throw new Error(`Prompt "${name}" does not exist`);
    }
    this.prompts[category][promptName] = {
      ...this.prompts[category][promptName],
      ...updates,
      metadata: {
        ...this.prompts[category][promptName].metadata,
        lastModified: new Date().toISOString(),
      },
    };
    await this.savePrompt(category, promptName);
  }

  async deletePrompt(name: string): Promise<void> {
    const [category, promptName] = name.split('/');
    if (!this.prompts[category] || !this.prompts[category][promptName]) {
      throw new Error(`Prompt "${name}" does not exist`);
    }
    delete this.prompts[category][promptName];
    await fs.unlink(path.join(this.promptsPath, category, `${promptName}.txt`));
  }

  async listPrompts(category?: string): Promise<Prompt[]> {
    if (category) {
      return Object.values(this.prompts[category] || {});
    }
    return Object.values(this.prompts).flatMap(categoryPrompts => Object.values(categoryPrompts));
  }

  async versionPrompt(action: 'list' | 'create' | 'switch', name: string, version?: string): Promise<void> {
    const [category, promptName] = name.split('/');
    const prompt = this.getPrompt(category, promptName);

    switch (action) {
      case 'list':
        console.log(`Versions for ${name}:`, prompt.versions);
        break;
      case 'create':
        const newVersion = this.incrementVersion(prompt.version);
        prompt.versions.push(newVersion);
        prompt.version = newVersion;
        await this.savePrompt(category, promptName);
        console.log(`Created new version ${newVersion} for ${name}`);
        break;
      case 'switch':
        if (!version || !prompt.versions.includes(version)) {
          throw new Error(`Invalid version ${version} for ${name}`);
        }
        prompt.version = version;
        await this.savePrompt(category, promptName);
        console.log(`Switched ${name} to version ${version}`);
        break;
    }
  }

  formatPrompt(category: string, promptName: string, params: Record<string, any>): string {
    const prompt = this.getPrompt(category, promptName);
    let formattedContent = prompt.content;
    for (const [key, value] of Object.entries(params)) {
      formattedContent = formattedContent.replace(new RegExp(`{{${key}}}`, 'g'), value);
    }
    return formattedContent;
  }

  get categories(): { [category: string]: PromptCategory<Record<string, Prompt>> } {
    return Object.fromEntries(
      Object.entries(this.prompts).map(([category, prompts]) => [
        category,
        Object.fromEntries(
          Object.entries(prompts).map(([name, prompt]) => [
            name,
            {
              raw: prompt.content,
              version: prompt.version,
              format: (inputs: Record<string, string>) => this.formatPrompt(category, name, inputs),
            },
          ])
        ),
      ])
    );
  }

  private async savePrompt(category: string, name: string): Promise<void> {
    const prompt = this.prompts[category][name];
    const filePath = path.join(this.promptsPath, category, `${name}.txt`);
    await fs.writeFile(filePath, prompt.content);
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
