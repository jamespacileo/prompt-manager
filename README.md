# Prompt Manager Library

A flexible and efficient prompt management library for AI applications.

## Installation

```bash
npm install prompt-manager
```

## Usage

```typescript
import { getPromptManager } from 'prompt-manager';

function example() {
  const promptManager = getPromptManager();
  const summarizationPrompt = promptManager.Summarization.ARTICLE_SUMMARIZATION_PROMPT;
  const formattedPrompt = summarizationPrompt.format({ articleContent: 'Your article content here' });
  // Use the formatted prompt with your AI service
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
