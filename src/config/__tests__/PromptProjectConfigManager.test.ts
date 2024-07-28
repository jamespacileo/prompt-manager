import { expect, test, beforeEach, afterEach, mock } from "bun:test";
import { PromptProjectConfigManager, Config } from "../PromptProjectConfigManager";
import fs from "fs/promises";
import path from "path";

const mockConfigPath = path.join(process.cwd(), "mock-fury-config.json");

beforeEach(async () => {
  // Clear the singleton instance before each test
  // @ts-ignore: Accessing private static property for testing
  PromptProjectConfigManager.instance = undefined;
});

afterEach(async () => {
  // Clean up the mock config file after each test
  try {
    await fs.unlink(mockConfigPath);
  } catch (error) {
    // Ignore errors if the file doesn't exist
  }
});

test("PromptProjectConfigManager initialization", async () => {
  const configManager = PromptProjectConfigManager.getInstance(mockConfigPath);
  await configManager.initialize();

  const config = configManager.getAllConfig();
  expect(config).toBeDefined();
  expect(config.promptsDir).toBeDefined();
  expect(config.outputDir).toBeDefined();
  expect(config.preferredModels).toBeInstanceOf(Array);
  expect(config.modelParams).toBeDefined();
});

test("PromptProjectConfigManager updates and retrieves config", async () => {
  const configManager = PromptProjectConfigManager.getInstance(mockConfigPath);
  await configManager.initialize();

  const newConfig: Partial<Config> = {
    promptsDir: "/new/prompts/dir",
    preferredModels: ["gpt-5", "gpt-4"],
  };

  await configManager.updateConfig(newConfig);

  expect(configManager.getConfig("promptsDir")).toBe("/new/prompts/dir");
  expect(configManager.getConfig("preferredModels")).toEqual(["gpt-5", "gpt-4"]);
});

test("PromptProjectConfigManager handles invalid config", async () => {
  const invalidConfig = {
    promptsDir: 123, // Should be a string
    outputDir: "/valid/path",
    preferredModels: ["gpt-4"],
    modelParams: {},
  };

  await fs.writeFile(mockConfigPath, JSON.stringify(invalidConfig));

  const configManager = PromptProjectConfigManager.getInstance(mockConfigPath);
  
  await expect(configManager.initialize()).rejects.toThrow("Invalid configuration file");
});

test("PromptProjectConfigManager creates default config if file doesn't exist", async () => {
  const configManager = PromptProjectConfigManager.getInstance(mockConfigPath);
  await configManager.initialize();

  const config = configManager.getAllConfig();
  expect(config.promptsDir).toBeDefined();
  expect(config.outputDir).toBeDefined();
  expect(config.preferredModels).toBeInstanceOf(Array);
  expect(config.modelParams).toBeDefined();

  // Check if the file was created
  const fileExists = await fs.access(mockConfigPath).then(() => true).catch(() => false);
  expect(fileExists).toBe(true);
});

test("PromptProjectConfigManager ensures directories exist", async () => {
  const mockEnsureDirectoryExists = mock(() => Promise.resolve());
  
  // @ts-ignore: Mocking for test purposes
  global.ensureDirectoryExists = mockEnsureDirectoryExists;

  const configManager = PromptProjectConfigManager.getInstance(mockConfigPath);
  await configManager.initialize();

  expect(mockEnsureDirectoryExists).toHaveBeenCalledTimes(2);
});
