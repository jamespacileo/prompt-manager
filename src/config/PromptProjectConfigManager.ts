import "reflect-metadata";
import path from "node:path";
import chalk from "chalk";
import { type OptionsSync, cosmiconfig } from "cosmiconfig";
import { Service } from "typedi";
import { fromError } from "zod-validation-error";
import { DEFAULT_CONFIG, configSchema, z } from "../schemas/config";
import type { Config } from "../schemas/config";
import type { IPromptProjectConfigManager } from "../types/interfaces";
import { ensureDirectoryExists } from "../utils/fileUtils";
import { logger } from "../utils/logger";

const DEFAULT_PROMPTS_FOLDER_CONFIG_FILENAME = ".promptmanager.config.json";

export type { Config };

/**
 * @class PromptProjectConfigManager
 * @description Manages the configuration for the prompt project
 *
 * @saga
 * This class is responsible for loading, validating, and providing access to the project configuration.
 * It handles the initialization of necessary directories and provides methods to update and retrieve
 * configuration values.
 *
 * @epicFeatures
 * - Configuration loading and validation
 * - Directory initialization
 * - Configuration update and retrieval
 * - Verbosity control
 *
 * @alliances
 * - cosmiconfig: For searching and loading configuration files
 * - zod: For schema validation of the configuration
 *
 * @allies
 * - PromptFileSystem: Uses this configuration for file operations
 * - PromptManager: Relies on this configuration for prompt management
 *
 * @epicTale
 * ```typescript
 * const configManager = Container.get(PromptProjectConfigManager);
 * await configManager.initialize();
 * const promptsDir = configManager.getConfig('promptsDir');
 * ```
 *
 * @safeguards
 * - Validates configuration against a schema to ensure integrity
 * - Ensures necessary directories exist before operations
 */
@Service()
export class PromptProjectConfigManager implements IPromptProjectConfigManager {
	private config: Config;
	private initialized = false;
	private explorer;
	private basePath: string;
	private configFilePath: string | undefined;

	constructor() {
		this.config = { ...DEFAULT_CONFIG };
		this.basePath = process.env.FURY_PROJECT_ROOT || process.cwd();
		const explorerOptions: OptionsSync = {
			searchPlaces: [
				"package.json",
				".promptmanagerrc",
				".promptmanagerrc.json",
				".promptmanagerrc.yaml",
				".promptmanagerrc.yml",
				".promptmanagerrc.js",
				"promptmanager.config.js",
			],
			loaders: {},
			transform: (result) => result,
			ignoreEmptySearchPlaces: true,
			cache: true,
			mergeImportArrays: true,
			mergeSearchPlaces: true,
			searchStrategy: "project",
		};
		this.explorer = cosmiconfig("promptmanager", explorerOptions);
		logger.debug(
			`Initializing PromptProjectConfigManager with basePath: ${this.basePath}`,
		);
	}

	public getBasePath(): string {
		return this.basePath;
	}

	public getPromptsDir(): string {
		if (!this.config.promptsDir) {
			throw new Error(
				"Prompts directory not set. Please set the prompts directory in your configuration file.",
			);
		}
		if (!path.isAbsolute(this.config.promptsDir)) {
			return path.join(this.basePath, this.config.promptsDir);
		}
		return this.config.promptsDir;
	}

	public getProjectConfigPath(): string {
		if (!this.configFilePath) {
			logger.warn("No configuration file found. Using default configuration.");
			throw new Error(
				"No configuration file found. Please set the configuration file in your project.",
			);
		}
		return this.configFilePath;
	}

	/**
	 * Initialize the configuration manager
	 *
	 * @quest None
	 * @reward void
	 * @peril Error - Thrown if initialization fails
	 *
	 * @lore
	 * This method loads the configuration, ensures necessary directories exist,
	 * and prints the configuration if verbosity is high enough.
	 *
	 * @epicDeed
	 * ```typescript
	 * await configManager.initialize();
	 * ```
	 */
	public async initialize(): Promise<void> {
		if (this.initialized) return;

		try {
			await this.loadConfig();
			await this.ensureConfigDirectories();
			this.prettyPrintConfig();
			this.initialized = true;
		} catch (error: any) {
			logger.error("Failed to initialize config:", error.message, error.stack);
			throw new Error(
				"Failed to initialize PromptProjectConfigManager. Please check your configuration and try again.",
				error.stack,
			);
		}
	}

	public async isInitialized(): Promise<boolean> {
		return this.initialized;
	}

