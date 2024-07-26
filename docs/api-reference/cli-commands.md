# CLI Commands Reference

This document provides a comprehensive list of all available CLI commands for the Prompt Manager.

## create

Creates a new prompt.

```bash
prompt-manager create <name> [options]
```

Options:
- `-c, --category <category>`: Specify the prompt category
- `--content <content>`: Specify the prompt content
- `--description <description>`: Add a description for the prompt

## list

Lists all prompts or prompts in a specific category.

```bash
prompt-manager list [options]
```

Options:
- `-c, --category <category>`: Filter prompts by category
- `--format <format>`: Output format (json or table)

## update

Updates an existing prompt.

```bash
prompt-manager update <name> [options]
```

Options:
- `--content <content>`: New content for the prompt
- `--description <description>`: New description for the prompt

## delete

Deletes a prompt.

```bash
prompt-manager delete <name>
```

## version

Manages versions of a prompt.

```bash
prompt-manager version <action> <name> [version]
```

Actions:
- `list`: List all versions of a prompt
- `create`: Create a new version of a prompt
- `switch`: Switch to a specific version of a prompt

## generate-types

Generates TypeScript types for all prompts.

```bash
prompt-manager generate-types
```

For more detailed information on using these commands, refer to the [CLI Quickstart Guide](../getting-started/cli-quickstart.md).
