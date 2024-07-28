import fs from 'fs/promises';
import path from 'path';
import chalk from 'chalk';
import { IPromptProjectConfigManager } from '../types/interfaces';
import { getDefaultPromptsPath } from './constants';
import { ensureDirectoryExists } from '../utils/fileUtils';
import { Config, configSchema, DEFAULT_CONFIG } from '../schemas/config';

export class PromptProjectConfigManager implements IPromptProjectConfigManager {
  private static instance: PromptProjectConfigManager;
  private configPath: string;
  private config: Config;

  private constructor(configPath?: string) {
    const configFileName = process.env.FURY_PROJECT_CONFIG_FILENAME || process.env.FURY_CONFIG_FILENAME || 'fury-config.json';
    this.configPath = configPath || path.join(process.env.FURY_PROJECT_ROOT || process.cwd(), configFileName);
    this.config = { ...DEFAULT_CONFIG };
  }

  public static getInstance(configPath?: string): PromptProjectConfigManager {
    if (!PromptProjectConfigManager.instance) {
      PromptProjectConfigManager.instance = new PromptProjectConfigManager(configPath);
    }
    return PromptProjectConfigManager.instance;
  }

  public async initialize(): Promise<void> {
    await this.loadConfig();
    await this.ensureConfigDirectories();
    this.prettyPrintConfig();
  }

  private async loadConfig(): Promise<void> {
    try {
      console.log(`Loading configuration from ${this.configPath}`);
      const configData = await fs.readFile(this.configPath, 'utf-8');
      const parsedConfig = JSON.parse(configData);

      const validatedConfig = configSchema.parse(parsedConfig);
      this.config = {
        ...validatedConfig,
        promptsDir: path.resolve(validatedConfig.promptsDir),
        outputDir: path.resolve(validatedConfig.outputDir),
      };
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        console.log('Configuration file not found. Using default configuration.');
        this.config = {
          ...DEFAULT_CONFIG,
          promptsDir: path.resolve(getDefaultPromptsPath()),
          outputDir: path.resolve(path.join(process.cwd(), 'output')),
        };
        await this.saveConfig();
      } else if (error instanceof z.ZodError) {
        console.error('Invalid configuration file:', error.errors);
        throw new Error(`Invalid configuration file: ${error.message}`);
      } else {
        console.error('Failed to load configuration:', error);
        throw new Error(`Failed to load configuration: ${error.message}`);
      }
    }
  }

  private prettyPrintConfig(): void {
    console.log(chalk.bold('\nLoaded Configuration:'));
    console.log(chalk.white('promptsDir:      ') + chalk.cyan(this.config.promptsDir));
    console.log(chalk.white('outputDir:       ') + chalk.cyan(this.config.outputDir));
    console.log(chalk.white('preferredModels: ') + chalk.cyan(this.config.preferredModels.join(', ')));
    console.log(chalk.white('modelParams:'));
    Object.entries(this.config.modelParams).forEach(([model, params]) => {
      console.log(chalk.white(`  ${model}:`));
      Object.entries(params).forEach(([key, value]) => {
        console.log(chalk.white(`    ${key}: `) + chalk.cyan(value));
      });
    });
    console.log('\n');
  }

  private async ensureConfigDirectories(): Promise<void> {
    await ensureDirectoryExists(this.config.promptsDir);
    await ensureDirectoryExists(this.config.outputDir);
  }

  private async saveConfig(): Promise<void> {
    try {
      const configData = JSON.stringify(this.config, null, 2);
      await fs.writeFile(this.configPath, configData, 'utf-8');
      console.log('Configuration saved successfully.');
    } catch (error: any) {
      console.error('Failed to save configuration:', error);
      throw new Error(`Failed to save configuration: ${error.message}`);
    }
  }

  public async updateConfig(newConfig: Partial<Config>): Promise<void> {
    try {
      const updatedConfig = configSchema.parse({
        ...this.config,
        ...newConfig,
        modelParams: {
          ...this.config.modelParams,
          ...newConfig.modelParams,
        },
      });

      this.config = updatedConfig;
      await this.saveConfig();
      await this.ensureConfigDirectories();
      this.prettyPrintConfig();
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        console.error('Invalid configuration update:', error.errors);
        throw new Error(`Invalid configuration update: ${error.message}`);
      }
      throw error;
    }
  }

  public getConfig<K extends keyof Config>(key: K): Config[K] {
    return this.config[key];
  }

  public getAllConfig(): Config {
    return { ...this.config };
  }

  public async setConfig<K extends keyof Config>(key: K, value: Config[K]): Promise<void> {
    try {
      const updatedConfig = { ...this.config, [key]: value };
      const validatedConfig = configSchema.parse(updatedConfig);
      this.config = validatedConfig;
      await this.saveConfig();
      await this.ensureConfigDirectories();
      this.prettyPrintConfig();
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        console.error('Invalid configuration update:', error.errors);
        throw new Error(`Invalid configuration update: ${error.message}`);
      }
      throw error;
    }
  }
}

export const configManager = PromptProjectConfigManager.getInstance();
