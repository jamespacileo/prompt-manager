# Library API Reference

This document provides a detailed reference for the Prompt Manager library API.

## PromptManager

The main class for interacting with prompts.

### Constructor

#### `new PromptManager(promptsPath: string)`

Creates a new instance of the PromptManager.

- `promptsPath`: The path to the directory containing the prompts.

### Methods

#### `initialize(): Promise<void>`

Initializes the PromptManager by loading all prompts from the specified directory.

#### `getPrompt(category: string, name: string): Prompt`

Retrieves a specific prompt.

- `category`: The category of the prompt.
- `name`: The name of the prompt.

Returns: A `Prompt` object.

#### `createPrompt(prompt: Omit<Prompt, 'versions'>): Promise<void>`

Creates a new prompt.

- `prompt`: An object containing the prompt details (name, category, content, etc.).

#### `updatePrompt(name: string, updates: Partial<Prompt>): Promise<void>`

Updates an existing prompt.

- `name`: The full name of the prompt (category/name).
- `updates`: An object containing the fields to update.

#### `deletePrompt(name: string): Promise<void>`

Deletes a prompt.

- `name`: The full name of the prompt (category/name).

#### `listPrompts(category?: string): Promise<Prompt[]>`

Lists all available prompts, optionally filtered by category.

- `category`: (Optional) The category to filter prompts by.

Returns: An array of `Prompt` objects.

#### `versionPrompt(action: 'list' | 'create' | 'switch', name: string, version?: string): Promise<void>`

Manages versions of a prompt.

- `action`: The version management action to perform.
- `name`: The full name of the prompt (category/name).
- `version`: (Optional) The version number (for 'switch' action).

#### `formatPrompt(category: string, promptName: string, params: Record<string, any>): string`

Formats a prompt with given parameters.

- `category`: The category of the prompt.
- `promptName`: The name of the prompt.
- `params`: An object containing the parameters to format the prompt with.

Returns: The formatted prompt string.

### Properties

#### `categories: { [category: string]: PromptCategory<Record<string, Prompt>> }`

Provides access to prompt categories for easy prompt management and formatting.

## Interfaces

### Prompt

Represents a single prompt in the system.

```typescript
interface Prompt {
  name: string;
  category: string;
  version: string;
  content: string;
  parameters: string[];
  metadata: {
    description: string;
    created: string;
    lastModified: string;
  };
  versions: string[];
}
```

### PromptCategory

Represents a category of prompts with utility methods.

```typescript
interface PromptCategory<T extends Record<string, Prompt>> {
  [K: string]: {
    raw: string;
    version: string;
    format(inputs: { [K in T[keyof T]['parameters'][number]]: string }): string;
  };
}
```

This API reference provides a comprehensive overview of the Prompt Manager library's main classes, methods, and interfaces. For more detailed usage examples, please refer to the [Library Quickstart Guide](./getting-started/library-quickstart.md).
