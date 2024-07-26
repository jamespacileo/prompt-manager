# Library Quickstart Guide

This guide provides a quick overview of how to use the Prompt Manager as an importable library in your TypeScript/JavaScript projects.

## Basic Usage

## Installation

First, install the package using npm:

```bash
npm install prompt-manager
```


### Initializing the Prompt Manager

```typescript
import { PromptManager } from 'prompt-manager';

const promptManager = new PromptManager('./prompts');
await promptManager.initialize();
```

### Accessing Prompts

```typescript
// Get a specific prompt
const greeting = promptManager.getPrompt('general', 'greeting');
console.log(greeting.content);

// Format a prompt with parameters
const formattedGreeting = promptManager.formatPrompt('general', 'greeting', { name: 'Alice' });
console.log(formattedGreeting);
```

### Managing Prompts

```typescript
// Create a new prompt
await promptManager.createPrompt({
  name: 'welcome',
  category: 'general',
  version: '1.0.0',
  content: 'Welcome to {{place}}, {{name}}!',
  parameters: ['place', 'name'],
  metadata: {
    description: 'A welcome message',
    created: new Date().toISOString(),
    lastModified: new Date().toISOString(),
  },
});

// Update an existing prompt
await promptManager.updatePrompt('general/welcome', {
  content: 'Welcome to the wonderful {{place}}, {{name}}!',
});

// Delete a prompt
await promptManager.deletePrompt('general/welcome');
```

For more detailed information on each method and additional features, refer to the [full library API documentation](../api-reference/library-api.md).
