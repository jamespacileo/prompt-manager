#!/usr/bin/env bun

import { Command } from 'commander';
import { input, confirm, select, expand, search } from '@inquirer/prompts';
import chalk from 'chalk';
import { createPrompt, listPrompts, updatePrompt, generateTypes, getStatus, getPromptDetails, getGeneratedTypes, getDetailedStatus, deletePrompt } from './commands.js';
import { Table } from 'console-table-printer';
import fs from 'fs-extra';
import { TextEncoder, TextDecoder } from 'util';
import { getConfigManager } from "../config/PromptProjectConfigManager"
import { PromptModel } from '../promptModel.js';

// Add TextEncoder and TextDecoder to the global object
(global as any).TextEncoder = TextEncoder;
(global as any).TextDecoder = TextDecoder;

async function ensureInitialized() {
  const configManager = await getConfigManager();
  if (!(await configManager.isInitialized())) {
    console.error(chalk.red('Project is not initialized. Please run the "init" command first.'));
    process.exit(1);
  }
}

const log = {
  info: (message: string) => console.log(chalk.blue(message)),
  success: (message: string) => console.log(chalk.green(message)),
  error: (message: string) => console.log(chalk.red(message)),
  warn: (message: string) => console.log(chalk.yellow(message)),
  title: (message: string) => console.log(chalk.bold.underline(message)),
  debug: (message: string) => console.log(chalk.gray(message)),
};

const program = new Command();

program
  .version('1.0.0')
  .description('Prompt Manager CLI - A powerful tool for managing and generating prompts')
  .hook('preAction', async (thisCommand) => {
    if (thisCommand.name() !== 'init') {
      await ensureInitialized();
    }
  });

program
  .command('init')
  .description('Initialize a new Prompt Manager project')
  .action(async () => {
    log.title('Initializing a new Prompt Manager project');
    log.info('This command will set up your project structure and configuration.');

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
      log.success('Configuration file created: prompt-manager.json');

      await fs.ensureDir(promptsDir);
      log.success(`Prompts directory created: ${promptsDir}`);

      await fs.ensureDir(outputDir);
      log.success(`Output directory created: ${outputDir}`);

      log.success('Project initialized successfully!');
      log.info('You can now start creating prompts using the "create" command.');
    } catch (error) {
      log.error('Failed to initialize project:');
      console.error(error);
    }
  });

program
  .command('create')
  .description('Create a new prompt')
  .action(async () => {
    log.title('Creating a new prompt');
    log.info('Please describe the prompt you want to create. AI will generate a prompt based on your description.');

    try {
      const configManager = await getConfigManager();
      // Check if the project is initialized
      if (!await configManager.isInitialized()) {
        throw new Error('Project is not initialized. Please run the "init" command first.');
      }

      await createPrompt();
      log.success('Prompt created successfully.');
      log.info('You can now use this prompt in your project.');
    } catch (error) {
      log.error('Failed to create prompt:');
      if (error instanceof Error) {
        log.error(error.message);
        if (error.stack) {
          log.debug(error.stack);
        }
      } else {
        log.error(String(error));
      }
    }
  });

