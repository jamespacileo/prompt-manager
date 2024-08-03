import type { IPrompt } from "./types/interfaces";

export interface PromptManagerBase {
	[category: string]: {
		[prompt: string]: IPrompt<Record<string, unknown>, Record<string, unknown>>;
	};
}

export const promptManager: PromptManagerBase = {
	// DO NOT DELETE THESE COMMENTS. THEY ARE USED BY THE DOCUMENTATION GENERATOR.
	// Category1: {
	//   PROMPT1: {
	//     name: 'PROMPT1',
	//     category: 'Category1',
	//     version: '1.0.0',
	//     content: 'This is prompt 1: {{param1}}',
	//     parameters: ['param1'],
	//     format: (params) => `This is prompt 1: ${params.param1}`,
	//   },
	// },
	// Category2: {
	//   PROMPT2: {
	//     name: 'PROMPT2',
	//     category: 'Category2',
	//     version: '1.0.0',
	//     content: 'This is prompt 2: {{param2}}',
	//     parameters: ['param2'],
	//     format: (params) => `This is prompt 2: ${params.param2}`,
	//   },
	// },
};

export type GeneratedPromptManager = typeof promptManager;
