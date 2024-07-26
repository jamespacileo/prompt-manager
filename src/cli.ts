import { IPromptInput, IPromptOutput, PromptManagerCLI } from './types/interfaces';
import { PromptManager } from './promptManager';

export class CLI implements PromptManagerCLI {
  private promptManager: PromptManager;

  constructor(promptsPath: string) {
    this.promptManager = new PromptManager(promptsPath);
  }

  async create(name: string, options: {
    category?: string;
    content?: string;
    parameters?: string[];
    description?: string;
  }): Promise<void> {
    const [category, promptName] = name.split('/');
    await this.promptManager.createPrompt({
      name: promptName,
      category: options.category || category,
      version: '1.0.0',
      content: options.content || '',
      parameters: options.parameters || [],
      metadata: {
        description: options.description || '',
        created: new Date().toISOString(),
        lastModified: new Date().toISOString(),
      },
      outputType: 'plain', // Add default outputType
      input: {} as IPromptInput, // Add default input
      output: {} as IPromptOutput, // Add default output
    });
    console.log(`Created prompt: ${name}`);
  }

  async list(options?: {
    category?: string;
    format?: 'json' | 'table';
  }): Promise<void> {
    const prompts = await this.promptManager.listPrompts(options?.category);
    if (options?.format === 'json') {
      console.log(JSON.stringify(prompts, null, 2));
    } else {
      console.table(prompts.map(p => ({
        name: p.name,
        category: p.category,
        version: p.version,
        description: p.metadata.description,
      })));
    }
  }

  async update(name: string, options: {
    content?: string;
    parameters?: string[];
    description?: string;
  }): Promise<void> {
    await this.promptManager.updatePrompt(name, {
      content: options.content,
      parameters: options.parameters,
      // metadata: options.description ? {
      //   description: options.description,
      //   created: new Date().toISOString(),
      //   lastModified: new Date().toISOString(),
      // } : {},
    });
    console.log(`Updated prompt: ${name}`);
  }

  async delete(name: string): Promise<void> {
    await this.promptManager.deletePrompt(name);
    console.log(`Deleted prompt: ${name}`);
  }

  async version(action: 'list' | 'create' | 'switch', name: string, version?: string): Promise<void> {
    await this.promptManager.versionPrompt(action, name, version);
  }

  async generateTypes(): Promise<void> {
    // Implementation for generating TypeScript types
    console.log('Generating TypeScript types...');
    // Add logic to generate types based on prompts
  }

  async check(): Promise<void> {
    // Implementation for consistency check
    console.log('Performing consistency check...');
    // Add logic to check prompts for consistency
  }
}
