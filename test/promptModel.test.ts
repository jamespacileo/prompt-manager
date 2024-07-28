import { expect, test, describe, beforeAll, afterAll, beforeEach, afterEach } from "bun:test";
import { PromptModel } from "../src/promptModel";
import { PromptFileSystem } from "../src/promptFileSystem";
import fs from "fs/promises";
import path from "path";
import path from "path";
import { IPrompt, IPromptInput, IPromptOutput } from "../src/types/interfaces";

const TEST_PROMPTS_PATH = path.join(process.cwd(), "test_prompts");
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
    process.env.PROMPTS_DIR = TEST_PROMPTS_PATH;
  });

  beforeEach(() => {
    fileSystem = new PromptFileSystem();
  });

  afterEach(async () => {
    const prompts = await fileSystem.listPrompts({});
    for (const prompt of prompts) {
      await fileSystem.deletePrompt({ category: prompt.category, promptName: prompt.name });
    }
  });

  afterAll(async () => {
    await fs.rm(TEST_PROMPTS_PATH, { recursive: true, force: true });
  });

  test("constructor initializes correctly", () => {
    const prompt = new PromptModel(dummyPromptData);
    expect(prompt.name).toBe(dummyPromptData.name);
    expect(prompt.category).toBe(dummyPromptData.category);
    expect(prompt.template).toBe(dummyPromptData.template);
  });

  test("save and load prompt", async () => {
    const prompt = new PromptModel(dummyPromptData);
    await prompt.save();

    const loadedPrompt = await PromptModel.loadPromptByName(`${prompt.category}/${prompt.name}`);
    expect(loadedPrompt.name).toBe(prompt.name);
    expect(loadedPrompt.template).toBe(prompt.template);
    expect(loadedPrompt.isLoadedFromStorage).toBe(true);
  });

  test("format prompt", () => {
    const prompt = new PromptModel(dummyPromptData);
    const formatted = prompt.format({ test: "formatted" });
    expect(formatted).toBe("This is a formatted prompt");
  });

  test("execute prompt", async () => {
    const prompt = new PromptModel(dummyPromptData);
    const result = await prompt.execute({ test: "executed" });
    expect(result).toHaveProperty("text");
    expect(typeof result.text).toBe("string");
  });

  test("stream prompt", async () => {
    const prompt = new PromptModel(dummyPromptData);
    const stream = await prompt.stream({ test: "streamed" });
    let result = "";
    for await (const chunk of stream) {
      result += chunk;
    }
    expect(result).toBeTruthy();
    expect(typeof result).toBe("string");
  });

  test("list prompts", async () => {
    const prompt1 = new PromptModel({ ...dummyPromptData, name: "prompt1" });
    const prompt2 = new PromptModel({ ...dummyPromptData, name: "prompt2" });
    await prompt1.save();
    await prompt2.save();

    const prompts = await PromptModel.listPrompts(dummyPromptData.category);
    expect(prompts).toContainEqual({
      name: "prompt1",
      category: dummyPromptData.category,
      filePath: path.join(TEST_PROMPTS_PATH, dummyPromptData.category, "prompt1", "prompt.json")
    });
    expect(prompts).toContainEqual({
      name: "prompt2",
      category: dummyPromptData.category,
      filePath: path.join(TEST_PROMPTS_PATH, dummyPromptData.category, "prompt2", "prompt.json")
    });

    const allPrompts = await PromptModel.listPrompts();
    expect(allPrompts).toContainEqual({
      name: "prompt1",
      category: dummyPromptData.category,
      filePath: path.join(TEST_PROMPTS_PATH, dummyPromptData.category, "prompt1", "prompt.json")
    });
    expect(allPrompts).toContainEqual({
      name: "prompt2",
      category: dummyPromptData.category,
      filePath: path.join(TEST_PROMPTS_PATH, dummyPromptData.category, "prompt2", "prompt.json")
    });
  });

  test("update metadata", () => {
    const prompt = new PromptModel(dummyPromptData);
    const newMetadata = {
      created: new Date().toISOString(),
      lastModified: new Date().toISOString(),
    };
    prompt.updateMetadata(newMetadata);
    expect(prompt.metadata).toEqual(newMetadata);
  });

  test("get summary", () => {
    const prompt = new PromptModel(dummyPromptData);
    const summary = prompt.getSummary();
    expect(summary).toBe(`${dummyPromptData.name} (${dummyPromptData.category}): ${dummyPromptData.description}`);
  });

  test("create and delete prompt", async () => {
    const newPrompt = new PromptModel({ ...dummyPromptData, name: "newPrompt" });
    await newPrompt.save();

    const loadedPrompt = await PromptModel.loadPromptByName(`${newPrompt.category}/${newPrompt.name}`);
    expect(loadedPrompt.name).toBe("newPrompt");

    await PromptModel.deletePrompt(newPrompt.category, newPrompt.name);
    await expect(PromptModel.loadPromptByName(`${newPrompt.category}/${newPrompt.name}`)).rejects.toThrow();
  });

  test("update prompt", async () => {
    const prompt = new PromptModel(dummyPromptData);
    await prompt.save();

    prompt.description = "Updated description";
    await prompt.save();

    const loadedPrompt = await PromptModel.loadPromptByName(`${prompt.category}/${prompt.name}`);
    expect(loadedPrompt.description).toBe("Updated description");
  });

  test("version management", async () => {
    const prompt = new PromptModel(dummyPromptData);
    await prompt.save();

    const initialVersion = prompt.version;
    prompt.template = "Updated template";
    await prompt.save();

    const versions = await prompt.versions();
    expect(versions).toContain(initialVersion);
    expect(versions).toContain(prompt.version);
    expect(versions.length).toBe(2);

    await prompt.switchVersion(initialVersion);
    expect(prompt.template).toBe(dummyPromptData.template);
  });
});
