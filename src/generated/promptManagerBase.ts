import fs from 'fs-extra';
import path from 'path';

export interface Prompt {
  content: string;
  format: (params: Record<string, any>) => string;
}

export class PromptManagerBase {
  private prompts: Record<string, Prompt> = {};

  constructor(private promptsPath: string) {}

  async initialize(): Promise<void> {
    const promptFiles = await fs.readdir(this.promptsPath);
    for (const file of promptFiles) {
      if (file.endsWith('.txt')) {
        const promptName = path.basename(file, '.txt');
        const content = await fs.readFile(path.join(this.promptsPath, file), 'utf-8');
        this.prompts[promptName] = {
          content,
          format: (params: Record<string, any>) => {
            let formatted = content;
            for (const [key, value] of Object.entries(params)) {
              formatted = formatted.replace(new RegExp(`{{${key}}}`, 'g'), value);
            }
            return formatted;
          },
        };
      }
    }
  }

  getPrompt(promptName: string): Prompt {
    const prompt = this.prompts[promptName];
    if (!prompt) {
      throw new Error(`Prompt '${promptName}' not found`);
    }
    return prompt;
  }
}
