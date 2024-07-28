import { expect, test, describe, beforeAll, afterAll, beforeEach } from "bun:test";
import { PromptManager } from '../src/promptManager';
import fs from 'fs/promises';
import path from 'path';
import { IPrompt, IPromptInput, IPromptOutput } from "../src/types/interfaces";
import { PromptProjectConfigManager } from "../src/config/PromptProjectConfigManager";

describe('PromptManager', () => {
  let manager: PromptManager;
  let testDir: string;
  let originalPromptsDir: string | undefined;

  beforeAll(async () => {
    originalPromptsDir = process.env.PROMPTS_DIR;
    testDir = path.join(process.cwd(), 'test-prompts-manager');
    await fs.mkdir(testDir, { recursive: true });
    process.env.PROMPTS_DIR = testDir;
    PromptProjectConfigManager.getInstance().setConfig('promptsDir', testDir);
  });

  beforeEach(async () => {
    manager = PromptManager.getInstance();
    await manager.initialize();
  });

  afterAll(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
    if (originalPromptsDir) {
      process.env.PROMPTS_DIR = originalPromptsDir;
    } else {
      delete process.env.PROMPTS_DIR;
    }
    PromptProjectConfigManager.getInstance().setConfig('promptsDir', originalPromptsDir || '');
  });

  test('Create and retrieve prompt', async () => {
    const cosmicPrompt: IPrompt<IPromptInput, IPromptOutput> = {
      name: 'cosmicVoyager',
      category: 'spaceExploration',
      description: 'A prompt for interstellar adventures',
      version: '1.0.0',
      template: 'Embark on a journey to {{planet}} in the {{galaxy}} galaxy',
      parameters: ['planet', 'galaxy'],
      inputSchema: {
        type: 'object',
        properties: {
          planet: { type: 'string' },
          galaxy: { type: 'string' },
        },
        required: ['planet', 'galaxy'],
      },
      outputSchema: {
        type: 'object',
        properties: {
          adventure: { type: 'string' },
        },
        required: ['adventure'],
      },
      outputType: 'structured',
      metadata: {
        created: new Date().toISOString(),
        lastModified: new Date().toISOString(),
      },
      configuration: {
        modelName: 'default-model',
        temperature: 0.7,
        maxTokens: 100,
        topP: 1,
        frequencyPenalty: 0,
        presencePenalty: 0,
        stopSequences: [],
      },
    };

    await manager.createPrompt({ prompt: cosmicPrompt });

    const retrievedPrompt = await manager.getPrompt({
      category: 'spaceExploration',
      name: 'cosmicVoyager',
    });

    expect(retrievedPrompt).toMatchObject({
      ...cosmicPrompt,
      isLoadedFromStorage: false,
      _isSaved: false,
      _inputZodSchema: null,
      _outputZodSchema: null,
      fileSystem: expect.any(Object),
      defaultModelName: undefined,
    });
  });

  test('List all prompts', async () => {
    const allPrompts = await manager.listPrompts({});
    expect(allPrompts.map(({ name, category, filePath }) => ({ name, category, filePath }))).toContainEqual({
      name: 'cosmicVoyager',
      category: 'spaceExploration',
      filePath: path.join(testDir, 'spaceExploration', 'cosmicVoyager', 'prompt.json'),
    });
  });

  test('List prompts by category', async () => {
    const spacePrompts = await manager.listPrompts({ category: 'spaceExploration' });
    expect(spacePrompts).toHaveLength(1);
    expect(spacePrompts[0].name).toBe('cosmicVoyager');
  });

  test('Update prompt', async () => {
    const updatedPrompt: Partial<IPrompt<IPromptInput, IPromptOutput>> = {
      description: 'An updated prompt for grand space odysseys',
      version: '1.1.0',
      template: 'Embark on an epic odyssey to {{planet}} in the vast {{galaxy}} galaxy',
    };

    await manager.updatePrompt({
      category: 'spaceExploration',
      name: 'cosmicVoyager',
      updates: updatedPrompt,
    });

    const retrievedPrompt = await manager.getPrompt({
      category: 'spaceExploration',
      name: 'cosmicVoyager',
    });

    expect(retrievedPrompt.description).toBe(updatedPrompt.description);
    expect(retrievedPrompt.version).toBe(updatedPrompt.version);
    expect(retrievedPrompt.template).toBe(updatedPrompt.template);
  });

  test('Delete prompt', async () => {
    await manager.deletePrompt({
      category: 'spaceExploration',
      name: 'cosmicVoyager',
    });

    await expect(manager.getPrompt({
      category: 'spaceExploration',
      name: 'cosmicVoyager',
    })).rejects.toThrow();
  });

  test('Create and delete category', async () => {
    await manager.createCategory({ categoryName: 'alienCivilizations' });

    let categories = await manager.listCategories();
    expect(categories).toContain('alienCivilizations');

    await manager.deleteCategory({ categoryName: 'alienCivilizations' });

    categories = await manager.listCategories();
    expect(categories).not.toContain('alienCivilizations');
  });
});
