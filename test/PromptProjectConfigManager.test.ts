import { expect, test, beforeEach, afterEach, mock, beforeAll, afterAll, describe } from "bun:test";
import { PromptProjectConfigManager } from "../src/config/PromptProjectConfigManager";
import type { Config } from "../src/schemas/config";
import fs from "fs/promises";
import path from "path";

const mockConfigPath = path.join(process.cwd(), "mock-fury-config.json");

describe("PromptProjectConfigManager", () => {
  beforeAll(async () => {
    // Create a default mock config file before all tests
    const defaultConfig = {
      promptsDir: "prompts",
      outputDir: "output",
      preferredModels: ["gpt-4"],
      modelParams: {}
    };
    await fs.writeFile(mockConfigPath, JSON.stringify(defaultConfig, null, 2));
  });

  afterAll(async () => {
    // Remove the mock config file after all tests
    try {
      await fs.unlink(mockConfigPath);
    } catch (error) {
      // Ignore errors if the file doesn't exist
    }
  });

  beforeEach(async () => {
    // Clear the singleton instance before each test
    // @ts-ignore: Accessing private static property for testing
    PromptProjectConfigManager.instance = undefined;

    // Set environment variables for testing
    process.env.FURY_PROJECT_CONFIG_FILENAME = "mock-fury-config.json";
    process.env.FURY_PROJECT_ROOT = process.cwd();
  });

  afterEach(async () => {
    // Reset the mock config file to its default state after each test
    const defaultConfig = {
      promptsDir: "prompts",
      outputDir: "output",
      preferredModels: ["gpt-4"],
      modelParams: {}
    };
    await fs.writeFile(mockConfigPath, JSON.stringify(defaultConfig, null, 2));

    // Clear environment variables
    delete process.env.FURY_PROJECT_CONFIG_FILENAME;
    delete process.env.FURY_PROJECT_ROOT;
  });

  test("PromptProjectConfigManager initialization", async () => {
    const configManager = await PromptProjectConfigManager.getInstance();
    await configManager.initialize();

    const config = await configManager.getAllConfig();
    expect(config).toBeDefined();
    expect(config.promptsDir).toBeDefined();
    expect(config.outputDir).toBeDefined();
    expect(config.preferredModels).toBeInstanceOf(Array);
    expect(config.modelParams).toBeDefined();
  });

  test("PromptProjectConfigManager updates and retrieves config", async () => {
    const configManager = await PromptProjectConfigManager.getInstance();
    await configManager.initialize();

    const newConfig: Partial<Config> = {
      promptsDir: "/new/prompts/dir",
      preferredModels: ["gpt-5", "gpt-4"],
    };

    await configManager.updateConfig(newConfig);

    expect(await configManager.getConfig("promptsDir")).toBe("/new/prompts/dir");
    expect(await configManager.getConfig("preferredModels")).toEqual(["gpt-5", "gpt-4"]);
  });

  test("PromptProjectConfigManager handles invalid config", async () => {
    const invalidConfig = {
      promptsDir: 123, // Should be a string
      outputDir: "/valid/path",
      preferredModels: ["gpt-4"],
      modelParams: {},
    };

    await fs.writeFile(mockConfigPath, JSON.stringify(invalidConfig));

    await expect(PromptProjectConfigManager.getInstance()).rejects.toThrow("Invalid configuration file");
  });

  test("PromptProjectConfigManager creates default config if file doesn't exist", async () => {
    const configManager = await PromptProjectConfigManager.getInstance();
    await configManager.initialize();

    const config = await configManager.getAllConfig();
    expect(config.promptsDir).toBeDefined();
    expect(config.outputDir).toBeDefined();
    expect(config.preferredModels).toBeInstanceOf(Array);
    expect(config.modelParams).toBeDefined();

    // Check if the file was created
    const fileExists = await fs.access(mockConfigPath).then(() => true).catch(() => false);
    expect(fileExists).toBe(true);
  });

}); // Close the describe block
