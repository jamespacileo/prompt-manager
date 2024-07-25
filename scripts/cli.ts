#!/usr/bin/env bun

import { Command } from 'commander';
import { createPrompt, listPrompts, updatePrompt, generateTypes, initializeProject } from '../src/commands';

const program = new Command();

program
  .version('1.0.0')
  .description('Prompt Manager CLI');

program
  .command('init')
  .description('Initialize a new Prompt Manager project')
  .action(initializeProject);

program
  .command('create <name>')
  .description('Create a new prompt')
  .option('-c, --category <category>', 'Prompt category')
  .option('-t, --content <content>', 'Prompt content')
  .action(createPrompt);

program
  .command('list')
  .description('List all prompts')
  .action(listPrompts);

program
  .command('update <name>')
  .description('Update an existing prompt')
  .option('-c, --content <content>', 'New prompt content')
  .action(updatePrompt);

program
  .command('generate')
  .description('Generate TypeScript types for prompts')
  .action(generateTypes);

program.parse(process.argv);
