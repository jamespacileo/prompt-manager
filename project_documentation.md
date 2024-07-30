# Project Documentation

## Project Structure

```
./src
├── PromptManagerClientGenerator.ts
├── cli
│   ├── aiHelpers.ts
│   ├── atoms.ts
│   ├── cli_generate.ts
│   ├── commands.ts
│   ├── components
│   │   ├── prompt
│   │   ├── ui
│   │   └── utils
│   ├── screens
│   └── uiConfig.ts
├── config
│   ├── PromptProjectConfigManager.ts
│   └── constants.ts
├── config.ts
├── generated
│   ├── index.ts
│   └── promptManagerBase.ts
├── generated.ts
├── index.ts
├── initializationManager.ts
├── promptFileSystem.ts
├── promptManager.ts
├── promptModel.ts
├── promptModelService.ts
├── schemas
│   ├── config.ts
│   └── prompts.ts
├── scripts
│   └── generatePromptManager.ts
├── test
│   ├── PromptProjectConfigManager.test.d.ts
│   ├── PromptProjectConfigManager.test.ts
│   ├── __snapshots__
│   ├── commands.test.d.ts
│   ├── commands.test.ts
│   ├── index.test.d.ts
│   ├── index.test.ts
│   ├── promptFileSystem.test.d.ts
│   ├── promptFileSystem.test.ts
│   ├── promptManager.test.d.ts
│   ├── promptManager.test.ts
│   ├── promptManagerUtils.test.ts
│   ├── promptModel.test.d.ts
│   ├── promptModel.test.ts
│   ├── setup.d.ts
│   ├── setup.ts
│   ├── setupEnvs.d.ts
│   ├── setupEnvs.ts
│   ├── testsUnload.d.ts
│   └── testsUnload.ts
├── types
│   ├── index.ts
│   └── interfaces.ts
└── utils
    ├── __snapshots__
    ├── cache.ts
    ├── fileUtils.ts
    ├── jsonSchemaToZod.ts
    ├── logger.ts
    ├── promptManagerUtils.ts
    ├── typeGeneration.test.ts
    ├── typeGeneration.ts
    └── versionUtils.ts

16 directories, 50 files
```

## src/cli/cli.tsx

**Description:** No description available

```typescript
#!/usr/bin/env bun

import "reflect-metadata";

import { Container } from "typedi";
import { PromptFileSystem } from "../promptFileSystem";
import { PromptManager } from "../promptManager";
import PromptManagerUI from "./PromptManagerUI";
import { PromptProjectConfigManager } from "../config/PromptProjectConfigManager";
import React from "react";
import { logger } from "../utils/logger";
import { render } from "ink";

//you need this
process.stdin.resume();

async function ensureInitialized() {
  const configManager = Container.get(PromptProjectConfigManager);
  await configManager.initialize();
  const fileSystem = Container.get(PromptFileSystem);
  await fileSystem.initialize();
  const promptManager = Container.get(PromptManager);
  await promptManager.initialize();
  logger.info("Initialized");
}

async function main() {
  await ensureInitialized();
  const { waitUntilExit, clear } = render(<PromptManagerUI />);

  const cleanup = () => {
    clear();
    logger.info("Exiting gracefully...");
    process.exit(0);
  };

  process.on("SIGINT", cleanup);
  process.on("SIGTERM", cleanup);

  try {
    await waitUntilExit();
  } finally {
    cleanup();
  }
}

await main().catch((error) => {
  console.error("An error occurred:", error);
  process.exit(1);
});
// await ensureInitialized();
// render(<PromptManagerUI />);

```

## src/types/interfaces.ts

**Description:** No description available

