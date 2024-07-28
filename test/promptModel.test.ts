import { expect, test, describe, beforeAll, afterAll, beforeEach, afterEach } from "bun:test";
import { PromptManager } from "../src/promptManager";
import { PromptFileSystem } from "../src/promptFileSystem";
import { configManager } from "../src/config/PromptProjectConfigManager";
import fs from "fs/promises";
import path from "path";
import { IPrompt, IPromptInput, IPromptOutput } from "../src/types/interfaces";

const TEST_PROMPTS_PATH = path.join(process.cwd(), "test_prompts");
let promptManager: PromptManager;
let fileSystem: PromptFileSystem;

// Dummy base objects for testing
const dummyPromptData: IPrompt<IPromptInput, IPromptOutput> = {
  name: "testPrompt",
  category: "testCategory",
  description: "A test prompt",
  version: "1.0.0",
  template: "This is a {{test}} prompt",
  parameters: ["test"],
  defaultModelName: "test-model",
  metadata: {
    created: new Date().toISOString(),
    lastModified: new Date().toISOString(),
  },
  configuration: {
    modelName: "test-model",
    temperature: 0.7,
    maxTokens: 100,
    topP: 1,
    frequencyPenalty: 0,
    presencePenalty: 0,
    stopSequences: [],
  },
  outputType: "plain",
  inputSchema: {
    type: "object",
    properties: {
      test: { type: "string" },
    },
    required: ["test"],
  },
  outputSchema: {
    type: "object",
    properties: {
      text: { type: "string" },
    },
    required: ["text"],
  },
};

describe("PromptModel", () => {
  beforeAll(async () => {
    await fs.mkdir(TEST_PROMPTS_PATH, { recursive: true });
    await configManager.updateConfig({
      promptsDir: TEST_PROMPTS_PATH,
      outputDir: path.join(TEST_PROMPTS_PATH, 'output'),
    });
  });

  beforeEach(async () => {
    await configManager.initialize();
    fileSystem = PromptFileSystem.getInstance();
    await fileSystem.initialize();
    promptManager = PromptManager.getInstance();
    await promptManager.initialize();
  });


  afterAll(async () => {
    await fs.rm(TEST_PROMPTS_PATH, { recursive: true, force: true });
  });

  test("create and retrieve prompt", async () => {
    await promptManager.createPrompt({ prompt: dummyPromptData });
    const retrievedPrompt = promptManager.getPrompt({ category: dummyPromptData.category, name: dummyPromptData.name });
    expect(retrievedPrompt.name).toBe(dummyPromptData.name);
    expect(retrievedPrompt.template).toBe(dummyPromptData.template);
  });

  test("format prompt", async () => {
    await promptManager.createPrompt({ prompt: dummyPromptData });
    const prompt = promptManager.getPrompt({ category: dummyPromptData.category, name: dummyPromptData.name });
    const formatted = prompt.format({ test: "formatted" });
    expect(formatted).toBe("This is a formatted prompt");
  });

  test("execute prompt", async () => {
    await promptManager.createPrompt({ prompt: dummyPromptData });
    const prompt = promptManager.getPrompt({ category: dummyPromptData.category, name: dummyPromptData.name });
    const result = await prompt.execute({ test: "executed" });
    expect(result).toHaveProperty("text");
    expect(typeof result.text).toBe("string");
  });

  test("stream prompt", async () => {
    await promptManager.createPrompt({ prompt: dummyPromptData });
    const prompt = promptManager.getPrompt({ category: dummyPromptData.category, name: dummyPromptData.name });
    const stream = await prompt.stream({ test: "streamed" });
    let result = "";
    for await (const chunk of stream) {
      result += chunk;
    }
    expect(result).toBeTruthy();
    expect(typeof result).toBe("string");
  });

  test("list prompts", async () => {
    await promptManager.createPrompt({ prompt: { ...dummyPromptData, name: "prompt1" } });
    await promptManager.createPrompt({ prompt: { ...dummyPromptData, name: "prompt2" } });

    const prompts = await promptManager.listPrompts({ category: dummyPromptData.category });
    expect(prompts).toContainEqual(expect.objectContaining({
      name: "prompt1",
      category: dummyPromptData.category,
    }));
    expect(prompts).toContainEqual(expect.objectContaining({
      name: "prompt2",
      category: dummyPromptData.category,
    }));

    const allPrompts = await promptManager.listPrompts({});
    expect(allPrompts.length).toBe(2);
  });

  test("update prompt", async () => {
    await promptManager.createPrompt({ prompt: dummyPromptData });
    await promptManager.updatePrompt({
      category: dummyPromptData.category,
      name: dummyPromptData.name,
      updates: { description: "Updated description" }
    });

    const updatedPrompt = promptManager.getPrompt({ category: dummyPromptData.category, name: dummyPromptData.name });
    expect(updatedPrompt.description).toBe("Updated description");
  });

  test("delete prompt", async () => {
    await promptManager.createPrompt({ prompt: dummyPromptData });
    await promptManager.deletePrompt({ category: dummyPromptData.category, name: dummyPromptData.name });

    const prompts = await promptManager.listPrompts({});
    expect(prompts).toHaveLength(0);
  });

  test("version management", async () => {
    await promptManager.createPrompt({ prompt: dummyPromptData });
    const prompt = promptManager.getPrompt({ category: dummyPromptData.category, name: dummyPromptData.name });

    const initialVersion = prompt.version;
    await promptManager.updatePrompt({
      category: dummyPromptData.category,
      name: dummyPromptData.name,
      updates: { template: "Updated template" }
    });

    const updatedPrompt = promptManager.getPrompt({ category: dummyPromptData.category, name: dummyPromptData.name });
    expect(updatedPrompt.version).not.toBe(initialVersion);

    const versions = await updatedPrompt.versions();
    expect(versions).toContain(initialVersion);
    expect(versions).toContain(updatedPrompt.version);
    expect(versions.length).toBe(2);

    await updatedPrompt.switchVersion(initialVersion);
    expect(updatedPrompt.template).toBe(dummyPromptData.template);
  });

  test("error handling - retrieve non-existent prompt", async () => {
    await expect(
      promptManager.getPrompt({ category: "nonexistent", name: "nonexistent" })
    ).rejects.toThrow();
  });

  test("error handling - create prompt with invalid data", async () => {
    const invalidPrompt = { ...dummyPromptData, name: "" };
    await expect(
      promptManager.createPrompt({ prompt: invalidPrompt as any })
    ).rejects.toThrow();
  });
});
