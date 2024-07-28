import fs from 'fs/promises';
import path from 'path';
import chalk from 'chalk';
import { IPromptProjectConfigManager, IPromptsFolderConfig } from '../types/interfaces';
import { getDefaultPromptsPath, getProjectRoot } from './constants';
import debug from 'debug';

const log = debug('fury:config');
import { ensureDirectoryExists } from '../utils/fileUtils';
import { configSchema, DEFAULT_CONFIG, z } from '../schemas/config';
import type { Config } from '../schemas/config';
import { PromptFileSystem, DEFAULT_PROMPTS_FOLDER_CONFIG_FILENAME } from '../promptFileSystem';

export type { Config };

/**
 * PromptProjectConfigManager is responsible for managing the configuration of the prompt project.
 * It implements the Singleton pattern to ensure only one instance of the configuration manager exists.
 */
// Helper function for deep merging objects
function deepMerge(target: any, source: any): any {
  if (typeof target !== 'object' || target === null) {
    return source;
  }

  Object.keys(source).forEach(key => {
    if (source[key] instanceof Object) {
      target[key] = deepMerge(target[key] || {}, source[key]);
    } else {
      target[key] = source[key];
    }
  });

  return target;
}

export class PromptProjectConfigManager implements IPromptProjectConfigManager {
  private configPath: string;
  private config: Config;
  private initialized: boolean = false;
  private static instance: PromptProjectConfigManager | null = null;
  private static initializationPromise: Promise<void> | null = null;
  private basePath: string;
  private verbosity: number = 0;

  /**
   * Constructor for PromptProjectConfigManager.
   * @param configPath Optional path to the configuration file
   */
  private constructor(configPath?: string) {
    const configFileName = process.env.FURY_PROJECT_CONFIG_FILENAME || process.env.FURY_CONFIG_FILENAME || 'fury-config.json';
    this.basePath = getProjectRoot();
    this.configPath = configPath || path.resolve(this.basePath, configFileName);
    this.config = { ...DEFAULT_CONFIG };
    log(`Initializing PromptProjectConfigManager with basePath: ${this.basePath}`);
    log(`Config path: ${this.configPath}`);
    this.performIntegrityCheck();
  }

  public getBasePath(): string {
    return this.basePath;
  }

  public setVerbosity(level: number): void {
    this.verbosity = level;
  }

  public getVerbosity(): number {
    return this.verbosity;
  }

  public static async getInstance(configPath?: string): Promise<PromptProjectConfigManager> {
    if (!PromptProjectConfigManager.instance) {
      if (!PromptProjectConfigManager.initializationPromise) {
        PromptProjectConfigManager.initializationPromise = (async () => {
          const instance = new PromptProjectConfigManager(configPath);
          await instance.initialize();
          PromptProjectConfigManager.instance = instance;
        })();
      }
      await PromptProjectConfigManager.initializationPromise;
    }
    return PromptProjectConfigManager.instance!;
  }

