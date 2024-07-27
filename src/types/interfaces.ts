import type { JSONSchema7 } from 'json-schema';
/**
 * This file contains the core interfaces for the Prompt Manager project.
 * It serves as a single source of truth for the expected behavior of both
 * the CLI tool and the importable library.
 *
 * These interfaces should be used to guide the implementation of the project.
 * Any changes to the project's core functionality should be reflected here first.
 *
 * IMPORTANT: Do not delete the comments in this file. They provide crucial
 * information about the purpose and usage of each interface and type.
 */

type IPromptInput = Record<string, any>;
type IPromptOutput = Record<string, any>;

/**
 * Represents the structure of a single prompt.
 */
interface IPrompt<PromptInput extends IPromptInput, PromptOutput extends IPromptOutput> {
  /** Unique identifier for the prompt */
  name: string;
  /** Category the prompt belongs to */
  category: string;
  /** Brief description of the prompt's purpose */
  description: string;
  /** Current version of the prompt */
  version: string;
  /** The actual content of the prompt */
  template: string;
  /** List of parameter names expected by the prompt */
  parameters: string[];
  /** Metadata associated with the prompt */
  metadata?: {
    /** Timestamp of when the prompt was created */
    created: string;
    /** Timestamp of the last modification */
    lastModified: string;
  };

  /** Type of output expected from the model (structured or plain text) */
  outputType: 'structured' | 'plain';
  /** Default model name to use for this prompt */
  defaultModelName?: string;
  /** Optional list of models that can be used with this prompt */
  compatibleModels?: string[];
  /** Optional list of tags or keywords associated with this prompt */
  tags?: string[];
  /** Type of input expected by the prompt */
  inputSchema: JSONSchema7;
  /** Type of output expected by the prompt */
  outputSchema: JSONSchema7;
}

type IAsyncIterableStream<T> = AsyncIterable<T> & ReadableStream<T>;

export interface IPromptModel extends IPrompt<IPromptInput, IPromptOutput> {

  /**
   * Configuration for the prompt to be run with the model.
   * This is generated when loading a prompt, it is generated based on prompt config fields and user project
   * configuration. eg modelName would be affected by the prompts config for preferred model and
   * the model preferences in the project settings.
   */
  configuration: {
    modelName: string;
    temperature: number;
    maxTokens: number;
    topP: number;
    frequencyPenalty: number;
    presencePenalty: number;
    stopSequences: string[];
  }

  fileSystem?: IPromptFileSystem;

  // Static methods
  /**
   * Load a prompt by its name.
   * @param props An object containing the name of the prompt to load.
   */
  loadPromptByName(props: { name: string }): IPromptModel;

  /**
   * Validate the input against the prompt's input schema.
   * @param props An object containing the input to validate.
   */
  validateInput(props: { input: IPromptInput }): boolean;

  /**
   * Validate the output against the prompt's output schema.
   * @param props An object containing the output to validate.
   */
  validateOutput(props: { output: IPromptOutput }): boolean;

  /**
   * Check if a prompt with the given name already exists in storage.
   * @param props An object containing the name of the prompt to check.
   */
  _promptExists(props: { name: string }): boolean;

  // Private methods
  /**
   * Private method to initialize the prompt configuration.
   */
  _initializeConfiguration(): void;

  /**
   * Private method to process the prompt content.
   */
  _processContent(): void;

  /**
   * Private method to get the file path for the prompt.
   */
  _getFilePath(): string;

  /**
   * Private method to mark the prompt as loaded from storage.
   */
  _markAsLoadedFromStorage(): void;

  // Public methods
  /**
   * Format the template with given inputs.
   * @param props An object containing the inputs to format the template with.
   */
  format(props: { inputs: IPromptInput }): string;

  /**
   * Submit a request to AI and stream the response.
   * @param props An object containing the inputs for the AI request.
   */
  stream(props: { inputs: IPromptInput }): Promise<IAsyncIterableStream<string>>;

  /**
   * Execute the prompt with the given inputs and return the output.
   * @param props An object containing the inputs for the prompt.
   */
  execute(props: { inputs: IPromptInput }): Promise<IPromptOutput>;

  /**
   * Update the metadata for the prompt.
   * @param props An object containing the new metadata for the prompt.
   */
  updateMetadata(props: { metadata: Partial<IPromptModel['metadata']> }): void;

