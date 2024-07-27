import fs from 'fs/promises';
import path from 'path';
import { IPromptFileSystem, IPrompt, IPromptInput, IPromptOutput } from './types/interfaces';
import config from './config/PromptProjectConfigManager';

export class PromptFileSystem implements IPromptFileSystem {
  private basePath: string;

  constructor() {
    this.basePath = config.getConfig('promptsDir');
  }

  private getFilePath(category: string, promptName: string): string {
    return path.join(this.basePath, category, `${promptName}.json`);
  }

  async savePrompt(props: { promptData: IPrompt<IPromptInput, IPromptOutput> }): Promise<void> {
    const { promptData } = props;
    const filePath = this.getFilePath(promptData.category, promptData.name);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(promptData, null, 2));
  }

  async loadPrompt(props: { category: string; promptName: string }): Promise<IPrompt<IPromptInput, IPromptOutput>> {
    const { category, promptName } = props;
    const filePath = this.getFilePath(category, promptName);
    const data = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(data);
  }

  async promptExists(props: { category: string; promptName: string }): Promise<boolean> {
    const { category, promptName } = props;
    const filePath = this.getFilePath(category, promptName);
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  async listPrompts(props?: { category?: string }): Promise<string[]> {
    const category = props?.category;
    const searchPath = category ? path.join(this.basePath, category) : this.basePath;
    const entries = await fs.readdir(searchPath, { withFileTypes: true });
    
    const prompts: string[] = [];
    for (const entry of entries) {
      if (entry.isDirectory() && !category) {
        const subPrompts = await this.listPrompts({ category: entry.name });
        prompts.push(...subPrompts.map(p => `${entry.name}/${p}`));
      } else if (entry.isFile() && entry.name.endsWith('.json')) {
        prompts.push(entry.name.slice(0, -5));
      }
    }
    return prompts;
  }

  async listCategories(): Promise<string[]> {
    const entries = await fs.readdir(this.basePath, { withFileTypes: true });
    return entries.filter(entry => entry.isDirectory()).map(entry => entry.name);
  }

  async searchPrompts(props: { query: string }): Promise<Array<{ category: string; name: string }>> {
    const { query } = props;
    const allPrompts = await this.listPrompts();
    return allPrompts
      .filter(prompt => prompt.toLowerCase().includes(query.toLowerCase()))
      .map(prompt => {
        const [category, name] = prompt.split('/');
        return { category, name };
      });
  }

  async searchCategories(props: { query: string }): Promise<string[]> {
    const { query } = props;
    const categories = await this.listCategories();
    return categories.filter(category => category.toLowerCase().includes(query.toLowerCase()));
  }

  async getPromptVersions(props: { category: string; promptName: string }): Promise<string[]> {
    const { category, promptName } = props;
    // This is a placeholder. Implement version tracking if needed.
    const promptData = await this.loadPrompt({ category, promptName });
    return [promptData.version];
  }
}
