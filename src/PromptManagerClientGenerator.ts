import fs from 'fs/promises';
import path from 'path';
import { PromptFileSystem } from './promptFileSystem';
import { PromptProjectConfigManager } from './config/PromptProjectConfigManager';
import { Container } from 'typedi';
import { logger } from './utils/logger';

const fileSystem = Container.get(PromptFileSystem);
const configManager = Container.get(PromptProjectConfigManager);

export class PromptManagerClientGenerator {
  private outputPath: string;

  constructor() {
    this.outputPath = path.join(configManager.getConfig('promptsDir'), '..', 'client.ts');
  }

  async generateClient(): Promise<void> {
    const categories = await fileSystem.listCategories();
    let clientCode = this.generateClientHeader();

    for (const category of categories) {
      const prompts = await fileSystem.listPrompts({ category });
      clientCode += this.generateCategoryCode(category, prompts.map(p => p.name));
    }

    clientCode += this.generateClientFooter();
    await this.writeClientFile(clientCode);
  }

  private generateClientHeader(): string {
    return `
import { IPromptManagerLibrary, IPrompt, IPromptInput, IPromptOutput } from './types/interfaces';
import { PromptFileSystem } from './promptFileSystem';

export class PromptManagerClient implements IPromptManagerLibrary {
  private promptFileSystem: PromptFileSystem;
  private promptManager: PromptManager;

  constructor() {
    this.promptFileSystem = new PromptFileSystem();
    this.promptManager = new PromptManager();
  }

  async initialize(): Promise<void> {
    await this.promptFileSystem.initialize();
    await this.promptManager.initialize();
  }

  async getPrompt(props: { category: string; name: string }): Promise<IPrompt<IPromptInput, IPromptOutput>> {
    return this.promptManager.getPrompt(props);
  }

  // Implement other IPromptManagerLibrary methods here

  categories: Record<string, Record<string, {
    format: (inputs: Record<string, any>) => Promise<string>;
    execute: (inputs: Record<string, any>) => Promise<Record<string, any>>;
    stream: (inputs: Record<string, any>) => Promise<IAsyncIterableStream<string>>;
    description: string;
    version: string;
  }>> = {
`;
  }

  private generateCategoryCode(category: string, prompts: string[]): string {
    let categoryCode = `    ${category}: {\n`;
    for (const prompt of prompts) {
      categoryCode += `      ${prompt}: {\n`;
      categoryCode += `        raw: async () => (await promptManager.getPrompt({ category: '${category}', name: '${prompt}' })).template,\n`;
      categoryCode += `        version: async () => (await promptManager.getPrompt({ category: '${category}', name: '${prompt}' })).version,\n`;
      categoryCode += `        format: async (inputs: Record<string, any>) => {\n`;
      categoryCode += `          const prompt = await promptManager.getPrompt({ category: '${category}', name: '${prompt}' });\n`;
      categoryCode += `          return prompt.template.replace(/\\{(\\w+)\\}/g, (_, key) => inputs[key] ?? '');\n`;
      categoryCode += `        },\n`;
      categoryCode += `      },\n`;
    }
    categoryCode += `    },\n`;
    return categoryCode;
  }

  private generateClientFooter(): string {
    return `  };
}

export const promptManager = new PromptManagerClient();
`;
  }

  private async writeClientFile(content: string): Promise<void> {
    await fs.writeFile(this.outputPath, content, 'utf8');
    logger.success(`Client file generated at ${this.outputPath}`);
  }

  async detectChanges(): Promise<boolean> {
    try {
      const currentContent = await fs.readFile(this.outputPath, 'utf8');
      const newContent = await this.generateClientContent();
      return currentContent !== newContent;
    } catch (error) {
      // If file doesn't exist, changes are needed
      return true;
    }
  }

  private async generateClientContent(): Promise<string> {
    const categories = await fileSystem.listCategories();
    let clientCode = this.generateClientHeader();

    for (const category of categories) {
      const prompts = await fileSystem.listPrompts({ category });
      clientCode += this.generateCategoryCode(category, prompts.map(p => p.name));
    }

    clientCode += this.generateClientFooter();
    return clientCode;
  }
}