```typescript
import type { JSONSchema7 } from 'json-schema';
import { ZodObject, ZodType } from 'zod';
import { Config } from '../schemas/config';
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
 * Represents the input structure for a prompt.
 * This can be extended to include any key-value pairs.
 */
type IPromptInput<T extends Record<string, any> = Record<string, any>> = T;

/**
 * Represents the output structure for a prompt.
 * This can be extended to include any key-value pairs.
 */
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
  /** Configuration for the AI model */
  configuration: {
    modelName: string;
    temperature: number;
    maxTokens: number;
    topP: number;
    frequencyPenalty: number;
    presencePenalty: number;
    stopSequences: string[];
  };
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
    author?: string;
    sourceName?: string;
    sourceUrl?: string;
    license?: string;
  };
  defaultModelName?: string;
}

export interface IPromptModel<
  TInput extends IPromptInput<any> = IPromptInput<any>,
  TOutput extends IPromptOutput<any> = IPromptOutput<any>
> extends Omit<IPrompt<TInput, TOutput>, 'inputSchema' | 'outputSchema'>, IPromptModelRequired {
  version: string;
  defaultModelName?: string;
  metadata: {
    created: string;
    lastModified: string;
    author?: string;
    sourceName?: string;
    sourceUrl?: string;
    license?: string;
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
  // fileSystem: IPromptFileSystem;
  isLoadedFromStorage: boolean;
  filePath?: string | undefined | null;

  validateInput(input: TInput): boolean;
  validateOutput(output: TOutput): boolean;
  format(inputs: TInput): string;
  stream(inputs: TInput): Promise<IAsyncIterableStream<string>>;
  execute(inputs: TInput): Promise<TOutput>;
  updateMetadata(metadata: Partial<IPromptModel['metadata']>): void;
  updateConfiguration(config: Partial<IPromptModel['configuration']>): void;
  getSummary(): string;
  save(): Promise<void>;
  load(filePath: string): Promise<void>;
  versions(): Promise<string[]>;
  switchVersion(version: string): Promise<void>;
  get isSaved(): boolean;
  get inputZodSchema(): ZodType<any>;
  get outputZodSchema(): ZodType<any>;
}

export interface IPromptModelStatic {
  loadPromptByName(name: string, fileSystem: IPromptFileSystem): Promise<IPromptModel>;
  promptExists(name: string, fileSystem: IPromptFileSystem): Promise<boolean>;
  listPrompts(category?: string, fileSystem?: IPromptFileSystem): Promise<Array<{ name: string; category: string; filePath: string }>>;
  deletePrompt(category: string, name: string, fileSystem?: IPromptFileSystem): Promise<void>;
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
   * Load all prompts from the file system.
   */
  loadPrompts(): Promise<void>;

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
  listPrompts(props: { category?: string }): Promise<IPromptModel<IPromptInput, IPromptOutput>[]>;

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

  /**
   * Checks if a prompt exists.
   * @param props An object containing the category and name of the prompt
   */
  promptExists(props: { category: string; name: string }): Promise<boolean>;

  /**
   * Creates a new category.
   * @param categoryName The name of the category to create
   */
  createCategory(categoryName: string): Promise<void>;

  /**
   * Deletes a category.
   * @param categoryName The name of the category to delete
   */
  deleteCategory(categoryName: string): Promise<void>;

  /**
   * Lists all categories.
   */
  listCategories(): Promise<string[]>;

  /**
   * Executes a prompt with given parameters.
   * @param props An object containing the category, prompt name, and parameters
   */
  executePrompt(props: { category: string; name: string; params: TInput }): Promise<TOutput>;
}

// Export the interfaces so they can be imported and used in other parts of the project
interface IPromptFileSystem {

  /**
   * Checks if the PromptFileSystem has been initialized.
   * @returns A boolean indicating whether the PromptFileSystem is initialized.
   */
  isInitialized(): boolean;

  /**
   * Gets the file path for a prompt.
   * @param props An object containing the category and name of the prompt.
   * @returns The file path for the prompt.
   */
  getFilePath(props: { category: string; promptName: string }): string;

  /**
   * Gets the file path for a specific version of a prompt.
   * @param props An object containing the category, name, and version of the prompt.
   * @returns The file path for the specific version of the prompt.
   */
  getVersionFilePath(props: { category: string; promptName: string; version: string }): string;

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
  listPrompts(props?: { category?: string }): Promise<Array<IPromptModel>>;

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
  searchPrompts(props: { query: string }): Promise<Array<IPromptModel>>;

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

  /**
   * Loads a specific version of a prompt from the file system.
   * @param props An object containing the category, name, and version of the prompt to load.
   * @returns A promise that resolves with the loaded prompt data for the specified version.
   */
  loadPromptVersion(props: { category: string; promptName: string; version: string }): Promise<IPrompt<IPromptInput, IPromptOutput>>;
  getCurrentVersion(prompt: IPrompt<IPromptInput, IPromptOutput>): Promise<string>;
}

/**
 * Interface for managing the project configuration for the Prompt Manager.
 */
interface IPromptProjectConfigManager {

  /**
   * Checks if the configuration manager has been initialized.
   * @returns A boolean indicating whether the configuration manager is initialized.
   */
  isInitialized(): Promise<boolean>;

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

  /**
   * Retrieves the base path for the project.
   * @returns The base path string.
   */
  getBasePath(): string;

  /**
   * Sets the verbosity level for the configuration manager.
   * @param level The verbosity level to set.
   */
  setVerbosity(level: number): void;

  /**
   * Gets the current verbosity level.
   * @returns The current verbosity level.
   */
  getVerbosity(): number;
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

export interface IPromptsFolderConfig {
  version: string;
  lastUpdated: string;
  promptCount: number;
}

```

## src/cli/PromptManagerUI.tsx

**Description:** No description available

```typescript
import React, { FC, useEffect } from "react";
import chalk from "chalk";
import { Box, Text, useApp, useInput } from "ink";
import { useAtom } from "jotai";
import Layout from "./components/ui/Layout";
import { logger } from "../utils/logger";
import { currentScreenAtom, selectedPromptAtom } from "./atoms";
import Footer from "./components/ui/Footer";
import Header from "./components/ui/Header";
import AlertMessage from "./components/ui/AlertMessage";
import HomeScreen from "./screens/HomeScreen";
import PromptCreateScreen from "./screens/PromptCreateScreen";
import PromptDetailScreen from "./screens/PromptDetailScreen";
import PromptListScreen from "./screens/PromptListScreen";
import StatusScreen from "./screens/StatusScreen";
import HelpScreen from "./screens/HelpScreen";
import PromptAmendScreen from "./screens/PromptAmendScreen";

const PromptManagerUI: FC = () => {
  const { exit } = useApp();
  const [currentScreen, setCurrentScreen] = useAtom(currentScreenAtom);
  const [selectedPrompt] = useAtom(selectedPromptAtom);

  useEffect(() => {
    const cleanup = () => {
      logger.info("Cleaning up...");
    };
    return cleanup;
  }, []);

  useInput((input, key) => {
    if (key.escape) {
      if (currentScreen !== "home") {
        setCurrentScreen("home");
      } else {
        exit();
      }
    }
  });

  const screenComponents = {
    home: <HomeScreen onNavigate={setCurrentScreen} />,
    list: <PromptListScreen />,
    detail: selectedPrompt ? (
      <PromptDetailScreen
        prompt={selectedPrompt}
        onBack={() => setCurrentScreen("list")}
      />
    ) : (
      <Text>No prompt selected. Please select a prompt from the list.</Text>
    ),
    create: <PromptCreateScreen />,
    status: <StatusScreen />,
    help: <HelpScreen />,
    amend: <PromptAmendScreen />,
  };

  const renderScreen = () =>
    screenComponents[currentScreen as keyof typeof screenComponents] ?? (
      <Text>Screen not found</Text>
    );

  return (
    <Layout>
      <Header title={`Prompt Manager - ${chalk.green(currentScreen)}`} />
      <Box flexGrow={1} flexDirection="column">
        {renderScreen()}
      </Box>
      <Footer>
        <Text>Press 'Esc' to go back, 'q' to quit</Text>
      </Footer>
    </Layout>
  );
};

export default PromptManagerUI;

```

