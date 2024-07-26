import { generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { PromptSchema } from '../schemas/prompts';

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
