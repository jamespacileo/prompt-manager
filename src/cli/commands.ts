import { PromptManager } from '../promptManager';
import { IPromptInput, IPromptOutput, Prompt } from '../types/interfaces';
import fs from 'fs-extra';
import path from 'path';

const getConfig = async () => {
  try {
    const config = await fs.readJSON('prompt-manager.json');
    return config;
  } catch (error) {
    throw new Error('Failed to read configuration. Please run "init" command first.');
  }
};

export async function createPrompt(name: string, options: any) {
  const config = await getConfig();
  const prompt: Prompt<IPromptInput, IPromptOutput> = {
    name,
    category: options.category || 'General',
    version: '1.0.0',
    content: options.content || '',
    parameters: [],
    metadata: {
      description: options.description || '',
      created: new Date().toISOString(),
      lastModified: new Date().toISOString(),
    },
    versions: ['1.0.0'],
    outputType: "plain",
    input: {},
    output: {},
    format: (inputs: IPromptInput) => {
      return inputs.content;
    },
  };

  const manager = new PromptManager(config.promptsDir);
  await manager.initialize();
  await manager.createPrompt(prompt);
}

export async function listPrompts(): Promise<string[]> {
  const config = await getConfig();
  const manager = new PromptManager(config.promptsDir);
  await manager.initialize();
  const prompts = await manager.listPrompts();
  return prompts.map(prompt => `${prompt.category}/${prompt.name}`);
}

export async function updatePrompt(name: string, options: any) {
  const config = await getConfig();
  const updates: Partial<Prompt<IPromptInput, IPromptOutput>> = {};
  if (options.content) updates.content = options.content;
  const manager = new PromptManager(config.promptsDir);
  await manager.initialize();
  await manager.updatePrompt(name, updates);
}

export async function generateTypes() {
  const config = await getConfig();
  const manager = new PromptManager(config.promptsDir);
  await manager.initialize();
  const prompts = await manager.listPrompts();
  let typeDefs = 'declare module "prompt-manager" {\n';

  for (const prompt of prompts) {
    typeDefs += `  export namespace ${prompt.category} {\n`;
    typeDefs += `    export const ${prompt.name}: {\n`;
    typeDefs += `      format: (inputs: { ${prompt.parameters.map(p => `${p}: string`).join('; ')} }) => string;\n`;
    typeDefs += `    };\n`;
    typeDefs += `  }\n\n`;
  }

  typeDefs += '}\n';

  await fs.writeFile(path.join(config.outputDir, 'prompts.d.ts'), typeDefs);
}

export async function getStatus() {
  const config = await getConfig();
  const manager = new PromptManager(config.promptsDir);
  await manager.initialize();
  const prompts = await manager.listPrompts();

  const categories = [...new Set(prompts.map(prompt => prompt.category))];
  
  let lastGenerated = null;
  try {
    const stats = await fs.stat(path.join(config.outputDir, 'prompts.d.ts'));
    lastGenerated = stats.mtime.toISOString();
  } catch (error) {
    // File doesn't exist, which is fine
  }

  const warnings = [];
  if (prompts.length === 0) {
    warnings.push('No prompts found. Use the "create" command to add new prompts.');
  }
  if (!lastGenerated) {
    warnings.push('Type definitions have not been generated yet. Use the "generate" command to create them.');
  }

  return {
    config,
    totalPrompts: prompts.length,
    categories,
    lastGenerated,
    warnings
  };
}
