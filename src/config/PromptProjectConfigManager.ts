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
    } catch (error) {
      throw new Error(`Failed to load configuration: ${error.message}`);
    }
  }

  async saveConfig(): Promise<void> {
    try {
      const configData = JSON.stringify(this.config, null, 2);
      await fs.writeFile(this.configPath, configData, 'utf-8');
    } catch (error) {
      throw new Error(`Failed to save configuration: ${error.message}`);
    }
  }

  updateConfig(key: string, value: any): void {
    if (key in this.config) {
      this.config[key] = value;
    } else {
      throw new Error(`Invalid configuration key: ${key}`);
    }
  }

  getConfig(key: string): any {
    if (key in this.config) {
      return this.config[key];
    } else {
      throw new Error(`Invalid configuration key: ${key}`);
    }
  }

  validateConfig(config: any): boolean {
    try {
      configSchema.parse(config);
      return true;
    } catch (error) {
      console.error('Configuration validation error:', error.errors);
      return false;
    }
  }
}
