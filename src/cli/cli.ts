#!/usr/bin/env bun

import 'reflect-metadata';
import { Command } from 'commander';
import { input, confirm, select, expand, search } from '@inquirer/prompts';
import { createPrompt, listPrompts, updatePrompt, generateTypes, getStatus, getPromptDetails, getGeneratedTypes, getDetailedStatus, deletePrompt, initializeContainer } from './commands.js';
import { Table } from 'console-table-printer';
import fs from 'fs-extra';
import { TextEncoder, TextDecoder } from 'util';
import { Container } from 'typedi';
import { PromptProjectConfigManager } from "../config/PromptProjectConfigManager";
import { PromptManager } from '../promptManager.js';
import { PromptFileSystem } from '../promptFileSystem.js';

// Add TextEncoder and TextDecoder to the global object
(global as any).TextEncoder = TextEncoder;
(global as any).TextDecoder = TextDecoder;

async function ensureInitialized() {
  const configManager = Container.get(PromptProjectConfigManager);
  await configManager.initialize();
  const fileSystem = Container.get(PromptFileSystem);
  await fileSystem.initialize();
  const promptManager = Container.get(PromptManager);
  await promptManager.initialize();
}

import { logger } from '../utils/logger';
const program = new Command();

program
  .version('1.0.0')
  .description('Prompt Manager CLI - A powerful tool for managing and generating prompts')
  .hook('preAction', async (thisCommand) => {
    if (thisCommand.name() !== 'init') {
      await ensureInitialized();
      // await ensureInitialized();
    }
  });

program
  .command('init')
  .description('Initialize a new Prompt Manager project')
  .action(async () => {
    logger.info('Initializing a new Prompt Manager project');
    logger.info('This command will set up your project structure and configuration.');

    const projectName = await input({ message: 'Enter project name:' });
    const promptsDir = await input({ message: 'Enter prompts directory:', default: '.prompts' });
    const outputDir = await input({ message: 'Enter output directory:', default: 'src/generated' });

    const config = {
      name: projectName,
      promptsDir,
      outputDir,
    };

    try {
      await fs.writeJSON('prompt-manager.json', config, { spaces: 2 });
      logger.success('Configuration file created: prompt-manager.json');

      await fs.ensureDir(promptsDir);
      logger.success(`Prompts directory created: ${promptsDir}`);

      await fs.ensureDir(outputDir);
      logger.success(`Output directory created: ${outputDir}`);

      const configManager = Container.get(PromptProjectConfigManager);
      await configManager.initialize();

      const promptFileSystem = Container.get(PromptFileSystem);
      await promptFileSystem.initialize();

      logger.success('Project initialized successfully!');
      logger.info('You can now start creating prompts using the "create" command.');
    } catch (error) {
      logger.error('Failed to initialize project:');
      logger.error('An error occurred:', error);
    }
  });

program
  .command('create')
  .description('Create a new prompt')
  .action(async () => {
    logger.info('Creating a new prompt');
    logger.info('Please describe the prompt you want to create. AI will generate a prompt based on your description.');

    try {
      await createPrompt();
      logger.success('Prompt created successfully.');
      logger.info('You can now use this prompt in your project.');
    } catch (error) {
      logger.error('Failed to create prompt:');
      if (error instanceof Error) {
        logger.error(error.message);
        if (error.stack) {
          logger.debug(error.stack);
        }
      } else {
        logger.error(String(error));
      }
    }
  });

program
  .command('list')
  .description('List all prompts')
  .action(async () => {
    logger.info('Listing all prompts');
    logger.info('Here are all the prompts currently available in your project:');

    try {
      while (true) {
        const prompts = await listPrompts();
        if (prompts.length === 0) {
          logger.warn('No prompts found. Use the "create" command to add new prompts.');
          return;
        }

        const table = new Table({
          columns: [
            { name: 'category', alignment: 'left', color: 'cyan' },
            { name: 'name', alignment: 'left', color: 'green' },
            { name: 'version', alignment: 'left', color: 'yellow' },
          ],
        });

        prompts.forEach((prompt) => {
          table.addRow({
            category: prompt.category,
            name: prompt.name,
            version: prompt.version,
          });
        });

        table.printTable();

        const promptChoices = prompts.map((prompt) => ({
          name: `${prompt.category}/${prompt.name}`,
          value: prompt,
        }));

        const selectedPrompt = await search({
          message: 'Select a prompt to view details (type to search):',
          source: async (input, { signal }) => {
            return promptChoices.filter((choice) =>
              choice.name.toLowerCase().includes((input || '').toLowerCase())
            );
          },
        });

        const result = await displayPromptDetails(selectedPrompt);
        if (result === 'delete' || result === 'error') {
          break;
        }
      }
    } catch (error) {
      logger.error('Failed to list prompts:');
      logger.error('An error occurred:', error);
    }
  });

