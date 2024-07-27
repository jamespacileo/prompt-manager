import fs from 'fs/promises';
import path from 'path';
import { z } from 'zod';
import { IPromptProjectConfigManager } from '../types/interfaces';
import { CONFIG_FILE_NAME, DEFAULT_CONFIG, getConfigPath, getDefaultPromptsPath } from './constants';

const configSchema = z.object({
  promptsDir: z.string(),
  preferredModels: z.array(z.string()),
  modelParams: z.record(z.object({
    temperature: z.number().optional(),
    maxTokens: z.number().optional(),
    topP: z.number().optional(),
    frequencyPenalty: z.number().optional(),
    presencePenalty: z.number().optional(),
  })),
});

class PromptProjectConfigManager implements IPromptProjectConfigManager {
  configPath: string;
  config: {
    promptsDir: string;
    preferredModels: string[];
    modelParams: Record<string, {
      temperature?: number;
      maxTokens?: number;
      topP?: number;
      frequencyPenalty?: number;
      presencePenalty?: number;
    }>;
  };

  /**
   * Creates a new PromptProjectConfigManager instance.
   * @param configPath Optional path to the configuration file. If not provided, uses the default path.
   */
  constructor(configPath?: string) {
    this.configPath = configPath || getConfigPath();
    this.config = { ...DEFAULT_CONFIG };
  }

  /**
   * Loads the configuration from the file system.
   * If the file doesn't exist, it creates a new one with default values.
   */
  async loadConfig(): Promise<void> {
    try {
      const configData = await fs.readFile(this.configPath, 'utf-8');
      const parsedConfig = JSON.parse(configData);

      if (this.validateConfig(parsedConfig)) {
        this.config = parsedConfig;
        this.config.promptsDir = path.resolve(path.dirname(this.configPath), this.config.promptsDir);
      } else {
        throw new Error('Invalid configuration file');
      }
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        // File doesn't exist, create a new one with default values
        this.config = { ...DEFAULT_CONFIG };
        this.config.promptsDir = getDefaultPromptsPath();
        await this.saveConfig();
      } else {
        throw new Error(`Failed to load configuration: ${error.message}`);
      }
    }
  }

  /**
   * Saves the current configuration to the file system.
   */
  async saveConfig(): Promise<void> {
    try {
      const configData = JSON.stringify(this.config, null, 2);
      await fs.writeFile(this.configPath, configData, 'utf-8');
    } catch (error: any) {
      throw new Error(`Failed to save configuration: ${error.message}`);
    }
  }

  /**
   * Updates a specific configuration value.
   * @param key The configuration key to update.
   * @param value The new value for the configuration key.
   */
  updateConfig<K extends keyof typeof this.config>(key: K, value: typeof this.config[K]): void {
    this.config[key] = value;
  }

  /**
   * Retrieves a specific configuration value.
   * @param key The configuration key to retrieve.
   * @returns The value of the specified configuration key.
   */
  getConfig<K extends keyof typeof this.config>(key: K): typeof this.config[K] {
    return this.config[key];
  }

  /**
   * Validates the configuration object against the defined schema.
   * @param config The configuration object to validate.
   * @returns A boolean indicating whether the configuration is valid.
   */
  validateConfig(config: any): boolean {
    try {
      configSchema.parse(config);
      return true;
    } catch (error: any) {
      console.error('Configuration validation error:', error.errors);
      return false;
    }
  }
}

// Create a singleton instance
const config = new PromptProjectConfigManager();

// Export the singleton instance
export default config;