  /**
   * Get a summary of the prompt.
   */
  getSummary(): string;

  /**
   * Save the prompt to a file.
   */
  save(): void;

  /**
   * Load the prompt from a file.
   * @param props An object containing the file path to load the prompt from.
   */
  load(props: { filePath: string }): void;

  /**
   * Get all available stored versions of the prompt.
   */
  versions(): string[];

  /**
   * Move to a different version of the prompt.
   * @param props An object containing the version to switch to.
   */
  switchVersion(props: { version: string }): void;

  /**
   * Check if the prompt was loaded from storage.
   */
  _isSaved(): boolean;

}



/**
 * Defines the structure and behavior of the Prompt Manager CLI.
 */
interface IPromptManagerCLI {
  /**
   * Creates a new prompt.
   * @param props An object containing the name and options for the new prompt
   */
  create(props: {
    name: string;
    options: {
      category?: string;
      content?: string;
      parameters?: string[];
      description?: string;
    }
  }): Promise<void>;

  /**
   * Lists all available prompts.
   * @param props An object containing filtering and display options
   */
  list(props?: {
    options?: {
      category?: string;
      format?: 'json' | 'table';
    }
  }): Promise<void>;

  /**
   * Updates an existing prompt.
   * @param props An object containing the name of the prompt to update and update options
   */
  update(props: {
    name: string;
    options: {
      content?: string;
      parameters?: string[];
      description?: string;
    }
  }): Promise<void>;

  /**
   * Deletes a prompt.
   * @param props An object containing the name of the prompt to delete
   */
  delete(props: { name: string }): Promise<void>;

  /**
   * Manages versions of a prompt.
   * @param props An object containing the version management action, prompt name, and optional version
   */
  version(props: {
    action: 'list' | 'create' | 'switch';
    name: string;
    version?: string;
  }): Promise<void>;

  /**
   * Generates TypeScript types for all prompts.
   */
  generateTypes(): Promise<void>;

  /**
   * Performs a consistency check on all prompts.
   */
  check(): Promise<void>;
}

/**
 * Represents a category of prompts in the importable library.
 * NOTE: DO NOT DELETE THESE COMMENTS. THEY ARE USED BY THE DOCUMENTATION GENERATOR.
 */
interface IPromptCategory<T extends Record<string, IPrompt<IPromptInput, IPromptOutput>>> {
  [K: string]: {
    /** Returns the raw content of the prompt */
    raw: string;
    /** Returns the current version of the prompt */
    version: string;
    /**
     * Formats the prompt with given inputs
     * @param inputs Object containing the required parameters
     */
    format(inputs: { [K in T[keyof T]['parameters'][number]]: string }): string;
  };
}

/**
 * Defines the structure and behavior of the importable Prompt Manager library.
 */
interface IPromptManagerLibrary {
  /**
   * Asynchronously initializes the Prompt Manager.
   * This must be called before using any other methods.
   */
  initialize(): Promise<void>;

  /**
   * Retrieves a specific prompt.
   * @param props An object containing the category and name of the prompt
   */
  getPrompt(props: { category: string; name: string }): IPrompt<IPromptInput, IPromptOutput>;

  /**
   * Creates a new prompt.
   * @param props An object containing the prompt to create
   */
  createPrompt(props: { prompt: Omit<IPrompt<IPromptInput, IPromptOutput>, 'versions'> }): Promise<void>;

  /**
   * Updates an existing prompt.
   * @param props An object containing the name of the prompt to update and the updates
   */
  updatePrompt(props: {
    name: string;
    updates: Partial<IPrompt<IPromptInput, IPromptOutput>>;
  }): Promise<void>;

  /**
   * Deletes a prompt.
   * @param props An object containing the name of the prompt to delete
   */
  deletePrompt(props: { name: string }): Promise<void>;

  /**
   * Lists all available prompts.
   * @param props An object containing an optional category to filter prompts
   */
  listPrompts(props?: { category?: string }): Promise<IPrompt<IPromptInput, IPromptOutput>[]>;

  /**
   * Manages versions of a prompt.
   * @param props An object containing the version management action, prompt name, and optional version
   */
  versionPrompt(props: {
    action: 'list' | 'create' | 'switch';
    name: string;
    version?: string;
  }): Promise<void>;

