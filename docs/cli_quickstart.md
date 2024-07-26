# CLI Quickstart Guide

This guide provides a quick overview of the Prompt Manager CLI commands with examples of terminal interactions.

## Basic Commands

### Create a Prompt

```bash
$ prompt-manager create greeting --category general --content "Hello, {{name}}!"
Created prompt: general/greeting
```

### List Prompts

```bash
$ prompt-manager list
┌─────────┬─────────┬─────────┬─────────────────────────┐
│ (index) │  name   │ category │      description        │
├─────────┼─────────┼─────────┼─────────────────────────┤
│    0    │'greeting'│'general'│ 'A simple greeting prompt'│
└─────────┴─────────┴─────────┴─────────────────────────┘
```

### Update a Prompt

```bash
$ prompt-manager update general/greeting --content "Greetings, {{name}}! Welcome to {{place}}."
Updated prompt: general/greeting
```

### Delete a Prompt

```bash
$ prompt-manager delete general/greeting
Deleted prompt: general/greeting
```

## Version Management

### List Versions

```bash
$ prompt-manager version list general/greeting
Versions for general/greeting: [ '1.0.0', '1.1.0' ]
```

### Create a New Version

```bash
$ prompt-manager version create general/greeting
Created new version 1.2.0 for general/greeting
```

### Switch Version

```bash
$ prompt-manager version switch general/greeting 1.1.0
Switched general/greeting to version 1.1.0
```

## Advanced Usage

### Generate TypeScript Types

```bash
$ prompt-manager generate-types
Generating TypeScript types...
Types generated successfully in src/generated/promptTypes.ts
```

### Consistency Check

```bash
$ prompt-manager check
Performing consistency check...
All prompts are consistent with the defined schema.
```

### Complex Prompt Creation with AI Assistance

```bash
$ prompt-manager create --ai
AI: Please provide a brief description of the prompt you want to create.
User: I need a prompt for generating product descriptions for an e-commerce site.
AI: Based on your description, I suggest creating a prompt in the "marketing" category. Here's a draft:

Category: marketing
Name: product_description
Content:
"""
Create a compelling product description for {{product_name}}.

Key features:
{{features}}

Target audience: {{target_audience}}

Tone: {{tone}}

Word limit: {{word_limit}}
"""

Shall I proceed with creating this prompt?
User: Yes, that looks good.
AI: Great! I'll create the prompt for you.

$ prompt-manager create marketing/product_description --content "Create a compelling product description for {{product_name}}.\n\nKey features:\n{{features}}\n\nTarget audience: {{target_audience}}\n\nTone: {{tone}}\n\nWord limit: {{word_limit}}"
Created prompt: marketing/product_description

AI: The prompt has been created successfully. You can now use it in your e-commerce application to generate product descriptions.
```

This quickstart guide covers the basic and advanced usage of the Prompt Manager CLI. For more detailed information on each command, use the `--help` option or refer to the full documentation.
