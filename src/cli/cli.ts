#!/usr/bin/env bun

import { Command } from 'commander';
import { createPrompt, listPrompts, updatePrompt, generateTypes } from '../commands';

const program = new Command();

program
  .version('1.0.0')
  .description('Prompt Manager CLI');

program
  .command('init')
  .description('Initialize a new Prompt Manager project')
  .action(() => {
    console.log('Initializing a new Prompt Manager project...');
    // Add initialization logic here
  });

program
  .command('create <name>')
  .description('Create a new prompt')
  .option('-c, --category <category>', 'Prompt category')
  .option('-t, --content <content>', 'Prompt content')
  .option('-d, --description <description>', 'Prompt description')
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
