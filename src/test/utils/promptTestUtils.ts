import type {
	IPromptInput,
	IPromptModel,
	IPromptOutput,
} from "@/types/interfaces";
import { faker } from "@faker-js/faker";
import "@jest/globals";

export function createFakePrompt(): IPromptModel<IPromptInput, IPromptOutput> {
	return {
		name: faker.lorem.slug(),
		category: faker.lorem.word(),
		description: faker.lorem.sentence(),
		template: faker.lorem.paragraph(),
		parameters: Array.from(
			{ length: faker.number.int({ min: 0, max: 5 }) },
			() => faker.lorem.word(),
		),
		inputSchema: {
			type: "object",
			properties: {
				[faker.lorem.word()]: { type: "string" },
			},
		},
		outputSchema: {
			type: "object",
			properties: {
				[faker.lorem.word()]: { type: "string" },
			},
		},
		outputType: "structured", // or appropriate value
		stream: jest.fn(),
		execute: jest.fn(),
		updateConfiguration: jest.fn(),
		save: jest.fn(),
		getSummary: jest.fn(),
		load: jest.fn(),
		isSaved: true,
		inputZodSchema: {} as any, // Replace with actual Zod schema if available
		outputZodSchema: {} as any,
		// delete: jest.fn(),
		version: faker.system.semver(),
		metadata: {
			created: faker.date.past().toISOString(),
			lastModified: faker.date.recent().toISOString(),
			author: faker.person.fullName(),
			license: "MIT",
			sourceUrl: faker.internet.url(),
		},
		configuration: {},
		isLoadedFromStorage: faker.datatype.boolean(),
		validateInput: jest.fn(),
		validateOutput: jest.fn(),
		format: jest.fn(),
		versions: jest.fn().mockResolvedValue([]),
		switchVersion: jest.fn(),
		updateMetadata: jest.fn(),
	};
}
