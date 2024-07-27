#!/usr/bin/env bun

import { Command } from 'commander';
import { input, confirm, select } from '@inquirer/prompts';
import chalk from 'chalk';
import { createPrompt, listPrompts, updatePrompt, generateTypes, getStatus, getPromptDetails, getGeneratedTypes, getDetailedStatus } from './commands.js';
import fs from 'fs-extra';
import path from 'path';
import { TextEncoder, TextDecoder } from 'text-encoding';

// Add TextEncoder and TextDecoder to the global object
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

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
  .description('Prompt Manager CLI - A powerful tool for managing and generating prompts');

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
      const prompts = await listPrompts();
      if (prompts.length === 0) {
        log.warn('No prompts found. Use the "create" command to add new prompts.');
      } else {
        const selectedPrompt = await select({
          message: 'Select a prompt to view details:',
          choices: prompts.map((prompt, index) => ({
            name: `${index + 1}. ${prompt}`,
            value: prompt,
          })),
        });
        const [category, promptName] = selectedPrompt.split('/');
        const promptDetails = await getPromptDetails({ category, name: promptName });
        log.info('\nPrompt Details:');
        Object.entries(promptDetails).forEach(([key, value]) => {
          log.info(`${key}: ${value}`);
        });
      }
    } catch (error) {
      log.error('Failed to list prompts:');
      console.error(error);
    }
  });

program
  .command('update <name>')
  .description('Update an existing prompt')
  .action(async (name: string) => {
    log.title(`Updating prompt: ${name}`);
    log.info('You can update various aspects of the prompt.');

    try {
      const [category, promptName] = name.split('/');
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
      await updatePrompt({ category: promptDetails.category!, name, updates: { [updateField]: newValue } });
      log.success(`Prompt "${name}" updated successfully.`);
      log.info('The new content has been saved and is ready to use.');
    } catch (error) {
      log.error('Failed to update prompt:');
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
