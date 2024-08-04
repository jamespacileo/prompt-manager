import { openai } from "@ai-sdk/openai";
import { generateObject } from "ai";
import axios from "axios";
import fs from "fs-extra";
import { z } from "zod";
import { PromptModel } from "./promptModel";
import type {
	IPromptInput,
	IPromptModel,
	IPromptOutput,
} from "./types/interfaces";
import { logger } from "./utils/logger";

const ContentSourceSchema = z.object({
	type: z.enum(["url", "text", "file"]),
	content: z.string(),
});

type ContentSource = z.infer<typeof ContentSourceSchema>;

const PromptSuggestionSchema = z.object({
	name: z.string(),
	category: z.string(),
	description: z.string(),
	template: z.string(),
	inputSchema: z.any(),
	outputSchema: z.any(),
	metadata: z.object({
		author: z.string().optional(),
		source: z.string().optional(),
		license: z.string().optional(),
	}),
});

type PromptSuggestion = z.infer<typeof PromptSuggestionSchema>;

export class PromptModelImporter {
	private retryCount = 3;
	private retryDelay = 1000;

	constructor(private aiModel = "gpt-4") {}

	async importFromSource(
		source: ContentSource,
	): Promise<PromptModel<IPromptInput, IPromptOutput>[]> {
		let content: string;
		try {
			content = await this.fetchContent(source);
		} catch (error) {
			logger.error(`Failed to fetch content from ${source.type}:`, error);
			throw new Error(`Failed to fetch content from ${source.type}`);
		}

		const suggestions = await this.generatePromptSuggestions(content);
		return this.createPromptModels(suggestions);
	}

	private async fetchContent(source: ContentSource): Promise<string> {
		switch (source.type) {
			case "url":
				return this.fetchFromUrl(source.content);
			case "text":
				return source.content;
			case "file":
				return this.readFromFile(source.content);
			default:
				throw new Error(`Unsupported source type: ${source.type}`);
		}
	}

	private async fetchFromUrl(url: string): Promise<string> {
		for (let i = 0; i < this.retryCount; i++) {
			try {
				const response = await axios.get(url);
				return response.data;
			} catch (error) {
				if (i === this.retryCount - 1) throw error;
				await new Promise((resolve) => setTimeout(resolve, this.retryDelay));
			}
		}
		throw new Error("Failed to fetch from URL after multiple retries");
	}

	private async readFromFile(filePath: string): Promise<string> {
		try {
			return await fs.readFile(filePath, "utf-8");
		} catch (error) {
			logger.error(`Failed to read file ${filePath}:`, error);
			throw new Error(`Failed to read file ${filePath}`);
		}
	}

	private async generatePromptSuggestions(
		content: string,
	): Promise<PromptSuggestion[]> {
		const prompt = `
      Analyze the following content and suggest one or more prompt models that could be created from it.
      For each prompt model, provide:
      1. A name
      2. A category
      3. A description
      4. A template
      5. An input schema (as a JSON Schema)
      6. An output schema (as a JSON Schema)
      7. Metadata including author, source, and license if available

      Content:
      ${content}
    `;

		try {
			const { object } = await generateObject({
				model: openai(this.aiModel),
				schema: z.array(PromptSuggestionSchema),
				prompt,
			});

			return object as PromptSuggestion[];
		} catch (error) {
			logger.error("Failed to generate prompt suggestions:", error);
			throw new Error("Failed to generate prompt suggestions");
		}
	}

	private createPromptModels(
		suggestions: PromptSuggestion[],
	): PromptModel<IPromptInput, IPromptOutput>[] {
		return suggestions.map((suggestion) => {
			const promptData: Partial<IPromptModel> = {
				...suggestion,
				version: "1.0.0",
				parameters: [],
				metadata: {
					...suggestion.metadata,
					created: new Date().toISOString(),
					lastModified: new Date().toISOString(),
				},
				configuration: {
					modelName: this.aiModel,
					temperature: 0.7,
					maxTokens: 150,
					topP: 1,
					frequencyPenalty: 0,
					presencePenalty: 0,
					stopSequences: [],
				},
				outputType: "structured",
			};

			return PromptModel.createWithDefaults(promptData);
		});
	}
}
