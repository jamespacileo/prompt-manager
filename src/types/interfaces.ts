import type { JSONSchema7 } from 'json-schema';
import { ZodObject } from 'zod';
import { Config } from '../config/PromptProjectConfigManager';
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

type IPromptInput<T extends Record<string, any> = Record<string, any>> = T;
type IPromptOutput<T extends Record<string, any> = Record<string, any>> = T;

/**
 * Represents the structure of a single prompt.
 */
interface IPrompt<PromptInput extends IPromptInput<any>, PromptOutput extends IPromptOutput<any>> {
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
  metadata: {
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

export interface IPromptModelRequired {
  name: string;
  category: string;
  description: string;
  template: string;
  parameters: string[];
  inputSchema: JSONSchema7;
  outputSchema: JSONSchema7;
  version: string;
  metadata: {
    created: string;
    lastModified: string;
  };
}

export interface IPromptModel<
  TInput extends IPromptInput<any> = IPromptInput<any>,
  TOutput extends IPromptOutput<any> = IPromptOutput<any>
> extends IPrompt<TInput, TOutput>, IPromptModelRequired {
  version: string;
  defaultModelName?: string;
  metadata: {
    created: string;
    lastModified: string;
  };
  configuration: {
    modelName: string;
    temperature: number;
    maxTokens: number;
    topP: number;
    frequencyPenalty: number;
    presencePenalty: number;
    stopSequences: string[];
  };
  outputType: 'structured' | 'plain';
  fileSystem: IPromptFileSystem;
  _isSaved: boolean;

  validateInput(input: TInput): boolean;
  validateOutput(output: TOutput): boolean;
  format(inputs: TInput): string;
  stream(inputs: TInput): Promise<IAsyncIterableStream<string>>;
  execute(inputs: TInput): Promise<TOutput>;
  updateMetadata(props: { metadata: Partial<IPromptModel['metadata']> }): void;
  getSummary(): string;
  save(): Promise<void>;
  load(props: { filePath: string }): Promise<void>;
  versions(): string[];
  switchVersion(props: { version: string }): void;
  get isSaved(): boolean;
  get inputZodSchema(): ZodObject<IPromptInput>;
  get outputZodSchema(): ZodObject<IPromptOutput>;
}

export interface IPromptModelStatic {
  loadPromptByName(name: string, fileSystem: IPromptFileSystem): Promise<IPromptModel>;
  promptExists(name: string, fileSystem: IPromptFileSystem): Promise<boolean>;
  listPrompts(category?: string, fileSystem?: IPromptFileSystem): Promise<string[]>;
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
interface IPromptManagerLibrary<TInput extends IPromptInput<any> = IPromptInput<any>, TOutput extends IPromptOutput<any> = IPromptOutput<any>> {
  /**
   * Asynchronously initializes the Prompt Manager.
   * This must be called before using any other methods.
   */
  initialize(props: {}): Promise<void>;

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
   * @param props An object containing the category, name of the prompt to update and the updates
   */
  updatePrompt(props: {
    category: string;
    name: string;
    updates: Partial<IPrompt<IPromptInput, IPromptOutput>>;
  }): Promise<void>;

  /**
   * Deletes a prompt.
   * @param props An object containing the category and name of the prompt to delete
   */
  deletePrompt(props: { category: string; name: string }): Promise<void>;

  /**
   * Lists all available prompts.
   * @param props An object containing an optional category to filter prompts
   */
  listPrompts(props: { category?: string }): Promise<IPrompt<IPromptInput, IPromptOutput>[]>;

  /**
   * Manages versions of a prompt.
   * @param props An object containing the version management action, category, prompt name, and optional version
   */
  versionPrompt(props: {
    action: 'list' | 'create' | 'switch';
    category: string;
    name: string;
    version?: string;
  }): Promise<void>;

  /**
   * Formats a prompt with given parameters.
   * @param props An object containing the category, prompt name, and parameters
   */
  formatPrompt(props: {
    category: string;
    name: string;
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
   * Deletes a prompt from the file system.
   * @param props An object containing the category and name of the prompt to delete.
   * @returns A promise that resolves when the prompt is deleted.
   */
  deletePrompt(props: { category: string; promptName: string }): Promise<void>;

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
  listPrompts(props?: { category?: string }): Promise<Array<{ name: string; category: string; filePath: string }>>;

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
  searchPrompts(props: { query: string }): Promise<Array<{ name: string; category: string; filePath: string }>>;

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

  /**
   * Deletes a prompt from the file system.
   * @param props An object containing the category and name of the prompt to delete.
   * @returns A promise that resolves when the prompt is deleted.
   */
  deletePrompt(props: { category: string; promptName: string }): Promise<void>;

  /**
   * Renames a prompt in the file system.
   * @param props An object containing the current category and name, and the new category and name.
   * @returns A promise that resolves when the prompt is renamed.
   */
  renamePrompt(props: {
    currentCategory: string;
    currentName: string;
    newCategory: string;
    newName: string
  }): Promise<void>;

  /**
   * Creates a new category in the file system.
   * @param props An object containing the name of the new category.
   * @returns A promise that resolves when the category is created.
   */
  createCategory(props: { categoryName: string }): Promise<void>;

  /**
   * Deletes a category and all its prompts from the file system.
   * @param props An object containing the name of the category to delete.
   * @returns A promise that resolves when the category and its prompts are deleted.
   */
  deleteCategory(props: { categoryName: string }): Promise<void>;
}

/**
 * Interface for managing the project configuration for the Prompt Manager.
 */
interface IPromptProjectConfigManager {
  /**
   * Initializes the configuration manager.
   * This should be called before using any other methods.
   */
  initialize(): Promise<void>;

  /**
   * Retrieves the entire configuration object.
   * @returns The complete configuration object.
   */
  getAllConfig(): Config;

  /**
   * Retrieves a specific configuration value.
   * @param key The configuration key to retrieve.
   * @returns The value of the specified configuration key.
   */
  getConfig<K extends keyof Config>(key: K): Config[K];

  /**
   * Updates the configuration with new values.
   * @param newConfig Partial configuration object with updated values.
   */
  updateConfig(newConfig: Partial<Config>): Promise<void>;
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

export interface IPromptManagerClientGenerator {
  generateClient(): Promise<void>;
  detectChanges(): Promise<boolean>;
}
