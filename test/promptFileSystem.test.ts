import { expect, test, beforeAll, afterAll, describe } from "bun:test";
import { PromptFileSystem } from "../src/promptFileSystem";
import { IPrompt, IPromptInput, IPromptOutput } from "../src/types/interfaces";
import fs from "fs/promises";
import path from "path";
import os from "os";

let promptFileSystem: PromptFileSystem;
let tempDir: string;

beforeAll(async () => {
  tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'prompt-fs-test-'));
  process.env.PROMPTS_DIR = tempDir;
  promptFileSystem = new PromptFileSystem();
});

afterAll(async () => {
  await fs.rm(tempDir, { recursive: true, force: true });
});

describe("PromptFileSystem", () => {
  test("savePrompt and loadPrompt", async () => {
    const promptData: IPrompt<IPromptInput, IPromptOutput> = {
      name: "testPrompt",
      category: "testCategory",
      description: "Test prompt",
      version: "1.0.0",
      template: "This is a test prompt",
      parameters: [],
      metadata: {
        created: new Date().toISOString(),
        lastModified: new Date().toISOString(),
      },
      outputSchema: {
        type: "object",
        properties: {
          text: { type: "string" },
        },
        required: ["text"],
      },
      outputType: "plain",
      inputSchema: {
        type: "object",
        properties: {},
        required: [],
      },
    };

    await promptFileSystem.savePrompt({ promptData });
    const loadedPrompt = await promptFileSystem.loadPrompt({
      category: "testCategory",
      promptName: "testPrompt",
    });

    expect(loadedPrompt).toEqual(promptData);
  });

  test("promptExists", async () => {
    const exists = await promptFileSystem.promptExists({
      category: "testCategory",
      promptName: "testPrompt",
    });
    expect(exists).toBe(true);

    const notExists = await promptFileSystem.promptExists({
      category: "testCategory",
      promptName: "nonExistentPrompt",
    });
    expect(notExists).toBe(false);
  });

  test("listPrompts", async () => {
    const prompts = await promptFileSystem.listPrompts();
    expect(prompts).toContain("testCategory/testPrompt");

    const categoryPrompts = await promptFileSystem.listPrompts({ category: "testCategory" });
    expect(categoryPrompts).toContain("testPrompt");
  });

  test("listCategories", async () => {
    const categories = await promptFileSystem.listCategories();
    expect(categories).toContain("testCategory");
  });

  test("searchPrompts", async () => {
    const searchResults = await promptFileSystem.searchPrompts({ query: "test" });
    expect(searchResults).toContainEqual({ category: "testCategory", name: "testPrompt" });
  });

  test("searchCategories", async () => {
    const searchResults = await promptFileSystem.searchCategories({ query: "test" });
    expect(searchResults).toContain("testCategory");
  });

  test("getPromptVersions", async () => {
    const promptData: IPrompt<IPromptInput, IPromptOutput> = {
      name: "testPrompt",
      category: "testCategory",
      description: "Test prompt",
      version: "1.0.0",
      template: "This is a test prompt",
      parameters: [],
      metadata: {
        created: new Date().toISOString(),
        lastModified: new Date().toISOString(),
      },
      outputSchema: {
        type: "object",
        properties: {
          text: { type: "string" },
        },
        required: ["text"],
      },
      outputType: "plain",
      inputSchema: {
        type: "object",
        properties: {},
        required: [],
      },
    };

    await promptFileSystem.savePrompt({ promptData });

    promptData.version = "1.1.0";
    await promptFileSystem.savePrompt({ promptData });

    const versions = await promptFileSystem.getPromptVersions({
      category: "testCategory",
      promptName: "testPrompt",
    });
    expect(versions).toEqual(["1.1.0", "1.0.0"]);
  });

  test("deletePrompt", async () => {
    await promptFileSystem.deletePrompt({
      category: "testCategory",
      promptName: "testPrompt",
    });
    const exists = await promptFileSystem.promptExists({
      category: "testCategory",
      promptName: "testPrompt",
    });
    expect(exists).toBe(false);
  });

  test("renamePrompt", async () => {
    const promptData: IPrompt<IPromptInput, IPromptOutput> = {
      name: "oldPrompt",
      category: "oldCategory",
      description: "Old prompt",
      version: "1.0.0",
      template: "This is an old prompt",
      parameters: [],
      metadata: {
        created: new Date().toISOString(),
        lastModified: new Date().toISOString(),
      },
      outputSchema: {
        type: "object",
        properties: {
          text: { type: "string" },
        },
        required: ["text"],
      },
      outputType: "plain",
      inputSchema: {
        type: "object",
        properties: {},
        required: [],
      },
    };

    await promptFileSystem.savePrompt({ promptData });

    await promptFileSystem.renamePrompt({
      currentCategory: "oldCategory",
      currentName: "oldPrompt",
      newCategory: "newCategory",
      newName: "newPrompt",
    });

    const oldExists = await promptFileSystem.promptExists({
      category: "oldCategory",
      promptName: "oldPrompt",
    });
    expect(oldExists).toBe(false);

    const newExists = await promptFileSystem.promptExists({
      category: "newCategory",
      promptName: "newPrompt",
    });
    expect(newExists).toBe(true);

    const loadedPrompt = await promptFileSystem.loadPrompt({
      category: "newCategory",
      promptName: "newPrompt",
    });
    expect(loadedPrompt.name).toBe("newPrompt");
    expect(loadedPrompt.category).toBe("newCategory");
  });

  test("createCategory and deleteCategory", async () => {
    await promptFileSystem.createCategory({ categoryName: "newCategory" });
    let categories = await promptFileSystem.listCategories();
    expect(categories).toContain("newCategory");

    await promptFileSystem.deleteCategory({ categoryName: "newCategory" });
    categories = await promptFileSystem.listCategories();
    expect(categories).not.toContain("newCategory");
  });
});
