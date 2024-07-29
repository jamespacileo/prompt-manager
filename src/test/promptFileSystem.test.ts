import { expect, test, beforeAll, afterAll, beforeEach, afterEach, describe } from "bun:test";
import { Container } from 'typedi';
import { PromptFileSystem } from "../promptFileSystem";
import { PromptProjectConfigManager } from "../config/PromptProjectConfigManager";
import { IPrompt, IPromptInput, IPromptOutput } from "../types/interfaces";
import fs from "fs/promises";
import path from "path";


const COSMIC_PROMPT: IPrompt<IPromptInput, IPromptOutput> = {
  name: "cosmicWhisper",
  category: "celestialMystery",
  description: "A prompt that echoes the secrets of the universe",
  version: "1.0.0",
  template: "In the vast expanse of cosmic wonder, {{celestialBody}} reveals its hidden truths",
  parameters: ["celestialBody"],
  metadata: {
    created: new Date().toISOString(),
    lastModified: new Date().toISOString(),
  },
  outputSchema: {
    type: "object",
    properties: {
      cosmicTruth: { type: "string" },
    },
    required: ["cosmicTruth"],
  },
  outputType: "structured",
  inputSchema: {
    type: "object",
    properties: {
      celestialBody: { type: "string" },
    },
    required: ["celestialBody"],
  },
  configuration: {
    modelName: "default-model",
    temperature: 0.7,
    maxTokens: 100,
    topP: 1,
    frequencyPenalty: 0,
    presencePenalty: 0,
    stopSequences: [],
  },
};

describe("PromptFileSystem", () => {
  let promptFileSystem: PromptFileSystem;
  let testDir: string;
  let originalPromptsDir: string;
  let configManager: PromptProjectConfigManager;

  beforeAll(async () => {
    originalPromptsDir = process.env.PROMPTS_DIR || '';
    testDir = path.resolve(process.cwd(), 'test-prompts');
    await fs.mkdir(testDir, { recursive: true });
    process.env.PROMPTS_DIR = testDir;
  });

  beforeEach(async () => {
    Container.reset();

    configManager = Container.get(PromptProjectConfigManager);
    await configManager.initialize();
    await configManager.updateConfig({ promptsDir: testDir });

    promptFileSystem = Container.get(PromptFileSystem);
    await promptFileSystem.initialize();
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
    await fs.mkdir(testDir, { recursive: true });
  });

  afterAll(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
    if (originalPromptsDir) {
      process.env.PROMPTS_DIR = originalPromptsDir;
    } else {
      delete process.env.PROMPTS_DIR;
    }
  });

  test("savePrompt and loadPrompt", async () => {
    await promptFileSystem.savePrompt({ promptData: COSMIC_PROMPT });
    const loadedPrompt = await promptFileSystem.loadPrompt({
      category: "celestialMystery",
      promptName: "cosmicWhisper",
    });

    expect(loadedPrompt).toEqual(COSMIC_PROMPT);
  });

  test("promptExists", async () => {
    await promptFileSystem.savePrompt({ promptData: COSMIC_PROMPT });
    const exists = await promptFileSystem.promptExists({
      category: "celestialMystery",
      promptName: "cosmicWhisper",
    });
    expect(exists).toBe(true);

    const notExists = await promptFileSystem.promptExists({
      category: "celestialMystery",
      promptName: "nonExistentPrompt",
    });
    expect(notExists).toBe(false);
  });

  test("listPrompts", async () => {
    await promptFileSystem.savePrompt({ promptData: COSMIC_PROMPT });
    const stargazerPrompt = {
      ...COSMIC_PROMPT,
      name: "stargazerDreams",
      description: "A prompt that captures the essence of stargazing",
    };
    await promptFileSystem.savePrompt({ promptData: stargazerPrompt });

    const prompts = await promptFileSystem.listPrompts();
    expect(prompts.length).toBeGreaterThanOrEqual(2);
    // expect(prompts).toContainEqual(
    //   expect.objectContaining({
    //     name: "cosmicWhisper",
    //     category: "celestialMystery",
    //     filePath: expect.stringContaining(path.join("celestialMystery", "cosmicWhisper", "prompt.json"))
    //   })
    // );
    // expect(prompts).toContainEqual(
    //   expect.objectContaining({
    //     name: "stargazerDreams",
    //     category: "celestialMystery",
    //     filePath: expect.stringContaining(path.join("celestialMystery", "stargazerDreams", "prompt.json"))
    //   })
    // );

    const categoryPrompts = await promptFileSystem.listPrompts({ category: "celestialMystery" });
    expect(categoryPrompts).toMatchSnapshot()
    expect(categoryPrompts.length).toBeGreaterThanOrEqual(2);
  });

});
