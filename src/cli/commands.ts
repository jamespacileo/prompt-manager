import { PromptManager } from '../promptManager';
import { PromptModel } from '../promptModel';
import fs from 'fs-extra';
import path from 'path';
import { input, confirm } from '@inquirer/prompts';
import { generatePromptWithAI, updatePromptWithAI, prettyPrintPrompt } from './aiHelpers';
import { IPrompt, IPromptInput, IPromptOutput } from '../types/interfaces';
import { configManager } from '../config/PromptProjectConfigManager';

/**
 * This file contains the implementation of various CLI commands for the Prompt Manager.
 * Each function represents a different command that can be executed from the command line.
 */

/**
 * Create a new prompt with AI assistance.
 * Purpose: Guide the user through creating a new prompt, leveraging AI for content generation and refinement.
 * @returns A Promise that resolves when the prompt creation process is complete.
 */
export async function createPrompt(): Promise<void> {
  try {
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
    await manager.initialize();

    // Validate the AI-generated prompt data
    const validatedPromptData = PromptSchema.parse(promptData);

    const prompt = new PromptModel({
      ...validatedPromptData,
      name: validatedPromptData.name || '',
      category: validatedPromptData.category || '',
      description: validatedPromptData.description || '',
      template: validatedPromptData.template || '',
      parameters: validatedPromptData.parameters || [],
      inputSchema: validatedPromptData.inputSchema || {},
      outputSchema: validatedPromptData.outputSchema || {},
      version: validatedPromptData.version || '1.0.0',
      metadata: {
        created: new Date().toISOString(),
        lastModified: new Date().toISOString(),
      }
    });

    await manager.createPrompt({ prompt });
    console.log(`Prompt "${prompt.name}" created successfully.`);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Invalid prompt data generated:', error.errors);
    } else {
      console.error('An error occurred while creating the prompt:', error);
    }
  }
}

/**
 * List all available prompts.
 * Purpose: Provide an overview of all prompts in the system for user reference.
 */
export async function listPrompts(): Promise<Array<{ name: string; category: string; version: string; filePath: string }>> {
  const manager = new PromptManager();
  await manager.initialize();
  const prompts = await manager.listPrompts({});
  
  if (prompts.length === 0) {
    console.log('No prompts found. Use the "create" command to add new prompts.');
  }
  
  return prompts.map(prompt => ({
    name: prompt.name,
    category: prompt.category,
    version: prompt.version || '1.0.0', // Default to '1.0.0' if version is not available
    filePath: prompt.filePath || ''
  }));
}

/**
 * Retrieve detailed information about a specific prompt.
 * Purpose: Allow users to inspect the properties and content of a particular prompt.
 */
