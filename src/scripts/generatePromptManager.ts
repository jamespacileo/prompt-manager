import fs from 'fs-extra';
import path from 'path';

const PROMPTS_DIR = path.join(__dirname, '..', '..', 'prompts');
const OUTPUT_FILE = path.join(__dirname, '..', 'generated', 'promptManager.ts');

async function generatePromptManager() {
  const categories = await fs.readdir(PROMPTS_DIR);
  let output = `import { PromptManagerBase } from './promptManagerBase';\n\n`;

  output += `export interface GeneratedPromptManager {\n`;
  for (const category of categories) {
    const categoryPath = path.join(PROMPTS_DIR, category);
    const stats = await fs.stat(categoryPath);
    if (stats.isDirectory()) {
      const prompts = await fs.readdir(categoryPath);
      output += `  ${category}: {\n`;
      for (const prompt of prompts) {
        if (prompt.endsWith('.txt')) {
          const promptName = path.basename(prompt, '.txt');
          output += `    getPrompt(name: '${promptName.toUpperCase()}_PROMPT'): { content: string; format: (params: Record<string, any>) => string; };\n`;
        }
      }
      output += `  };\n`;
    }
  }
  output += `}\n\n`;

  output += `class PromptManager extends PromptManagerBase implements GeneratedPromptManager {\n`;
  for (const category of categories) {
    const categoryPath = path.join(PROMPTS_DIR, category);
    const stats = await fs.stat(categoryPath);
    if (stats.isDirectory()) {
      output += `  ${category} = {\n`;
      output += `    getPrompt: (name: string) => this.getPrompt(name),\n`;
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
  console.log(`Generated prompt manager at ${OUTPUT_FILE}`);
}

generatePromptManager().catch(console.error);
