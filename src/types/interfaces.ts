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

/**
 * Represents the structure of a single prompt.
 */
interface Prompt<PromptInput, PromptOutput> {
  /** Unique identifier for the prompt */
  name: string;
  /** Category the prompt belongs to */
  category: string;
  /** Current version of the prompt */
  version: string;
  /** The actual content of the prompt */
  content: string;
  /** List of parameter names expected by the prompt */
  parameters: string[];
  /** Metadata associated with the prompt */
  metadata: {
    /** Brief description of the prompt's purpose */
    description: string;
    /** Timestamp of when the prompt was created */
    created: string;
    /** Timestamp of the last modification */
    lastModified: string;
  };
  /** List of all available versions for this prompt */
  versions: string[];

  /** Type of output expected from the model (structured or plain text) */
  outputType: 'structured' | 'plain';
  /** Default model name to use for this prompt */
  defaultModelName?: string;
  /** Optional list of models that can be used with this prompt */
  compatibleModels?: string[];
  /** Optional list of tags or keywords associated with this prompt */
  tags?: string[];

  /** Type of input expected by the prompt */
  input: PromptInput;
  /** Type of output expected by the prompt */
  output: PromptOutput;
  /** Function to format the prompt with given inputs */
  format: (inputs: PromptInput) => string;
}

/**
 * Defines the structure and behavior of the Prompt Manager CLI.
 */
interface PromptManagerCLI {
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
interface PromptCategory<T extends Record<string, Prompt<any, any>>> {
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
interface PromptManagerLibrary {
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
  getPrompt(category: string, name: string): Prompt<any, any>;

  /**
   * Creates a new prompt.
   * @param prompt The prompt to create
   */
  createPrompt(prompt: Omit<Prompt<any, any>, 'versions'>): Promise<void>;

  /**
   * Updates an existing prompt.
   * @param name Name of the prompt to update
   * @param updates Partial prompt object with updates
   */
  updatePrompt(name: string, updates: Partial<Prompt<any, any>>): Promise<void>;

  /**
   * Deletes a prompt.
   * @param name Name of the prompt to delete
   */
  deletePrompt(name: string): Promise<void>;

  /**
   * Lists all available prompts.
   * @param category Optional category to filter prompts
   */
  listPrompts(category?: string): Promise<Prompt<any, any>[]>;

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
    [category: string]: PromptCategory<Record<string, Prompt<any, any>>>;
  };
}

// Export the interfaces so they can be imported and used in other parts of the project
export {
  Prompt,
  PromptManagerCLI,
  PromptCategory,
  PromptManagerLibrary
};
