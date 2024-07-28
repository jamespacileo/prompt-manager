import fs from 'fs/promises';
import path from 'path';
import { z } from 'zod';
import { IPromptProjectConfigManager } from '../types/interfaces';
import { CONFIG_FILE_NAME, DEFAULT_CONFIG, getConfigPath, getDefaultPromptsPath } from './constants';

const configSchema = z.object({
  promptsDir: z.string(),
  outputDir: z.string(),
  preferredModels: z.array(z.string()),
  modelParams: z.record(z.object({
    temperature: z.number().optional(),
    maxTokens: z.number().optional(),
    topP: z.number().optional(),
    frequencyPenalty: z.number().optional(),
    presencePenalty: z.number().optional(),
  })),
});

export type Config = z.infer<typeof configSchema>;

class PromptProjectConfigManager implements IPromptProjectConfigManager {
  private static instance: PromptProjectConfigManager;
  private configPath: string;
  private config: Config;

  private constructor(configPath?: string) {
    this.configPath = configPath || getConfigPath();
    this.config = { ...DEFAULT_CONFIG };
  }

  public static getInstance(configPath?: string): PromptProjectConfigManager {
    if (!PromptProjectConfigManager.instance) {
      PromptProjectConfigManager.instance = new PromptProjectConfigManager(configPath);
    }
    PromptProjectConfigManager.instance.initialize();
    return PromptProjectConfigManager.instance;
  }

  public async initialize(): Promise<void> {
    await this.loadConfig();
  }

  private async loadConfig(): Promise<void> {
    try {
      console.log(`Loading configuration from ${this.configPath}`);
      const configData = await fs.readFile(this.configPath, 'utf-8');
      const parsedConfig = JSON.parse(configData);

      if (this.validateConfig(parsedConfig)) {
        this.config = parsedConfig;
        this.config.promptsDir = path.resolve(path.dirname(this.configPath), this.config.promptsDir);
        this.config.outputDir = path.resolve(path.dirname(this.configPath), this.config.outputDir);
      } else {
        throw new Error('Invalid configuration file');
      }
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        // File doesn't exist, create a new one with default values
        this.config = { ...DEFAULT_CONFIG };
        this.config.promptsDir = getDefaultPromptsPath();
        this.config.outputDir = path.join(path.dirname(this.configPath), 'output');
        await this.saveConfig();
      } else {
        throw new Error(`Failed to load configuration: ${error.message}`);
      }
    }
  }

  private async saveConfig(): Promise<void> {
    try {
      const configData = JSON.stringify(this.config, null, 2);
      await fs.writeFile(this.configPath, configData, 'utf-8');
    } catch (error: any) {
      throw new Error(`Failed to save configuration: ${error.message}`);
    }
  }

  public async updateConfig(newConfig: Partial<Config>): Promise<void> {
    this.config = { ...this.config, ...newConfig };
    await this.saveConfig();
  }

  public getConfig<K extends keyof Config>(key: K): Config[K] {
    return this.config[key];
  }

  public getAllConfig(): Config {
    return { ...this.config };
  }

  private validateConfig(config: any): config is Config {
    try {
      configSchema.parse(config);
      return true;
    } catch (error: any) {
      console.error('Configuration validation error:', error.errors);
      return false;
    }
  }
}

export const configManager = PromptProjectConfigManager.getInstance();
