import fs from 'fs-extra';
import path from 'path';

const PROMPTS_DIR = path.join(__dirname, '..', '..', 'prompts');
const OUTPUT_FILE = path.join(__dirname, '..', 'generated', 'promptManager.ts');
const TYPE_DEFINITION_FILE = path.join(__dirname, '..', '..', 'types', 'PromptManager.d.ts');

async function generatePromptManager() {
  const categories = await fs.readdir(PROMPTS_DIR);
  let output = `import { PromptManagerBase } from './promptManagerBase';\n\n`;
  let typeDefinition = `declare module "prompt-manager" {\n`;

  output += `export interface GeneratedPromptManager {\n`;
  for (const category of categories) {
    const categoryPath = path.join(PROMPTS_DIR, category);
    const stats = await fs.stat(categoryPath);
    if (stats.isDirectory()) {
      const prompts = await fs.readdir(categoryPath);
      output += `  ${category}: {\n`;
      typeDefinition += `  export namespace ${category} {\n`;
      for (const prompt of prompts) {
        if (prompt.endsWith('.txt')) {
          const promptName = path.basename(prompt, '.txt');
          const promptContent = await fs.readFile(path.join(categoryPath, prompt), 'utf-8');
          const parameters = extractParameters(promptContent);
          
          output += `    ${promptName}: {\n`;
          output += `      content: string;\n`;
          output += `      format: (params: { ${parameters.join('; ')} }) => string;\n`;
          output += `      description: string;\n`;
          output += `      version: string;\n`;
          output += `    };\n`;

          typeDefinition += `    export const ${promptName}: {\n`;
          typeDefinition += `      format: (inputs: { ${parameters.join('; ')} }) => string;\n`;
          typeDefinition += `      description: string;\n`;
          typeDefinition += `      version: string;\n`;
          typeDefinition += `    };\n`;
        }
      }
      output += `  };\n`;
      typeDefinition += `  }\n`;
    }
  }
  output += `}\n\n`;
  typeDefinition += `}\n`;

  output += `class PromptManager extends PromptManagerBase implements GeneratedPromptManager {\n`;
  for (const category of categories) {
    const categoryPath = path.join(PROMPTS_DIR, category);
    const stats = await fs.stat(categoryPath);
    if (stats.isDirectory()) {
      output += `  ${category} = {\n`;
      const prompts = await fs.readdir(categoryPath);
      for (const prompt of prompts) {
        if (prompt.endsWith('.txt')) {
          const promptName = path.basename(prompt, '.txt');
          output += `    ${promptName}: this.getPrompt('${category}', '${promptName}'),\n`;
        }
      }
      output += `  };\n`;
    }
  }
  output += `}\n\n`;

  output += `export async function getPromptManager(): Promise<GeneratedPromptManager> {\n`;
  output += `  const manager = new PromptManager('${PROMPTS_DIR}');\n`;
  output += `  await manager.initialize();\n`;
  output += `  return manager;\n`;
  output += `}\n`;

  await fs.writeFile(OUTPUT_FILE, output);
  await fs.writeFile(TYPE_DEFINITION_FILE, typeDefinition);
  console.log(`Generated prompt manager at ${OUTPUT_FILE}`);
  console.log(`Generated type definitions at ${TYPE_DEFINITION_FILE}`);
}

function extractParameters(content: string): string[] {
  const matches = content.match(/\{([^}]+)\}/g);
  if (!matches) return [];
  return matches.map(match => match.slice(1, -1).trim()).filter((value, index, self) => self.indexOf(value) === index);
}

generatePromptManager().catch(console.error);