  /**
   * Formats a prompt with given parameters.
   * @param props An object containing the category, prompt name, and parameters
   */
  formatPrompt(props: {
    category: string;
    promptName: string;
    params: Record<string, any>;
  }): string;

  /**
   * Access to prompt categories.
   * This allows for dynamic access to categories and prompts.
   */
  categories: {
    [category: string]: IPromptCategory<Record<string, IPrompt<IPromptInput, IPromptOutput>>>;
  };
}

// Export the interfaces so they can be imported and used in other parts of the project
interface IPromptFileSystem {
  /**
   * Saves a prompt to the file system.
   * @param props An object containing the prompt data to be saved.
   * @returns A promise that resolves when the prompt is saved.
   */
  savePrompt(props: { promptData: IPrompt<IPromptInput, IPromptOutput> }): Promise<void>;

  /**
   * Loads a prompt from the file system.
   * @param props An object containing the category and name of the prompt to load.
   * @returns A promise that resolves with the loaded prompt data.
   */
  loadPrompt(props: { category: string; promptName: string }): Promise<IPrompt<IPromptInput, IPromptOutput>>;

  /**
   * Checks if a prompt exists in the file system.
   * @param props An object containing the category and name of the prompt to check.
   * @returns A promise that resolves with a boolean indicating if the prompt exists.
   */
  promptExists(props: { category: string; promptName: string }): Promise<boolean>;

  /**
   * Lists all prompts, optionally filtered by category.
   * @param props An object containing an optional category to filter prompts.
   * @returns A promise that resolves with an array of prompt names.
   */
  listPrompts(props?: { category?: string }): Promise<string[]>;

  /**
   * Lists all categories in the file system.
   * @returns A promise that resolves with an array of category names.
   */
  listCategories(): Promise<string[]>;

  /**
   * Searches for prompts based on a query string.
   * @param props An object containing the search query.
   * @returns A promise that resolves with an array of objects containing category and name of matching prompts.
   */
  searchPrompts(props: { query: string }): Promise<Array<{ category: string; name: string }>>;

  /**
   * Searches for categories based on a query string.
   * @param props An object containing the search query.
   * @returns A promise that resolves with an array of matching category names.
   */
  searchCategories(props: { query: string }): Promise<string[]>;

  /**
   * Retrieves all versions of a specific prompt.
   * @param props An object containing the category and name of the prompt.
   * @returns A promise that resolves with an array of version strings.
   */
  getPromptVersions(props: { category: string; promptName: string }): Promise<string[]>;
}

/**
 * Interface for managing the project configuration for the Prompt Manager.
 */
interface IPromptProjectConfigManager {
  /** The path to the project configuration file */
  configPath: string;
  /** The loaded and validated configuration object */
  config: {
    /** The absolute path to the directory where prompts are stored */
    promptsDir: string;
    /** The preferred AI models for the project */
    preferredModels: string[];
    /** Model-specific parameters */
    modelParams: Record<string, {
      temperature?: number;
      maxTokens?: number;
      topP?: number;
      frequencyPenalty?: number;
      presencePenalty?: number;
    }>;
  };

  /**
   * Loads the configuration file and validates its contents.
   * @returns A promise that resolves when the configuration is loaded and validated.
   */
  loadConfig(): Promise<void>;

  /**
   * Saves the current configuration to the config file.
   * @returns A promise that resolves when the configuration is saved.
   */
  saveConfig(): Promise<void>;

  /**
   * Updates a specific configuration value.
   * @param key The configuration key to update.
   * @param value The new value for the configuration key.
   */
  updateConfig(key: string, value: any): void;

  /**
   * Retrieves a specific configuration value.
   * @param key The configuration key to retrieve.
   * @returns The value of the specified configuration key.
   */
  getConfig(key: string): any;

  /**
   * Validates the configuration object against the defined schema.
   * @param config The configuration object to validate.
   * @returns A boolean indicating whether the configuration is valid.
   */
  validateConfig(config: any): boolean;
}

export type {
  IAsyncIterableStream,
  IPromptInput,
  IPromptOutput,
  IPrompt,
  IPromptManagerCLI,
  IPromptCategory,
  IPromptManagerLibrary,
  IPromptFileSystem,
  IPromptProjectConfigManager
};
