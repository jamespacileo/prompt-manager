import { Prompt as IPrompt } from './types/interfaces';

export interface Prompt<PromptInput, PromptOutput> extends IPrompt<PromptInput, PromptOutput> {
  name: string;
  category: string;
  version: string;
  content: string;
  parameters: string[];
  format: (params: Record<string, any>) => string;
}

export interface PromptManagerBase {
  [category: string]: {
    [prompt: string]: Prompt<any, any>;
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
