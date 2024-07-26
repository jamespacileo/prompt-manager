# Managing Prompts

This guide covers how to create, update, and delete prompts using the Prompt Manager.

## Creating Prompts

To create a new prompt:

```typescript
await promptManager.createPrompt({
  name: 'greeting',
  category: 'general',
  version: '1.0.0',
  content: 'Hello, {{name}}!',
  parameters: ['name'],
  metadata: {
    description: 'A simple greeting prompt',
    created: new Date().toISOString(),
    lastModified: new Date().toISOString(),
  },
});
```

## Updating Prompts

To update an existing prompt:

```typescript
await promptManager.updatePrompt('general/greeting', {
  content: 'Greetings, {{name}}!',
  metadata: {
    description: 'An updated greeting prompt',
  },
});
```

## Deleting Prompts

To delete a prompt:

```typescript
await promptManager.deletePrompt('general/greeting');
```

For more information on prompt management, including version control and AI assistance, refer to the [Version Control](./version-control.md) and [AI Assistance](./ai-assistance.md) guides.
