import { PromptManager } from '../promptManager';
import { PromptModel } from '../promptModel';
import fs from 'fs-extra';
import path from 'path';
import { input, confirm } from '@inquirer/prompts';
import { generatePromptWithAI, updatePromptWithAI, prettyPrintPrompt } from './aiHelpers';
import { IPrompt, IPromptInput, IPromptOutput } from '../types/interfaces';
import { PromptProjectConfigManager } from '../config/PromptProjectConfigManager';

export async function createPrompt(): Promise<void> {
  const configManager = PromptProjectConfigManager.getInstance();
  let promptData: Partial<IPrompt<IPromptInput, IPromptOutput>> = {};
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

  const manager = new PromptManager();
  await manager.initialize({});
  const prompt = new PromptModel({
    ...promptData,
    name: promptData.name || '',
    category: promptData.category || '',
    description: promptData.description || '',
    template: promptData.template || '',
    parameters: promptData.parameters || [],
    inputSchema: promptData.inputSchema || {},
    outputSchema: promptData.outputSchema || {},
    version: promptData.version || '1.0.0',
    metadata: {
      created: new Date().toISOString(),
      lastModified: new Date().toISOString(),
    }
  });

  await manager.createPrompt({ prompt });
  console.log(`Prompt "${prompt.name}" created successfully.`);
}

export async function listPrompts(): Promise<string[]> {
  const config = await configManager.config
  const manager = new PromptManager();
  await manager.initialize({});
  const prompts = await manager.listPrompts({});
  return prompts.map(prompt => `${prompt.category}/${prompt.name}`);
}

export async function getPromptDetails(props: { category: string; name: string }): Promise<Partial<IPrompt<IPromptInput, IPromptOutput>>> {
  const configManager = PromptProjectConfigManager.getInstance();
  const manager = new PromptManager();
  await manager.initialize({});
  const prompt = await manager.getPrompt(props);
  return {
    name: prompt.name,
    category: prompt.category,
    description: prompt.description,
    version: prompt.version,
    template: prompt.template,
    parameters: prompt.parameters,
    metadata: prompt.metadata,
  };
}

export async function updatePrompt(props: { category: string; name: string; updates: Partial<IPrompt<IPromptInput, IPromptOutput>> }): Promise<void> {
  const configManager = PromptProjectConfigManager.getInstance();
  const manager = new PromptManager();
  await manager.initialize({});

  if (props.updates.template) {
    const useAI = await confirm({ message: 'Do you want to use AI to refine the new content?' });
    if (useAI) {
      const query = 'Refine and improve this prompt content:';
      const refinedPrompt = await updatePromptWithAI({ ...props.updates, category: props.category, name: props.name } as IPrompt<IPromptInput, IPromptOutput>, query);
      props.updates.template = refinedPrompt.template;
    }
  }

  await manager.updatePrompt(props);
}

export async function generateTypes(): Promise<void> {
  const configManager = PromptProjectConfigManager.getInstance();
  const outputDir = configManager.getConfig('outputDir');
  const manager = new PromptManager();
  await manager.initialize({});
  const prompts = await manager.listPrompts({});
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

  await fs.writeFile(path.join(outputDir, 'prompts.d.ts'), typeDefs);
}

export async function getGeneratedTypes(): Promise<string> {
  const configManager = PromptProjectConfigManager.getInstance();
  const outputDir = configManager.getConfig('outputDir');
  return fs.readFile(path.join(outputDir, 'prompts.d.ts'), 'utf-8');
}

export async function getStatus(): Promise<{
  config: any;
  totalPrompts: number;
  categories: string[];
  lastGenerated: string | null;
  warnings: string[];
}> {
  const configManager = PromptProjectConfigManager.getInstance();
  const config = {
    promptsDir: configManager.getConfig('promptsDir'),
    outputDir: configManager.getConfig('outputDir'),
    preferredModels: configManager.getConfig('preferredModels'),
    modelParams: configManager.getConfig('modelParams')
  };
  const manager = new PromptManager();
  await manager.initialize({});
  const prompts = await manager.listPrompts({});

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

export async function getDetailedStatus(): Promise<Partial<IPrompt<IPromptInput, IPromptOutput>>[]> {
  const configManager = PromptProjectConfigManager.getInstance();
  const manager = new PromptManager();
  await manager.initialize({});
  const prompts = await manager.listPrompts({});

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