export async function getPromptDetails(props: { category: string; name: string }): Promise<Partial<IPrompt<IPromptInput, IPromptOutput>>> {
  const manager = new PromptManager();
  await manager.initialize();
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

/**
 * Update an existing prompt, optionally using AI for content refinement.
 * Purpose: Allow users to modify prompt properties and content, with AI assistance if desired.
 */
export async function updatePrompt(props: { category: string; name: string; updates: Partial<IPrompt<IPromptInput, IPromptOutput>> }): Promise<void> {
  try {
    const manager = new PromptManager();
    await manager.initialize();

    // Fetch the current prompt
    const currentPrompt = await manager.getPrompt({ category: props.category, name: props.name });

    if (!currentPrompt) {
      console.error(`Prompt "${props.category}/${props.name}" not found.`);
      return;
    }

    // Determine the type of update (major, minor, or patch)
    const updateType = await select({
      message: 'What type of update is this?',
      choices: [
        { name: 'Patch (backwards-compatible bug fixes)', value: 'patch' },
        { name: 'Minor (backwards-compatible new features)', value: 'minor' },
        { name: 'Major (breaking changes)', value: 'major' },
      ],
    });

    // Update the version
    const [major, minor, patch] = (currentPrompt.version || '1.0.0').split('.').map(Number);
    switch (updateType) {
      case 'major':
        props.updates.version = `${major + 1}.0.0`;
        break;
      case 'minor':
        props.updates.version = `${major}.${minor + 1}.0`;
        break;
      case 'patch':
        props.updates.version = `${major}.${minor}.${patch + 1}`;
        break;
    }

    if (props.updates.template) {
      const useAI = await confirm({ message: 'Do you want to use AI to refine the new content?' });
      if (useAI) {
        const query = 'Refine and improve this prompt content:';
        const refinedPrompt = await updatePromptWithAI({ ...currentPrompt, ...props.updates, category: props.category, name: props.name } as IPrompt<IPromptInput, IPromptOutput>, query);
        props.updates.template = refinedPrompt.template;
      }
    }

    // Update the lastModified metadata
    props.updates.metadata = {
      ...currentPrompt.metadata,
      lastModified: new Date().toISOString()
    };

    await manager.updatePrompt(props);
    console.log(`Prompt "${props.category}/${props.name}" updated successfully to version ${props.updates.version}.`);
  } catch (error) {
    console.error('An error occurred while updating the prompt:', error);
  }
}

/**
 * Generate TypeScript type definitions for all prompts.
 * Purpose: Create type-safe interfaces for using prompts in TypeScript projects.
 */
export async function generateTypes(): Promise<void> {
  const outputDir = configManager.getConfig('outputDir');
  const manager = new PromptManager();
  await manager.initialize();
  const prompts = await manager.listPrompts({});
  let typeDefs = 'declare module "prompt-manager" {\n';

  for (const prompt of prompts) {
    const promptData = prompt as IPrompt<IPromptInput, IPromptOutput>;
    typeDefs += `  export namespace ${promptData.category} {\n`;
    typeDefs += `    export const ${promptData.name}: {\n`;
    typeDefs += `      format: (inputs: ${generateInputType(promptData.inputSchema)}) => ${generateOutputType(promptData.outputSchema)};\n`;
    typeDefs += `      description: string;\n`;
    typeDefs += `      version: string;\n`;
    typeDefs += `    };\n`;
    typeDefs += `  }\n\n`;
  }

  typeDefs += '}\n';

  await fs.writeFile(path.join(outputDir, 'prompts.d.ts'), typeDefs);
}

function generateInputType(schema: any): string {
  if (schema.type === 'object' && schema.properties) {
    const props = Object.entries(schema.properties)
      .map(([key, value]: [string, any]) => `${key}: ${getTypeFromSchema(value)}`)
      .join('; ');
    return `{ ${props} }`;
  }
  return 'any';
}

function generateOutputType(schema: any): string {
  return getTypeFromSchema(schema);
}

function getTypeFromSchema(schema: any): string {
  switch (schema.type) {
    case 'string':
      return 'string';
    case 'number':
      return 'number';
    case 'boolean':
      return 'boolean';
    case 'array':
      return `Array<${getTypeFromSchema(schema.items)}>`;
    case 'object':
      if (schema.properties) {
        const props = Object.entries(schema.properties)
          .map(([key, value]: [string, any]) => `${key}: ${getTypeFromSchema(value)}`)
          .join('; ');
        return `{ ${props} }`;
      }
      return 'Record<string, any>';
    default:
      return 'any';
  }
}

export async function getGeneratedTypes(): Promise<string> {
  const outputDir = configManager.getConfig('outputDir');
  return fs.readFile(path.join(outputDir, 'prompts.d.ts'), 'utf-8');
}

/**
 * Retrieve the current status of the prompt management system.
 * Purpose: Provide an overview of the system's configuration, prompt count, and potential issues.
 */
export async function getStatus(): Promise<{
  config: any;
  totalPrompts: number;
  categories: string[];
  lastGenerated: string | null;
  warnings: string[];
}> {
  const config = {
    promptsDir: configManager.getConfig('promptsDir'),
    outputDir: configManager.getConfig('outputDir'),
    preferredModels: configManager.getConfig('preferredModels'),
    modelParams: configManager.getConfig('modelParams')
  };
  const manager = new PromptManager();
  await manager.initialize();
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
  const manager = new PromptManager();
  await manager.initialize();
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

export async function deletePrompt(props: { category: string; name: string }): Promise<void> {
  const manager = new PromptManager();
  await manager.initialize();
  await manager.deletePrompt(props);
  console.log(`Prompt "${props.category}/${props.name}" deleted successfully.`);
}
