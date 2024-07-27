# CLI Quickstart Guide

This guide provides a quick overview of the Prompt Manager CLI commands with examples of terminal interactions.

## Basic Commands

### Create a Prompt

```bash
$ prompt-manager create product-description --category marketing --content "Create a compelling product description for {{product_name}}. Key features: {{features}}. Target audience: {{target_audience}}. Tone: {{tone}}. Word limit: {{word_limit}}"
Created prompt: marketing/product-description
```

### List Prompts

```bash
$ prompt-manager list
┌─────────┬────────────────────┬───────────┬─────────────────────────────────────┐
│ (index) │        name        │ category  │            description              │
├─────────┼────────────────────┼───────────┼─────────────────────────────────────┤
│    0    │'product-description'│'marketing'│'A prompt for product descriptions' │
│    1    │    'greeting'      │ 'general' │    'A simple greeting prompt'       │
└─────────┴────────────────────┴───────────┴─────────────────────────────────────┘
```

### Update a Prompt

```bash
$ prompt-manager update marketing/product-description --content "Create an engaging product description for {{product_name}}. Highlight these key features: {{features}}. Appeal to this target audience: {{target_audience}}. Use a {{tone}} tone. Stay within {{word_limit}} words."
Updated prompt: marketing/product-description
```

### Delete a Prompt

```bash
$ prompt-manager delete marketing/product-description
Deleted prompt: marketing/product-description
```

## Version Management

### List Versions

```bash
$ prompt-manager version list marketing/product-description
Versions for marketing/product-description: [ '1.0.0', '1.1.0', '1.2.0' ]
```

### Create a New Version

```bash
$ prompt-manager version create marketing/product-description
Created new version 1.3.0 for marketing/product-description
```

### Switch Version

```bash
$ prompt-manager version switch marketing/product-description 1.2.0
Switched marketing/product-description to version 1.2.0
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

### AI-Assisted Prompt Creation

```bash
$ prompt-manager create --ai
AI: Please provide a brief description of the prompt you want to create.
User: I need a prompt for generating email subject lines for a newsletter.
AI: Based on your description, I suggest creating a prompt in the "email" category. Here's a draft:

Category: email
Name: newsletter_subject
Content:
"""
Generate an engaging email subject line for a newsletter about {{topic}}.

Target audience: {{target_audience}}
Key message: {{key_message}}
Tone: {{tone}}
Character limit: {{char_limit}}
"""

Shall I proceed with creating this prompt?
User: Yes, that looks good.
AI: Great! I'll create the prompt for you.

$ prompt-manager create email/newsletter_subject --content "Generate an engaging email subject line for a newsletter about {{topic}}.\n\nTarget audience: {{target_audience}}\nKey message: {{key_message}}\nTone: {{tone}}\nCharacter limit: {{char_limit}}"
Created prompt: email/newsletter_subject

AI: The prompt has been created successfully. You can now use it in your email marketing campaigns to generate newsletter subject lines.
```

This quickstart guide covers the basic and advanced usage of the Prompt Manager CLI. For more detailed information on each command, use the `--help` option or refer to the full documentation.
