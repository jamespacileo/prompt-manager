import { PromptManagerClient } from "../client";
import { PromptFileSystem } from "../promptFileSystem";
import { PromptManager } from "../promptManager";
import type { IPrompt, IPromptInput, IPromptOutput } from "../types/interfaces";

jest.mock("../promptFileSystem");
jest.mock("../promptManager");

describe("PromptManagerClient", () => {
	let client: PromptManagerClient;
	let mockPromptFileSystem: jest.Mocked<PromptFileSystem>;
	let mockPromptManager: jest.Mocked<PromptManager>;

	beforeEach(() => {
		mockPromptFileSystem =
			new PromptFileSystem() as jest.Mocked<PromptFileSystem>;
		mockPromptManager = new PromptManager() as jest.Mocked<PromptManager>;
		client = new PromptManagerClient();
		(client as any).promptFileSystem = mockPromptFileSystem;
		(client as any).promptManager = mockPromptManager;
	});

	describe("initialize", () => {
		it("should initialize promptFileSystem and promptManager", async () => {
			await client.initialize();
			expect(mockPromptFileSystem.initialize).toHaveBeenCalled();
			expect(mockPromptManager.initialize).toHaveBeenCalled();
		});
	});

	describe("getPrompt", () => {
		it("should call promptManager.getPrompt with correct parameters", async () => {
			const props = { category: "test", name: "testPrompt" };
			await client.getPrompt(props);
			expect(mockPromptManager.getPrompt).toHaveBeenCalledWith(props);
		});
	});

	describe("categories", () => {
		it("should return a proxy object for categories", () => {
			const categories = client.categories;
			expect(categories).toBeInstanceOf(Object);
		});

		it("should allow access to category methods", async () => {
			const mockPrompt: IPrompt<IPromptInput, IPromptOutput> = {
				name: "testPrompt",
				category: "testCategory",
				description: "Test prompt",
				version: "1.0.0",
				template: "Test template",
				parameters: [],
				metadata: { created: "", lastModified: "" },
				outputType: "plain",
				inputSchema: {},
				outputSchema: {},
			};
			mockPromptManager.getPrompt.mockResolvedValue(mockPrompt);

			const result = await client.categories.testCategory.testPrompt.format({
				test: "input",
			});
			expect(mockPromptManager.getPrompt).toHaveBeenCalledWith({
				category: "testCategory",
				name: "testPrompt",
			});
			expect(result).toBe("Test template");
		});
	});
});
