import { generateObject, generateText, streamText } from "ai";

import { PromptSchema } from "../schemas/prompts";
import chalk from "chalk";
import { logger } from "../utils/logger";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";

/**
 * Pretty prints the given prompt to the console with color-coded output.
 *
 * @param prompt The prompt object to be printed
 */
export function prettyPrintPrompt(prompt: any): string {
  let output = '';
  output += chalk.bold.underline("\nGenerated Prompt:\n");
  output += chalk.cyan("Name: ") + prompt.name.toUpperCase().replace(/ /g, "_") + "\n";
  output += chalk.magenta("Category: ") + prompt.category.replace(/ /g, "") + "\n";
  output += chalk.yellow("Description: ") + prompt.description + "\n";
  output += chalk.green("Template:\n") + prompt.template + "\n";
  output += chalk.blue("Output Type: ") + prompt.outputType + "\n";
  if (prompt.tags && prompt.tags.length > 0) {
    output += chalk.red("Tags: ") + prompt.tags.join(", ") + "\n";
  }
  output += chalk.gray("\nInput Schema:\n");
  output += JSON.stringify(prompt.inputSchema, null, 2) + "\n";
  output += chalk.gray("\nOutput Schema:\n");
  output += JSON.stringify(prompt.outputSchema, null, 2) + "\n";
  return output;
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

export async function updatePromptWithAI({
  currentPrompt,
  instruction,
  updateTemplate = true,
  updateInputSchema = true,
  updateOutputSchema = true,
}: {
  currentPrompt: any;
  instruction: string;
  updateTemplate?: boolean;
  updateInputSchema?: boolean;
  updateOutputSchema?: boolean;
}): Promise<any> {
  const { object } = await generateObject({
    model: openai("gpt-4o-mini"),
    schema: PromptSchema,
    prompt: `Update the following prompt based on this instruction: ${instruction}
    ${updateTemplate ? 'Update the template.' : 'Do not change the template.'}
    ${updateInputSchema ? 'Update the input schema.' : 'Do not change the input schema.'}
    ${updateOutputSchema ? 'Update the output schema.' : 'Do not change the output schema.'}
    \n\nCurrent prompt:\n${JSON.stringify(currentPrompt, null, 2)}`,
  });

  if (!updateTemplate) {
    object.template = currentPrompt.template;
  }
  if (!updateInputSchema) {
    object.inputSchema = currentPrompt.inputSchema;
  }
  if (!updateOutputSchema) {
    object.outputSchema = currentPrompt.outputSchema;
  }

  return object;
}

/**
 * Generates auto-completion suggestions based on the given input and context.
 *
 * @param input The current user input
 * @param context Additional context to guide the AI
 * @returns A Promise that resolves to a string with auto-completion suggestions
 */
export async function generateAutoComplete({ input, context }: { input: string, context: string }): Promise<string> {
  const { text } = await generateText({
    model: openai("gpt-4o-mini"),
    prompt: `Given the following user input and context, provide a short auto-completion suggestion (max 50 tokens):
    
    Context: ${context}
    
    User input: ${input}
    
    Auto-completion (include the input text in the suggestion):

    Examples:
    Context: Writing a greeting email
    User input: Hi John,
    Auto-completion: Hi John, I hope this email finds you well. I wanted to discuss...

    Context: Coding a function
    User input: function add(a, b) {
    Auto-completion: function add(a, b) { return a + b; }

    Context: ${context}
    User input: ${input}
    Auto-completion:`,
    maxTokens: 50,
  });

  return text;
}

/**
 * Generates and validates test input data for a given prompt.
 *
 * @param prompt The prompt object containing input schema
 * @returns A Promise that resolves to the generated and validated test input data
 */
export async function generateTestInputData(prompt: any): Promise<any> {
  const { object } = await generateObject({
    model: openai("gpt-4o-mini"),
    schema: prompt.inputSchema,
    prompt: `Generate test input data for the following prompt:
    
    ${JSON.stringify(prompt, null, 2)}
    
    Ensure that the generated data adheres to the input schema.`,
  });

  // Validate the generated test input data
  try {
    const validationResult = PromptSchema.parse(object);
    return validationResult;
  } catch (error) {
    logger.error("Generated test input data failed validation:", error);
    throw new Error("Failed to generate valid test input data");
  }
}

/**
 * Evaluates a prompt using AI and provides actionable advice.
 *
 * @param prompt The prompt object to evaluate
 * @returns A Promise that resolves to an evaluation object with scores and advice
 */
export async function evaluatePrompt(prompt: any): Promise<any> {
  const evaluationSchema = z.object({
    clarity: z.number().min(1).max(10),
    specificity: z.number().min(1).max(10),
    relevance: z.number().min(1).max(10),
    completeness: z.number().min(1).max(10),
    actionableAdvice: z.array(z.string()).min(3).max(5),
  });


  const { object } = await generateObject({
    model: openai("gpt-4o-mini"),
    schema: evaluationSchema,
    prompt: `Evaluate the following prompt and provide scores (1-10) for clarity, specificity, relevance, and completeness. Also, provide 3-5 actionable pieces of advice for improvement:
    
    ${JSON.stringify(prompt, null, 2)}`,
  });

  return object;
}


export async function generateUpdatedPrompt(currentPrompt: any, selectedAdvice: string): Promise<any> {
  const { object } = await generateObject({
    model: openai("gpt-4o-mini"),
    schema: PromptSchema,
    prompt: `Update the following prompt based on this advice: ${selectedAdvice}
    
    Current prompt:
    ${JSON.stringify(currentPrompt, null, 2)}
    
    Please provide an updated version of the prompt, focusing on improving the template and any relevant schemas.`,
  });

  return object;
}
