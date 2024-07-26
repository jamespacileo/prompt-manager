# AI Assistance

This guide covers how to use AI assistance features in the Prompt Manager.

## AI-Assisted Prompt Creation

To create a prompt with AI assistance:

```typescript
const newPrompt = await promptManager.createPromptWithAI('Create a product description prompt');
```

## AI-Assisted Prompt Update

To update a prompt with AI assistance:

```typescript
const updatedPrompt = await promptManager.updatePromptWithAI('general/product_description', 'Make it more engaging');
```

## AI-Generated Suggestions

To get AI-generated suggestions for improving a prompt:

```typescript
const suggestions = await promptManager.getAISuggestions('general/product_description');
```

For more information on managing prompts, refer to the [Managing Prompts](./managing-prompts.md) guide.