## src/cli/screens/HomeScreen.tsx

**Description:** No description available

```typescript
import React, { FC } from "react";
import { Box, Text } from "ink";
import { ScreenWrapper } from "../components/utils/ScreenWrapper";
import { PaginatedList } from "../components/utils/PaginatedList";
import { THEME_COLORS } from "../uiConfig";

interface HomeScreenProps {
  onNavigate?: (screen: string) => void;
}

const menuItems = [
  { key: "l", name: "List Prompts", screen: "list" },
  { key: "c", name: "Create New Prompt", screen: "create" },
  { key: "s", name: "Status", screen: "status" },
  { key: "h", name: "Help", screen: "help" },
  { key: "q", name: "Quit", screen: "quit" },
];

const HomeScreen: FC<HomeScreenProps> = ({ onNavigate }) => {
  const handleSelectItem = (item: typeof menuItems[0]) => {
    if (item.screen === "quit") {
      process.exit(0);
    } else {
      void onNavigate?.(item.screen);
    }
  };

  const renderMenuItem = (item: typeof menuItems[0], index: number, isSelected: boolean) => (
    <Box>
      <Text color={isSelected ? THEME_COLORS.primary : THEME_COLORS.text}>
        {item.key}: {item.name}
      </Text>
    </Box>
  );

  return (
    <ScreenWrapper title="Welcome to Prompt Manager">
      <Box flexDirection="column">
        <Text bold>Welcome to Prompt Manager</Text>
        <Text>Use arrow keys to navigate, Enter to select</Text>
        <PaginatedList
          items={menuItems}
          itemsPerPage={menuItems.length}
          renderItem={renderMenuItem}
          onSelectItem={handleSelectItem}
        />
      </Box>
    </ScreenWrapper>
  );
};

export default HomeScreen;

```

## src/cli/screens/PromptCreateScreen.tsx

**Description:** No description available

```typescript
import { Box, Text, useInput } from "ink";
import React, { FC, useCallback, useState } from "react";

import { AsyncInputHandler } from "../components/utils/AsyncInputHandler";
import { ConfirmationDialog } from "../components/utils/ConfirmationDialog";
import FireSpinner from "../components/ui/FireSpinner";
import { IPromptModel } from "../../types/interfaces";
import PromptView from "../components/prompt/PromptView";
import { ScreenWrapper } from "../components/utils/ScreenWrapper";
import { THEME_COLORS } from "../uiConfig";
import { createPrompt } from "../commands";
import { currentScreenAtom } from "../atoms";
import { generatePromptWithAI } from "../aiHelpers";
import { useAtom } from "jotai";

const PromptCreateScreen: FC = () => {
  const [, setCurrentScreen] = useAtom(currentScreenAtom);
  const [generatedPrompt, setGeneratedPrompt] =
    useState<Partial<IPromptModel> | null>(null);
  const [status, setStatus] = useState<"input" | "confirm" | "amend">("input");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onAiSubmitSuccess = useCallback(
    async (promptData: Partial<IPromptModel>) => {
      setGeneratedPrompt(promptData);
      setStatus("confirm");
    },
    [],
  );

  const onAiSubmitRequest = useCallback(async (description: string) => {
    try {
      const promptData = await generatePromptWithAI(description);
      return promptData;
    } catch (error) {
      console.error("Error generating prompt:", error);
      setError("Failed to generate prompt. Please try again.");
    }
  }, []);

  const handleSave = useCallback(async () => {
    if (generatedPrompt) {
      setIsLoading(true);
      setError(null);
      try {
        await createPrompt(generatedPrompt);
        setCurrentScreen("list");
      } catch (error) {
        console.error("Error saving prompt:", error);
        setError("Failed to save prompt. Please try again.");
      } finally {
        setIsLoading(false);
      }
    }
  }, [generatedPrompt, setCurrentScreen]);

  useInput((input) => {
    if (status === "confirm") {
      if (input === "q") setCurrentScreen("list");
      if (input === "s") handleSave();
      if (input === "a") setStatus("amend");
    }
  });

  const renderContent = () => {
    if (isLoading) {
      return <FireSpinner label="Processing..." />;
    }

    if (error) {
      return (
        <Box flexDirection="column">
          <Text color={THEME_COLORS.error}>{error}</Text>
          <Text>Press any key to continue</Text>
        </Box>
      );
    }

    switch (status) {
      case "input":
        return (
          <Box flexDirection="column">
            <Text color={THEME_COLORS.primary}>
              Enter a description of the prompt you want:
            </Text>
            <AsyncInputHandler<IPromptModel>
              onSubmit={onAiSubmitRequest}
              onSuccess={onAiSubmitSuccess}
              placeholder="Enter a description of the prompt you want"
              errorMessage="Failed to generate prompt. Please try again."
            />
          </Box>
        );
      case "confirm":
        if (!generatedPrompt) {
          return <Text>No prompt generated</Text>;
        }
        return (
          <Box flexDirection="column">
            <Text bold color={THEME_COLORS.primary}>
              Generated Prompt:
            </Text>
            <PromptView prompt={generatedPrompt} />
            <ConfirmationDialog
              message="Do you want to save this prompt?"
              onConfirm={handleSave}
              onCancel={() => setStatus("amend")}
            />
          </Box>
        );
      case "amend":
        return (
          <Box flexDirection="column">
            <Text color={THEME_COLORS.primary}>
              Enter additional instructions to refine the prompt:
            </Text>
            <AsyncInputHandler<IPromptModel>
              onSubmit={onAiSubmitRequest}
              onSuccess={onAiSubmitSuccess}
              placeholder="Enter additional instructions to refine the prompt"
              errorMessage="Failed to generate prompt. Please try again."
            />
          </Box>
        );
    }
  };

  return (
    <ScreenWrapper title="Create New Prompt">
      <Text bold color={THEME_COLORS.heading}>
        Create New Prompt
      </Text>
      {renderContent()}
    </ScreenWrapper>
  );
};

export default PromptCreateScreen;

```

