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
    const result = explorer.search();
    if (result && !result.isEmpty) {
      const config = await result;
      return {
        ...defaultConfig,
        ...config.config,
        promptsDir: path.resolve(process.cwd(), config.config.promptsDir || defaultConfig.promptsDir),
        outputDir: path.resolve(process.cwd(), config.config.outputDir || defaultConfig.outputDir),
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
