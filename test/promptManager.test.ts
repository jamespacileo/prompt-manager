import { expect, test, describe, beforeAll, afterAll } from "bun:test";
import { PromptManager } from '../src/promptManager';
import { PromptFileSystem } from '../src/promptFileSystem';
import fs from 'fs/promises';
import path from 'path';

describe('PromptManager', () => {
  let manager: PromptManager;
  let testDir: string;

  beforeAll(async () => {
    testDir = path.join(process.cwd(), 'test-prompts-manager');
    await fs.mkdir(testDir, { recursive: true });
    process.env.PROMPTS_DIR = testDir;
    manager = new PromptManager();
    await manager.initialize();
  });

  afterAll(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  test('Create and retrieve prompt', async () => {
    const cosmicPrompt = {
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
      outputType: 'json',
    };

    await manager.createPrompt(cosmicPrompt);

    const retrievedPrompt = await manager.getPrompt({
      category: 'spaceExploration',
      name: 'cosmicVoyager',
    });

    expect(retrievedPrompt).toEqual(cosmicPrompt);
  });

  test('List all prompts', async () => {
    const allPrompts = await manager.listPrompts({});
    expect(allPrompts).toContainEqual({
      name: 'cosmicVoyager',
      category: 'spaceExploration',
      filePath: expect.stringContaining('/test-prompts-manager/spaceExploration/cosmicVoyager/prompt.json'),
    });
  });

  test('List prompts by category', async () => {
    const spacePrompts = await manager.listPrompts({ category: 'spaceExploration' });
    expect(spacePrompts).toHaveLength(1);
    expect(spacePrompts[0].name).toBe('cosmicVoyager');
  });

  test('Update prompt', async () => {
    const updatedPrompt = {
      name: 'cosmicVoyager',
      category: 'spaceExploration',
      description: 'An updated prompt for grand space odysseys',
      version: '1.1.0',
      template: 'Embark on an epic odyssey to {{planet}} in the vast {{galaxy}} galaxy',
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
          odyssey: { type: 'string' },
        },
        required: ['odyssey'],
      },
      outputType: 'json',
    };

    await manager.updatePrompt({
      category: 'spaceExploration',
      name: 'cosmicVoyager',
      promptData: updatedPrompt,
    });

    const retrievedPrompt = await manager.getPrompt({
      category: 'spaceExploration',
      name: 'cosmicVoyager',
    });

    expect(retrievedPrompt).toEqual(updatedPrompt);
  });

  test('Delete prompt', async () => {
    await manager.deletePrompt({
      category: 'spaceExploration',
      name: 'cosmicVoyager',
    });

    const promptExists = await manager.promptExists({
      category: 'spaceExploration',
      name: 'cosmicVoyager',
    });

    expect(promptExists).toBe(false);
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
