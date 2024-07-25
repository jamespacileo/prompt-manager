# API Reference

This document provides a detailed reference for the Prompt Manager API.

## PromptManager

The main class for interacting with prompts.

### Methods

#### `getPromptManager(): PromptManager`

Returns an instance of the PromptManager.

Example:
```typescript
const promptManager = getPromptManager();
```

#### `PromptManager.getInstance(): PromptManager`

Static method to get the PromptManager instance.

Example:
```typescript
const promptManager = PromptManager.getInstance();
```

## Prompt Operations

### `createPrompt(name: string, options: any): Promise<void>`

Creates a new prompt.

Parameters:
- `name`: The name of the prompt
- `options`: An object containing prompt details (category, content, etc.)

### `listPrompts(): Promise<string[]>`

Lists all available prompts.

### `updatePrompt(name: string, options: any): Promise<void>`

Updates an existing prompt.

Parameters:
- `name`: The name of the prompt to update
- `options`: An object containing the fields to update

### `generateTypes(): Promise<void>`

Generates TypeScript type definitions for the prompts.

## Prompt Usage

Each prompt in the PromptManager has a `format` method:

```typescript
format(inputs: Record<string, any>): string
```

This method takes an object of parameters and returns the formatted prompt string.