## src/cli/screens/PromptDetailScreen.tsx

**Description:** No description available

```typescript
import React, { useState, useEffect } from "react";
import { Box, Text, Newline, useInput } from "ink";
import {
  getPromptDetails,
  amendPrompt,
  deletePrompt,
  listPromptVersions,
  switchPromptVersion,
  getGeneratedTypeScript,
} from "../commands";
import chalk from "chalk";
import FireSpinner from "../components/ui/FireSpinner";
import { ScreenWrapper } from "../components/utils/ScreenWrapper";
import PromptView from "../components/prompt/PromptView";
import { ConfirmationDialog } from "../components/utils/ConfirmationDialog";
import { useAtom } from "jotai";
import { IPrompt } from "../../types/interfaces";
import { currentScreenAtom, alertMessageAtom } from "../atoms";

interface PromptDetailScreenProps {
  prompt: { category: string; name: string };
  onBack: () => void;
}

const PromptDetailScreen: React.FC<PromptDetailScreenProps> = ({
  prompt,
  onBack,
}) => {
  const [details, setDetails] = useState<Partial<IPrompt<any, any>> | null>(null);
  const [comparisonVersion, setComparisonVersion] = useState<Partial<IPrompt<any, any>> | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [versions, setVersions] = useState<string[]>([]);
  const [currentVersion, setCurrentVersion] = useState<string>("");
  const [currentVersionIndex, setCurrentVersionIndex] = useState<number>(0);
  const [, setCurrentScreen] = useAtom(currentScreenAtom);
  const [, setAlertMessage] = useAtom(alertMessageAtom);
  const [generatedTypeScript, setGeneratedTypeScript] = useState<string | null>(null);
  const [showTypeScript, setShowTypeScript] = useState(false);

  useEffect(() => {
    getPromptDetails({ category: prompt.category, name: prompt.name }).then(setDetails);
    listPromptVersions({ category: prompt.category, name: prompt.name }).then((versions) => {
      setVersions(versions);
      setCurrentVersion(versions[versions.length - 1]);
      setCurrentVersionIndex(versions.length - 1);
    });
    getGeneratedTypeScript({ category: prompt.category, name: prompt.name }).then(setGeneratedTypeScript);
  }, [prompt.category, prompt.name]);

  useInput((input, key) => {
    if (input === "b" || key.escape) {
      onBack();
    } else if (input === "a") {
      setCurrentScreen("amend");
    } else if (input === "d") {
      setIsDeleting(true);
    } else if (isDeleting && input === "y") {
      deletePrompt({ category: prompt.category, name: prompt.name }).then(() => setCurrentScreen("list"));
    } else if (isDeleting && input === "n") {
      setIsDeleting(false);
    } else if (key.leftArrow || key.rightArrow) {
      const newIndex = (currentVersionIndex + (key.leftArrow ? -1 : 1) + versions.length) % versions.length;
      setCurrentVersionIndex(newIndex);
      getPromptDetails({ category: prompt.category, name: prompt.name, version: versions[newIndex] }).then(setComparisonVersion);
    } else if (input === "v") {
      switchPromptVersion({
        category: prompt.category,
        name: prompt.name,
        version: versions[currentVersionIndex],
      }).then(() => {
        setDetails(comparisonVersion);
        setComparisonVersion(null);
        setCurrentVersion(versions[currentVersionIndex]);
        setAlertMessage(`Version changed to ${versions[currentVersionIndex]}`);
        setTimeout(() => setAlertMessage(null), 3000);
      });
    } else if (input === "t") {
      setShowTypeScript(!showTypeScript);
    }
  });

  if (!details) {
    return <FireSpinner label="Loading prompt details..." />;
  }

  return (
    <ScreenWrapper title="Prompt Details">
      <Text bold color="cyan">
        {showTypeScript ? "Generated TypeScript" : "Prompt Details"}
      </Text>
      <Newline />
      <Box flexDirection="column">
        <Text bold>Current Version: {currentVersion}</Text>
        {showTypeScript ? (
          <Box flexDirection="column" marginY={1}>
            <Text bold>Generated TypeScript:</Text>
            <Box marginLeft={2}>
              <Text>{generatedTypeScript}</Text>
            </Box>
          </Box>
        ) : (
            <Box flexDirection="row">
              <Box width="50%">
                <PromptView prompt={details} />
              </Box>
              {comparisonVersion && (
                <Box width="50%" marginLeft={2} flexDirection="column">
                  <Text bold>Comparison Version:</Text>
                  <PromptView prompt={comparisonVersion} />
                </Box>
              )}
            </Box>
        )}
      </Box>
      <Newline />
      <Text>
        Press {chalk.bold.yellow("b")} to go back, {chalk.bold.yellow("a")} to amend,{" "}
        {chalk.bold.yellow("d")} to delete, {chalk.bold.yellow("v")} to set current version,{" "}
        {chalk.bold.yellow("t")} to toggle TypeScript view
      </Text>
      {isDeleting && (
        <ConfirmationDialog
          message="Are you sure you want to delete this prompt?"
          onConfirm={() =>
            deletePrompt({ category: prompt.category, name: prompt.name }).then(() => setCurrentScreen("list"))
          }
          onCancel={() => setIsDeleting(false)}
        />
      )}
      <Box marginTop={1} flexDirection="column">
        <Text>Versions: {versions.length}</Text>
        <Text>
          {versions
            .map((version, index) =>
              index === currentVersionIndex ? chalk.green(`[${version}]`) : chalk.gray(version)
            )
            .join(" ")}
        </Text>
        <Text>Use {chalk.bold.yellow("←")} {chalk.bold.yellow("→")} arrow keys to switch versions</Text>
      </Box>
    </ScreenWrapper>
  );
};

export default PromptDetailScreen;

```

