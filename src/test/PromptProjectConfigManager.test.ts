import {
	afterAll,
	afterEach,
	beforeAll,
	beforeEach,
	describe,
	expect,
	test,
} from "bun:test";
import path from "node:path";
import fs from "fs-extra";
import { Container } from "typedi";
import { PromptFileSystem } from "..";
import { PromptProjectConfigManager } from "../config/PromptProjectConfigManager";
import type { Config } from "../schemas/config";

describe("PromptProjectConfigManager", () => {
	let promptFileSystem: PromptFileSystem;
	const testProjectFolder: string = path.join(process.cwd(), "test-project");
	const mockConfigPath = path.join(testProjectFolder, "mock-fury-config.json");
	let originalPromptsDir: string;
	let configManager: PromptProjectConfigManager;

	beforeAll(async () => {
		const defaultConfig = {
			promptsDir: "prompts",
			outputDir: "output",
			preferredModels: ["gpt-4"],
			modelParams: {},
		};
		// await fs.writeFile(mockConfigPath, JSON.stringify(defaultConfig, null, 2));
		await fs.mkdir(testProjectFolder, { recursive: true });
		await fs.writeFile(mockConfigPath, JSON.stringify(defaultConfig, null, 2));
		await fs.mkdir(path.join(testProjectFolder, "test-prompts-2"), {
			recursive: true,
		});
	});

	afterAll(async () => {
		try {
			await fs.unlink(mockConfigPath);
		} catch (error) {
			// Ignore errors if the file doesn't exist
		}
	});

	beforeEach(async () => {
		Container.reset();

		configManager = Container.get(PromptProjectConfigManager);
		await configManager.initialize();
		await configManager.updateConfig({ promptsDir: "test-prompts-2" });

		promptFileSystem = Container.get(PromptFileSystem);
		await promptFileSystem.initialize();
	});

	afterEach(async () => {
		const defaultConfig = {
			promptsDir: "prompts",
			outputDir: "output",
			preferredModels: ["gpt-4"],
			modelParams: {},
		};
		await fs.writeFile(mockConfigPath, JSON.stringify(defaultConfig, null, 2));
	});

	test("PromptProjectConfigManager initialization", async () => {
		const configManager = Container.get(PromptProjectConfigManager);

		const config = configManager.getAllConfig();
		expect(config).toBeDefined();
		expect(config.promptsDir).toBeDefined();
		expect(config.outputDir).toBeDefined();
		expect(config.preferredModels).toBeInstanceOf(Array);
		expect(config.modelParams).toBeDefined();
	});

	test("PromptProjectConfigManager updates and retrieves config", async () => {
		const configManager = Container.get(PromptProjectConfigManager);

		const newConfig: Partial<Config> = {
			promptsDir: "/new/prompts/dir",
			preferredModels: ["gpt-5", "gpt-4"],
		};

		await configManager.updateConfig(newConfig);

		expect(configManager.getConfig("promptsDir")).toBe("/new/prompts/dir");
		expect(configManager.getConfig("preferredModels")).toEqual([
			"gpt-5",
			"gpt-4",
		]);
	});

	test("PromptProjectConfigManager creates default config if file doesn't exist", async () => {
		await fs.unlink(mockConfigPath).catch(() => {});

		const configManager = Container.get(PromptProjectConfigManager);

		const config = configManager.getAllConfig();
		expect(config.promptsDir).toBeDefined();
		expect(config.outputDir).toBeDefined();
		expect(config.preferredModels).toBeInstanceOf(Array);
		expect(config.modelParams).toBeDefined();

		const fileExists = await fs
			.access(mockConfigPath)
			.then(() => true)
			.catch(() => false);
		expect(fileExists).toBe(true);
	});
});
