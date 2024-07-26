import fs from 'fs';
import path from 'path';
import { cosmiconfig } from 'cosmiconfig';

export interface PromptManagerConfig {
  promptsDir: string;
  outputDir: string;
}

const defaultConfig: PromptManagerConfig = {
  promptsDir: 'prompts',
  outputDir: 'src/generated',
};

export function loadConfig(): PromptManagerConfig {
  const explorer = cosmiconfig('prompt-manager');
  const result = explorer.searchSync();

  if (result && !result.isEmpty) {
    return { ...defaultConfig, ...result.config };
  }

  return defaultConfig;
}

export const config = loadConfig();