## src/cli/screens/PromptListScreen.tsx

**Description:** No description available

```typescript
import React, { useState, useEffect, useCallback } from "react";
import { Box, Text, useInput } from "ink";
import TextInput from "ink-text-input";
import { useAtom } from "jotai";
import FireSpinner from "../components/ui/FireSpinner";
import { ScreenWrapper } from "../components/utils/ScreenWrapper";
import { THEME_COLORS } from "../uiConfig";
import { IPromptModel } from "../../types/interfaces";
import { currentScreenAtom, selectedPromptAtom } from "../atoms";
import { listPrompts } from "../commands";
import InteractiveElement from "../components/ui/InteractiveElement";
import { PaginatedList } from "../components/utils/PaginatedList";

const ITEMS_PER_PAGE = 10;

const PromptListScreen: React.FC = () => {
  const [prompts, setPrompts] = useState<Partial<IPromptModel>[]>([]);
  const [loading, setLoading] = useState(true);
  const [, setCurrentScreen] = useAtom(currentScreenAtom);
  const [, setSelectedPrompt] = useAtom(selectedPromptAtom);
  const [searchMode, setSearchMode] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const fetchPrompts = async () => {
      const fetchedPrompts = await listPrompts();
      setPrompts(fetchedPrompts);
      setLoading(false);
    };
    fetchPrompts();
  }, []);

  const filteredPrompts = prompts.filter(
    (prompt) =>
      prompt.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      prompt.category?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const handleSelectPrompt = useCallback(
    (prompt: IPromptModel) => {
      setSelectedPrompt(prompt);
      setCurrentScreen("detail");
    },
    [setSelectedPrompt, setCurrentScreen],
  );

  const renderPrompt = useCallback(
    (prompt: IPromptModel, index: number, isSelected: boolean) => (
      <Box>
        <Box width={3} marginRight={1}>
          <Text color={isSelected ? THEME_COLORS.primary : THEME_COLORS.secondary}>{index + 1}</Text>
        </Box>
        <Box width={20} marginRight={1}>
          <Text color={isSelected ? THEME_COLORS.primary : THEME_COLORS.text}>{prompt.category}</Text>
        </Box>
        <Box width={30} marginRight={1}>
          <InteractiveElement isSelected={isSelected}>
            <Text color={isSelected ? THEME_COLORS.primary : THEME_COLORS.text}>{prompt.name}</Text>
          </InteractiveElement>
        </Box>
        <Box width={10} marginRight={1}>
          <Text color={isSelected ? THEME_COLORS.primary : THEME_COLORS.secondary}>v{prompt.version}</Text>
        </Box>
        {/* <Box width={10}>
        <StatusIndicator status={prompt.isActive ? 'active' : 'inactive'} />
      </Box> */}
      </Box>
    ),
    [],
  );

  useInput((input, key) => {
    if (searchMode && key.escape) {
      setSearchMode(false);
      setSearchTerm("");
    } else if (!searchMode && input === "s") {
      setSearchMode(true);
    }
  });

  if (loading) {
    return (
      <Box>
        <FireSpinner label="Loading prompts" />
      </Box>
    );
  }

  return (
    <ScreenWrapper title="Prompt List">
      <Box flexDirection="column">
        <Text bold color={THEME_COLORS.heading}>
          Prompt List
        </Text>
        {searchMode ? (
          <TextInput
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Search prompts..."
          />
        ) : (
          <Text color={THEME_COLORS.text}>Press (S) to search</Text>
        )}
        <Box flexDirection="column" marginY={1}>
          <Box>
            <Box width={3} marginRight={1}>
              <Text bold color={THEME_COLORS.heading}>
                #
              </Text>
            </Box>
            <Box width={20} marginRight={1}>
              <Text bold color={THEME_COLORS.heading}>
                Category
              </Text>
            </Box>
            <Box width={30} marginRight={1}>
              <Text bold color={THEME_COLORS.heading}>
                Name
              </Text>
            </Box>
            <Box width={10} marginRight={1}>
              <Text bold color={THEME_COLORS.heading}>
                Version
              </Text>
            </Box>
            <Box width={10}>
              <Text bold color={THEME_COLORS.heading}>
                Status
              </Text>
            </Box>
          </Box>
          <PaginatedList
            items={filteredPrompts as IPromptModel[]}
            itemsPerPage={ITEMS_PER_PAGE}
            renderItem={renderPrompt}
            onSelectItem={handleSelectPrompt}
          />
        </Box>
      </Box>
    </ScreenWrapper>
  );
};

export default PromptListScreen;

```

## src/cli/screens/StatusScreen.tsx

**Description:** No description available

