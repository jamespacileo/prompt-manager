import { Container } from 'typedi';
import { PromptManager } from '../promptManager';
import { PromptModel } from '../promptModel';
import fs from 'fs-extra';
import path from 'path';
import { input, confirm, select } from '@inquirer/prompts';
import { generatePromptWithAI, updatePromptWithAI, prettyPrintPrompt } from './aiHelpers';
import { IPrompt, IPromptInput, IPromptOutput } from '../types/interfaces';
import { PromptProjectConfigManager } from '../config/PromptProjectConfigManager';
import { PromptFileSystem } from '../promptFileSystem';
import { z } from 'zod';
import { PromptSchema } from '../schemas/prompts';
import { generateExportableSchemaAndType } from '../utils/typeGeneration';
import { logger } from '../utils/logger';

export async function initializeContainer(): Promise<void> {
  const configManager = Container.get(PromptProjectConfigManager);
  await configManager.initialize();
  
  const promptManager = Container.get(PromptManager);
  await promptManager.initialize();

  const promptFileSystem = Container.get(PromptFileSystem);
  await promptFileSystem.initialize();
}

export async function createPrompt(): Promise<void> {
  const promptManager = Container.get(PromptManager);
  let promptData: Partial<IPrompt<IPromptInput, IPromptOutput>> = {};
  try {
    let accepted = false;

    const description = await input({ message: 'Describe the prompt you want to create:' });

    while (!accepted) {
      promptData = await generatePromptWithAI(description);
      prettyPrintPrompt(promptData);

      if (!promptData.name || !promptData.category) {
        logger.warn('The generated prompt is missing required fields (name or category). Regenerating...');
        continue;
      }

      accepted = await confirm({ message: 'Do you accept this prompt?' });

      if (!accepted) {
        const instruction = await input({ message: 'What changes would you like to make? (Type "quit" to cancel)' });
        if (instruction.toLowerCase() === 'quit') {
          logger.info('Prompt creation cancelled.');
          return;
        }
        promptData = await updatePromptWithAI(promptData, instruction);
      }
    }

    const validatedPromptData: Omit<IPrompt<IPromptInput, IPromptOutput>, 'versions'> = {
      ...PromptSchema.parse(promptData),
      inputSchema: promptData.inputSchema || {}, // Add a default empty object if not present
      outputSchema: promptData.outputSchema || {} // Add a default empty object if not present
    };

    await promptManager.createPrompt({ prompt: validatedPromptData });
    logger.success(`Prompt "${validatedPromptData.name}" created successfully.`);
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.error(`Failed to create prompt "${promptData.name}": Invalid prompt data`);
      logger.error('Validation errors:', error.errors);
      logger.warn(`This could be because:
        1. The AI-generated prompt doesn't meet the required schema.
        2. Manual edits introduced invalid data.
        
        To resolve this:
        - Review the generated prompt data and ensure all required fields are present and valid.
        - Try regenerating the prompt with a more specific description.
        - If you made manual edits, double-check them against the prompt schema.`);
    } else if (error instanceof Error) {
      logger.error(`Failed to create prompt "${promptData.name}": ${error.message}`);
      logger.warn(`This could be due to:
        1. File system issues (e.g., permissions, disk space).
        2. Conflicts with existing prompts.
        3. Unexpected data format issues.
        
        To resolve this:
        - Check your file system permissions and available disk space.
        - Ensure the prompt name and category are unique.
        - Try creating a simpler prompt to isolate the issue.
        - If the problem persists, run 'status' to check the overall project health.`);
    } else {
      logger.error(`Failed to create prompt "${promptData.name}": Unknown error`);
      logger.error('Error details:', error);
    }
    throw error;
  }
}

export async function listPrompts(): Promise<Array<{ name: string; category: string; version: string; filePath: string }>> {
  const promptManager = Container.get(PromptManager);
  const prompts = await promptManager.listPrompts({});

  if (prompts.length === 0) {
    logger.info('No prompts found. Use the "create" command to add new prompts.');
  }

  return prompts.map(prompt => ({
    name: prompt.name,
    category: prompt.category,
    version: prompt.version || '1.0.0',
    filePath: prompt.filePath || ''
  }));
}