  /**
   * Initialize the configuration manager.
   * This method loads the configuration, ensures necessary directories exist, and prints the loaded configuration.
   */
  private async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      await this.loadConfig();
      await this.ensureConfigDirectories();
      await this.initializePromptsFolderConfig();
      await this.validatePromptsFolder();
      this.prettyPrintConfig();
      this.initialized = true;
    } catch (error: any) {
      console.error(chalk.red('Failed to initialize config:'), error.message);
      throw new Error('Failed to initialize PromptProjectConfigManager. Please check your configuration and try again.');
    }
  }

  /**
   * Checks if the configuration manager has been initialized.
   * @returns A promise that resolves to true if initialized, false otherwise.
   */
  public async isInitialized(): Promise<boolean> {
    const timeout = 30000; // 30 seconds timeout
    const startTime = Date.now();
    while (!this.initialized && Date.now() - startTime < timeout) {
      await new Promise(resolve => setTimeout(resolve, 100)); // Wait for 100ms
    }
    return this.initialized;
  }

  private async ensureInitialized(): Promise<void> {
    if (!await this.isInitialized()) {
      throw new Error('PromptProjectConfigManager is not initialized. Please check for any issues preventing initialization.');
    }
  }

  private async performIntegrityCheck(): Promise<void> {
    try {
      await this.loadConfig();
      const result = configSchema.safeParse(this.config);
      if (!result.success) {
        throw new Error(`Config validation failed: ${result.error.message}`);
      }
      await this.ensureConfigDirectories();
      console.log(chalk.green('✔ Configuration integrity check passed'));
    } catch (error: any) {
      if (error instanceof Error && error.message.includes('Project not initialized')) {
        console.warn(chalk.yellow('⚠ Configuration file not found. Project needs to be initialized.'));
        throw error;
      } else if (error instanceof z.ZodError || error.message.includes('Config validation failed')) {
        console.error(chalk.red('Invalid configuration file:'), error.message);
        throw new Error(`Invalid configuration file. This could be due to:
          1. Manual edits that introduced errors.
          2. Partial updates that left the config in an inconsistent state.
          
          To resolve this:
          - Review your fury-config.json file for any obvious mistakes.
          - Run the 'config --reset' command to restore default settings.
          - If you need to keep your current settings, use 'config --validate' to get more details on the specific issues.`);
      } else {
        console.error(chalk.red('Configuration integrity check failed:'), error.message);
        throw error;
      }
    }
  }

  private async initializePromptsFolderConfig(): Promise<void> {
    const configPath = path.join(this.basePath, DEFAULT_PROMPTS_FOLDER_CONFIG_FILENAME);
    try {
      await fs.access(configPath);
      console.log(chalk.green('✔ Prompts folder configuration already exists'));
    } catch (error) {
      console.log(chalk.yellow('⚠ Prompts folder configuration not found. Creating a default one...'));
      const defaultConfig: IPromptsFolderConfig = {
        version: "1.0.0",
        lastUpdated: new Date().toISOString(),
        promptCount: 0
      };
      await fs.writeFile(configPath, JSON.stringify(defaultConfig, null, 2));
      console.log(chalk.green('✔ Created default prompts folder configuration'));
    }
  }

  private async validatePromptsFolder(): Promise<void> {
    const promptFileSystem = await PromptFileSystem.getInstance();

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
      log(`Loading configuration from ${this.configPath}`);
      const configData = await fs.readFile(this.configPath, 'utf-8');
      const parsedConfig = JSON.parse(configData);

      // Merge parsed config with default config to ensure all required fields are present
      const mergedConfig = deepMerge(DEFAULT_CONFIG, parsedConfig);

      const validatedConfig = configSchema.parse(mergedConfig);
      this.config = {
        ...validatedConfig,
        promptsDir: path.resolve(this.basePath, validatedConfig.promptsDir),
        outputDir: path.resolve(this.basePath, validatedConfig.outputDir),
      };
      log('Configuration loaded successfully');
      log(`Prompts directory: ${this.config.promptsDir}`);
      log(`Output directory: ${this.config.outputDir}`);
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        console.error(chalk.red('Configuration file not found. Project needs to be initialized.'));
        throw new Error(`Project not initialized. Configuration file not found at ${this.configPath}. Please run the initialization command first.`);
      } else if (error instanceof z.ZodError) {
        console.error(chalk.red('Invalid configuration file:'), error.errors);
        const invalidFields = error.errors.map(err => err.path.join('.'));
        throw new Error(`Invalid configuration file at ${this.configPath}: ${error.message}. Invalid fields: ${invalidFields.join(', ')}. Please check these fields and ensure they match the expected schema.`);
      } else if (error instanceof SyntaxError) {
        console.error(chalk.red('Invalid JSON in configuration file:'), error);
        throw new Error(`Invalid JSON in configuration file at ${this.configPath}: ${error.message}. Please check the file contents and ensure it is valid JSON.`);
      } else {
        console.error(chalk.red('Failed to load configuration:'), error);
        throw new Error(`Failed to load configuration from ${this.configPath}: ${error instanceof Error ? error.message : String(error)}. This could be due to a corrupted configuration file or insufficient permissions.`);
      }
    }
  }

  private prettyPrintConfig(): void {
    if (this.verbosity > 0) {
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
      console.log(chalk.white('verbosity:        ') + chalk.cyan(this.verbosity));
      console.log('\n');
    }
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
      const updatedConfig = configSchema.parse(deepMerge(this.config, newConfig));

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

export const getConfigManager = () => PromptProjectConfigManager.getInstance();
