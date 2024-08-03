import { describe, expect, test } from "bun:test";
import type { JSONSchema7 } from "json-schema";
import type { IPrompt } from "../types/interfaces";
import {
	generateExportableSchemaAndType,
	generatePromptTypeScript,
	generatePromptTypescriptDefinition,
	generateTestInputs,
} from "./typeGeneration";

describe("Type Generation Utilities", () => {
	const sampleSchema: JSONSchema7 = {
		type: "object",
		properties: {
			name: { type: "string" },
			age: { type: "number" },
			isStudent: { type: "boolean" },
		},
		required: ["name", "age"],
	};

	test("generateExportableSchemaAndType", async () => {
		const result = await generateExportableSchemaAndType({
			schema: sampleSchema,
			name: "Person",
		});
		expect(result.formattedSchemaTs).toContain(
			"export const Person = z.object({",
		);
		expect(result.formattedSchemaTs).toContain("name: z.string(),");
		expect(result.formattedSchemaTs).toContain("age: z.number(),");
		expect(result.formattedSchemaTs).toContain(
			"isStudent: z.boolean().optional(),",
		);
		expect(result.formattedSchemaTs).toContain(
			"export type Person = z.infer<typeof Person>;",
		);
		expect(result).toMatchSnapshot();
	});

	test("generatePromptTypeScript", async () => {
		const prompt: IPrompt<any, any> = {
			name: "ExamplePrompt",
			category: "exampleCategory",
			description: "An example prompt",
			version: "1.0.0",
			template: "Example template",
			inputSchema: {
				type: "object",
				properties: {
					input: { type: "string" },
				},
			},
			outputSchema: {
				type: "object",
				properties: {
					output: { type: "string" },
				},
			},
			// parameters: {}, // Add appropriate parameters
			metadata: {
				created: "2023-01-01T00:00:00.000Z",
				lastModified: "2023-01-01T00:00:00.000Z",
			}, // Add appropriate metadata
			outputType: "structured", // Add appropriate outputType
			// configuration: {} // Add appropriate configuration
		};
		const result = await generatePromptTypeScript(prompt);
		expect(result).toContain("export interface ExamplePromptInput");
		expect(result).toContain("export interface ExamplePromptOutput");
		expect(result).toMatchSnapshot();
	});

	test("generatePromptTypescriptDefinition", async () => {
		const prompt: IPrompt<any, any> = {
			name: "ExamplePrompt",
			category: "exampleCategory",
			description: "An example prompt",
			version: "1.0.0",
			template: "Example template",
			inputSchema: {
				type: "object",
				properties: {
					input: { type: "string" },
				},
			},
			outputSchema: {
				type: "object",
				properties: {
					output: { type: "string" },
				},
			},
			metadata: {
				created: "2023-01-01T00:00:00.000Z",
				lastModified: "2023-01-01T00:00:00.000Z",
			},
			outputType: "structured",
		};
		const result = await generatePromptTypescriptDefinition(prompt);
		expect(result).toContain("export interface ExamplePromptInput");
		expect(result).toContain("export interface ExamplePromptOutput");
		expect(result).toMatchSnapshot();
	});

	test("generateTestInputs", () => {
		const result = generateTestInputs(sampleSchema, 3);
		expect(result).toHaveLength(3);
		for (const input of result) {
			expect(input).toHaveProperty("name");
			expect(input).toHaveProperty("age");
			expect(input).toHaveProperty("isStudent");
		}
		expect(result).toMatchSnapshot();
	});
});
