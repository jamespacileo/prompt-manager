# Prompt Manager Library

A flexible and efficient prompt management library for AI applications.

## Installation

```bash
npm install prompt-manager
```

## Usage

### Initializing a Project

```bash
npx prompt-manager init
```

This will create a `prompt-manager.config.js` file in your project root.

### Creating a Prompt

```bash
npx prompt-manager create MY_PROMPT -c MyCategory -t "This is a {{param}} prompt."
```

### Using Prompts in Your Code

```typescript
import { getPromptManager } from 'prompt-manager';

async function example() {
  const promptManager = getPromptManager();
  const summarizationPrompt = promptManager.Summarization.ARTICLE_SUMMARIZATION_PROMPT;
  const formattedPrompt = summarizationPrompt.format({ articleContent: 'Your article content here' });
  // Use the formatted prompt with your AI service
}
```

### Generating Types

```bash
npx prompt-manager generate
```

This will generate TypeScript types based on your prompts.

## Configuration

You can customize Prompt Manager by editing the `prompt-manager.config.js` file:

```javascript
module.exports = {
  promptsDir: '.prompts',
  outputDir: 'src/generated',
  typescript: true,
};
```

### Creating a New Prompt

```typescript
import { createPrompt } from 'prompt-manager';

async function createNewPrompt() {
  await createPrompt('NEW_PROMPT', {
    category: 'CustomCategory',
    content: 'This is a {{customParam}} prompt.',
  });
}
```

### Updating an Existing Prompt

```typescript
import { updatePrompt } from 'prompt-manager';

async function updateExistingPrompt() {
  await updatePrompt('EXISTING_PROMPT', {
    content: 'This is the updated {{param}} content.',
  });
}
```

### Listing Available Prompts

```typescript
import { listPrompts } from 'prompt-manager';

async function listAvailablePrompts() {
  await listPrompts();
}
```

### Generating Type Definitions

```typescript
import { generateTypes } from 'prompt-manager';

async function generateTypeDefinitions() {
  await generateTypes();
}
```

## Features

- Centralized prompt management
- Type-safe prompt access and formatting
- Easy integration with AI services
- Customizable prompt structure
- Auto-generated types and implementation based on prompt definitions

## Development

To update the prompt library:

1. Modify or add prompt JSON files in the `.prompts` directory
2. Run `npm run generate` to update the generated code
3. Build the project with `npm run build`

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License.