export async function getPromptDetails(props: { category: string; name: string }): Promise<Partial<IPrompt<IPromptInput, IPromptOutput>>> {
  const promptManager = Container.get(PromptManager);
  const prompt = promptManager.getPrompt(props);
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
  const { category, name, updates } = props;

  if (!category || !name) {
    throw new Error('Category and name are required for updating a prompt');
  }

  if (Object.keys(updates).length === 0) {
    throw new Error('No updates provided');
  }

  if (updates.version && !/^\d+\.\d+\.\d+$/.test(updates.version)) {
    throw new Error('Invalid version format. Use semantic versioning (e.g., 1.0.0)');
  }

  try {
    const promptManager = Container.get(PromptManager);
    const currentPrompt = promptManager.getPrompt({ category, name });

    if (!currentPrompt) {
      throw new Error(`Prompt "${category}/${name}" not found.`);
    }

    const updateType = await select({
      message: 'What type of update is this?',
      choices: [
        { name: 'Patch (backwards-compatible bug fixes)', value: 'patch' },
        { name: 'Minor (backwards-compatible new features)', value: 'minor' },
        { name: 'Major (breaking changes)', value: 'major' },
      ],
    });

    if (updates.template) {
      const useAI = await confirm({ message: 'Do you want to use AI to refine the new content?' });
      if (useAI) {
        const query = 'Refine and improve this prompt content:';
        const refinedPrompt = await updatePromptWithAI({ ...currentPrompt, ...updates, category, name } as IPrompt<IPromptInput, IPromptOutput>, query);
        updates.template = refinedPrompt.template;
      }
    }

    updates.metadata = {
      ...currentPrompt.metadata,
      lastModified: new Date().toISOString()
    };

    const updatedPromptData = { ...currentPrompt, ...updates };
    const validatedPromptData = PromptSchema.parse(updatedPromptData);

    logger.info('Proposed changes:');
    logger.info(JSON.stringify(updates, null, 2));
    const confirmUpdate = await confirm({ message: 'Do you want to apply these changes?' });

    if (confirmUpdate) {
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

      await promptManager.updatePrompt({ category, name, updates: validatedPromptData });
      logger.success(`Prompt "${category}/${name}" updated successfully to version ${validatedPromptData.version}.`);
    } else {
      logger.info('Update cancelled.');
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.error('Invalid prompt data:', error.errors);
    } else if (error instanceof Error) {
      logger.error('An error occurred while updating the prompt:', error.message);
      if (error.stack) {
        logger.debug(error.stack);
      }
    } else {
      logger.error('An unknown error occurred while updating the prompt:', String(error));
    }
  }
}

export async function generateTypes(): Promise<void> {
  const configManager = Container.get(PromptProjectConfigManager);
  const outputDir = configManager.getConfig('outputDir');
  const promptManager = Container.get(PromptManager);
  const prompts = await promptManager.listPrompts({});
  let typeDefs = 'declare module "prompt-manager" {\n';

  for (const prompt of prompts) {
    const inputTypes = await generateExportableSchemaAndType({ schema: prompt.inputSchema, name: `${prompt.category}/${prompt.name}Input` });
    const outputTypes = await generateExportableSchemaAndType({ schema: prompt.outputSchema, name: `${prompt.category}/${prompt.name}Output` });

    typeDefs += `  ${inputTypes.formattedSchemaTsNoImports};\n`;
    typeDefs += `  ${outputTypes.formattedSchemaTsNoImports};\n`;

    const promptData = prompt as IPrompt<IPromptInput, IPromptOutput>;
    typeDefs += `  export namespace ${promptData.category} {\n`;
    typeDefs += `    export const ${promptData.name}: {\n`;
    typeDefs += `      format: (inputs: ${promptData.name}Input) => ${promptData.name}Output;\n`;
    typeDefs += `      description: string;\n`;
    typeDefs += `      version: string;\n`;
    typeDefs += `    };\n`;
    typeDefs += `  }\n\n`;
  }

  typeDefs += '}\n';

  try {
    await fs.writeFile(path.join(outputDir, 'prompts.d.ts'), typeDefs);
    logger.success(`Type definitions generated successfully at ${path.join(outputDir, 'prompts.d.ts')}`);
  } catch (error) {
    logger.error('Failed to write type definitions file:', error);
    throw new Error(`Failed to generate type definitions: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// ... other helper functions (generateInputType, generateOutputType, getTypeFromSchema) remain the same

export async function getGeneratedTypes(): Promise<string> {
  const configManager = Container.get(PromptProjectConfigManager);
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
  const configManager = Container.get(PromptProjectConfigManager);
  const promptManager = Container.get(PromptManager);
  
  const config = {
    promptsDir: configManager.getConfig('promptsDir'),
    outputDir: configManager.getConfig('outputDir'),
    preferredModels: configManager.getConfig('preferredModels'),
    modelParams: configManager.getConfig('modelParams')
  };
  
  const prompts = await promptManager.listPrompts({});
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
  const promptManager = Container.get(PromptManager);
  const prompts = await promptManager.listPrompts({});

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
  const promptManager = Container.get(PromptManager);
  await promptManager.deletePrompt(props);
  logger.success(`Prompt "${props.category}/${props.name}" deleted successfully.`);
}
