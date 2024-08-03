import path from "node:path";
import fs from "fs-extra";
import { PromptFileSystem } from "./promptFileSystem";
import { PromptManager } from "./promptManager";
import type {
	IAsyncIterableStream,
	IPrompt,
	IPromptInput,
	IPromptManagerLibrary,
	IPromptOutput,
} from "./types/interfaces";

export class PromptManagerClient implements IPromptManagerLibrary {
	private promptFileSystem: PromptFileSystem;
	private promptManager: PromptManager;

	constructor() {
		this.promptFileSystem = new PromptFileSystem();
		this.promptManager = new PromptManager();
	}

	async initialize(): Promise<void> {
		await this.promptFileSystem.initialize();
		await this.promptManager.initialize();
	}

	async getPrompt(props: { category: string; name: string }): Promise<
		IPrompt<IPromptInput, IPromptOutput>
	> {
		return this.promptManager.getPrompt(props);
	}

	async createPrompt(props: {
		prompt: Omit<IPrompt<IPromptInput, IPromptOutput>, "versions">;
	}): Promise<void> {
		await this.promptManager.createPrompt(props);
	}

	async updatePrompt(props: {
		category: string;
		name: string;
		updates: Partial<IPrompt<IPromptInput, IPromptOutput>>;
	}): Promise<void> {
		await this.promptManager.updatePrompt(props);
	}

	async deletePrompt(props: { category: string; name: string }): Promise<void> {
		await this.promptManager.deletePrompt(props);
	}

	async listPrompts(props: { category?: string }): Promise<
		IPrompt<IPromptInput, IPromptOutput>[]
	> {
		return this.promptManager.listPrompts(props);
	}

	async versionPrompt(props: {
		action: "list" | "create" | "switch";
		category: string;
		name: string;
		version?: string;
	}): Promise<void> {
		await this.promptManager.versionPrompt(props);
	}

	async formatPrompt(props: {
		category: string;
		name: string;
		params: Record<string, any>;
	}): Promise<string> {
		return this.promptManager.formatPrompt(props);
	}

	async executePrompt(props: {
		category: string;
		name: string;
		params: Record<string, any>;
	}): Promise<any> {
		const prompt = await this.getPrompt(props);
		return prompt.execute(props.params);
	}

	async streamPrompt(props: {
		category: string;
		name: string;
		params: Record<string, any>;
	}): Promise<IAsyncIterableStream<string>> {
		const prompt = await this.getPrompt(props);
		return prompt.stream(props.params);
	}

	get categories(): {
		[category: string]: {
			[prompt: string]: IPrompt<IPromptInput, IPromptOutput>;
		};
	} {
		return new Proxy(
			{},
			{
				get: (target, category: string) => {
					return new Proxy(
						{},
						{
							get: (innerTarget, promptName: string) => {
								return {
									format: async (inputs: Record<string, any>) =>
										this.formatPrompt({
											category,
											name: promptName,
											params: inputs,
										}),
									execute: async (inputs: Record<string, any>) =>
										this.executePrompt({
											category,
											name: promptName,
											params: inputs,
										}),
									stream: async (inputs: Record<string, any>) =>
										this.streamPrompt({
											category,
											name: promptName,
											params: inputs,
										}),
									description: async () => {
										const prompt = await this.getPrompt({
											category,
											name: promptName,
										});
										return prompt.description;
									},
									version: async () => {
										const prompt = await this.getPrompt({
											category,
											name: promptName,
										});
										return prompt.version;
									},
								};
							},
						},
					);
				},
			},
		);
	}
}

export const promptManager = new PromptManagerClient();