async function displayPromptDetails(prompt: any): Promise<string> {
  while (true) {
    try {
      const promptDetails = await getPromptDetails({ category: prompt.category, name: prompt.name });
      logger.info('\nPrompt Details:');
      const detailsTable = new Table({
        columns: [
          { name: 'property', alignment: 'left', color: 'cyan' },
          { name: 'value', alignment: 'left', color: 'green' },
        ],
      });

      Object.entries(promptDetails).forEach(([key, value]) => {
        detailsTable.addRow({ property: key, value: JSON.stringify(value ?? 'N/A', null, 2) });
      });

      detailsTable.printTable();

      const action = await expand({
        message: 'What would you like to do?',
        default: 'e',
        choices: [
          {
            key: 'e',
            name: 'Edit prompt',
            value: 'edit',
          },
          {
            key: 'd',
            name: 'Delete prompt',
            value: 'delete',
          },
          {
            key: 'b',
            name: 'Go back to list',
            value: 'back',
          },
          {
            key: 'x',
            name: 'Exit',
            value: 'exit',
          },
        ],
      });

      switch (action) {
        case 'edit':
          await updatePrompt({ category: prompt.category, name: prompt.name, updates: {} });
          break;
        case 'delete':
          await deletePrompt({ category: prompt.category, name: prompt.name });
          return 'delete';
        case 'back':
          return 'back';
        case 'exit':
          process.exit(0);
      }
    } catch (error) {
      logger.error(`Failed to display prompt details: ${error instanceof Error ? error.message : String(error)}`);
      return 'error';
    }
  }
}

program
  .command('update <name>')
  .description('Update an existing prompt')
  .action(async (name: string) => {
    logger.info(`Updating prompt: ${name}`);
    logger.info('You can update various aspects of the prompt.');

    try {
      const [category, promptName] = name.split('/');
      if (!category || !promptName) {
        throw new Error('Invalid prompt name format. Please use "category/promptName".');
      }
      const promptManager = Container.get(PromptManager);
      const promptExists = await promptManager.promptExists({ category, name: promptName });
      if (!promptExists) {
        throw new Error(`Prompt "${name}" does not exist.`);
      }
      const promptDetails = await getPromptDetails({ category, name: promptName });
      logger.info('Current prompt details:');
      Object.entries(promptDetails).forEach(([key, value]) => {
        logger.info(`${key}: ${value}`);
      });

      const updateField = await select({
        message: 'Select a field to update:',
        choices: Object.keys(promptDetails).map(field => ({ name: field, value: field })),
      });

      const newValue = await input({ message: `Enter new value for ${updateField}:` });
      await updatePrompt({ category, name: promptName, updates: { [updateField]: newValue } });
      logger.success(`Prompt "${name}" updated successfully.`);
      logger.info('The new content has been saved and is ready to use.');
    } catch (error) {
      if (error instanceof Error) {
        logger.error(`Failed to update prompt: ${error.message}`);
      } else {
        logger.error('Failed to update prompt: An unknown error occurred');
      }
      logger.error('An error occurred:', error);
    }
  });

program
  .command('generate')
  .description('Generate TypeScript types for prompts')
  .action(async () => {
    logger.info('Generating TypeScript types for prompts');
    logger.info('This command will create type definitions based on your current prompts.');

    try {
      const shouldProceed = await confirm({ message: 'This action will overwrite existing type definitions. Continue?' });
      if (!shouldProceed) {
        logger.info('Type generation cancelled.');
        return;
      }

      await generateTypes();
      logger.success('Type definitions generated successfully.');
      logger.info('You can now use these types in your TypeScript projects for better type safety and autocompletion.');

      const viewTypes = await confirm({ message: 'Would you like to view the generated types?' });
      if (viewTypes) {
        const types = await getGeneratedTypes();
        logger.info('\nGenerated Types:');
        logger.info(types);
      }
    } catch (error) {
      logger.error('Failed to generate type definitions:');
      logger.error('An error occurred:', error);
    }
  });

program
  .command('status')
  .description('Display the current status of the Prompt Manager project')
  .action(async () => {
    logger.info('Prompt Manager Status');
    logger.info('Fetching current project status...');

    try {
      const status = await getStatus();
      logger.info('Project Configuration:');
      logger.info(`  Name: ${status.config.name}`);
      logger.info(`  Prompts Directory: ${status.config.promptsDir}`);
      logger.info(`  Output Directory: ${status.config.outputDir}`);

      logger.info('\nPrompt Statistics:');
      logger.info(`  Total Prompts: ${status.totalPrompts}`);
      logger.info(`  Categories: ${status.categories.join(', ')}`);

      logger.info('\nLast Generated:');
      logger.info(`  ${status.lastGenerated || 'Types have not been generated yet'}`);

      if (status.warnings.length > 0) {
        logger.warn('\nWarnings:');
        status.warnings.forEach(warning => logger.warn(`  - ${warning}`));
      }

      const showDetails = await confirm({ message: 'Would you like to see detailed prompt information?' });
      if (showDetails) {
        const detailedStatus = await getDetailedStatus();
        logger.info('\nDetailed Prompt Information:');
        detailedStatus.forEach(prompt => {
          logger.info(`\n${prompt.category}/${prompt.name}:`);
          logger.info(`  Version: ${prompt.version}`);
          logger.info(`  Parameters: ${prompt.parameters?.join(', ')}`);
          logger.info(`  Last Modified: ${prompt.metadata?.lastModified}`);
        });
      }
    } catch (error) {
      logger.error('Failed to retrieve status:');
      logger.error('An error occurred:', error);
    }
  });

program.parse(process.argv);
