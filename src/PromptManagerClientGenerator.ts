import fs from 'fs/promises';
import path from 'path';
import { getFileSystemManager, PromptFileSystem } from './promptFileSystem';
import { getConfigManager, PromptProjectConfigManager } from './config/PromptProjectConfigManager';

const fileSystem = await getFileSystemManager();
const configManager = await getConfigManager();

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

  constructor() {
    this.promptFileSystem = new PromptFileSystem();
  }

  async initialize(): Promise<void> {
    // Initialization logic here
  }

  async getPrompt(props: { category: string; name: string }): Promise<IPrompt<IPromptInput, IPromptOutput>> {
    return this.promptFileSystem.loadPrompt(props);
  }

  // Implement other IPromptManagerLibrary methods here

  categories: Record<string, Record<string, {
    raw: () => Promise<string>;
    version: () => Promise<string>;
    format: (inputs: Record<string, any>) => Promise<string>;
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
