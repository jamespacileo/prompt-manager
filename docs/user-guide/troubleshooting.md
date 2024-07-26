# Troubleshooting Guide

This guide provides solutions to common issues you might encounter while using the Prompt Manager library or CLI.

## Common Issues

### 1. Prompt Not Found

**Problem**: You're trying to access a prompt that doesn't exist.

**Solution**:
- Double-check the prompt name and category.
- Ensure that the prompt has been created and added to the library.
- Use the `prompt-manager list` command or `listPrompts()` function to see all available prompts.

### 2. Incorrect Prompt Formatting

**Problem**: The formatted prompt doesn't contain the expected values.

**Solution**:
- Verify that you're passing all required parameters to the `format()` function or CLI command.
- Check the prompt template to ensure all placeholders are correctly defined (e.g., `{{paramName}}`).

### 3. Type Definitions Not Updating

**Problem**: After adding new prompts, the TypeScript definitions aren't updating.

**Solution**:
- Run the `prompt-manager generate-types` command or `generateTypes()` function to update the type definitions.
- Restart your TypeScript server or IDE.

### 4. CLI Command Not Found

**Problem**: The `prompt-manager` command is not recognized.

**Solution**:
- Ensure that Prompt Manager is installed globally (`npm install -g prompt-manager`) or use `npx prompt-manager` to run commands.
- Check that your PATH environment variable includes the npm global bin directory.

### 5. Version Conflicts

**Problem**: You're experiencing unexpected behavior after updating Prompt Manager.

**Solution**:
- Check the [Changelog](./changelog.md) for any breaking changes in the latest version.
- Ensure all parts of your project (CLI, library, etc.) are using the same version of Prompt Manager.
- Try clearing your npm cache (`npm cache clean --force`) and reinstalling.

## Getting Help

If you're experiencing issues not covered in this guide, please:

1. Check the [GitHub Issues](https://github.com/your-repo/prompt-manager/issues) to see if it's a known problem.
2. If not, create a new issue with a detailed description of the problem, including steps to reproduce it.

For general questions, consider starting a discussion in the GitHub Discussions section of the repository.

Remember to include relevant information such as:
- Prompt Manager version
- Node.js version
- Operating system
- Any error messages or logs
- A minimal reproducible example of the issue

This will help the maintainers and community assist you more effectively.
