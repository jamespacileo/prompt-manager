import { Container, Service } from "typedi";
import { Inject } from "typedi";
import type { PromptProjectConfigManager } from "./config/PromptProjectConfigManager";
import type { PromptFileSystem } from "./promptFileSystem";
import type { PromptManager } from "./promptManager";
import type {
	IAsyncIterableStream,
	IPrompt,
	IPromptCategory,
	IPromptInput,
	IPromptManagerLibrary,
	IPromptModel,
	IPromptOutput,
} from "./types/interfaces";

@Service()
export class PromptManagerClient implements IPromptManagerLibrary {
	private initialized = false;

	constructor(
		@Inject() private promptFileSystem: PromptFileSystem,
		@Inject() private promptManager: PromptManager,
		@Inject() private configManager: PromptProjectConfigManager,
	) {}

	private handleError(error: unknown, context: string): never {
		if (error instanceof Error) {
			throw new Error(`${context}: ${error.message}`);
		}
		throw new Error(`${context}: ${String(error)}`);
	}

	async initialize(): Promise<void> {
		if (this.initialized) return;

		try {
			await this.configManager.initialize();
			await this.promptFileSystem.initialize();
			await this.promptManager.initialize();
			this.initialized = true;
		} catch (error: unknown) {
			this.handleError(error, "Failed to initialize PromptManagerClient");
		}
	}

	private ensureInitialized(): void {
		if (!this.initialized) {
			throw new Error(
				"PromptManagerClient is not initialized. Call initialize() first.",
			);
		}
	}

	async getPrompt(props: { category: string; name: string }): Promise<
		IPrompt<IPromptInput, IPromptOutput>
	> {
		this.ensureInitialized();
		try {
			return await this.promptManager.getPrompt(props);
		} catch (error: unknown) {
			this.handleError(error, "Failed to get prompt");
		}
	}

	async createPrompt(props: {
		prompt: Omit<IPrompt<IPromptInput, IPromptOutput>, "versions">;
	}): Promise<void> {
		this.ensureInitialized();
		try {
			await this.promptManager.createPrompt(props);
		} catch (error: unknown) {
			this.handleError(error, "Failed to create prompt");
		}
	}

	async updatePrompt(props: {
		category: string;
		name: string;
		updates: Partial<IPrompt<IPromptInput, IPromptOutput>>;
	}): Promise<void> {
		this.ensureInitialized();
		try {
			await this.promptManager.updatePrompt(props);
		} catch (error: unknown) {
			this.handleError(error, "Failed to update prompt");
		}
	}

	async deletePrompt(props: { category: string; name: string }): Promise<void> {
		this.ensureInitialized();
		try {
			await this.promptManager.deletePrompt(props);
		} catch (error: unknown) {
			this.handleError(error, "Failed to delete prompt");
		}
	}

	async listPrompts(
		props: { category?: string } = {},
	): Promise<
		Array<
			IPrompt<Record<string, any>, Record<string, any>> & { filePath: string }
		>
	> {
		this.ensureInitialized();
		try {
			const prompts = await this.promptManager.listPrompts(props);
			return prompts.map((prompt) => ({
				...prompt,
				filePath: prompt.filePath || "",
			})) as Array<
				IPrompt<Record<string, any>, Record<string, any>> & { filePath: string }
			>;
		} catch (error: unknown) {
			this.handleError(error, "Failed to list prompts");
		}
	}

	async versionPrompt(props: {
		action: "list" | "create" | "switch";
		category: string;
		name: string;
		version?: string;
	}): Promise<{
		action: "list" | "create" | "switch";
		category: string;
		name: string;
		result: string[] | string;
	}> {
		this.ensureInitialized();
		try {
			return await this.promptManager.versionPrompt(props);
		} catch (error: unknown) {
			this.handleError(error, "Failed to version prompt");
		}
	}

	async formatPrompt(props: {
		category: string;
		name: string;
		params: Record<string, any>;
	}): Promise<string> {
		this.ensureInitialized();
		try {
			return await this.promptManager.formatPrompt(props);
		} catch (error: unknown) {
			this.handleError(error, "Failed to format prompt");
		}
	}

	async executePrompt(props: {
		category: string;
		name: string;
		params: Record<string, any>;
	}): Promise<any> {
		this.ensureInitialized();
		try {
			return await this.promptManager.executePrompt(props);
		} catch (error: unknown) {
			this.handleError(error, "Failed to execute prompt");
		}
	}

	async streamPrompt(props: {
		category: string;
		name: string;
		params: Record<string, any>;
	}): Promise<IAsyncIterableStream<string>> {
		this.ensureInitialized();
		try {
			return await this.promptManager.streamPrompt(props);
		} catch (error: unknown) {
			this.handleError(error, "Failed to stream prompt");
		}
	}

	async loadPrompts(): Promise<void> {
		this.ensureInitialized();
		try {
			await this.promptManager.loadPrompts();
		} catch (error: unknown) {
			this.handleError(error, "Failed to load prompts");
		}
	}

	async promptExists(props: {
		category: string;
		name: string;
	}): Promise<boolean> {
		this.ensureInitialized();
		try {
			return await this.promptManager.promptExists(props);
		} catch (error: unknown) {
			this.handleError(error, "Failed to check if prompt exists");
		}
	}

	async createCategory(props: { categoryName: string }): Promise<void> {
		this.ensureInitialized();
		try {
			await this.promptManager.createCategory(props.categoryName);
		} catch (error: unknown) {
			this.handleError(error, "Failed to create category");
		}
	}

	async deleteCategory({
		categoryName,
	}: { categoryName: string }): Promise<void> {
		this.ensureInitialized();
		try {
			await this.promptManager.deleteCategory(categoryName);
		} catch (error: unknown) {
			this.handleError(error, "Failed to delete category");
		}
	}

	async listCategories(): Promise<string[]> {
		this.ensureInitialized();
		try {
			return await this.promptManager.listCategories();
		} catch (error: unknown) {
			this.handleError(error, "Failed to list categories");
		}
	}

	get categories(): {
		[category: string]: IPromptCategory<Record<string, any>>;
	} {
		this.ensureInitialized();
		return this.promptManager.categories;
	}
}

// Export a singleton instance
export const promptManager = Container.get(PromptManagerClient);
