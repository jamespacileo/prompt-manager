# Version Control

This guide explains how to use version control features in the Prompt Manager.

## Listing Versions

To list all versions of a prompt:

```typescript
await promptManager.versionPrompt('list', 'general/greeting');
```

## Creating a New Version

To create a new version of a prompt:

```typescript
await promptManager.versionPrompt('create', 'general/greeting');
```

## Switching Versions

To switch to a specific version of a prompt:

```typescript
await promptManager.versionPrompt('switch', 'general/greeting', '1.1.0');
```

For more information on managing prompts, refer to the [Managing Prompts](./managing-prompts.md) guide.
