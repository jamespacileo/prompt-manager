import fs from 'fs-extra';
import path from 'path';
import { config } from '../src/config';

const PROMPTS_DIR = config.promptsDir;
const OUTPUT_DIR = config.outputDir;

interface PromptData {
  name: string;
  category: string;
  version: string;
  content: string;
  parameters: string[];
  description: string;
}

export async function discoverPrompts(): Promise<PromptData[]> {
  const prompts: PromptData[] = [];
  const categories = await fs.readdir(PROMPTS_DIR);
  for (const category of categories) {
    const categoryPath = path.join(PROMPTS_DIR, category);
    const promptFiles = await fs.readdir(categoryPath);
    for (const promptFile of promptFiles) {
      if (promptFile === 'prompt.json') {
        const promptPath = path.join(categoryPath, promptFile);
        const promptData = await fs.readJson(promptPath);
        prompts.push(promptData);
      }
    }
  }
  return prompts;
}

export function generateTypes(prompts: PromptData[]): string {
  let output = 'export interface PromptManager {\n';
  const categories = new Set(prompts.map(p => p.category));

  for (const category of categories) {
    output += `  ${category}: {\n`;
    const categoryPrompts = prompts.filter(p => p.category === category);
    for (const prompt of categoryPrompts) {
      output += `    ${prompt.name}: {\n`;
      output += `      name: string;\n`;
      output += `      category: string;\n`;
      output += `      version: string;\n`;
      output += `      content: string;\n`;
      output += `      parameters: string[];\n`;
      output += `      description: string;\n`;
      output += `      format: (inputs: {${prompt.parameters.map((p: string) => `${p}: string`).join('; ')}}) => string;\n`;
      output += `    };\n`;
    }
    output += `  };\n`;
  }

  output += '}\n';
  return output;
}

export function generateImplementation(prompts: PromptData[]): string {
  let output = 'const promptManager: PromptManager = {\n';
  const categories = new Set(prompts.map(p => p.category));

  for (const category of categories) {
    output += `  ${category}: {\n`;
    const categoryPrompts = prompts.filter(p => p.category === category);
    for (const prompt of categoryPrompts) {
      output += `    ${prompt.name}: {\n`;
      output += `      name: "${prompt.name}",\n`;
      output += `      category: "${prompt.category}",\n`;
      output += `      version: "${prompt.version}",\n`;
      output += `      content: ${JSON.stringify(prompt.content)},\n`;
      output += `      parameters: ${JSON.stringify(prompt.parameters)},\n`;
      output += `      description: ${JSON.stringify(prompt.description)},\n`;
      output += `      format: (inputs) => {\n`;
      output += `        let formatted = ${JSON.stringify(prompt.content)};\n`;
      output += `        for (const [key, value] of Object.entries(inputs)) {\n`;
      output += `          formatted = formatted.replace(new RegExp(\`{{${key}}}\`, 'g'), value);\n`;
      output += `        }\n`;
      output += `        return formatted;\n`;
      output += `      },\n`;
      output += `    },\n`;
    }
    output += `  },\n`;
  }

  output += '};\n\nexport default promptManager;\n';
  return output;
}

export async function generate() {
  try {
    const prompts = await discoverPrompts();
    const types = generateTypes(prompts);
    const implementation = generateImplementation(prompts);

    await fs.ensureDir(OUTPUT_DIR);
    await fs.writeFile(path.join(OUTPUT_DIR, 'types.ts'), types);
    await fs.writeFile(path.join(OUTPUT_DIR, 'promptManager.ts'), implementation);

    const indexContent = `export * from './types';\nexport { default as promptManager } from './promptManager';\n`;
    await fs.writeFile(path.join(OUTPUT_DIR, 'index.ts'), indexContent);

    console.log('Generation complete.');
  } catch (error) {
    console.error('Error during generation:', error);
    process.exit(1);
  }
}

generate();
