# EPIC SAGA: Enhanced Programming Insight and Context - Structured Annotations for Generative AI

## TypeScript Comprehensive Documentation Specification for AI-Assisted Code Analysis and Generation

This document outlines the EPIC SAGA commenting style for TypeScript code, designed to provide rich context for AI analysis and human developers alike. EPIC SAGA stands for **E**nhanced **P**rogramming **I**nsight and **C**ontext - **S**tructured **A**nnotations for **G**enerative **A**I.

## Class-Level Comment Specification

Use this detailed specification for classes and significant modules:

```typescript
/**
 * @class [ClassName]
 * @description [Brief description of the class's purpose]
 * 
 * @saga
 * [Detailed explanation of the class's role in the system]
 * 
 * @epicFeatures
 * - [Feature 1]
 * - [Feature 2]
 * - [Feature 3]
 * 
 * @alliances
 * - [Dependency 1]: [Brief description]
 * - [Dependency 2]: [Brief description]
 * 
 * @allies
 * - [Consumer 1]: [How it uses this class]
 * - [Consumer 2]: [How it uses this class]
 * 
 * @epicTale
 * ```typescript
 * [Code example showing typical usage]
 * ```
 * 
 * @safeguards
 * - [Security consideration 1]
 * - [Security consideration 2]
 */
```

### Explanation of Class-Level Tags:

- `@class`: Name of the class (our hero)
- `@description`: Concise statement of the class's main purpose (hero's mission)
- `@saga`: Detailed context about the class's role in the larger system (hero's backstory)
- `@epicFeatures`: List of key functionalities (hero's special abilities)
- `@alliances`: Components or services this class relies on (hero's mentors and supporters)
- `@allies`: Components or services that use this class (hero's comrades)
- `@epicTale`: Code snippet demonstrating typical usage (hero's legendary deed)
- `@safeguards`: Important security considerations or best practices (hero's armor and defenses)

## Method-Level Comment Specification

Use this compact specification for methods and functions:

```typescript
/**
 * [Brief description of the method's purpose]
 * 
 * @quest [paramName] - [Parameter description]
 * @reward [Description of return value]
 * @peril [ExceptionType] - [Conditions under which exception is thrown]
 * 
 * @lore
 * [Any additional context, considerations, or explanations]
 * 
 * @epicDeed
 * ```typescript
 * [Short code example]
 * ```
 */
```

### Explanation of Method-Level Tags:

- Description: A brief statement about what the method does (the quest's objective)
- `@quest`: Description of each parameter (quest requirements)
- `@reward`: Description of what the method returns (quest reward)
- `@peril`: Description of exceptions the method might throw (quest dangers)
- `@lore`: Any additional important information about usage, edge cases, etc. (quest background)
- `@epicDeed`: A short, illustrative code example (tale of a successful quest)

## Guidelines for AI Comment Generation

When instructing an AI to add comments to TypeScript code:

1. For classes and major components, use the full EPIC SAGA class-level specification.
2. For methods and functions, use the compact EPIC SAGA method-level specification.
3. Ensure comments provide context beyond what's immediately obvious from the code.
4. Include type information in `@quest` and `@reward` tags for better TypeScript integration.
5. Use `@epicTale` and `@epicDeed` to illustrate non-obvious usage patterns.
6. Include `@safeguards` notes for classes or methods handling sensitive operations.
7. Keep method-level comments concise while still providing necessary information.
8. Use `@saga` and `@lore` to add any important contextual information that doesn't fit other tags.
