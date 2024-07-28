import fs from 'fs/promises';
import path from 'path';
import chalk from 'chalk';
import { IPromptProjectConfigManager } from '../types/interfaces';
import { getDefaultPromptsPath } from './constants';
import { ensureDirectoryExists } from '../utils/fileUtils';
import { configSchema, DEFAULT_CONFIG, z } from '../schemas/config';
import type { Config } from '../schemas/config';
import { PromptFileSystem } from '../promptFileSystem';

export type { Config };

/**
 * PromptProjectConfigManager is responsible for managing the configuration of the prompt project.
 * It implements the Singleton pattern to ensure only one instance of the configuration manager exists.
 */
export class PromptProjectConfigManager implements IPromptProjectConfigManager {
  private static instance: PromptProjectConfigManager;
  private configPath: string;
  private config: Config;

  /**
   * Private constructor to prevent direct construction calls with the `new` operator.
   * @param configPath Optional path to the configuration file
   */
  private constructor(configPath?: string) {
    const configFileName = process.env.FURY_PROJECT_CONFIG_FILENAME || process.env.FURY_CONFIG_FILENAME || 'fury-config.json';
    const projectRoot = process.env.FURY_PROJECT_ROOT || process.cwd();
    this.configPath = configPath || path.join(projectRoot, configFileName);
    this.config = { ...DEFAULT_CONFIG };
    this.performIntegrityCheck();
  }

  public static getInstance(configPath?: string): PromptProjectConfigManager {
    if (!PromptProjectConfigManager.instance) {
      PromptProjectConfigManager.instance = new PromptProjectConfigManager(configPath);
    }
    return PromptProjectConfigManager.instance;
  }

  /**
   * Initialize the configuration manager.
   * This method loads the configuration, ensures necessary directories exist, and prints the loaded configuration.
   */
  public async initialize(): Promise<void> {
    try {
      await this.loadConfig();
      await this.ensureConfigDirectories();
      await this.validatePromptsFolder();
      this.prettyPrintConfig();
    } catch (error: any) {
      console.error(chalk.red('Failed to initialize config:'), error.message);
      throw error;
    }
  }

  private async performIntegrityCheck(): Promise<void> {
    try {
      await this.loadConfig();
      await this.ensureConfigDirectories();
      console.log(chalk.green('✔ Configuration integrity check passed'));
    } catch (error: any) {
      if (error instanceof Error && error.message.includes('Project not initialized')) {
        console.warn(chalk.yellow('⚠ Configuration file not found. Project needs to be initialized.'));
        throw error;
      } else if (error instanceof z.ZodError) {
        console.error(chalk.red('Invalid configuration file:'), error.errors);
        throw new Error(`Invalid configuration file. Please check the file contents and ensure it matches the expected schema.`);
      } else {
        console.warn(chalk.yellow('⚠ Configuration integrity check failed:'), error.message);
        console.log(chalk.yellow('Attempting to create necessary directories...'));
        try {
          await this.ensureConfigDirectories();
        } catch (dirError) {
          console.error(chalk.red('Failed to create necessary directories:'), dirError);
          throw new Error(`Failed to create necessary directories. Please check your file system permissions.`);
        }
      }
    }
  }

  private async validatePromptsFolder(): Promise<void> {
    const promptsDir = path.resolve(process.env.FURY_PROJECT_ROOT || process.cwd(), this.config.promptsDir);
    const promptFileSystem = new PromptFileSystem();
    await promptFileSystem.initialize();

    const isValid = await promptFileSystem.validatePromptsFolderConfig();
    if (!isValid) {
      console.error(chalk.red('Error: Prompts folder is not properly initialized or has an invalid configuration.'));
      console.error(chalk.yellow('Please make sure you have run the initialization command for your prompts folder.'));
      console.error(chalk.yellow('If you believe this is an error, check that the promptsDir path in your configuration is correct.'));
      throw new Error('Invalid prompts folder configuration');
    }
  }

  private async ensureConfigDirectories(): Promise<void> {
    const projectRoot = process.env.FURY_PROJECT_ROOT || process.cwd();
    try {
      await ensureDirectoryExists(path.resolve(projectRoot, this.config.promptsDir));
      console.log(chalk.green(`✔ Created prompts directory: ${this.config.promptsDir}`));
      await ensureDirectoryExists(path.resolve(projectRoot, this.config.outputDir));
      console.log(chalk.green(`✔ Created output directory: ${this.config.outputDir}`));
    } catch (error: any) {
      console.error(chalk.red('Error: Failed to create necessary directories.'));
      console.error(chalk.yellow('Please check that you have write permissions in the project directory.'));
      throw new Error(`Failed to create directories: ${error.message}`);
    }
  }

  private async loadConfig(): Promise<void> {
    try {
      console.log(chalk.blue(`Loading configuration from ${this.configPath}`));
      const configData = await fs.readFile(this.configPath, 'utf-8');
      const parsedConfig = JSON.parse(configData);

      const validatedConfig = configSchema.parse(parsedConfig);
      this.config = {
        ...validatedConfig,
        promptsDir: path.relative(process.cwd(), path.resolve(process.env.FURY_PROJECT_ROOT || process.cwd(), validatedConfig.promptsDir)),
        outputDir: path.relative(process.cwd(), path.resolve(process.env.FURY_PROJECT_ROOT || process.cwd(), validatedConfig.outputDir)),
      };
      console.log(chalk.green('✔ Configuration loaded successfully'));
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        console.error(chalk.red('Configuration file not found. Project needs to be initialized.'));
        throw new Error(`Project not initialized. Configuration file not found at ${this.configPath}. Please run the initialization command first.`);
      } else if (error instanceof z.ZodError) {
        console.error(chalk.red('Invalid configuration file:'), error.errors);
        throw new Error(`Invalid configuration file at ${this.configPath}: ${error.message}. Please check the file contents and ensure it matches the expected schema.`);
      } else {
        console.error(chalk.red('Failed to load configuration:'), error);
        throw new Error(`Failed to load configuration from ${this.configPath}: ${error.message}. This could be due to a corrupted configuration file.`);
      }
    }
  }

  private prettyPrintConfig(): void {
    console.log(chalk.bold('\nLoaded Configuration:'));
    console.log(chalk.white('prompts_dir:      ') + chalk.cyan(this.config.promptsDir));
    console.log(chalk.white('output_dir:       ') + chalk.cyan(this.config.outputDir));
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

  private async saveConfig(): Promise<void> {
    try {
      const configData = JSON.stringify(this.config, null, 2);
      await fs.writeFile(this.configPath, configData, 'utf-8');
      console.log('Configuration saved successfully.');
    } catch (error: any) {
      console.error('Failed to save configuration:', error);
      throw new Error(`Failed to save configuration to ${this.configPath}: ${error.message}. 
        This could be due to insufficient permissions or disk space. 
        Please check your file system permissions and available storage. 
        If the issue persists, try saving to a different location or contact your system administrator.`);
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

  public getConfigTyped<K extends keyof Config>(key: K): Config[K] {
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
