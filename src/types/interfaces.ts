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

  // Static methods
  /**
   * Load a prompt by its name.
   * @param name The name of the prompt to load.
   */
  loadPromptByName(name: string): IPromptModel;

  /**
   * Validate the input against the prompt's input schema.
   * @param input The input to validate.
   */
  validateInput(input: IPromptInput): boolean;

  /**
   * Validate the output against the prompt's output schema.
   * @param output The output to validate.
   */
  validateOutput(output: IPromptOutput): boolean;

  /**
   * Check if a prompt with the given name already exists in storage.
   * @param name The name of the prompt to check.
   */
  _promptExists(name: string): boolean;

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
   * @param inputs The inputs to format the template with.
   */
  format(inputs: IPromptInput): string;

  /**
   * Submit a request to AI and stream the response.
   * @param inputs The inputs for the AI request.
   * @param onData Callback for handling streamed data.
   * @param onComplete Callback for handling completion of the stream.
   */
  stream(
    inputs: IPromptInput,
  ): Promise<IAsyncIterableStream<string>>;

  /**
   * Execute the prompt with the given inputs and return the output.
   * @param inputs The inputs for the prompt.
   */
  execute(inputs: IPromptInput): Promise<IPromptOutput>;

  /**
   * Update the metadata for the prompt.
   * @param metadata The new metadata for the prompt.
   */
  updateMetadata(metadata: Partial<IPromptModel['metadata']>): void;

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
   * @param filePath The path to the file to load the prompt from.
   */
  load(filePath: string): void;

  /**
   * Get all available stored versions of the prompt.
   */
  versions(): string[];

  /**
   * Move to a different version of the prompt.
   * @param version The version to switch to.
   */
  switchVersion(version: string): void;

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
   * @param name Name of the new prompt
   * @param options Additional options for prompt creation
   */
  create(name: string, options: {
    category?: string;
    content?: string;
    parameters?: string[];
    description?: string;
  }): Promise<void>;

  /**
   * Lists all available prompts.
   * @param options Filtering and display options
   */
  list(options?: {
    category?: string;
    format?: 'json' | 'table';
  }): Promise<void>;

  /**
   * Updates an existing prompt.
   * @param name Name of the prompt to update
   * @param options Update options
   */
  update(name: string, options: {
    content?: string;
    parameters?: string[];
    description?: string;
  }): Promise<void>;

  /**
   * Deletes a prompt.
   * @param name Name of the prompt to delete
   */
  delete(name: string): Promise<void>;

  /**
   * Manages versions of a prompt.
   * @param action Version management action
   * @param name Name of the prompt
   * @param version Version number (for switch action)
   */
  version(action: 'list' | 'create' | 'switch', name: string, version?: string): Promise<void>;

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
   * @param category Category of the prompt
   * @param name Name of the prompt
   */
  getPrompt(category: string, name: string): IPrompt<IPromptInput, IPromptOutput>;

  /**
   * Creates a new prompt.
   * @param prompt The prompt to create
   */
  createPrompt(prompt: Omit<IPrompt<IPromptInput, IPromptOutput>, 'versions'>): Promise<void>;

  /**
   * Updates an existing prompt.
   * @param name Name of the prompt to update
   * @param updates Partial prompt object with updates
   */
  updatePrompt(name: string, updates: Partial<IPrompt<IPromptInput, IPromptOutput>>): Promise<void>;

  /**
   * Deletes a prompt.
   * @param name Name of the prompt to delete
   */
  deletePrompt(name: string): Promise<void>;

  /**
   * Lists all available prompts.
   * @param category Optional category to filter prompts
   */
  listPrompts(category?: string): Promise<IPrompt<IPromptInput, IPromptOutput>[]>;

  /**
   * Manages versions of a prompt.
   * @param action Version management action
   * @param name Name of the prompt
   * @param version Version number (for switch action)
   */
  versionPrompt(action: 'list' | 'create' | 'switch', name: string, version?: string): Promise<void>;

  /**
   * Formats a prompt with given parameters.
   * @param category Category of the prompt
   * @param promptName Name of the prompt
   * @param params Object containing the required parameters
   */
  formatPrompt(category: string, promptName: string, params: Record<string, any>): string;

  /**
   * Access to prompt categories.
   * This allows for dynamic access to categories and prompts.
   */
  categories: {
    [category: string]: IPromptCategory<Record<string, IPrompt<IPromptInput, IPromptOutput>>>;
  };
}

// Export the interfaces so they can be imported and used in other parts of the project
export interface IPromptFileSystem {
  savePrompt(promptData: IPrompt<IPromptInput, IPromptOutput>): Promise<void>;
  loadPrompt(category: string, promptName: string): Promise<IPrompt<IPromptInput, IPromptOutput>>;
  promptExists(category: string, promptName: string): Promise<boolean>;
  listPrompts(category?: string): Promise<string[]>;
  listCategories(): Promise<string[]>;
  searchPrompts(query: string): Promise<Array<{ category: string; name: string }>>;
  searchCategories(query: string): Promise<string[]>;
  getPromptVersions(category: string, promptName: string): Promise<string[]>;
}

export type {
  IAsyncIterableStream,
  IPromptInput,
  IPromptOutput,
  IPrompt as Prompt,
  IPromptManagerCLI as PromptManagerCLI,
  IPromptCategory as PromptCategory,
  IPromptManagerLibrary as PromptManagerLibrary,
  IPromptFileSystem
};