```typescript
import { Box, Text, useInput } from "ink";
import React, { useEffect, useState } from "react";

import FireSpinner from "../components/ui/FireSpinner";
import { ScreenWrapper } from "../components/utils/ScreenWrapper";
import { currentScreenAtom } from "../atoms";
import { getStatus } from "../commands";
import { useAtom } from "jotai";

const StatusScreen: React.FC = () => {
  const [, setCurrentScreen] = useAtom(currentScreenAtom);
  const [status, setStatus] = useState<any>(null);

  useEffect(() => {
    getStatus().then(setStatus);
  }, []);

  useInput(() => {
    setCurrentScreen("home");
  });

  if (!status) {
    return <FireSpinner label="Loading status..." />;
  }

  return (
    <ScreenWrapper title="Prompt Manager Status">
      <Text bold>Prompt Manager Status</Text>
      <Text>Total Prompts: {status.totalPrompts}</Text>
      <Text>Categories: {status.categories.join(", ")}</Text>
      <Text>Last Generated: {status.lastGenerated ?? "Never"}</Text>
      {status.warnings.map((warning: string, index: number) => (
        <Text key={index} color="yellow">{warning}</Text>
      ))}
      <Text>Press any key to go back</Text>
    </ScreenWrapper>
  );
};

export default StatusScreen;

```

## src/cli/components/ui/ContentWrapper.tsx

**Description:** No description available

```typescript
import { Box, BoxProps } from "ink";

import React from "react";

interface ContentWrapperProps extends BoxProps {
  borderColor?: string;
  children: React.ReactNode;
}

const ContentWrapper: React.FC<ContentWrapperProps> = ({
  children,
  borderColor = "blue",
  ...props
}) => {
  return (
    <Box
      borderStyle="round"
      borderTop={true}
      flexDirection="column"
      borderColor={borderColor}
      padding={1}
      {...props}
    >
      {children}
    </Box>
  );
};

export default ContentWrapper;

```

## src/cli/components/ui/FireSpinner.tsx

**Description:** No description available

```typescript
import React, { useState } from "react";
import { Text, useStdout } from "ink";

import { useInterval } from "react-use";

const fireFrames = ["🔥", "🔶", "🔸"];
const fireColors = ["#FF4500", "#FFA500", "#FFD700"];

const FireSpinner: React.FC<{ label?: string }> = ({ label = "Loading" }) => {
  const [frame, setFrame] = useState(0);
  const [colorIndex, setColorIndex] = useState(0);
  const { write } = useStdout();

  useInterval(() => {
    setFrame((prevFrame) => (prevFrame + 1) % fireFrames.length);
    setColorIndex((prevIndex) => (prevIndex + 1) % fireColors.length);
    write("\r"); // Move cursor to the beginning of the line
  }, 100);

  return (
    <Text color={fireColors[colorIndex]}>
      {fireFrames[frame]} {label}
    </Text>
  );
};

export default FireSpinner;

```

## src/cli/components/ui/Footer.tsx

**Description:** No description available

```typescript
import React, { ReactNode } from "react";

import { Box } from "ink";

interface FooterProps {
  children: ReactNode;
}

const Footer: React.FC<FooterProps> = ({ children }) => (
  <Box borderStyle="single" borderColor="blue" paddingX={1}>
    {children}
  </Box>
);

export default Footer;

```

## src/cli/components/ui/Header.tsx

**Description:** No description available

```typescript
import { Box, Text } from "ink";

import FireSpinner from "./FireSpinner";
import React from "react";
import chalk from "chalk";

const Header: React.FC<{ title: string }> = ({ title }) => (
  <Box width="100%" borderColor="#ea580c" borderStyle="round" paddingX={1}>
    <Box
      flexDirection="column"
      justifyContent="center"
      alignItems="center"
      width="100%"
      flexGrow={1}
      gap={1}
    >
      <Text>🔥 {title} 🔥</Text>
      <Text color="grey">
        Lorem ipsum dolor sit amet, consectetur adipiscing elit.
      </Text>
    </Box>
  </Box>
);

export default Header;

```

## src/cli/components/ui/InteractiveElement.tsx

**Description:** No description available

```typescript
import { Text, TextProps } from "ink";
import React from "react";
import { THEME_COLORS } from "../../uiConfig";

interface InteractiveElementProps extends TextProps {
  isSelected?: boolean;
}

const InteractiveElement: React.FC<InteractiveElementProps> = ({ children, isSelected, ...props }) => {
  return (
    <Text
      color={isSelected ? THEME_COLORS.primary : THEME_COLORS.text}
      backgroundColor={isSelected ? THEME_COLORS.highlight : undefined}
      bold={isSelected}
      {...props}
    >
      {children}
    </Text>
  );
};

export default InteractiveElement;

```

## src/cli/components/ui/Layout.tsx

**Description:** No description available

```typescript
import React, { ReactNode } from "react";
import { Box } from "ink";
import AlertMessage from "./AlertMessage";

interface LayoutProps {
  children: ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => (
  <Box flexDirection="column" height="100%" width="100%" padding={1}>
    <AlertMessage />
    {children}
  </Box>
);

export default Layout;

```

## src/cli/components/ui/Navigation.tsx

**Description:** No description available

```typescript
import { Box, Text } from "ink";
import React, { FC } from "react";

import { currentScreenAtom } from "../../atoms";
import { logger } from "../../../utils/logger";
import { useAtom } from "jotai";
import { useInput } from "ink";

interface NavigationProps {
  onNavigate: (screen: string) => void;
}

const Navigation: FC<NavigationProps> = ({ onNavigate }) => {
  const [currentScreen, setCurrentScreen] = useAtom(currentScreenAtom);
  const isHome = currentScreen === "home";
  const isList = currentScreen === "list";
  const isCreate = currentScreen === "create";
  const isStatus = currentScreen === "status";

  useInput((input, key) => {
    console.log("Navigation useInput:", input, key);
    console.log(`isHome: ${isHome}`);
    if (!isHome) {
      return;
    }
    if (input === "q") {
      process.exit(0);
    }
    switch (input) {
      case "h":
        void onNavigate("home");
        break;
      case "l":
        void onNavigate("list");
        break;
      case "c":
        void onNavigate("create");
        break;
      case "s":
        void onNavigate("status");
        break;
    }
  });

  return (
    <Box>
      <Text>Home (h)</Text>
      <Text> | </Text>
      <Text>List (l)</Text>
      <Text> | </Text>
      <Text>Create (c)</Text>
      <Text> | </Text>
      <Text>Status (s)</Text>
    </Box>
  );
};

export default Navigation;

```

