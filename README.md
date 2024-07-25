# Prompt Manager Library

A flexible and efficient prompt management library for AI applications.

## Installation

```bash
npm install prompt-manager
```

## Usage

```typescript
import { getPromptManager } from 'prompt-manager';

async function example() {
  const promptManager = await getPromptManager();
  const summarizationPrompt = promptManager.Summarization.getPrompt('ARTICLE_SUMMARIZATION_PROMPT');
  const formattedPrompt = summarizationPrompt.format({ articleContent: 'Your article content here' });
  // Use the formatted prompt with your AI service
}
```

## Features

- Centralized prompt management
- Type-safe prompt access and formatting
- Easy integration with AI services
- Customizable prompt structure

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License.
