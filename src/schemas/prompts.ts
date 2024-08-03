import type { JSONSchema7 } from "json-schema";
import { z } from "zod";

export const PromptSchema = z.object({
	name: z.string().describe("Unique identifier for the prompt"),
	category: z.string().describe("Category the prompt belongs to"),
	description: z.string().describe("Brief description of the prompt's purpose"),
	version: z.string().describe("Version of the prompt"),
	template: z.string().describe("The actual content of the prompt"),
	parameters: z
		.array(z.string())
		.describe("List of parameter names expected by the prompt"),
	metadata: z
		.object({
			created: z.string(),
			lastModified: z.string(),
		})
		.describe("Metadata associated with the prompt"),
	outputType: z
		.enum(["structured", "plain"])
		.describe("Type of output expected from the model"),
	defaultModelName: z
		.string()
		.optional()
		.describe("Default model name to use for this prompt"),
	compatibleModels: z
		.array(z.string())
		.optional()
		.describe("Optional list of models that can be used with this prompt"),
	tags: z
		.array(z.string())
		.optional()
		.describe("Optional list of tags or keywords associated with this prompt"),
	inputSchema: z
		.any()
		.describe(
			"JSON Schema defining the structure of the input expected by the prompt",
		),
	outputSchema: z
		.any()
		.describe(
			"JSON Schema defining the structure of the output produced by the prompt",
		),
	configuration: z
		.object({
			modelName: z.string(),
			temperature: z.number(),
			maxTokens: z.number(),
			topP: z.number(),
			frequencyPenalty: z.number(),
			presencePenalty: z.number(),
			stopSequences: z.array(z.string()),
		})
		.describe("Configuration for the AI model"),
});

export type IPrompt<TInput = any, TOutput = any> = z.infer<typeof PromptSchema>;
