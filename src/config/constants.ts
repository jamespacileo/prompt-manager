import path from 'path';

/**
 * Constants used throughout the Prompt Manager project.
 * This file defines important constant values that are used across different modules.
 */

/** The name of the configuration file */
export const CONFIG_FILE_NAME = 'prompt-manager.json';

/** The default directory name for storing prompts */
export const DEFAULT_PROMPTS_DIR = 'prompts';
export const DEFAULT_CONFIG = {
  promptsDir: DEFAULT_PROMPTS_DIR,
  outputDir: 'output',
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
