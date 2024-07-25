# Troubleshooting Guide

This guide provides solutions to common issues you might encounter while using the Prompt Manager library.

## Common Issues

### 1. Prompt Not Found

**Problem**: You're trying to access a prompt that doesn't exist.

**Solution**: 
- Double-check the prompt name and category.
- Ensure that the prompt has been created and added to the library.
- Use the `listPrompts()` function to see all available prompts.

### 2. Incorrect Prompt Formatting

**Problem**: The formatted prompt doesn't contain the expected values.

**Solution**:
- Verify that you're passing all required parameters to the `format()` function.
- Check the prompt template to ensure all placeholders are correctly defined (e.g., `{{paramName}}`).

### 3. Type Definitions Not Updating

**Problem**: After adding new prompts, the TypeScript definitions aren't updating.

**Solution**:
- Run the `generateTypes()` function to update the type definitions.
- Restart your TypeScript server or IDE.

## Getting Help

If you're experiencing issues not covered in this guide, please:

1. Check the [GitHub Issues](https://github.com/your-repo/prompt-manager/issues) to see if it's a known problem.
2. If not, create a new issue with a detailed description of the problem, including steps to reproduce it.

For general questions, consider starting a discussion in the GitHub Discussions section of the repository.
