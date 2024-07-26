# Custom Integrations

This guide explains how to integrate the Prompt Manager with custom systems and workflows.

## Extending the PromptManager Class

You can extend the `PromptManager` class to add custom functionality:

```typescript
import { PromptManager } from 'prompt-manager';

class CustomPromptManager extends PromptManager {
  async customMethod() {
    // Custom implementation
  }
}
```

## Creating Custom Prompt Processors

You can create custom prompt processors to modify prompts before they're used:

```typescript
function customProcessor(prompt: string): string {
  // Custom processing logic
  return modifiedPrompt;
}

// Use the custom processor
const processedPrompt = customProcessor(promptManager.getPrompt('category', 'name').content);
```

## Integrating with External APIs

You can integrate the Prompt Manager with external APIs:

```typescript
import axios from 'axios';

async function sendPromptToAPI(prompt: string) {
  const response = await axios.post('https://api.example.com/process-prompt', { prompt });
  return response.data;
}

// Use the API integration
const prompt = promptManager.getPrompt('category', 'name');
const apiResponse = await sendPromptToAPI(prompt.content);
```

For more advanced topics, refer to the [Best Practices](./best-practices.md) guide.