	/**
	 * Load and validate the configuration
	 *
	 * @quest None
	 * @reward void
	 * @peril Error - Thrown if configuration loading or validation fails
	 *
	 * @lore
	 * This method searches for a configuration file, loads it, and validates it against the schema.
	 * If no configuration is found, it uses the default configuration.
	 *
	 * @epicDeed
	 * ```typescript
	 * await configManager.loadConfig();
	 * ```
	 */
	private async loadConfig(): Promise<void> {
		try {
			const result = await this.explorer.search();
			if (result?.config) {
				const validatedConfig = configSchema.parse({
					...DEFAULT_CONFIG,
					...result.config,
				});
				this.config = {
					...validatedConfig,
					promptsDir: path.resolve(this.basePath, validatedConfig.promptsDir),
					outputDir: path.resolve(this.basePath, validatedConfig.outputDir),
				};
				logger.debug(`Found configuration file at ${result.filepath}`);
				this.configFilePath = result.filepath;
			} else {
				logger.warn(
					"No configuration file found. Using default configuration.",
				);
				this.config = { ...DEFAULT_CONFIG };
			}
			if (!this.configFilePath) {
				logger.error(`No configuration file found at ${this.basePath}`);
				this.configFilePath = path.join(
					this.basePath,
					DEFAULT_PROMPTS_FOLDER_CONFIG_FILENAME,
				);
			} else {
				logger.debug(`Configuration file found at ${this.configFilePath}`);
			}
			logger.debug("Configuration loaded successfully");
			logger.debug(`Prompts directory: ${this.config.promptsDir}`);
			logger.debug(`Output directory: ${this.config.outputDir}`);
		} catch (error) {
			if (error instanceof z.ZodError) {
				const validationError = fromError(error);
				logger.error(validationError.toString());
				logger.error("Invalid configuration:", error.errors);
				throw new Error(`Invalid configuration: ${error.message}`);
			}
			logger.error("Error loading configuration:", error);
			throw new Error(
				"Failed to load configuration. Please check your configuration file.",
			);
		}
	}

	private async ensureConfigDirectories(): Promise<void> {
		try {
			await ensureDirectoryExists(this.config.promptsDir);
			logger.success(
				`Created prompts directory: ${chalk.yellow(this.config.promptsDir)}`,
			);
			await ensureDirectoryExists(this.config.outputDir);
			logger.success(
				`Created output directory: ${chalk.yellow(this.config.outputDir)}`,
			);
		} catch (error: any) {
			logger.error("Error: Failed to create necessary directories.");
			logger.warn(
				"Please check that you have write permissions in the project directory.",
			);
			throw new Error(`Failed to create directories: ${error.message}`);
		}
	}

	private prettyPrintConfig(): void {
		if (this.config.verbosity > 99) {
			logger.info(chalk.bold("\nLoaded Configuration:"));
			logger.info(`prompts_dir:      ${chalk.cyan(this.config.promptsDir)}`);
			logger.info(`output_dir:       ${chalk.cyan(this.config.outputDir)}`);
			logger.info(
				`preferredModels:  ${chalk.cyan(this.config.preferredModels.join(", "))}`,
			);
			const modelParamsEntries = Object.entries(this.config.modelParams);
			const formattedModelParams = modelParamsEntries
				.map(([model, params]) => {
					const paramEntries = Object.entries(params);
					const formattedParams = paramEntries
						.map(([key, value]) => `    ${key}: ${chalk.cyan(value)}`)
						.join("\n");
					return `  ${model}:\n${formattedParams}`;
				})
				.join("\n");
			logger.info(`modelParams:\n${formattedModelParams}`);
			logger.info(`verbosity:        ${chalk.cyan(this.config.verbosity)}`);
			logger.info("\n");
		}
	}

	public getConfig<K extends keyof Config>(key: K): Config[K] {
		return this.config[key];
	}

	public getAllConfig(): Config {
		return { ...this.config };
	}

	/**
	 * Update the configuration with new values
	 *
	 * @quest newConfig - Partial configuration to update
	 * @reward void
	 * @peril Error - Thrown if the new configuration is invalid
	 *
	 * @lore
	 * This method updates the current configuration with new values,
	 * validates the resulting configuration, and prints it if verbosity is high.
	 *
	 * @epicDeed
	 * ```typescript
	 * await configManager.updateConfig({ promptsDir: './new-prompts' });
	 * ```
	 */
	public async updateConfig(newConfig: Partial<Config>): Promise<void> {
		try {
			const updatedConfig = configSchema.parse({
				...this.config,
				...newConfig,
			});
			this.config = updatedConfig;
			this.prettyPrintConfig();
		} catch (error: any) {
			if (error instanceof z.ZodError) {
				const validationError = fromError(error);
				logger.error("Validation error:", validationError.toString());
				logger.error("Invalid configuration update:", error.errors);
				throw new Error(`Invalid configuration update: ${error.message}`);
			}
			throw error;
		}
	}

	/**
	 * Set the verbosity level of the configuration
	 *
	 * @quest level - The new verbosity level
	 * @reward void
	 *
	 * @lore
	 * This method updates the verbosity level in the configuration.
	 * Higher verbosity levels result in more detailed logging.
	 *
	 * @epicDeed
	 * ```typescript
	 * configManager.setVerbosity(2);
	 * ```
	 */
	setVerbosity(level: number): void {
		this.config.verbosity = level;
	}

	/**
	 * Get the current verbosity level
	 *
	 * @quest None
	 * @reward number - The current verbosity level
	 *
	 * @lore
	 * This method retrieves the current verbosity level from the configuration.
	 *
	 * @epicDeed
	 * ```typescript
	 * const verbosity = configManager.getVerbosity();
	 * ```
	 */
	getVerbosity(): number {
		return this.config.verbosity;
	}
}
