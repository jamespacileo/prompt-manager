import { program } from 'commander';
import { createPrompt, listPrompts, updatePrompt, generateTypes } from './commands';

program
  .version('1.0.0')
  .description('Prompt Management CLI');

program
  .command('create <name>')
  .description('Create a new prompt')
  .option('-c, --category <category>', 'Prompt category')
  .option('-a, --ai <instruction>', 'Use AI to generate prompt')
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
  .command('generate-types')
  .description('Generate TypeScript types for prompts')
  .action(generateTypes);

program.parse(process.argv);

export * from './generated';
