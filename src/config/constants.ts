import path from 'path';

/**
 * Constants used throughout the Prompt Manager project.
 * This file defines important constant values that are used across different modules.
 */

/** The name of the configuration file */
export const CONFIG_FILE_NAME = process.env.PROMPT_MANAGER_CONFIG_FILE || 'prompt-manager.json';

/** The default directory name for storing prompts */
export const DEFAULT_PROMPTS_DIR = process.env.PROMPT_MANAGER_PROMPTS_DIR || 'prompts';
export const DEFAULT_CONFIG = {
  promptsDir: process.env.PROMPT_MANAGER_PROMPTS_DIR || 'prompts',
  outputDir: process.env.PROMPT_MANAGER_OUTPUT_DIR || 'generated',
  preferredModels: process.env.PROMPT_MANAGER_PREFERRED_MODELS ? JSON.parse(process.env.PROMPT_MANAGER_PREFERRED_MODELS) : ['gpt-4', 'gpt-3.5-turbo'],
  modelParams: process.env.PROMPT_MANAGER_MODEL_PARAMS ? JSON.parse(process.env.PROMPT_MANAGER_MODEL_PARAMS) : {
    'gpt-4': {
      temperature: 0.7,
      maxTokens: 2000,
      topP: 1,
      frequencyPenalty: 0,
      presencePenalty: 0
    },
    'gpt-3.5-turbo': {
      temperature: 0.8,
      maxTokens: 1500,
      topP: 1,
      frequencyPenalty: 0,
      presencePenalty: 0
    }
  },
  defaultLanguage: process.env.PROMPT_MANAGER_DEFAULT_LANGUAGE || 'en',
  version: process.env.PROMPT_MANAGER_VERSION || '1.0.0'
};

export function getProjectRoot(): string {
  return process.env.PROMPT_MANAGER_PROJECT_ROOT || process.env.FURY_PROJECT_ROOT || process.cwd();
}

export function getConfigPath(): string {
  return process.env.PROMPT_MANAGER_CONFIG_PATH || path.resolve(getProjectRoot(), CONFIG_FILE_NAME);
}

export function getDefaultPromptsPath(): string {
  return process.env.PROMPT_MANAGER_DEFAULT_PROMPTS_PATH || path.resolve(getProjectRoot(), DEFAULT_PROMPTS_DIR);
}
