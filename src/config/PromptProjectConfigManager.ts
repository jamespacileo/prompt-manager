import { cosmiconfig, OptionsSync } from 'cosmiconfig';
import path from 'path';
import type { IPromptProjectConfigManager } from '../types/interfaces';
import { ensureDirectoryExists } from '../utils/fileUtils';
import { configSchema, DEFAULT_CONFIG, z } from '../schemas/config';
import type { Config } from '../schemas/config';
import { Service } from 'typedi';
import { fromError } from 'zod-validation-error';
import { logger } from '../utils/logger';
import chalk from 'chalk';

const DEFAULT_PROMPTS_FOLDER_CONFIG_FILENAME = '.promptmanager.config.json';

export type { Config };

@Service()
export class PromptProjectConfigManager implements IPromptProjectConfigManager {
  private config: Config;
  private initialized: boolean = false;
  private explorer;
  private basePath: string;
  private configFilePath: string | undefined;

  constructor() {
    this.config = { ...DEFAULT_CONFIG };
    this.basePath = process.env.FURY_PROJECT_ROOT || process.cwd();
    const explorerOptions: OptionsSync = {
      searchPlaces: [
        'package.json',
        '.promptmanagerrc',
        '.promptmanagerrc.json',
        '.promptmanagerrc.yaml',
        '.promptmanagerrc.yml',
        '.promptmanagerrc.js',
        'promptmanager.config.js',
      ],
      loaders: {},
      transform: (result) => result,
      ignoreEmptySearchPlaces: true,
      cache: true,
      mergeImportArrays: true,
      mergeSearchPlaces: true,
      searchStrategy: 'project',
    };
    this.explorer = cosmiconfig('promptmanager', explorerOptions);
    logger.debug(`Initializing PromptProjectConfigManager with basePath: ${this.basePath}`);
  }

  public getBasePath(): string {
    return this.basePath;
  }

  public getPromptsDir(): string {
    if (!this.config.promptsDir) {
      throw new Error('Prompts directory not set. Please set the prompts directory in your configuration file.');
    }
    if (!path.isAbsolute(this.config.promptsDir)) {
      return path.join(this.basePath, this.config.promptsDir);
    }
    return this.config.promptsDir;
  }

  public getProjectConfigPath(): string {
    if (!this.configFilePath) {
      logger.warn('No configuration file found. Using default configuration.');
      throw new Error('No configuration file found. Please set the configuration file in your project.');
    }
    return this.configFilePath;
  }

  public async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      await this.loadConfig();
      await this.ensureConfigDirectories();
      this.prettyPrintConfig();
      this.initialized = true;
    } catch (error: any) {
      logger.error('Failed to initialize config:', error.message);
      throw new Error('Failed to initialize PromptProjectConfigManager. Please check your configuration and try again.');
    }
  }

  public async isInitialized(): Promise<boolean> {
    return this.initialized;
  }

  private async loadConfig(): Promise<void> {
    try {
      const result = await this.explorer.search();
      if (result && result.config) {
        const validatedConfig = configSchema.parse({ ...DEFAULT_CONFIG, ...result.config });
        this.config = {
          ...validatedConfig,
          promptsDir: path.resolve(this.basePath, validatedConfig.promptsDir),
          outputDir: path.resolve(this.basePath, validatedConfig.outputDir),
        };
        logger.debug(`Found configuration file at ${result.filepath}`);
        this.configFilePath = result.filepath;
      } else {
        logger.warn('No configuration file found. Using default configuration.');
        this.config = { ...DEFAULT_CONFIG };
      }
      if (!this.configFilePath) {
        logger.error(`No configuration file found at ${this.basePath}`);
        this.configFilePath = path.join(this.basePath, DEFAULT_PROMPTS_FOLDER_CONFIG_FILENAME);
      } else {
        logger.debug(`Configuration file found at ${this.configFilePath}`);
      }
      logger.debug('Configuration loaded successfully');
      logger.debug(`Prompts directory: ${this.config.promptsDir}`);
      logger.debug(`Output directory: ${this.config.outputDir}`);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const validationError = fromError(error);
        logger.error(validationError.toString());
        logger.error('Invalid configuration:', error.errors);
        throw new Error(`Invalid configuration: ${error.message}`);
      } else {
        logger.error('Error loading configuration:', error);
        throw new Error('Failed to load configuration. Please check your configuration file.');
      }
    }
  }

  private async ensureConfigDirectories(): Promise<void> {
    try {
      await ensureDirectoryExists(this.config.promptsDir);
      logger.success(`Created prompts directory: ${this.config.promptsDir}`);
      await ensureDirectoryExists(this.config.outputDir);
      logger.success(`Created output directory: ${this.config.outputDir}`);
    } catch (error: any) {
      logger.error('Error: Failed to create necessary directories.');
      logger.warn('Please check that you have write permissions in the project directory.');
      throw new Error(`Failed to create directories: ${error.message}`);
    }
  }

  private prettyPrintConfig(): void {
    if (this.config.verbosity > 99) {
      logger.info(chalk.bold('\nLoaded Configuration:'));
      logger.info(`prompts_dir:      ${chalk.cyan(this.config.promptsDir)}`);
      logger.info(`output_dir:       ${chalk.cyan(this.config.outputDir)}`);
      logger.info(`preferredModels:  ${chalk.cyan(this.config.preferredModels.join(', '))}`);
      logger.info('modelParams:');
      Object.entries(this.config.modelParams).forEach(([model, params]) => {
        logger.info(`  ${model}:`);
        Object.entries(params).forEach(([key, value]) => {
          logger.info(`    ${key}: ${chalk.cyan(value)}`);
        });
      });
      logger.info(`verbosity:        ${chalk.cyan(this.config.verbosity)}`);
      logger.info('\n');
    }
  }

  public getConfig<K extends keyof Config>(key: K): Config[K] {
    return this.config[key];
  }

  public getAllConfig(): Config {
    return { ...this.config };
  }

  public async updateConfig(newConfig: Partial<Config>): Promise<void> {
    try {
      const updatedConfig = configSchema.parse({ ...this.config, ...newConfig });
      this.config = updatedConfig;
      this.prettyPrintConfig();
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        const validationError = fromError(error);
        logger.error("Validation error:", validationError.toString());
        logger.error('Invalid configuration update:', error.errors);
        throw new Error(`Invalid configuration update: ${error.message}`);
      }
      throw error;
    }
  }
  setVerbosity(level: number): void {
    this.config.verbosity = level;
  }

  getVerbosity(): number {
    return this.config.verbosity;
  }
}

