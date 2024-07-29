import { expect, test, describe, beforeAll, afterAll, beforeEach, afterEach, jest } from "bun:test";
import { Container } from 'typedi';
import { PromptManager } from "../promptManager";
import { PromptFileSystem } from "../promptFileSystem";
import { PromptProjectConfigManager } from "../config/PromptProjectConfigManager";
import fs from "fs/promises";
import path from "path";
import { IPrompt, IPromptInput, IPromptOutput } from "../types/interfaces";

// Function to create a unique dummy prompt for each test
const createUniqueDummyPrompt = (testName: string): IPrompt<IPromptInput, IPromptOutput> => ({
  name: `testPrompt_${testName}`,
  category: `testCategory_${testName}`,
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
});

describe("PromptModel", () => {
  const testProjectDir = path.join(process.cwd(), "test-project")
  const TEST_PROMPTS_PATH = path.join(testProjectDir, "test_prompts");
  let promptManager: PromptManager;
  let fileSystem: PromptFileSystem;
  let configManager: PromptProjectConfigManager;


  beforeAll(async () => {
    process.cwd = jest.fn().mockReturnValue(testProjectDir);
    await fs.mkdir(testProjectDir, { recursive: true });
  });

  beforeEach(async () => {
    Container.reset();

    configManager = Container.get(PromptProjectConfigManager);
    await configManager.initialize();
    await configManager.updateConfig({
      promptsDir: "test_prompts",
      outputDir: path.join(TEST_PROMPTS_PATH, 'output'),
    });

    fileSystem = Container.get(PromptFileSystem);
    await fileSystem.initialize();

    console.log(`Config manager initialized`);

    promptManager = Container.get(PromptManager);
    await promptManager.initialize();

    console.log(`Prompt manager initialized`);
  });

  afterAll(async () => {
    await fs.rm(TEST_PROMPTS_PATH, { recursive: true, force: true });
  });

  test("create and retrieve prompt", async () => {
    const dummyPrompt = createUniqueDummyPrompt("createAndRetrieve");
    console.log(`Creating prompt ${dummyPrompt.name} in category ${dummyPrompt.category}`);
    await promptManager.createPrompt({ prompt: dummyPrompt });
    console.log(`Prompt created`);
    const retrievedPrompt = promptManager.getPrompt({ category: dummyPrompt.category, name: dummyPrompt.name });
    expect(retrievedPrompt.name).toBe(dummyPrompt.name);
    expect(retrievedPrompt.template).toBe(dummyPrompt.template);
  });

  test("format prompt", async () => {
    const dummyPrompt = createUniqueDummyPrompt("format");
    await promptManager.createPrompt({ prompt: dummyPrompt });
    const prompt = promptManager.getPrompt({ category: dummyPrompt.category, name: dummyPrompt.name });
    const formatted = prompt.format({ test: "formatted" });
    expect(formatted).toBe("This is a formatted prompt");
  });

  test("execute prompt", async () => {
    const dummyPrompt = createUniqueDummyPrompt("execute");
    await promptManager.createPrompt({ prompt: dummyPrompt });
    const prompt = promptManager.getPrompt({ category: dummyPrompt.category, name: dummyPrompt.name });
    const result = await prompt.execute({ test: "executed" });
    expect(result).toHaveProperty("text");
    expect(typeof result.text).toBe("string");
  });

  test("stream prompt", async () => {
    const dummyPrompt = createUniqueDummyPrompt("stream");
    await promptManager.createPrompt({ prompt: dummyPrompt });
    const prompt = promptManager.getPrompt({ category: dummyPrompt.category, name: dummyPrompt.name });
    const stream = await prompt.stream({ test: "streamed" });
    let result = "";
    for await (const chunk of stream) {
      result += chunk;
    }
    expect(result).toBeTruthy();
    expect(typeof result).toBe("string");
  });

  test("list prompts", async () => {
    const dummyPrompt1 = createUniqueDummyPrompt("list1");
    const dummyPrompt2 = createUniqueDummyPrompt("list2");
    await promptManager.createPrompt({ prompt: dummyPrompt1 });
    await promptManager.createPrompt({ prompt: dummyPrompt2 });

    const prompts = await promptManager.listPrompts({ category: dummyPrompt1.category });

    const filteredPrompt1 = prompts.find(p => p.name === dummyPrompt1.name && p.category === dummyPrompt1.category);
    expect(filteredPrompt1).toBeTruthy();

    const allPrompts = await promptManager.listPrompts({});
    const filteredPrompt2 = allPrompts.find(p => p.name === dummyPrompt2.name && p.category === dummyPrompt2.category);
    expect(filteredPrompt2).toBeTruthy();
  });

  test("update prompt", async () => {
    const dummyPrompt = createUniqueDummyPrompt("update");
    await promptManager.createPrompt({ prompt: dummyPrompt });
    await promptManager.updatePrompt({
      category: dummyPrompt.category,
      name: dummyPrompt.name,
      updates: { description: "Updated description" }
    });

    const updatedPrompt = promptManager.getPrompt({ category: dummyPrompt.category, name: dummyPrompt.name });
    expect(updatedPrompt.description).toBe("Updated description");
  });

  test("delete prompt", async () => {
    const dummyPrompt = createUniqueDummyPrompt("delete");
    await promptManager.createPrompt({ prompt: dummyPrompt });
    await promptManager.deletePrompt({ category: dummyPrompt.category, name: dummyPrompt.name });

    const prompts = await promptManager.listPrompts({});
    const deletedPrompt = prompts.find(p => p.name === dummyPrompt.name && p.category === dummyPrompt.category);
    expect(deletedPrompt).toBeUndefined();
  });

  test("version management", async () => {
    const dummyPrompt = createUniqueDummyPrompt("versionManagement");
    await promptManager.createPrompt({ prompt: dummyPrompt });
    const prompt = promptManager.getPrompt({ category: dummyPrompt.category, name: dummyPrompt.name });

    const initialVersion = prompt.version;
    await promptManager.updatePrompt({
      category: dummyPrompt.category,
      name: dummyPrompt.name,
      updates: { template: "Updated template" }
    });

    const updatedPrompt = promptManager.getPrompt({ category: dummyPrompt.category, name: dummyPrompt.name });
    expect(updatedPrompt.version).not.toBe(initialVersion);

    const versions = await updatedPrompt.versions();
    expect(versions).toContain(initialVersion);
    expect(versions).toContain(updatedPrompt.version);
    expect(versions.length).toBe(2);

    await updatedPrompt.switchVersion(initialVersion);
    expect(updatedPrompt.template).toBe(dummyPrompt.template);
  });

  test("error handling - retrieve non-existent prompt", () => {
    expect(() =>
      promptManager.getPrompt({ category: "nonexistent", name: "nonexistent" })
    ).toThrow();
  });

  test("error handling - create prompt with invalid data", async () => {
    const dummyPrompt = createUniqueDummyPrompt("invalidData");
    const invalidPrompt = { ...dummyPrompt, name: "" };
    await expect(
      promptManager.createPrompt({ prompt: invalidPrompt as any })
    ).rejects.toThrow();
  });
});
