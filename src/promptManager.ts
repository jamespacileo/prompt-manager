import { IPromptManagerLibrary, IPromptCategory, IPromptInput, IPromptOutput } from './types/interfaces';
import { PromptModel } from './promptModel';
import fs from 'fs/promises';
import path from 'path';
import { PromptFileSystem } from './promptFileSystem';

export class PromptManager implements IPromptManagerLibrary {
  private prompts: Record<string, Record<string, PromptModel>> = {};
  private promptsPath: string;

  private fileSystem: PromptFileSystem;

  constructor(promptsPath: string) {
    this.promptsPath = promptsPath;
    this.fileSystem = new PromptFileSystem(promptsPath);
  }

  async initialize(): Promise<void> {
    const categories = await this.fileSystem.listCategories();
    for (const category of categories) {
      this.prompts[category] = {};
      const promptNames = await this.fileSystem.listPrompts(category);
      for (const promptName of promptNames) {
        const promptData = await this.fileSystem.loadPrompt(category, promptName);
        this.prompts[category][promptName] = new PromptModel(promptData, this.fileSystem);
      }
    }
  }

  getPrompt(category: string, name: string): PromptModel {
    if (!this.prompts[category] || !this.prompts[category][name]) {
      throw new Error(`Prompt "${name}" in category "${category}" does not exist`);
    }
    return this.prompts[category][name];
  }

  async createPrompt(prompt: Omit<IPromptModelRequired, 'fileSystem'>): Promise<void> {
    if (!prompt.category || !prompt.name) {
      throw new Error('Prompt category and name are required');
    }
    if (!this.prompts[prompt.category]) {
      this.prompts[prompt.category] = {};
    }
    const newPrompt = new PromptModel({ ...prompt, fileSystem: this.fileSystem });
    this.prompts[prompt.category][prompt.name] = newPrompt;
    await newPrompt.save();
  }

  async updatePrompt(name: string, updates: Partial<PromptModel>): Promise<void> {
    const [category, promptName] = name.split('/');
    const prompt = this.getPrompt(category, promptName);
    Object.assign(prompt, updates);
    prompt.updateMetadata({ lastModified: new Date().toISOString() });
    await prompt.save();
  }

  async deletePrompt(name: string): Promise<void> {
    const [category, promptName] = name.split('/');
    if (!this.prompts[category] || !this.prompts[category][promptName]) {
      throw new Error(`Prompt "${name}" does not exist`);
    }
    delete this.prompts[category][promptName];
    await this.fileSystem.deletePrompt(category, promptName);
  }

  async listPrompts(category?: string): Promise<PromptModel[]> {
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
        const versions = await prompt.versions();
        console.log(`Versions for ${name}:`, versions);
        break;
      case 'create':
        const newVersion = this.incrementVersion(prompt.version);
        prompt.version = newVersion;
        await prompt.save();
        console.log(`Created new version ${newVersion} for ${name}`);
        break;
      case 'switch':
        const availableVersions = await prompt.versions();
        if (!version || !availableVersions.includes(version)) {
          throw new Error(`Invalid version ${version} for ${name}`);
        }
        await prompt.switchVersion(version);
        await prompt.save();
        console.log(`Switched ${name} to version ${version}`);
        break;
    }
  }

  formatPrompt(category: string, promptName: string, params: Record<string, any>): string {
    const prompt = this.getPrompt(category, promptName);
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

export function getPromptManager(promptsPath: string): PromptManager {
  return new PromptManager(promptsPath);
}