## src/cli/components/ui/ScreenHeader.tsx

**Description:** No description available

```typescript
import { Box, Text } from "ink";

import React from "react";
import { currentScreenAtom } from "../../atoms";
import { useAtom } from "jotai";

interface ScreenHeaderProps {
  subtitle?: string;
  title?: string;
}

const ScreenHeader: React.FC<ScreenHeaderProps> = ({
  subtitle,
  title = "No title",
}) => {
  const [currentScreen] = useAtom(currentScreenAtom);

  return (
    <Box flexDirection="row" alignItems="center" paddingLeft={1}>
      <Text bold color="cyan">
        {title}
      </Text>
      {subtitle && <Text color="gray">| {subtitle}</Text>}
    </Box>
  );
};

export default ScreenHeader;

```

## src/cli/components/ui/Spinner.tsx

**Description:** No description available

```typescript
import { useEffect, useState } from "react";

import { MAIN_TERM_COLOR } from "../../uiConfig";
import React from "react";
import { Text } from "ink";

const frames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

interface SpinnerProps {
  label?: string;
}

const Spinner: React.FC<SpinnerProps> = ({ label = "Loading..." }) => {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setFrame((previousFrame) => (previousFrame + 1) % frames.length);
    }, 80);

    return () => {
      clearInterval(timer);
    };
  }, []);

  return (
    <Text color={MAIN_TERM_COLOR}>
      {frames[frame]} {label}
    </Text>
  );
};

export default Spinner;

```

## src/cli/components/ui/StatusIndicator.tsx

**Description:** No description available

```typescript
import React from "react";
import { Text } from "ink";

interface StatusIndicatorProps {
  status: "active" | "inactive" | "warning";
}

const StatusIndicator: React.FC<StatusIndicatorProps> = ({ status }) => {
  const color = {
    active: "green",
    inactive: "gray",
    warning: "yellow",
  }[status];

  return <Text color={color}>●</Text>;
};

export default StatusIndicator;

```

## src/cli/components/utils/AsyncInputHandler.tsx

**Description:** No description available

```typescript
import { Box, Text } from "ink";

import TextInput from "ink-text-input";
import { useState } from "react";

interface AsyncInputHandlerProps<T> {
  onSubmit: (value: string) => Promise<T>;
  onSuccess: (result: T) => void;
  placeholder?: string;
  errorMessage?: string;
}

export const AsyncInputHandler = <T,>({
  onSubmit,
  onSuccess,
  placeholder,
  errorMessage,
}: AsyncInputHandlerProps<T>) => {
  const [value, setValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await onSubmit(value);
      onSuccess(result);
    } catch (err) {
      setError(errorMessage || "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box flexDirection="column">
      <TextInput
        value={value}
        onChange={setValue}
        onSubmit={handleSubmit}
        placeholder={placeholder}
      />
      {isLoading && <Text>Loading...</Text>}
      {error && <Text color="red">{error}</Text>}
    </Box>
  );
};

```

## src/cli/components/utils/ConfirmationDialog.tsx

**Description:** No description available

```typescript
import { Box, Text, useInput } from "ink";

interface ConfirmationDialogProps {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  message,
  onConfirm,
  onCancel,
}) => {
  useInput((input) => {
    if (input === "y") {
      onConfirm();
    } else if (input === "n") {
      onCancel();
    }
  });

  return (
    <Box flexDirection="column">
      <Text color="yellow">{message}</Text>
      <Text>Press (Y) to confirm or (N) to cancel</Text>
    </Box>
  );
};

```

## src/cli/components/utils/KeyboardShortcuts.tsx

**Description:** No description available

```typescript
import { Box, Text, useInput } from "ink";

import chalk from "chalk";

interface Shortcut {
  key: string;
  description: string;
  action: () => void;
}

interface KeyboardShortcutsProps {
  shortcuts: Shortcut[];
}

export const KeyboardShortcuts: React.FC<KeyboardShortcutsProps> = ({
  shortcuts,
}) => {
  useInput((input) => {
    const shortcut = shortcuts.find((s) => s.key === input);
    if (shortcut) {
      shortcut.action();
    }
  });

  return (
    <Box flexDirection="column">
      {shortcuts.map((shortcut, index) => (
        <Text key={index}>
          Press {chalk.bold(shortcut.key)} to {shortcut.description}
        </Text>
      ))}
    </Box>
  );
};

```

## src/cli/components/utils/PaginatedList.tsx

**Description:** No description available

