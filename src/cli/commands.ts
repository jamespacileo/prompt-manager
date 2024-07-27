import { PromptManager } from '../promptManager';
import { PromptModel } from '../promptModel';
import fs from 'fs-extra';
import path from 'path';
import { input, confirm } from '@inquirer/prompts';
import { generatePromptWithAI, updatePromptWithAI, prettyPrintPrompt } from './aiHelpers';

const getConfig = async () => {
  try {
    const config = await fs.readJSON('prompt-manager.json');
    return config;
  } catch (error) {
    throw new Error('Failed to read configuration. Please run "init" command first.');
  }
};

export async function createPrompt() {
  const config = await getConfig();
  let promptData: Partial<PromptModel> = {};
  let accepted = false;

  const description = await input({ message: 'Describe the prompt you want to create:' });

  while (!accepted) {
    promptData = await generatePromptWithAI(description);
    prettyPrintPrompt(promptData);

    accepted = await confirm({ message: 'Do you accept this prompt?' });

    if (!accepted) {
      const instruction = await input({ message: 'What changes would you like to make? (Type "quit" to cancel)' });
      if (instruction.toLowerCase() === 'quit') {
        console.log('Prompt creation cancelled.');
        return;
      }
      promptData = await updatePromptWithAI(promptData, instruction);
    }
  }

  const manager = new PromptManager(config.promptsDir);
  await manager.initialize();
  const prompt = new PromptModel({
    ...promptData,
    name: promptData.name || '',
    category: promptData.category || '',
    description: promptData.description || '',
    template: promptData.template || '',
    version: '1.0.0',
    parameters: promptData.parameters || [],
    metadata: {
      created: new Date().toISOString(),
      lastModified: new Date().toISOString(),
    },
  }, manager.getFileSystem());

  await manager.createPrompt(prompt);
  console.log(`Prompt "${prompt.name}" created successfully.`);
}

export async function listPrompts(): Promise<string[]> {
  const config = await getConfig();
  const manager = new PromptManager(config.promptsDir);
  await manager.initialize();
  const prompts = await manager.listPrompts();
  return prompts.map(prompt => `${prompt.category}/${prompt.name}`);
}

export async function getPromptDetails(name: string): Promise<Partial<PromptModel>> {
  const config = await getConfig();
  const manager = new PromptManager(config.promptsDir);
  await manager.initialize();
  const [category, promptName] = name.split('/');
  const prompt = await manager.getPrompt(category, promptName);
  return {
    name: prompt.name,
    category: prompt.category,
    description: prompt.description,
    version: prompt.version,
    template: prompt.template,
    parameters: prompt.parameters,
    metadata: {
      created: prompt.metadata.created,
      lastModified: prompt.metadata.lastModified,
    },
    format: prompt.format,
  };
}

export async function updatePrompt(name: string, updates: Partial<PromptModel>) {
  const config = await getConfig();
  const manager = new PromptManager(config.promptsDir);
  await manager.initialize();

  if (updates.template) {
    const useAI = await confirm({ message: 'Do you want to use AI to refine the new content?' });
    if (useAI) {
      const query = 'Refine and improve this prompt content:';
      const refinedPrompt = await updatePromptWithAI({ name, ...updates } as PromptModel, query);
      updates.template = refinedPrompt.template;
    }
  }

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
    typeDefs += `      description: string;\n`;
    typeDefs += `      version: string;\n`;
    typeDefs += `    };\n`;
    typeDefs += `  }\n\n`;
  }

  typeDefs += '}\n';

  await fs.writeFile(path.join(config.outputDir, 'prompts.d.ts'), typeDefs);
}

export async function getGeneratedTypes(): Promise<string> {
  const config = await getConfig();
  return fs.readFile(path.join(config.outputDir, 'prompts.d.ts'), 'utf-8');
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

export async function getDetailedStatus(): Promise<Partial<PromptModel>[]> {
  const config = await getConfig();
  const manager = new PromptManager(config.promptsDir);
  await manager.initialize();
  const prompts = await manager.listPrompts();

  return prompts.map(prompt => ({
    name: prompt.name,
    category: prompt.category,
    version: prompt.version,
    parameters: prompt.parameters,
    metadata: {
      created: prompt.metadata.created,
      lastModified: prompt.metadata.lastModified,
    },
  }));
}
