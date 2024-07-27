import fs from 'fs/promises';
import path from 'path';
import { IPromptProjectConfigManager } from './types/interfaces';
import { PromptFileSystem } from './promptFileSystem';

export class PromptManagerClientGenerator {
  private configManager: IPromptProjectConfigManager;
  private promptFileSystem: PromptFileSystem;
  private outputPath: string;

  constructor(configManager: IPromptProjectConfigManager) {
    this.configManager = configManager;
    this.promptFileSystem = new PromptFileSystem();
    this.outputPath = path.join(this.configManager.getConfig('promptsDir'), '..', 'generatedPromptManager.ts');
  }

  async generateClient(): Promise<void> {
    const categories = await this.promptFileSystem.listCategories();
    let clientCode = this.generateClientHeader();

    for (const category of categories) {
      const prompts = await this.promptFileSystem.listPrompts({ category });
      clientCode += this.generateCategoryCode(category, prompts);
    }

    clientCode += this.generateClientFooter();

    await this.writeClientFile(clientCode);
  }

  private generateClientHeader(): string {
    return `
import { IPromptManagerLibrary, IPrompt, IPromptInput, IPromptOutput } from './types/interfaces';

export class GeneratedPromptManager implements IPromptManagerLibrary {
  private promptFileSystem: any;

  constructor(promptFileSystem: any) {
    this.promptFileSystem = promptFileSystem;
  }

  async initialize(): Promise<void> {
    // Initialization logic here
  }

  async getPrompt(props: { category: string; name: string }): Promise<IPrompt<IPromptInput, IPromptOutput>> {
    return this.promptFileSystem.loadPrompt(props);
  }

  // Implement other IPromptManagerLibrary methods here

  categories = {
`;
  }

  private generateCategoryCode(category: string, prompts: string[]): string {
    let categoryCode = `    ${category}: {\n`;
    for (const prompt of prompts) {
      categoryCode += `      ${prompt}: {\n`;
      categoryCode += `        raw: async () => (await this.getPrompt({ category: '${category}', name: '${prompt}' })).template,\n`;
      categoryCode += `        version: async () => (await this.getPrompt({ category: '${category}', name: '${prompt}' })).version,\n`;
      categoryCode += `        format: async (inputs: any) => {\n`;
      categoryCode += `          const prompt = await this.getPrompt({ category: '${category}', name: '${prompt}' });\n`;
      categoryCode += `          return prompt.template.replace(/\\{(\\w+)\\}/g, (_, key) => inputs[key] || '');\n`;
      categoryCode += `        },\n`;
      categoryCode += `      },\n`;
    }
    categoryCode += `    },\n`;
    return categoryCode;
  }

  private generateClientFooter(): string {
    return `  };
}
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
    const categories = await this.promptFileSystem.listCategories();
    let clientCode = this.generateClientHeader();

    for (const category of categories) {
      const prompts = await this.promptFileSystem.listPrompts({ category });
      clientCode += this.generateCategoryCode(category, prompts);
    }

    clientCode += this.generateClientFooter();
    return clientCode;
  }
}
