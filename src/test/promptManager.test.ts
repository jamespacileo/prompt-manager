import { expect, test, describe, beforeAll, afterAll, beforeEach, afterEach } from "bun:test";
import { Container } from 'typedi';
import { PromptManager } from '../promptManager';
import { PromptFileSystem } from '../promptFileSystem';
import { PromptProjectConfigManager } from "../config/PromptProjectConfigManager";
import fs from 'fs/promises';
import path from 'path';
import { IPrompt, IPromptInput, IPromptOutput } from "../types/interfaces";

const getRandomElement = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];

const categories = [
  'test_NaturalLanguageProcessing_1',
  'test_MachineLearning_2',
  'test_ComputerVision_3',
  'test_DataAnalysis_4',
  'test_ArtificialIntelligence_5',
  'test_DeepLearning_6',
  'test_RoboticProcess_7',
  'test_SpeechRecognition_8',
  'test_TextGeneration_9',
  'test_SentimentAnalysis_10'
];

const promptNames = [
  'test_LanguageModel_A',
  'test_ImageClassifier_B',
  'test_SentimentAnalyzer_C',
  'test_TextSummarizer_D',
  'test_NamedEntityRecognizer_E',
  'test_QuestionAnswering_F',
  'test_MachineTranslation_G',
  'test_SpeechToText_H',
  'test_TextToSpeech_I',
  'test_AnomalyDetection_J'
];

describe('PromptManager', () => {
  let manager: PromptManager;
  let fileSystem: PromptFileSystem;
  let configManager: PromptProjectConfigManager;
  let testDir: string;

  beforeAll(async () => {
    testDir = path.join(process.cwd(), 'test-prompts-manager');
    await fs.mkdir(testDir, { recursive: true });
  });

  beforeEach(async () => {
    Container.reset();

    configManager = Container.get(PromptProjectConfigManager);
    await configManager.initialize();
    await configManager.updateConfig({
      promptsDir: testDir,
      outputDir: path.join(testDir, 'output'),
    });

    fileSystem = Container.get(PromptFileSystem);
    await fileSystem.initialize();

    manager = Container.get(PromptManager);
    await manager.initialize();
  });

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
    defaultModelName: 'gpt-4o-mini',
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
      modelName: 'gpt-4o-mini',
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

    const { name, category, description, version, template, parameters, inputSchema, outputSchema, outputType, configuration } = retrievedPrompt;

    expect({ name, category, description, version, template, parameters, inputSchema, outputSchema, outputType, configuration }).toMatchObject({
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
    const createdPrompt = allPrompts.find(p => p.name === testPrompt.name && p.category === testPrompt.category);
    expect(createdPrompt).toBeDefined();
    expect(createdPrompt).toMatchObject({
      name: testPrompt.name,
      category: testPrompt.category,
    });
  });

  test('List prompts by category', async () => {
    const testPrompt = getRandomPrompt();
    await manager.createPrompt({ prompt: testPrompt });
    const categoryPrompts = await manager.listPrompts({ category: testPrompt.category });
    const createdPrompt = categoryPrompts.find(p => p.name === testPrompt.name);
    expect(createdPrompt).toBeDefined();
    expect(createdPrompt?.name).toBe(testPrompt.name);
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

    expect(retrievedPrompt.description).toBe(updatedPrompt.description!);
    expect(retrievedPrompt.version).toBe("1.1.1");
    expect(retrievedPrompt.template).toBe(updatedPrompt.template!);
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
    const testCategory = "testCategory_Unique";
    await manager.createCategory(testCategory);

    let categories = Object.keys(manager.categories);
    expect(categories).toContain(testCategory);

    await manager.deleteCategory(testCategory);

    categories = Object.keys(manager.categories);
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
    // expect(versions).toEqual({})

    // check if versions is an array
    expect(Array.isArray(versions.result)).toBe(true);

    expect(versions.result).toContain('1.0.0');

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
    expect(Array.isArray(versions.result)).toBe(true);

    expect(versions.result).toContain('1.0.1');

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

  test('Error handling - non-existent prompt', () => {
    expect(() => manager.getPrompt({
      category: 'test_NonExistent',
      name: 'test_NonExistentPrompt',
    })).toThrow();
  });

  test('Error handling - invalid prompt data', async () => {
    const invalidPrompt = { ...getRandomPrompt(), name: '' };
    await expect(manager.createPrompt({ prompt: invalidPrompt as any })).rejects.toThrow();
  });
});
