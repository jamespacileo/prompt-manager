# Importable Library Quickstart Guide

This guide provides a quick overview of how to use the Prompt Manager as an importable library in your TypeScript/JavaScript projects.

## Installation

First, install the package using npm:

```bash
npm install prompt-manager
```

## Basic Usage

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

### Listing Prompts

```typescript
// List all prompts
const allPrompts = await promptManager.listPrompts();
console.log(allPrompts);

// List prompts in a specific category
const generalPrompts = await promptManager.listPrompts('general');
console.log(generalPrompts);
```

### Version Management

```typescript
// List versions of a prompt
await promptManager.versionPrompt('list', 'general/greeting');

// Create a new version
await promptManager.versionPrompt('create', 'general/greeting');

// Switch to a specific version
await promptManager.versionPrompt('switch', 'general/greeting', '1.1.0');
```

## Advanced Usage

### Using Categories

The Prompt Manager provides a `categories` property for easy access to prompts:

```typescript
// Access a prompt in a specific category
const greeting = promptManager.categories.general.greeting;

// Get the raw content
console.log(greeting.raw);

// Get the current version
console.log(greeting.version);

// Format the prompt
const formattedGreeting = greeting.format({ name: 'Bob' });
console.log(formattedGreeting);
```

This quickstart guide covers the basic and advanced usage of the Prompt Manager as an importable library. For more detailed information on each method and property, refer to the full API documentation.
