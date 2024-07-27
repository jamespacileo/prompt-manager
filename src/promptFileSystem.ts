import fs from 'fs/promises';
import path from 'path';

export class PromptFileSystem {
  constructor(private basePath: string) {}

  private getFilePath(category: string, promptName: string): string {
    return path.join(this.basePath, category, `${promptName}.json`);
  }

  async savePrompt(promptData: any): Promise<void> {
    const filePath = this.getFilePath(promptData.category, promptData.name);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(promptData, null, 2));
  }

  async loadPrompt(category: string, promptName: string): Promise<any> {
    const filePath = this.getFilePath(category, promptName);
    const data = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(data);
  }

  async promptExists(category: string, promptName: string): Promise<boolean> {
    const filePath = this.getFilePath(category, promptName);
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  async listPrompts(category?: string): Promise<string[]> {
    const searchPath = category ? path.join(this.basePath, category) : this.basePath;
    const entries = await fs.readdir(searchPath, { withFileTypes: true });
    
    const prompts: string[] = [];
    for (const entry of entries) {
      if (entry.isDirectory() && !category) {
        const subPrompts = await this.listPrompts(entry.name);
        prompts.push(...subPrompts.map(p => `${entry.name}/${p}`));
      } else if (entry.isFile() && entry.name.endsWith('.json')) {
        prompts.push(entry.name.slice(0, -5));
      }
    }
    return prompts;
  }

  async getVersions(category: string, promptName: string): Promise<string[]> {
    // This is a placeholder. Implement version tracking if needed.
    const promptData = await this.loadPrompt(category, promptName);
    return [promptData.version];
  }
}
