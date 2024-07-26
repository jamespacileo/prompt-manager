import { cosmiconfig } from 'cosmiconfig';
import path from 'path';

export interface PromptManagerConfig {
  promptsDir: string;
  outputDir: string;
}

const defaultConfig: PromptManagerConfig = {
  promptsDir: 'prompts',
  outputDir: 'src/generated',
};

export async function loadConfig(): Promise<PromptManagerConfig> {
  const explorer = cosmiconfig('prompt-manager', {
    searchPlaces: [
      'package.json',
      '.prompt-managerrc',
      '.prompt-managerrc.json',
      '.prompt-managerrc.yaml',
      '.prompt-managerrc.yml',
      '.prompt-managerrc.js',
      'prompt-manager.config.js',
    ],
  });

  try {
    const result = await explorer.search();
    if (result) {
      return {
        ...defaultConfig,
        ...result.config,
        promptsDir: path.resolve(process.cwd(), result.config?.promptsDir || defaultConfig.promptsDir),
        outputDir: path.resolve(process.cwd(), result.config?.outputDir || defaultConfig.outputDir),
      };
    }
  } catch (error) {
    console.warn('Error loading config:', error);
  }

  return {
    ...defaultConfig,
    promptsDir: path.resolve(process.cwd(), defaultConfig.promptsDir),
    outputDir: path.resolve(process.cwd(), defaultConfig.outputDir),
  };
}

export const config = await loadConfig();
