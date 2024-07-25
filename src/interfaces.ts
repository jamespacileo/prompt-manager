// This file contains TypeScript interfaces describing the user-facing CLI and library behavior.
// It serves as a single source of truth for the project's API.
// DO NOT DELETE THE COMMENTS IN THIS FILE.

/**
 * Represents the configuration options for the PromptManager.
 */
interface PromptManagerConfig {
  /**
   * The directory path where prompt files are stored.
   */
  promptsDir: string;

  /**
   * Optional custom file extension for prompt files (default is '.txt').
   */
  fileExtension?: string;
}

/**
 * Represents a single prompt with its content and formatting function.
 */
interface Prompt {
  /**
   * The raw content of the prompt.
   */
  content: string;

  /**
   * A function to format the prompt with given parameters.
   * @param params - An object containing key-value pairs for formatting the prompt.
   * @returns The formatted prompt string.
   */
  format: (params: Record<string, any>) => string;
}

/**
 * Represents the main PromptManager class that handles prompt operations.
 */
interface IPromptManager {
  /**
   * Initializes the PromptManager by loading prompts from the specified directory.
   * @returns A promise that resolves when initialization is complete.
   */
  initialize(): Promise<void>;

  /**
   * Retrieves a prompt by its category and name.
   * @param category - The category of the prompt.
   * @param promptName - The name of the prompt.
   * @returns The requested Prompt object.
   * @throws An error if the prompt doesn't exist.
   */
  getPrompt(category: string, promptName: string): Prompt;

  /**
   * Formats a prompt with given parameters.
   * @param category - The category of the prompt.
   * @param promptName - The name of the prompt.
   * @param params - An object containing key-value pairs for formatting the prompt.
   * @returns The formatted prompt string.
   * @throws An error if the prompt doesn't exist.
   */
  formatPrompt(category: string, promptName: string, params: Record<string, any>): string;
}

/**
 * Represents the CLI commands and their options.
 */
interface CLICommands {
  /**
   * Initializes a new project with prompt management capabilities.
   * @param projectName - The name of the project to create.
   * @param options - Additional options for project initialization.
   */
  init(projectName: string, options: { template?: string }): void;

  /**
   * Generates TypeScript code based on the prompts in the project.
   * @param options - Options for code generation.
   */
  generate(options: { output?: string }): void;

  /**
   * Adds a new prompt to the project.
   * @param category - The category for the new prompt.
   * @param promptName - The name of the new prompt.
   * @param content - The content of the new prompt.
   */
  add(category: string, promptName: string, content: string): void;

  /**
   * Lists all available prompts in the project.
   * @param options - Options for filtering and displaying prompts.
   */
  list(options: { category?: string }): void;
}

export {
  PromptManagerConfig,
  Prompt,
  IPromptManager,
  CLICommands
};
