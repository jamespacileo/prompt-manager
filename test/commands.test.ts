import { expect, test, describe, beforeAll, afterAll, beforeEach, jest } from "bun:test";
import * as commands from "../src/cli/commands";
import { PromptManager } from "../src/promptManager";
import fs from 'fs/promises';
import path from 'path';
import { PromptProjectConfigManager } from "../src/config/PromptProjectConfigManager";

describe.skip('CLI Commands', () => {
  let testDir: string;
  let originalPromptsDir: string | undefined;

  beforeAll(async () => {
    originalPromptsDir = process.env.PROMPTS_DIR;
    testDir = path.join(process.cwd(), 'test-prompts-cli');
    await fs.mkdir(testDir, { recursive: true });
    process.env.PROMPTS_DIR = testDir;
    PromptProjectConfigManager.getInstance().setConfig('promptsDir', testDir);
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
    PromptProjectConfigManager.getInstance().setConfig('promptsDir', originalPromptsDir || '');
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
      outputType: "json",
    };

    // Mock the prompt responses
    (enquirer.prompt as jest.Mock).mockResolvedValueOnce(promptData);

    await commands.createPrompt();

    const manager = new PromptManager();
    await manager.initialize();
    const createdPrompt = await manager.getPrompt({
      category: "cosmicCompositions",
      name: "stardustSymphony",
    });

    expect(createdPrompt).toEqual(promptData);
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
      outputType: "json",
    });
  });

  test("updatePrompt updates an existing prompt", async () => {
    const updatedPromptData = {
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
      outputType: "json",
    };

    // Mock the prompt responses
    (enquirer.prompt as jest.Mock).mockResolvedValueOnce({
      category: "cosmicCompositions",
      name: "stardustSymphony",
    }).mockResolvedValueOnce(updatedPromptData);

    await commands.updatePrompt();

    const manager = new PromptManager();
    await manager.initialize();
    const updatedPrompt = await manager.getPrompt({
      category: "cosmicCompositions",
      name: "stardustSymphony",
    });

    expect(updatedPrompt).toEqual(updatedPromptData);
  });

  test("deletePrompt removes a prompt", async () => {
    // Mock the prompt responses
    (enquirer.prompt as jest.Mock).mockResolvedValueOnce({
      category: "cosmicCompositions",
      name: "stardustSymphony",
    });

    await commands.deletePrompt();

    const manager = new PromptManager();
    await manager.initialize();
    const promptExists = await manager.promptExists({
      category: "cosmicCompositions",
      name: "stardustSymphony",
    });

    expect(promptExists).toBe(false);
  });

  test("createCategory creates a new category", async () => {
    await commands.createCategory({ categoryName: "quantumQueries" });

    const manager = new PromptManager();
    await manager.initialize();
    const categories = await manager.listCategories();

    expect(categories).toContain("quantumQueries");
  });

  test("deleteCategory removes a category", async () => {
    await commands.deleteCategory({ categoryName: "quantumQueries" });

    const manager = new PromptManager();
    await manager.initialize();
    const categories = await manager.listCategories();

    expect(categories).not.toContain("quantumQueries");
  });
});
