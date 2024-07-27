import path from 'path';

export const CONFIG_FILE_NAME = 'prompt-manager.json';
export const DEFAULT_PROMPTS_DIR = 'prompts';
export const DEFAULT_CONFIG = {
  promptsDir: DEFAULT_PROMPTS_DIR,
  preferredModels: ['gpt-4o-mini'],
  modelParams: {},
};

export function getProjectRoot(): string {
  return process.cwd();
}

export function getConfigPath(): string {
  return path.join(getProjectRoot(), CONFIG_FILE_NAME);
}

export function getDefaultPromptsPath(): string {
  return path.join(getProjectRoot(), DEFAULT_PROMPTS_DIR);
}
