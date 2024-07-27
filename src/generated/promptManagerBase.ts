import fs from 'fs-extra';
import path from 'path';

import { IPrompt, IPromptInput, IPromptOutput } from '../types/interfaces';

export class PromptManagerBase {
  private prompts: Record<string, IPrompt<any, any>> = {};

  constructor(private promptsPath: string) { }

  async initialize(): Promise<void> {
    const promptFiles = await fs.readdir(this.promptsPath);
    for (const file of promptFiles) {
      if (file.endsWith('.txt')) {
        const promptName = path.basename(file, '.txt');
        const content = await fs.readFile(path.join(this.promptsPath, file), 'utf-8');

        // todo: SETUP PROMPT
        // this.prompts[promptName] = {
        //   content,
        //   name: promptName,
        //   category: 'default',
        //   version: '1.0',
        //   parameters: {},
        //   format: (params: Record<string, any>) => {
        //     let formatted = content;
        //     for (const [key, value] of Object.entries(params)) {
        //       formatted = formatted.replace(new RegExp(`{{${key}}}`, 'g'), value);
        //     }
        //     return formatted;
        //   },
        // };
      }
    }
  }

  getPrompt(promptName: string): IPrompt<IPromptInput, IPromptOutput> {
    const prompt = this.prompts[promptName];
    if (!prompt) {
      throw new Error(`Prompt '${promptName}' not found`);
    }
    return prompt;
  }
}
