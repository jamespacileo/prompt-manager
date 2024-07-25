# Creating Prompts

This guide explains how to create new prompts using the Prompt Manager library.

## Using the createPrompt Function

The `createPrompt` function allows you to add new prompts to your prompt library. Here's how to use it:

```typescript
import { createPrompt } from 'prompt-manager';

async function createNewPrompt() {
  await createPrompt('NEW_PROMPT', {
    category: 'CustomCategory',
    content: 'This is a {{customParam}} prompt.',
  });
}
```

## Prompt Structure

When creating a prompt, you need to provide the following information:

- `name`: A unique identifier for the prompt
- `category`: The category the prompt belongs to
- `content`: The actual text of the prompt, with placeholders for parameters

## Best Practices

1. Use descriptive names for your prompts
2. Group related prompts into categories
3. Use clear and consistent parameter names in your prompt content

## Next Steps

- Learn about [Updating Prompts](./updating-prompts.md)
- Explore [Advanced Prompt Techniques](./advanced-prompt-techniques.md)
