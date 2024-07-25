import { PromptManager, Prompt } from './promptManager';
import fs from 'fs-extra';
import path from 'path';

export async function createPrompt(name: string, options: any) {
  const prompt: Prompt = {
    name,
    category: options.category || 'General',
    version: '1.0.0',
    content: options.ai ? await generateAIPrompt(options.ai) : '',
    parameters: [],
    metadata: {
      description: '',
      created: new Date().toISOString(),
      lastModified: new Date().toISOString(),
    },
    versions: ['1.0.0'],
  };

  await PromptManager.createPrompt(prompt);
  console.log(`Prompt "${name}" created successfully.`);
}

export async function listPrompts() {
  const prompts = await PromptManager.listPrompts();
  console.log('Available prompts:');
  prompts.forEach((prompt) => console.log(`- ${prompt}`));
}

export async function updatePrompt(name: string, options: any) {
  const updates: Partial<Prompt> = {};
  if (options.content) updates.content = options.content;
  await PromptManager.updatePrompt(name, updates);
  console.log(`Prompt "${name}" updated successfully.`);
}

export async function generateTypes() {
  const prompts = await PromptManager.listPrompts();
  let typeDefs = 'declare module "prompt-manager" {\n';

  for (const promptName of prompts) {
    const prompt = await PromptManager.getPrompt(promptName);
    if (prompt) {
      typeDefs += `  export namespace ${prompt.category} {\n`;
      typeDefs += `    export const ${prompt.name}: {\n`;
      typeDefs += `      format: (inputs: { ${prompt.parameters.map(p => `${p}: string`).join('; ')} }) => string;\n`;
      typeDefs += `    };\n`;
      typeDefs += `  }\n\n`;
    }
  }

  typeDefs += '}\n';

  await fs.writeFile('prompts.d.ts', typeDefs);
  console.log('Type definitions generated successfully.');
}

async function generateAIPrompt(instruction: string): Promise<string> {
  // TODO: Implement AI prompt generation
  return `AI-generated prompt based on: ${instruction}`;
}
