import fs from 'fs/promises';
import path from 'path';
import { z } from 'zod';
import { IPromptProjectConfigManager } from '../types/interfaces';

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

export class PromptProjectConfigManager implements IPromptProjectConfigManager {
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

  constructor(configPath: string) {
    this.configPath = configPath;
    this.config = {
      promptsDir: '',
      preferredModels: [],
      modelParams: {},
    };
  }

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
    } catch (error: Error | any) {
      throw new Error(`Failed to load configuration: ${error.message}`);
    }
  }

  async saveConfig(): Promise<void> {
    try {
      const configData = JSON.stringify(this.config, null, 2);
      await fs.writeFile(this.configPath, configData, 'utf-8');
    } catch (error: Error | any) {
      throw new Error(`Failed to save configuration: ${error.message}`);
    }
  }

  updateConfig<K extends keyof typeof this.config>(key: K, value: typeof this.config[K]): void {
    this.config[key] = value;
  }

  getConfig<K extends keyof typeof this.config>(key: K): typeof this.config[K] {
    return this.config[key];
  }

  validateConfig(config: any): boolean {
    try {
      configSchema.parse(config);
      return true;
    } catch (error: Error | any) {
      console.error('Configuration validation error:', error.errors);
      return false;
    }
  }
}
