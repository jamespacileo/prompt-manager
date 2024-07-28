import { PromptManager } from '../promptManager';
import { PromptModel } from '../promptModel';
import fs from 'fs-extra';
import path from 'path';
import { input, confirm, select } from '@inquirer/prompts';
import { generatePromptWithAI, updatePromptWithAI, prettyPrintPrompt } from './aiHelpers';
import { IPrompt, IPromptInput, IPromptOutput } from '../types/interfaces';
import { getConfigManager } from '../config/PromptProjectConfigManager';
import { z } from 'zod';
import { PromptSchema } from '../schemas/prompts';

let promptManager: PromptManager;

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
  promptManager = await PromptManager.getInstance();
  let promptData: Partial<IPrompt<IPromptInput, IPromptOutput>> = {};
  try {
    let accepted = false;

    const description = await input({ message: 'Describe the prompt you want to create:' });

    while (!accepted) {
      promptData = await generatePromptWithAI(description);
      prettyPrintPrompt(promptData);

      // Validate required fields before asking for acceptance
      if (!promptData.name || !promptData.category) {
        console.log('The generated prompt is missing required fields (name or category). Regenerating...');
        continue;
      }

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

    // Validate the AI-generated prompt data
    const validatedPromptData = PromptSchema.parse(promptData);

    const prompt = new PromptModel({
      ...validatedPromptData,
      name: validatedPromptData.name,
      category: validatedPromptData.category,
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

    await promptManager.createPrompt({ prompt });
    console.log(`Prompt "${prompt.name}" created successfully.`);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error(`Failed to create prompt "${promptData.name}": Invalid prompt data`);
      console.error('Validation errors:', error.errors);
      console.error(`This could be because:
        1. The AI-generated prompt doesn't meet the required schema.
        2. Manual edits introduced invalid data.
        
        To resolve this:
        - Review the generated prompt data and ensure all required fields are present and valid.
        - Try regenerating the prompt with a more specific description.
        - If you made manual edits, double-check them against the prompt schema.`);
    } else if (error instanceof Error) {
      console.error(`Failed to create prompt "${promptData.name}": ${error.message}`);
      console.error(`This could be due to:
        1. File system issues (e.g., permissions, disk space).
        2. Conflicts with existing prompts.
        3. Unexpected data format issues.
        
        To resolve this:
        - Check your file system permissions and available disk space.
        - Ensure the prompt name and category are unique.
        - Try creating a simpler prompt to isolate the issue.
        - If the problem persists, run 'status' to check the overall project health.`);
    } else {
      console.error(`Failed to create prompt "${promptData.name}": Unknown error`);
      console.error('Error details:', error);
    }
    throw error; // Re-throw the error to be caught by the caller
  }
}

/**
 * List all available prompts.
 * Purpose: Provide an overview of all prompts in the system for user reference.
 */
export async function listPrompts(): Promise<Array<{ name: string; category: string; version: string; filePath: string }>> {
  const prompts = await promptManager.listPrompts({});

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
  const manager = await PromptManager.getInstance();
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
  const { category, name, updates } = props;

  if (!category || !name) {
    throw new Error('Category and name are required for updating a prompt');
  }

  if (Object.keys(updates).length === 0) {
    throw new Error('No updates provided');
  }

  // Validate specific fields in updates
  if (updates.version && !/^\d+\.\d+\.\d+$/.test(updates.version)) {
    throw new Error('Invalid version format. Use semantic versioning (e.g., 1.0.0)');
  }

  try {
    const manager = await PromptManager.getInstance();

    // Fetch the current prompt
    const currentPrompt = await manager.getPrompt({ category: props.category, name: props.name });

    if (!currentPrompt) {
      throw new Error(`Prompt "${props.category}/${props.name}" not found.`);
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

    // Validate the updated prompt data
    const updatedPromptData = { ...currentPrompt, ...props.updates };
    const validatedPromptData = PromptSchema.parse(updatedPromptData);

    // Confirm changes with the user
    console.log('Proposed changes:');
    console.log(JSON.stringify(props.updates, null, 2));
    const confirmUpdate = await confirm({ message: 'Do you want to apply these changes?' });

    if (confirmUpdate) {
      // Update the version only if the user confirms the changes
      const [major, minor, patch] = (currentPrompt.version || '1.0.0').split('.').map(Number);
      switch (updateType) {
        case 'major':
          validatedPromptData.version = `${major + 1}.0.0`;
          break;
        case 'minor':
          validatedPromptData.version = `${major}.${minor + 1}.0`;
          break;
        case 'patch':
          validatedPromptData.version = `${major}.${minor}.${patch + 1}`;
          break;
      }

      await manager.updatePrompt({ category: props.category, name: props.name, updates: validatedPromptData });
      console.log(`Prompt "${props.category}/${props.name}" updated successfully to version ${validatedPromptData.version}.`);
    } else {
      console.log('Update cancelled.');
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Invalid prompt data:', error.errors);
    } else if (error instanceof Error) {
      console.error('An error occurred while updating the prompt:', error.message);
      if (error.stack) {
        console.debug(error.stack);
      }
    } else {
      console.error('An unknown error occurred while updating the prompt:', String(error));
    }
  }
}

/**
 * Generate TypeScript type definitions for all prompts.
 * Purpose: Create type-safe interfaces for using prompts in TypeScript projects.
 */
export async function generateTypes(): Promise<void> {
  const configManager = await getConfigManager();
  const outputDir = configManager.getConfig('outputDir');
  const manager = await PromptManager.getInstance();
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

  try {
    await fs.writeFile(path.join(outputDir, 'prompts.d.ts'), typeDefs);
    console.log(`Type definitions generated successfully at ${path.join(outputDir, 'prompts.d.ts')}`);
  } catch (error) {
    console.error('Failed to write type definitions file:', error);
    throw new Error(`Failed to generate type definitions: ${error instanceof Error ? error.message : String(error)}`);
  }
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
  if (schema.type === 'object' && schema.properties) {
    const props = Object.entries(schema.properties)
      .map(([key, value]: [string, any]) => `${key}${schema.required?.includes(key) ? '' : '?'}: ${getTypeFromSchema(value)}`)
      .join('; ');
    return `{ ${props} }`;
  }
  if (schema.type === 'array') {
    return `Array<${getTypeFromSchema(schema.items)}>`;
  }
  if (schema.enum) {
    return schema.enum.map((v: any) => JSON.stringify(v)).join(' | ');
  }
  // Add more cases for other complex types
  return schema.type || 'any';
}

export async function getGeneratedTypes(): Promise<string> {
  const configManager = await getConfigManager();
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
  const configManager = await getConfigManager();
  const config = {
    promptsDir: configManager.getConfig('promptsDir'),
    outputDir: configManager.getConfig('outputDir'),
    preferredModels: configManager.getConfig('preferredModels'),
    modelParams: configManager.getConfig('modelParams')
  };
  const manager = await PromptManager.getInstance();
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
  const manager = await PromptManager.getInstance();
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
  const manager = await PromptManager.getInstance();
  await manager.deletePrompt(props);
  console.log(`Prompt "${props.category}/${props.name}" deleted successfully.`);
}
