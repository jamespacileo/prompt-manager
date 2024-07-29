import { generateObject, streamText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { PromptSchema } from '../schemas/prompts';
import chalk from 'chalk';
import { logger } from '../utils/logger';

/**
 * Pretty prints the given prompt to the console with color-coded output.
 * 
 * @param prompt The prompt object to be printed
 */
export function prettyPrintPrompt(prompt: any): void {
  logger.info(chalk.bold.underline('\nGenerated Prompt:'));
  logger.info(chalk.cyan('Name: ') + prompt.name.toUpperCase().replace(/ /g, '_'));
  logger.info(chalk.magenta('Category: ') + prompt.category.replace(/ /g, ''));
  logger.info(chalk.yellow('Description: ') + prompt.description);
  logger.info(chalk.green('Content:\n') + prompt.content);
  logger.info(chalk.blue('Output Type: ') + prompt.outputType);
  if (prompt.tags && prompt.tags.length > 0) {
    logger.info(chalk.red('Tags: ') + prompt.tags.join(', '));
  }
  logger.info(chalk.gray('\nInput Schema:'));
  logger.info(JSON.stringify(prompt.inputSchema, null, 2));
  logger.info(chalk.gray('\nOutput Schema:'));
  logger.info(JSON.stringify(prompt.outputSchema, null, 2));
}

/**
 * Generates a prompt using AI based on the given description.
 * 
 * @param description A string describing the desired prompt
 * @returns A Promise that resolves to the generated prompt object
 */
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
