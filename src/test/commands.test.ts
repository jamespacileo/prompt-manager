import {
	expect,
	test,
	describe,
	beforeAll,
	afterAll,
	beforeEach,
	jest,
	spyOn,
} from "bun:test";
import { Container } from "typedi";
import * as commands from "../cli/commands";
import { PromptManager } from "../promptManager";
import { PromptProjectConfigManager } from "../config/PromptProjectConfigManager";
import { PromptFileSystem } from "../promptFileSystem";
import fs from "fs/promises";
import path from "path";
import type { IPrompt } from "../types/interfaces";

describe.skip("CLI Commands", () => {
	let testDir: string;
	let originalPromptsDir: string | undefined;

	beforeAll(async () => {
		originalPromptsDir = process.env.PROMPTS_DIR;
		testDir = path.join(process.cwd(), "test-prompts-cli");
		await fs.mkdir(testDir, { recursive: true });
		process.env.PROMPTS_DIR = testDir;
	});

	beforeEach(async () => {
		Container.reset();
		const configManager = new PromptProjectConfigManager();
		await configManager.initialize();
		await configManager.updateConfig({ promptsDir: testDir });
		Container.set(PromptProjectConfigManager, configManager);
		Container.set(PromptFileSystem, PromptFileSystem);
		Container.set(PromptManager, PromptManager);

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
	});

	test("createPrompt creates a new prompt", async () => {
		const promptData = {
			name: "stardustSymphony",
			category: "cosmicCompositions",
			description:
				"A prompt that composes melodies inspired by celestial bodies",
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

		spyOn(console, "log").mockImplementation(() => {});
		spyOn(console, "error").mockImplementation(() => {});

		await commands.createPrompt(promptData as any);

		const manager = Container.get(PromptManager);
		const createdPrompt = manager.getPrompt({
			category: "cosmicCompositions",
			name: "stardustSymphony",
		});

		expect(createdPrompt).toMatchObject(promptData);
	});

	test("listPrompts returns a list of prompts", async () => {
		const result = await commands.listPrompts();

		const stardustSymphony = result.find(
			(prompt) =>
				prompt.category === "cosmicCompositions" &&
				prompt.name === "stardustSymphony",
		);

		expect(stardustSymphony).toBeDefined();
		expect(stardustSymphony).toEqual({
			category: "cosmicCompositions",
			name: "stardustSymphony",
			version: "1.0.0",
			filePath: expect.stringContaining(
				"/test-prompts-cli/cosmicCompositions/stardustSymphony/prompt.json",
			),
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
			description:
				"A prompt that composes melodies inspired by celestial bodies",
			version: "1.0.0",
			template: "Compose a {{genre}} melody inspired by the {{celestialBody}}",
			parameters: ["genre", "celestialBody"],
			metadata: expect.any(Object),
		});
	});

	test("updatePrompt updates an existing prompt", async () => {
		const updatedPromptData: Partial<IPrompt<any, any>> = {
			name: "stardustSymphony",
			category: "cosmicCompositions",
			description: "An updated prompt that orchestrates cosmic melodies",
			version: "1.1.0",
			template:
				"Orchestrate a {{genre}} symphony inspired by the {{celestialEvent}}",
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

		spyOn(console, "log").mockImplementation(() => {});
		spyOn(console, "error").mockImplementation(() => {});

		const manager = Container.get(PromptManager);
		await commands.updatePrompt({
			category: "cosmicCompositions",
			name: "stardustSymphony",
			updates: updatedPromptData,
		});

		const updatedPrompt = manager.getPrompt({
			category: "cosmicCompositions",
			name: "stardustSymphony",
		});

		expect(updatedPrompt).toMatchObject(updatedPromptData);
	});

	test("deletePrompt removes a prompt", async () => {
		spyOn(console, "log").mockImplementation(() => {});
		spyOn(console, "error").mockImplementation(() => {});

		await commands.deletePrompt({
			category: "cosmicCompositions",
			name: "stardustSymphony",
		});

		const manager = Container.get(PromptManager);
		const prompts = await manager.listPrompts({});
		const deletedPrompt = prompts.find(
			(p) =>
				p.name === "stardustSymphony" && p.category === "cosmicCompositions",
		);

		expect(deletedPrompt).toBeUndefined();
	});

	test("createCategory creates a new category", async () => {
		const manager = Container.get(PromptManager);
		await manager.createCategory("quantumQueries");
		const categories = await manager.listCategories();

		expect(categories).toContain("quantumQueries");
	});
});