```typescript
import { Box, Text, useInput } from "ink";
import { useState } from "react";
import chalk from "chalk";

interface PaginatedListProps<T> {
  items: T[];
  itemsPerPage: number;
  renderItem: (item: T, index: number, isSelected: boolean) => React.ReactNode;
  onSelectItem: (item: T) => void;
}

export const PaginatedList = <T,>({
  items,
  itemsPerPage,
  renderItem,
  onSelectItem,
}: PaginatedListProps<T>) => {
  const [currentPage, setCurrentPage] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const paginatedItems = items.slice(
    currentPage * itemsPerPage,
    (currentPage + 1) * itemsPerPage,
  );

  useInput((input, key) => {
    if (key.upArrow) {
      setSelectedIndex(Math.max(0, selectedIndex - 1));
    } else if (key.downArrow) {
      setSelectedIndex(Math.min(paginatedItems.length - 1, selectedIndex + 1));
    } else if (key.return) {
      onSelectItem(paginatedItems[selectedIndex]);
    } else if (
      input === "n" &&
      currentPage < Math.floor(items.length / itemsPerPage) - 1
    ) {
      setCurrentPage(currentPage + 1);
      setSelectedIndex(0);
    } else if (input === "p" && currentPage > 0) {
      setCurrentPage(currentPage - 1);
      setSelectedIndex(0);
    }
  });

  return (
    <Box flexDirection="column">
      {paginatedItems.map((item, index) => (
        <Box key={index}>
          {renderItem(item, index, index === selectedIndex)}
        </Box>
      ))}
      <Text>
        Page {currentPage + 1} of {Math.ceil(items.length / itemsPerPage)}
      </Text>
      <Text>
        {chalk.gray(`Use ↑↓ to navigate, Enter to select, (N)ext/(P)revious page`)}
      </Text>
    </Box>
  );
};

```

## src/cli/components/utils/ScreenWrapper.tsx

**Description:** No description available

```typescript
import { Box } from "ink";
import ContentWrapper from "../ui/ContentWrapper";
import ScreenHeader from "../ui/ScreenHeader";

interface ScreenWrapperProps {
  title: string;
  children: React.ReactNode;
}

export const ScreenWrapper: React.FC<ScreenWrapperProps> = ({
  title,
  children,
}) => (
  <Box flexDirection="column">
    <ScreenHeader title={title} />
    <ContentWrapper>{children}</ContentWrapper>
  </Box>
);

```

## src/cli/aiHelpers.ts

**Description:** No description available

```typescript
import { generateObject, streamText } from "ai";

import { PromptSchema } from "../schemas/prompts";
import chalk from "chalk";
import { logger } from "../utils/logger";
import { openai } from "@ai-sdk/openai";

/**
 * Pretty prints the given prompt to the console with color-coded output.
 *
 * @param prompt The prompt object to be printed
 */
export function prettyPrintPrompt(prompt: any): void {
  logger.info(chalk.bold.underline("\nGenerated Prompt:"));
  logger.info(
    chalk.cyan("Name: ") + prompt.name.toUpperCase().replace(/ /g, "_"),
  );
  logger.info(chalk.magenta("Category: ") + prompt.category.replace(/ /g, ""));
  logger.info(chalk.yellow("Description: ") + prompt.description);
  logger.info(chalk.green("Content:\n") + prompt.content);
  logger.info(chalk.blue("Output Type: ") + prompt.outputType);
  if (prompt.tags && prompt.tags.length > 0) {
    logger.info(chalk.red("Tags: ") + prompt.tags.join(", "));
  }
  logger.info(chalk.gray("\nInput Schema:"));
  logger.info(JSON.stringify(prompt.inputSchema, null, 2));
  logger.info(chalk.gray("\nOutput Schema:"));
  logger.info(JSON.stringify(prompt.outputSchema, null, 2));
}

/**
 * Generates a prompt using AI based on the given description.
 *
 * @param description A string describing the desired prompt
 * @returns A Promise that resolves to the generated prompt object
 */
export async function generatePromptWithAI(description: string): Promise<any> {
  const { object } = await generateObject({
    model: openai("gpt-4o-mini"),
    schema: PromptSchema,
    prompt: `Generate a prompt based on the following description: ${description}`,
  });

  return object;
}

export async function updatePromptWithAI({
  currentPrompt,
  instruction,
}: {
  currentPrompt: any;
  instruction: string;
}): Promise<any> {
  const { object } = await generateObject({
    model: openai("gpt-4o-mini"),
    schema: PromptSchema,
    prompt: `Update the following prompt based on this instruction: ${instruction}\n\nCurrent prompt:\n${JSON.stringify(currentPrompt, null, 2)}`,
  });

  return object;
}

```

## src/schemas/prompts.ts

**Description:** No description available

```typescript
import { z } from 'zod';
import type { JSONSchema7 } from 'json-schema';

export const PromptSchema = z.object({
    name: z.string().describe('Unique identifier for the prompt'),
    category: z.string().describe('Category the prompt belongs to'),
    description: z.string().describe('Brief description of the prompt\'s purpose'),
    version: z.string().describe('Version of the prompt'),
    template: z.string().describe('The actual content of the prompt'),
    parameters: z.array(z.string()).describe('List of parameter names expected by the prompt'),
    metadata: z.object({
        created: z.string(),
        lastModified: z.string()
    }).describe('Metadata associated with the prompt'),
    outputType: z.enum(['structured', 'plain']).describe('Type of output expected from the model'),
    defaultModelName: z.string().optional().describe('Default model name to use for this prompt'),
    compatibleModels: z.array(z.string()).optional().describe('Optional list of models that can be used with this prompt'),
    tags: z.array(z.string()).optional().describe('Optional list of tags or keywords associated with this prompt'),
    inputSchema: z.any().describe('JSON Schema defining the structure of the input expected by the prompt'),
    outputSchema: z.any().describe('JSON Schema defining the structure of the output produced by the prompt'),
    configuration: z.object({
        modelName: z.string(),
        temperature: z.number(),
        maxTokens: z.number(),
        topP: z.number(),
        frequencyPenalty: z.number(),
        presencePenalty: z.number(),
        stopSequences: z.array(z.string())
    }).describe('Configuration for the AI model'),
});

export type IPrompt<TInput = any, TOutput = any> = z.infer<typeof PromptSchema>;

```

