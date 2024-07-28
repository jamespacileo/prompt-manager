import { expect, test, beforeAll, afterAll, beforeEach, afterEach, describe } from "bun:test";
import { PromptFileSystem } from "../src/promptFileSystem";
import { IPrompt, IPromptInput, IPromptOutput } from "../src/types/interfaces";
import fs from "fs/promises";
import path from "path";
import { PromptProjectConfigManager } from "../src/config/PromptProjectConfigManager";

let promptFileSystem: PromptFileSystem;
let testDir: string;
let originalPromptsDir: string;

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

beforeAll(async () => {
  originalPromptsDir = process.env.PROMPTS_DIR || '';
  testDir = path.resolve(process.cwd(), 'test-prompts');
  await fs.mkdir(testDir, { recursive: true });
  process.env.PROMPTS_DIR = testDir;
  await PromptProjectConfigManager.getInstance().initialize();
  await PromptProjectConfigManager.getInstance().updateConfig({ promptsDir: testDir });
});

beforeEach(async () => {
  promptFileSystem = new PromptFileSystem();
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
  await PromptProjectConfigManager.getInstance().updateConfig({ promptsDir: originalPromptsDir });
});

describe("PromptFileSystem", () => {
  test("savePrompt and loadPrompt", async () => {
    await promptFileSystem.savePrompt({ promptData: COSMIC_PROMPT });
    const loadedPrompt = await promptFileSystem.loadPrompt({
      category: "celestialMystery",
      promptName: "cosmicWhisper",
    });

    expect(loadedPrompt).toEqual(COSMIC_PROMPT);
  });

  test("promptExists", async () => {
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
    const stargazerPrompt = {
      ...COSMIC_PROMPT,
      name: "stargazerDreams",
      description: "A prompt that captures the essence of stargazing",
    };
    await promptFileSystem.savePrompt({ promptData: stargazerPrompt });

    const prompts = await promptFileSystem.listPrompts();
    expect(prompts.length).toBeGreaterThanOrEqual(2);
    expect(prompts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "cosmicWhisper",
          category: "celestialMystery",
          filePath: expect.stringContaining(path.join("celestialMystery", "cosmicWhisper", "prompt.json"))
        }),
        expect.objectContaining({
          name: "stargazerDreams",
          category: "celestialMystery",
          filePath: expect.stringContaining(path.join("celestialMystery", "stargazerDreams", "prompt.json"))
        })
      ])
    );

    const categoryPrompts = await promptFileSystem.listPrompts({ category: "celestialMystery" });
    expect(categoryPrompts.length).toBeGreaterThanOrEqual(2);
  });

  test("listCategories", async () => {
    const categories = await promptFileSystem.listCategories();
    expect(categories).toContain("celestialMystery");
  });

  test("searchPrompts", async () => {
    const searchResults = await promptFileSystem.searchPrompts({ query: "cosmic" });
    expect(searchResults).toContainEqual({
      name: "cosmicWhisper",
      category: "celestialMystery",
      filePath: path.join(testDir, "celestialMystery", "cosmicWhisper", "prompt.json")
    });
  });

  test("searchCategories", async () => {
    const searchResults = await promptFileSystem.searchCategories({ query: "celestial" });
    expect(searchResults).toContain("celestialMystery");
  });

  test("getPromptVersions", async () => {
    const updatedPrompt = { ...COSMIC_PROMPT, version: "1.1.0" };
    await promptFileSystem.savePrompt({ promptData: updatedPrompt });

    const versions = await promptFileSystem.getPromptVersions({
      category: "celestialMystery",
      promptName: "cosmicWhisper",
    });
    expect(versions).toEqual(["1.1.0", "1.0.0"]);
  });

  test("deletePrompt", async () => {
    await promptFileSystem.deletePrompt({
      category: "celestialMystery",
      promptName: "stargazerDreams",
    });
    const exists = await promptFileSystem.promptExists({
      category: "celestialMystery",
      promptName: "stargazerDreams",
    });
    expect(exists).toBe(false);
  });

  test("renamePrompt", async () => {
    const nebulaNarrativePrompt = {
      ...COSMIC_PROMPT,
      name: "nebulaNarrative",
      description: "A prompt that weaves tales of nebulae",
    };
    await promptFileSystem.savePrompt({ promptData: nebulaNarrativePrompt });

    await promptFileSystem.renamePrompt({
      currentCategory: "celestialMystery",
      currentName: "nebulaNarrative",
      newCategory: "galacticLore",
      newName: "nebulaChronicles",
    });

    const oldExists = await promptFileSystem.promptExists({
      category: "celestialMystery",
      promptName: "nebulaNarrative",
    });
    expect(oldExists).toBe(false);

    const newExists = await promptFileSystem.promptExists({
      category: "galacticLore",
      promptName: "nebulaChronicles",
    });
    expect(newExists).toBe(true);

    const loadedPrompt = await promptFileSystem.loadPrompt({
      category: "galacticLore",
      promptName: "nebulaChronicles",
    });
    expect(loadedPrompt.name).toBe("nebulaChronicles");
    expect(loadedPrompt.category).toBe("galacticLore");
  }, 10000);  // Increase timeout to 10 seconds

  test("createCategory and deleteCategory", async () => {
    await promptFileSystem.createCategory({ categoryName: "stellarSaga" });
    let categories = await promptFileSystem.listCategories();
    expect(categories).toContain("stellarSaga");

    await promptFileSystem.deleteCategory({ categoryName: "stellarSaga" });
    categories = await promptFileSystem.listCategories();
    expect(categories).not.toContain("stellarSaga");
  });
});
