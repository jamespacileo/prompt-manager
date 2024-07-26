# Managing Prompts

This guide covers how to create, update, rollback, and use AI to amend prompts in the Prompt Manager system.

## Creating a Prompt

### Manual Creation

To create a prompt manually, use the `create` command:

```bash
$ prompt-manager create greeting --category general --content "Hello, {{name}}!"
Created prompt: general/greeting
```

### AI-Assisted Creation

For AI-assisted prompt creation:

```bash
$ prompt-manager create --ai
AI: Please provide a brief description of the prompt you want to create.
User: I need a prompt for generating product reviews.
AI: Based on your description, I suggest creating a prompt in the "marketing" category. Here's a draft:

Category: marketing
Name: product_review
Content:
"""
Write a {{tone}} product review for {{product_name}}.

Key points to cover:
- Overall impression
- Pros and cons
- Value for money
- Recommendation

Word limit: {{word_limit}}
"""

Shall I proceed with creating this prompt?
User: Yes, that looks good.
AI: Great! I'll create the prompt for you.

Created prompt: marketing/product_review
```

## Updating a Prompt

### Manual Update

To update a prompt manually:

```bash
$ prompt-manager update marketing/product_review --content "Write a {{tone}} product review for {{product_name}}.\n\nKey points to cover:\n- Overall impression\n- Pros and cons\n- Value for money\n- Recommendation\n- Comparison with similar products\n\nWord limit: {{word_limit}}"
Updated prompt: marketing/product_review
```

### AI-Assisted Update

For AI-assisted prompt updates:

```bash
$ prompt-manager update marketing/product_review --ai
AI: How would you like to modify the product_review prompt?
User: Can we add a section for the target audience?
AI: Certainly! I'll update the prompt to include a target audience section. Here's the modified version:

"""
Write a {{tone}} product review for {{product_name}}.

Target audience: {{target_audience}}

Key points to cover:
- Overall impression
- Pros and cons
- Value for money
- Recommendation
- Comparison with similar products
- Suitability for the target audience

Word limit: {{word_limit}}
"""

Shall I proceed with this update?
User: Yes, please update it.
AI: Great! I'll update the prompt for you.

Updated prompt: marketing/product_review
```

## Rolling Back a Prompt

To rollback a prompt to a previous version:

1. List the available versions:

```bash
$ prompt-manager version list marketing/product_review
Versions for marketing/product_review: [ '1.0.0', '1.1.0', '1.2.0' ]
```

2. Switch to the desired version:

```bash
$ prompt-manager version switch marketing/product_review 1.1.0
Switched marketing/product_review to version 1.1.0
```

## Using AI to Amend a Prompt

You can use AI to suggest improvements or modifications to existing prompts:

```bash
$ prompt-manager update marketing/product_review --ai
AI: How would you like to modify the product_review prompt?
User: Can you suggest ways to make the review more engaging?
AI: Certainly! I'll suggest some modifications to make the product review prompt more engaging. Here's an updated version:

"""
Craft an engaging {{tone}} product review for {{product_name}} that will captivate potential buyers.

Target audience: {{target_audience}}

Key points to cover:
1. Hook: Start with an attention-grabbing opening line or anecdote
2. First impressions: Describe your initial reaction to the product
3. Deep dive:
   - Standout features and benefits
   - Any unexpected surprises (positive or negative)
   - Real-world performance and usability
4. Balanced perspective:
   - Pros: What makes this product shine?
   - Cons: Areas for improvement
5. Value proposition: Is it worth the price?
6. Comparisons: How does it stack up against similar products?
7. Ideal user: Who would benefit most from this product?
8. Verdict: Sum up your overall recommendation

Remember to use vivid language, specific examples, and personal experiences to bring your review to life.

Word limit: {{word_limit}}
"""

Would you like to apply these changes to the prompt?
User: Yes, that looks great!
AI: Excellent! I'll update the prompt with these changes.

Updated prompt: marketing/product_review
```

This guide covers the main aspects of managing prompts, including creation, updates, rollbacks, and AI-assisted modifications. Remember to use version control judiciously to maintain a history of your prompt changes and allow for easy rollbacks when needed.
