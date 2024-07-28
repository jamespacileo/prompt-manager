import fs from 'fs/promises';
import path from 'path';
import { z } from 'zod';
import chalk from 'chalk';
import { IPromptProjectConfigManager } from '../types/interfaces';
import { getDefaultPromptsPath } from './constants';
import { ensureDirectoryExists } from '../utils/fileUtils';

const DEFAULT_CONFIG: Config = {
  promptsDir: getDefaultPromptsPath(),
  outputDir: path.join(process.cwd(), 'output'),
  preferredModels: ['gpt-4', 'gpt-4o-mini'],
  modelParams: {
    'gpt-4': {
      temperature: 0.7,
      maxTokens: 2000,
      topP: 1,
      frequencyPenalty: 0,
      presencePenalty: 0,
    },
    'gpt-4o-mini': {
      temperature: 0.8,
      maxTokens: 1500,
      topP: 1,
      frequencyPenalty: 0,
      presencePenalty: 0,
    },
  },
};

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

export class PromptProjectConfigManager implements IPromptProjectConfigManager {
  private static instance: PromptProjectConfigManager;
  private configPath: string;
  private config: Config;

  private constructor(configPath?: string) {
    const configFileName = process.env.FURY_PROJECT_CONFIG_FILENAME || process.env.FURY_CONFIG_FILENAME || 'fury-config.json';
    this.configPath = configPath || path.join(process.env.FURY_PROJECT_ROOT || process.cwd(), configFileName);
    this.config = DEFAULT_CONFIG;
    this.loadConfig();
  }

  private loadConfig(): void {
    try {
      const fileContent = fs.readFileSync(this.configPath, 'utf8');
      const loadedConfig = JSON.parse(fileContent);
      this.config = configSchema.parse(loadedConfig);
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
        // File doesn't exist, use default config
        this.config = DEFAULT_CONFIG;
      } else {
        // Other error (e.g., JSON parsing error, validation error)
        throw new Error(`Failed to load configuration: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
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
    await this.ensureConfigDirectories();
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
        // File doesn't exist, use default values
        this.config = {
          ...DEFAULT_CONFIG,
          promptsDir: path.resolve(DEFAULT_CONFIG.promptsDir),
          outputDir: path.resolve(DEFAULT_CONFIG.outputDir),
        };
        await this.saveConfig();
      } else if (error instanceof z.ZodError) {
        throw new Error(`Invalid configuration file: ${error.message}`);
      } else {
        throw new Error(`Failed to load configuration: ${error.message}`);
      }
    }

    // Ensure directories exist
    await this.ensureConfigDirectories();

    // Pretty print the loaded configuration
    this.prettyPrintConfig();
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
    } catch (error: any) {
      throw new Error(`Failed to save configuration: ${error.message}`);
    }
  }

  public async updateConfig(newConfig: Partial<Config>): Promise<void> {
    this.config = {
      ...DEFAULT_CONFIG,
      ...this.config,
      ...newConfig,
      modelParams: {
        ...DEFAULT_CONFIG.modelParams,
        ...this.config.modelParams,
        ...newConfig.modelParams,
      },
    };
    await this.saveConfig();
    await this.ensureConfigDirectories();
  }

  public getConfig<K extends keyof Config>(key: K): Config[K] {
    return this.config[key];
  }

  public getAllConfig(): Config {
    return { ...this.config };
  }

  public async setConfig<K extends keyof Config>(key: K, value: Config[K]): Promise<void> {
    this.config[key] = value;
    await this.saveConfig();
    await this.ensureConfigDirectories();
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
