import { expect, test, describe, beforeAll, afterAll, beforeEach, afterEach } from "bun:test";
import { PromptManager } from '../src/promptManager';
import { PromptFileSystem } from '../src/promptFileSystem';
import { configManager } from "../src/config/PromptProjectConfigManager";
import fs from 'fs/promises';
import path from 'path';
import { IPrompt, IPromptInput, IPromptOutput } from "../src/types/interfaces";

const getRandomElement = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];

const categories = [
  'test_NaturalLanguageProcessing',
  'test_MachineLearning',
  'test_ComputerVision',
  'test_DataAnalysis',
  'test_ArtificialIntelligence',
  'test_DeepLearning',
  'test_RoboticProcess',
  'test_SpeechRecognition',
  'test_TextGeneration',
  'test_SentimentAnalysis'
];

const promptNames = [
  'test_LanguageModel',
  'test_ImageClassifier',
  'test_SentimentAnalyzer',
  'test_TextSummarizer',
  'test_NamedEntityRecognizer',
  'test_QuestionAnswering',
  'test_MachineTranslation',
  'test_SpeechToText',
  'test_TextToSpeech',
  'test_AnomalyDetection'
];

describe('PromptManager', () => {
  let manager: PromptManager;
  let fileSystem: PromptFileSystem;
  let testDir: string;

  beforeAll(async () => {
    testDir = path.join(process.cwd(), 'test-prompts-manager');
    await fs.mkdir(testDir, { recursive: true });
    await configManager.updateConfig({
      promptsDir: testDir,
      outputDir: path.join(testDir, 'output'),
    });
  });

  beforeEach(async () => {
    await configManager.initialize();
    fileSystem = await PromptFileSystem.getInstance();
    await fileSystem.initialize();
    manager = await PromptManager.getInstance();
    await manager.initialize();
  });

  // afterEach(async () => {
  //   const prompts = await manager.listPrompts({});
  //   for (const prompt of prompts) {
  //     await manager.deletePrompt({ category: prompt.category, name: prompt.name });
  //   }
  // });

  afterAll(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  const getRandomPrompt = (): IPrompt<IPromptInput, IPromptOutput> => ({
    name: getRandomElement(promptNames),
    category: getRandomElement(categories),
    description: `A test prompt for ${getRandomElement(categories).replace('test_', '')}`,
    version: '1.0.0',
    template: 'Process {{input}} using {{algorithm}}',
    parameters: ['input', 'algorithm'],
    inputSchema: {
      type: 'object',
      properties: {
        input: { type: 'string' },
        algorithm: { type: 'string' },
      },
      required: ['input', 'algorithm'],
    },
    outputSchema: {
      type: 'object',
      properties: {
        result: { type: 'string' },
      },
      required: ['result'],
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
  });

  test('Create and retrieve prompt', async () => {
    const testPrompt = getRandomPrompt();
    await manager.createPrompt({ prompt: testPrompt });

    const retrievedPrompt = manager.getPrompt({
      category: testPrompt.category,
      name: testPrompt.name,
    });

    expect(retrievedPrompt).toMatchObject({
      name: testPrompt.name,
      category: testPrompt.category,
      description: testPrompt.description,
      version: testPrompt.version,
      template: testPrompt.template,
      parameters: testPrompt.parameters,
      inputSchema: testPrompt.inputSchema,
      outputSchema: testPrompt.outputSchema,
      outputType: testPrompt.outputType,
      configuration: testPrompt.configuration,
    });
  });

  test('List all prompts', async () => {
    const testPrompt = getRandomPrompt();
    await manager.createPrompt({ prompt: testPrompt });
    const allPrompts = await manager.listPrompts({});
    expect(allPrompts).toHaveLength(1);
    expect(allPrompts[0]).toMatchObject({
      name: testPrompt.name,
      category: testPrompt.category,
    });
  });

  test('List prompts by category', async () => {
    const testPrompt = getRandomPrompt();
    await manager.createPrompt({ prompt: testPrompt });
    const categoryPrompts = await manager.listPrompts({ category: testPrompt.category });
    expect(categoryPrompts).toHaveLength(1);
    expect(categoryPrompts[0].name).toBe(testPrompt.name);
  });

  test('Update prompt', async () => {
    const testPrompt = getRandomPrompt();
    await manager.createPrompt({ prompt: testPrompt });

    const updatedPrompt: Partial<IPrompt<IPromptInput, IPromptOutput>> = {
      description: `An updated prompt for ${testPrompt.category.replace('test_', '')}`,
      version: '1.1.0',
      template: 'Updated process {{input}} using {{algorithm}}',
    };

    await manager.updatePrompt({
      category: testPrompt.category,
      name: testPrompt.name,
      updates: updatedPrompt,
    });

    const retrievedPrompt = manager.getPrompt({
      category: testPrompt.category,
      name: testPrompt.name,
    });

    expect(retrievedPrompt.description).toBe(updatedPrompt.description);
    expect(retrievedPrompt.version).toBe(updatedPrompt.version);
    expect(retrievedPrompt.template).toBe(updatedPrompt.template);
  });

  test('Delete prompt', async () => {
    const testPrompt = getRandomPrompt();
    await manager.createPrompt({ prompt: testPrompt });

    await manager.deletePrompt({
      category: testPrompt.category,
      name: testPrompt.name,
    });

    expect(() => manager.getPrompt({
      category: testPrompt.category,
      name: testPrompt.name,
    })).toThrow();
  });

  test('Create and delete category', async () => {
    const testCategory = getRandomElement(categories);
    await manager.createCategory({ categoryName: testCategory });

    let categories = await manager.listCategories();
    expect(categories).toContain(testCategory);

    await manager.deleteCategory({ categoryName: testCategory });

    categories = await manager.listCategories();
    expect(categories).not.toContain(testCategory);
  });

  test('Format prompt', async () => {
    const testPrompt = getRandomPrompt();
    await manager.createPrompt({ prompt: testPrompt });
    const formattedPrompt = manager.formatPrompt({
      category: testPrompt.category,
      name: testPrompt.name,
      params: { input: 'test data', algorithm: 'test algorithm' },
    });
    expect(formattedPrompt).toBe('Process test data using test algorithm');
  });

  test('Execute prompt', async () => {
    const testPrompt = getRandomPrompt();
    await manager.createPrompt({ prompt: testPrompt });
    const result = await manager.executePrompt({
      category: testPrompt.category,
      name: testPrompt.name,
      params: { input: 'test data', algorithm: 'test algorithm' },
    });
    expect(result).toHaveProperty('result');
    expect(typeof result.result).toBe('string');
  });

  test('Version prompt', async () => {
    const testPrompt = getRandomPrompt();
    await manager.createPrompt({ prompt: testPrompt });

    // List versions
    let versions = await manager.versionPrompt({
      action: 'list',
      category: testPrompt.category,
      name: testPrompt.name,
    });
    expect(versions).toContain('1.0.0');

    // Create new version
    await manager.versionPrompt({
      action: 'create',
      category: testPrompt.category,
      name: testPrompt.name,
    });

    versions = await manager.versionPrompt({
      action: 'list',
      category: testPrompt.category,
      name: testPrompt.name,
    });
    expect(versions).toContain('1.0.1');

    // Switch version
    await manager.versionPrompt({
      action: 'switch',
      category: testPrompt.category,
      name: testPrompt.name,
      version: '1.0.0',
    });

    const prompt = manager.getPrompt({
      category: testPrompt.category,
      name: testPrompt.name,
    });
    expect(prompt.version).toBe('1.0.0');
  });

  test('Error handling - non-existent prompt', async () => {
    await expect(manager.getPrompt({
      category: 'test_NonExistent',
      name: 'test_NonExistentPrompt',
    })).rejects.toThrow();
  });

  test('Error handling - invalid prompt data', async () => {
    const invalidPrompt = { ...getRandomPrompt(), name: '' };
    await expect(manager.createPrompt({ prompt: invalidPrompt as any })).rejects.toThrow();
  });
});
