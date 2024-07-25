import fs from 'fs-extra';
import path from 'path';

const ROOT_DIR = '.prompts';

export interface Prompt {
  name: string;
  category: string;
  version: string;
  content: string;
  parameters: string[];
  metadata: {
    description: string;
    created: string;
    lastModified: string;
  };
  versions: string[];
}

export class PromptManager {
  static async createPrompt(prompt: Prompt): Promise<void> {
    const promptDir = path.join(ROOT_DIR, prompt.name);
    await fs.ensureDir(promptDir);
    await fs.writeJson(path.join(promptDir, 'prompt.json'), prompt, { spaces: 2 });
  }

  static async getPrompt(name: string): Promise<Prompt | null> {
    const promptPath = path.join(ROOT_DIR, name, 'prompt.json');
    if (await fs.pathExists(promptPath)) {
      return fs.readJson(promptPath);
    }
    return null;
  }

  static async updatePrompt(name: string, updates: Partial<Prompt>): Promise<void> {
    const promptPath = path.join(ROOT_DIR, name, 'prompt.json');
    const prompt = await this.getPrompt(name);
    if (!prompt) throw new Error('Prompt not found');

    const updatedPrompt = { ...prompt, ...updates };
    await fs.writeJson(promptPath, updatedPrompt, { spaces: 2 });
  }

  static async listPrompts(): Promise<string[]> {
    const dirs = await fs.readdir(ROOT_DIR);
    return dirs.filter(async (dir) => {
      const stat = await fs.stat(path.join(ROOT_DIR, dir));
      return stat.isDirectory();
    });
  }
}
