#!/usr/bin/env bun

import { Command } from 'commander';
import { input, confirm, select } from '@inquirer/prompts';
import chalk from 'chalk';
import { createPrompt, listPrompts, updatePrompt, generateTypes } from './commands.js';
import fs from 'fs-extra';
import path from 'path';

const log = {
  info: (message: string) => console.log(chalk.blue(message)),
  success: (message: string) => console.log(chalk.green(message)),
  error: (message: string) => console.log(chalk.red(message)),
  warn: (message: string) => console.log(chalk.yellow(message)),
};

const program = new Command();

program
  .version('1.0.0')
  .description('Prompt Manager CLI');

program
  .command('init')
  .description('Initialize a new Prompt Manager project')
  .action(async () => {
    log.info('Initializing a new Prompt Manager project...');

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
      await fs.ensureDir(promptsDir);
      await fs.ensureDir(outputDir);
      log.success('Project initialized successfully!');
    } catch (error) {
      log.error('Failed to initialize project:');
      console.error(error);
    }
  });

program
  .command('create <name>')
  .description('Create a new prompt')
  .action(async (name: string) => {
    log.info(`Creating new prompt: ${name}`);

    const category = await input({ message: 'Enter prompt category:', default: 'General' });
    const content = await input({ message: 'Enter prompt content:' });
    const description = await input({ message: 'Enter prompt description:' });

    try {
      await createPrompt(name, { category, content, description });
      log.success(`Prompt "${name}" created successfully.`);
    } catch (error) {
      log.error('Failed to create prompt:');
      console.error(error);
    }
  });

program
  .command('list')
  .description('List all prompts')
  .action(async () => {
    log.info('Listing all prompts...');

    try {
      const prompts = await listPrompts();
      prompts.forEach((prompt) => log.info(`- ${prompt}`));
    } catch (error) {
      log.error('Failed to list prompts:');
      console.error(error);
    }
  });

program
  .command('update <name>')
  .description('Update an existing prompt')
  .action(async (name: string) => {
    log.info(`Updating prompt: ${name}`);

    const content = await input({ message: 'Enter new prompt content:' });

    try {
      await updatePrompt(name, { content });
      log.success(`Prompt "${name}" updated successfully.`);
    } catch (error) {
      log.error('Failed to update prompt:');
      console.error(error);
    }
  });

program
  .command('generate')
  .description('Generate TypeScript types for prompts')
  .action(async () => {
    log.info('Generating TypeScript types for prompts...');

    try {
      await generateTypes();
      log.success('Type definitions generated successfully.');
    } catch (error) {
      log.error('Failed to generate type definitions:');
      console.error(error);
    }
  });

program.parse(process.argv);
