import { expect, test, describe, beforeAll, afterAll, beforeEach, afterEach } from "bun:test";
import { PromptModel } from "../src/promptModel";
import { PromptFileSystem } from "../src/promptFileSystem";
import fs from "fs/promises";
import path from "path";
import { IPromptModelRequired } from "../src/types/interfaces";

const TEST_PROMPTS_PATH = path.join(process.cwd(), "test_prompts");
let fileSystem: PromptFileSystem;

// Dummy base objects for testing
const dummyPromptData: Partial<PromptModel> & IPromptModelRequired = {
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
  outputType: "plain" as const,
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
  });

  beforeEach(() => {
    fileSystem = new PromptFileSystem();
  });

  afterEach(async () => {
    const prompts = await fileSystem.listPrompts({});
    for (const prompt of prompts) {
      const [category, promptName] = prompt.split('/');
      await fileSystem.deletePrompt({ category, promptName });
    }
  });

  afterAll(async () => {
    await fs.rm(TEST_PROMPTS_PATH, { recursive: true, force: true });
  });

  test("constructor initializes correctly", () => {
    const prompt = new PromptModel(dummyPromptData, fileSystem);
    expect(prompt.name).toBe(dummyPromptData.name);
    expect(prompt.category).toBe(dummyPromptData.category);
    expect(prompt.template).toBe(dummyPromptData.template);
  });

  test("save and load prompt", async () => {
    const prompt = new PromptModel(dummyPromptData, fileSystem);
    await prompt.save();

    const loadedPrompt = await PromptModel.loadPromptByName(`${prompt.category}/${prompt.name}`, fileSystem);
    expect(loadedPrompt.name).toBe(prompt.name);
    expect(loadedPrompt.template).toBe(prompt.template);
    expect(loadedPrompt.isLoadedFromStorage).toBe(true);
  });

  test("format prompt", () => {
    const prompt = new PromptModel(dummyPromptData, fileSystem);
    const formatted = prompt.format({ test: "formatted" });
    expect(formatted).toBe("This is a formatted prompt");
  });

  test("execute prompt", async () => {
    const prompt = new PromptModel(dummyPromptData, fileSystem);
    // Mock the execute method to avoid actual API calls
    prompt.execute = async () => ({ text: "Mocked execution result" });
    const result = await prompt.execute({ test: "executed" });
    expect(result).toHaveProperty("text");
    expect(typeof result.text).toBe("string");
  });

  test("stream prompt", async () => {
    const prompt = new PromptModel(dummyPromptData, fileSystem);
    // Mock the stream method to avoid actual API calls
    // prompt.stream = async function* () {
    //   yield "Mocked ";
    //   yield "stream ";
    //   yield "result";
    // };
    const stream = await prompt.stream({ test: "streamed" });
    let result = "";
    for await (const chunk of stream) {
      result += chunk;
    }
    expect(result).toBeTruthy();
    expect(typeof result).toBe("string");
  });

  test("list prompts", async () => {
    const prompt1 = new PromptModel({ ...dummyPromptData, name: "prompt1" }, fileSystem);
    const prompt2 = new PromptModel({ ...dummyPromptData, name: "prompt2" }, fileSystem);
    await prompt1.save();
    await prompt2.save();

    const prompts = await PromptModel.listPrompts(dummyPromptData.category, fileSystem);
    expect(prompts).toContainEqual({
      name: "prompt1",
      category: dummyPromptData.category,
      relativeFilePath: `${dummyPromptData.category}/prompt1/`
    });
    expect(prompts).toContainEqual({
      name: "prompt2",
      category: dummyPromptData.category,
      relativeFilePath: `${dummyPromptData.category}/prompt2/`
    });

    const allPrompts = await PromptModel.listPrompts(undefined, fileSystem);
    expect(allPrompts).toContainEqual({
      name: "prompt1",
      category: dummyPromptData.category,
      relativeFilePath: `${dummyPromptData.category}/prompt1/`
    });
    expect(allPrompts).toContainEqual({
      name: "prompt2",
      category: dummyPromptData.category,
      relativeFilePath: `${dummyPromptData.category}/prompt2/`
    });
  });

  test("update metadata", () => {
    const prompt = new PromptModel(dummyPromptData, fileSystem);
    const newMetadata = {
      created: new Date().toISOString(),
      lastModified: new Date().toISOString(),
    };
    prompt.updateMetadata({ metadata: newMetadata });
    expect(prompt.metadata).toEqual(newMetadata);
  });

  test("get summary", () => {
    const prompt = new PromptModel(dummyPromptData, fileSystem);
    const summary = prompt.getSummary();
    expect(summary).toBe(`${dummyPromptData.name} (${dummyPromptData.category}): ${dummyPromptData.description}`);
  });

  test("list prompts", async () => {
    const prompt1 = new PromptModel({ ...dummyPromptData, name: "prompt1" }, fileSystem);
    const prompt2 = new PromptModel({ ...dummyPromptData, name: "prompt2" }, fileSystem);
    await prompt1.save();
    await prompt2.save();

    const prompts = await PromptModel.listPrompts(dummyPromptData.category, fileSystem);
    expect(prompts).toContainEqual({
      name: "prompt1",
      category: dummyPromptData.category,
      relativeFilePath: `${dummyPromptData.category}/prompt1/prompt.json`
    });
    expect(prompts).toContainEqual({
      name: "prompt2",
      category: dummyPromptData.category,
      relativeFilePath: `${dummyPromptData.category}/prompt2/prompt.json`
    });
  });
});
