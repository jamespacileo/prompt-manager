# Library API Reference

This document provides a detailed reference for the Prompt Manager library API.

## PromptManager

The main class for interacting with prompts.

### Constructor

```typescript
new PromptManager(promptsPath: string)
```

Creates a new instance of the PromptManager.

### Methods

#### initialize

```typescript
async initialize(): Promise<void>
```

Initializes the PromptManager by loading all prompts from the specified directory.

#### getPrompt

```typescript
getPrompt(category: string, name: string): Prompt
```

Retrieves a specific prompt.

#### createPrompt

```typescript
async createPrompt(prompt: Omit<Prompt, 'versions'>): Promise<void>
```

Creates a new prompt.

#### updatePrompt

```typescript
async updatePrompt(name: string, updates: Partial<Prompt>): Promise<void>
```

Updates an existing prompt.

#### deletePrompt

```typescript
async deletePrompt(name: string): Promise<void>
```

Deletes a prompt.

#### listPrompts

```typescript
async listPrompts(category?: string): Promise<Prompt[]>
```

Lists all available prompts, optionally filtered by category.

#### versionPrompt

```typescript
async versionPrompt(action: 'list' | 'create' | 'switch', name: string, version?: string): Promise<void>
```

Manages versions of a prompt.

#### formatPrompt

```typescript
formatPrompt(category: string, promptName: string, params: Record<string, any>): string
```

Formats a prompt with given parameters.

For more information on using the library API, refer to the [Library Quickstart Guide](../getting-started/library-quickstart.md).
