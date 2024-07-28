import { expect, test, describe, beforeAll, afterAll, beforeEach, jest, spyOn } from "bun:test";
import * as commands from "../src/cli/commands";
import { PromptManager } from "../src/promptManager";
import fs from 'fs/promises';
import path from 'path';
import { getConfigManager } from "../src/config/PromptProjectConfigManager";
import { IPrompt } from "../src/types/interfaces";

describe.skip('CLI Commands', () => {
  let testDir: string;
  let originalPromptsDir: string | undefined;

  beforeAll(async () => {
    originalPromptsDir = process.env.PROMPTS_DIR;
    testDir = path.join(process.cwd(), 'test-prompts-cli');
    await fs.mkdir(testDir, { recursive: true });
    process.env.PROMPTS_DIR = testDir;
    (await getConfigManager()).updateConfig({ promptsDir: testDir });
  });

  beforeEach(async () => {
    // Clear the test directory before each test
    const files = await fs.readdir(testDir);
    for (const file of files) {
      await fs.rm(path.join(testDir, file), { recursive: true, force: true });
    }
  });

  afterAll(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
    if (originalPromptsDir) {
      process.env.PROMPTS_DIR = originalPromptsDir;
    } else {
      delete process.env.PROMPTS_DIR;
    }
    (await getConfigManager()).updateConfig({ promptsDir: originalPromptsDir || '' });
  });

  test("createPrompt creates a new prompt", async () => {
    const promptData = {
      name: "stardustSymphony",
      category: "cosmicCompositions",
      description: "A prompt that composes melodies inspired by celestial bodies",
      version: "1.0.0",
      template: "Compose a {{genre}} melody inspired by the {{celestialBody}}",
      parameters: ["genre", "celestialBody"],
      inputSchema: {
        type: "object",
        properties: {
          genre: { type: "string" },
          celestialBody: { type: "string" },
        },
        required: ["genre", "celestialBody"],
      },
      outputSchema: {
        type: "object",
        properties: {
          melody: { type: "string" },
        },
        required: ["melody"],
      },
      outputType: "structured",
    };

    // Mock the prompt responses
    spyOn(console, 'log').mockImplementation(() => { });
    spyOn(console, 'error').mockImplementation(() => { });

    await commands.createPrompt();

    const manager = await PromptManager.getInstance();
    // initialization is now handled internally
    const createdPrompt = await manager.getPrompt({
      category: "cosmicCompositions",
      name: "stardustSymphony",
    });

    expect(createdPrompt).toMatchObject(promptData);
  });

  test("listPrompts returns a list of prompts", async () => {
    const result = await commands.listPrompts();

    expect(result).toContainEqual({
      category: "cosmicCompositions",
      name: "stardustSymphony",
      filePath: expect.stringContaining("/test-prompts-cli/cosmicCompositions/stardustSymphony/prompt.json"),
    });
  });

  test("getPromptDetails returns prompt details", async () => {
    const result = await commands.getPromptDetails({
      category: "cosmicCompositions",
      name: "stardustSymphony",
    });

    expect(result).toEqual({
      name: "stardustSymphony",
      category: "cosmicCompositions",
      description: "A prompt that composes melodies inspired by celestial bodies",
      version: "1.0.0",
      template: "Compose a {{genre}} melody inspired by the {{celestialBody}}",
      parameters: ["genre", "celestialBody"],
      inputSchema: {
        type: "object",
        properties: {
          genre: { type: "string" },
          celestialBody: { type: "string" },
        },
        required: ["genre", "celestialBody"],
      },
      outputSchema: {
        type: "object",
        properties: {
          melody: { type: "string" },
        },
        required: ["melody"],
      },
      outputType: "structured",
    });
  });

  test("updatePrompt updates an existing prompt", async () => {
    const updatedPromptData: Partial<IPrompt<any, any>> = {
      name: "stardustSymphony",
      category: "cosmicCompositions",
      description: "An updated prompt that orchestrates cosmic melodies",
      version: "1.1.0",
      template: "Orchestrate a {{genre}} symphony inspired by the {{celestialEvent}}",
      parameters: ["genre", "celestialEvent"],
      inputSchema: {
        type: "object",
        properties: {
          genre: { type: "string" },
          celestialEvent: { type: "string" },
        },
        required: ["genre", "celestialEvent"],
      },
      outputSchema: {
        type: "object",
        properties: {
          symphony: { type: "string" },
        },
        required: ["symphony"],
      },
      outputType: "structured",
    };


    // Mock the prompt responses
    spyOn(console, 'log').mockImplementation(() => { });
    spyOn(console, 'error').mockImplementation(() => { });

    const manager = await PromptManager.getInstance();
    spyOn(manager, 'updatePrompt').mockResolvedValueOnce();

    await commands.updatePrompt({ category: "cosmicCompositions", name: "stardustSymphony", updates: updatedPromptData });

    const updatedPrompt = await manager.getPrompt({
      category: "cosmicCompositions",
      name: "stardustSymphony",
    });

    expect(updatedPrompt).toMatchObject(updatedPromptData);
  });

  test("deletePrompt removes a prompt", async () => {
    // Mock the prompt responses
    spyOn(console, 'log').mockImplementation(() => { });
    spyOn(console, 'error').mockImplementation(() => { });

    await commands.deletePrompt({ category: "cosmicCompositions", name: "stardustSymphony" });

    const manager = await PromptManager.getInstance();
    const promptExists = await manager.promptExists({
      category: "cosmicCompositions",
      name: "stardustSymphony",
    });

    expect(promptExists).toBe(false);
  });

  test("createCategory creates a new category", async () => {

    const manager = await PromptManager.getInstance();
    await manager.createCategory("quantumQueries");
    const categories = await manager.listCategories();

    expect(categories).toContain("quantumQueries");
  });

  test("deletePrompt removes a prompt", async () => {
    // Mock the prompt responses
    spyOn(console, 'log').mockImplementation(() => { });
    spyOn(console, 'error').mockImplementation(() => { });

    const manager = await PromptManager.getInstance();
    spyOn(manager, 'deletePrompt').mockImplementationOnce(async () => { });

    await commands.deletePrompt({ category: "cosmicCompositions", name: "stardustSymphony" });

    const promptExists = await manager.promptExists({
      category: "cosmicCompositions",
      name: "stardustSymphony",
    });

    expect(promptExists).toBe(false);
  });
});
