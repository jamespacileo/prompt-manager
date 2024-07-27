import { expect, test, mock } from "bun:test";
import * as commands from "../src/cli/commands";
import { PromptManager } from "../src/promptManager";
import { PromptModel } from "../src/promptModel";
import * as aiHelpers from "../src/cli/aiHelpers";
import configManager from "../src/config/PromptProjectConfigManager";

// Mock external dependencies
mock.module("@inquirer/prompts", () => ({
  input: async () => "test input",
  confirm: async () => true,
}));

mock.module("fs-extra", () => ({
  writeFile: async () => {},
  readFile: async () => "mock file content",
  stat: async () => ({ mtime: new Date() }),
}));

test("createPrompt creates a new prompt", async () => {
  const mockGeneratePromptWithAI = mock(() => Promise.resolve({
    name: "testPrompt",
    category: "testCategory",
    description: "Test description",
    template: "Test template",
    parameters: ["param1", "param2"],
    inputSchema: {},
    outputSchema: {},
    version: "1.0.0",
  }));
  mock.module("../src/cli/aiHelpers", () => ({
    ...aiHelpers,
    generatePromptWithAI: mockGeneratePromptWithAI,
  }));

  const mockCreatePrompt = mock(() => Promise.resolve());
  mock.module("../src/promptManager", () => ({
    PromptManager: class {
      async initialize() {}
      createPrompt = mockCreatePrompt;
    },
  }));

  await commands.createPrompt();

  expect(mockGeneratePromptWithAI).toHaveBeenCalled();
  expect(mockCreatePrompt).toHaveBeenCalled();
});

test("listPrompts returns a list of prompts", async () => {
  const mockListPrompts = mock(() => Promise.resolve([
    { category: "cat1", name: "prompt1" },
    { category: "cat2", name: "prompt2" },
  ]));
  mock.module("../src/promptManager", () => ({
    PromptManager: class {
      async initialize() {}
      listPrompts = mockListPrompts;
    },
  }));

  const result = await commands.listPrompts();

  expect(mockListPrompts).toHaveBeenCalled();
  expect(result).toEqual(["cat1/prompt1", "cat2/prompt2"]);
});

test("getPromptDetails returns prompt details", async () => {
  const mockGetPrompt = mock(() => Promise.resolve({
    name: "testPrompt",
    category: "testCategory",
    description: "Test description",
    version: "1.0.0",
    template: "Test template",
    parameters: ["param1", "param2"],
    metadata: { created: "2023-01-01", lastModified: "2023-01-02" },
  }));
  mock.module("../src/promptManager", () => ({
    PromptManager: class {
      async initialize() {}
      getPrompt = mockGetPrompt;
    },
  }));

  const result = await commands.getPromptDetails({ category: "testCategory", name: "testPrompt" });

  expect(mockGetPrompt).toHaveBeenCalledWith({ category: "testCategory", name: "testPrompt" });
  expect(result).toEqual({
    name: "testPrompt",
    category: "testCategory",
    description: "Test description",
    version: "1.0.0",
    template: "Test template",
    parameters: ["param1", "param2"],
    metadata: { created: "2023-01-01", lastModified: "2023-01-02" },
  });
});

// Add more tests for other functions in commands.ts
