import { generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { PromptSchema } from '../schemas/prompts';
import chalk from 'chalk';

export function prettyPrintPrompt(prompt: any): void {
  console.log(chalk.bold.underline('\nGenerated Prompt:'));
  console.log(chalk.cyan('Name: ') + prompt.name.toUpperCase().replace(/ /g, '_'));
  console.log(chalk.magenta('Category: ') + prompt.category.replace(/ /g, ''));
  console.log(chalk.yellow('Description: ') + prompt.description);
  console.log(chalk.green('Content:\n') + prompt.content);
  console.log(chalk.blue('Output Type: ') + prompt.outputType);
  if (prompt.tags && prompt.tags.length > 0) {
    console.log(chalk.red('Tags: ') + prompt.tags.join(', '));
  }
  console.log(chalk.gray('\nInput Schema:'));
  console.log(JSON.stringify(prompt.inputSchema, null, 2));
  console.log(chalk.gray('\nOutput Schema:'));
  console.log(JSON.stringify(prompt.outputSchema, null, 2));
}

export async function generatePromptWithAI(description: string): Promise<any> {
  const { object } = await generateObject({
    model: openai("gpt-4o-mini"),
    schema: PromptSchema,
    prompt: `Generate a prompt based on the following description: ${description}`,
  });

  return object;
}

export async function updatePromptWithAI(currentPrompt: any, instruction: string): Promise<any> {
  const { object } = await generateObject({
    model: openai("gpt-4o-mini"),
    schema: PromptSchema,
    prompt: `Update the following prompt based on this instruction: ${instruction}\n\nCurrent prompt:\n${JSON.stringify(currentPrompt, null, 2)}`,
  });

  return object;
}