program
  .command('list')
  .description('List all prompts')
  .action(async () => {
    log.title('Listing all prompts');
    log.info('Here are all the prompts currently available in your project:');

    try {
      while (true) {
        const prompts = await listPrompts();
        if (prompts.length === 0) {
          log.warn('No prompts found. Use the "create" command to add new prompts.');
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
      log.error('Failed to list prompts:');
      console.error(error);
    }
  });

async function displayPromptDetails(prompt: any): Promise<string> {
  while (true) {
    try {
      const promptDetails = await getPromptDetails({ category: prompt.category, name: prompt.name });
      log.info('\nPrompt Details:');
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
      log.error(`Failed to display prompt details: ${error instanceof Error ? error.message : String(error)}`);
      return 'error';
    }
  }
}

program
  .command('update <name>')
  .description('Update an existing prompt')
  .action(async (name: string) => {
    log.title(`Updating prompt: ${name}`);
    log.info('You can update various aspects of the prompt.');

    try {
      const [category, promptName] = name.split('/');
      if (!category || !promptName) {
        throw new Error('Invalid prompt name format. Please use "category/promptName".');
      }
      const promptExists = await PromptModel.promptExists(name);
      if (!promptExists) {
        throw new Error(`Prompt "${name}" does not exist.`);
      }
      const promptDetails = await getPromptDetails({ category, name: promptName });
      log.info('Current prompt details:');
      Object.entries(promptDetails).forEach(([key, value]) => {
        log.info(`${key}: ${value}`);
      });

      const updateField = await select({
        message: 'Select a field to update:',
        choices: Object.keys(promptDetails).map(field => ({ name: field, value: field })),
      });

      const newValue = await input({ message: `Enter new value for ${updateField}:` });
      await updatePrompt({ category, name: promptName, updates: { [updateField]: newValue } });
      log.success(`Prompt "${name}" updated successfully.`);
      log.info('The new content has been saved and is ready to use.');
    } catch (error) {
      if (error instanceof Error) {
        log.error(`Failed to update prompt: ${error.message}`);
      } else {
        log.error('Failed to update prompt: An unknown error occurred');
      }
      console.error(error);
    }
  });

program
  .command('generate')
  .description('Generate TypeScript types for prompts')
  .action(async () => {
    log.title('Generating TypeScript types for prompts');
    log.info('This command will create type definitions based on your current prompts.');

    try {
      const shouldProceed = await confirm({ message: 'This action will overwrite existing type definitions. Continue?' });
      if (!shouldProceed) {
        log.info('Type generation cancelled.');
        return;
      }

      await generateTypes();
      log.success('Type definitions generated successfully.');
      log.info('You can now use these types in your TypeScript projects for better type safety and autocompletion.');

      const viewTypes = await confirm({ message: 'Would you like to view the generated types?' });
      if (viewTypes) {
        const types = await getGeneratedTypes();
        log.info('\nGenerated Types:');
        console.log(types);
      }
    } catch (error) {
      log.error('Failed to generate type definitions:');
      console.error(error);
    }
  });

program
  .command('status')
  .description('Display the current status of the Prompt Manager project')
  .action(async () => {
    log.title('Prompt Manager Status');
    log.info('Fetching current project status...');

    try {
      const status = await getStatus();
      log.info('Project Configuration:');
      log.info(`  Name: ${status.config.name}`);
      log.info(`  Prompts Directory: ${status.config.promptsDir}`);
      log.info(`  Output Directory: ${status.config.outputDir}`);

      log.info('\nPrompt Statistics:');
      log.info(`  Total Prompts: ${status.totalPrompts}`);
      log.info(`  Categories: ${status.categories.join(', ')}`);

      log.info('\nLast Generated:');
      log.info(`  ${status.lastGenerated || 'Types have not been generated yet'}`);

      if (status.warnings.length > 0) {
        log.warn('\nWarnings:');
        status.warnings.forEach(warning => log.warn(`  - ${warning}`));
      }

      const showDetails = await confirm({ message: 'Would you like to see detailed prompt information?' });
      if (showDetails) {
        const detailedStatus = await getDetailedStatus();
        log.info('\nDetailed Prompt Information:');
        detailedStatus.forEach(prompt => {
          log.info(`\n${prompt.category}/${prompt.name}:`);
          log.info(`  Version: ${prompt.version}`);
          log.info(`  Parameters: ${prompt.parameters?.join(', ')}`);
          log.info(`  Last Modified: ${prompt.metadata?.lastModified}`);
        });
      }
    } catch (error) {
      log.error('Failed to retrieve status:');
      console.error(error);
    }
  });

program.parse(process.argv);
