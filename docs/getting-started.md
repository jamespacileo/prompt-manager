# Getting Started with Prompt Manager

This guide will help you get started with using the Prompt Manager library in your project.

## Installation

To install Prompt Manager, run the following command in your project directory:

```bash
npm install prompt-manager
```

## Basic Usage

Here's a simple example of how to use Prompt Manager:

```typescript
import { getPromptManager } from 'prompt-manager';

async function example() {
  const promptManager = getPromptManager();
  const summarizationPrompt = promptManager.Summarization.ARTICLE_SUMMARIZATION_PROMPT;
  const formattedPrompt = summarizationPrompt.format({ articleContent: 'Your article content here' });
  // Use the formatted prompt with your AI service
}
```

## Next Steps

- Learn about [Creating Prompts](./creating-prompts.md)
- Explore [Advanced Usage](./advanced-usage.md)
- Check out the [API Reference](./api-reference.md)
