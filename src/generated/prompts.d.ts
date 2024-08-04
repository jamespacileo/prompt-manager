import { IAsyncIterableStream } from "./types/interfaces";

declare module "prompt-manager" {
  export class PromptManagerClient {
    

export const writinggeneratePromptInput = z.object({
  themes: z
    .string()
    .describe("Themes to explore in the story, e.g., friendship, betrayal.")
    .optional(),
  setting: z
    .string()
    .describe("The setting of the story, e.g., fantasy world, futuristic city.")
    .optional(),
  main_character: z
    .string()
    .describe(
      "Description of the main character, e.g., a young hero, an unlikely ally.",
    )
    .optional(),
  conflict: z
    .string()
    .describe("The central conflict the character faces.")
    .optional(),
});
export type WritinggeneratePromptInput = z.infer<
  typeof writinggeneratePromptInput
>;

    

export const writinggeneratePromptOutput = z.object({
  story: z
    .string()
    .describe(
      "The generated story based on the provided themes, setting, and character.",
    )
    .optional(),
});
export type WritinggeneratePromptOutput = z.infer<
  typeof writinggeneratePromptOutput
>;

    

export const CreativeWritinggeneratePoemFromArticlesInput = z.object({
  articles: z.array(z.string()),
});
export type CreativeWritinggeneratePoemFromArticlesInput = z.infer<
  typeof CreativeWritinggeneratePoemFromArticlesInput
>;

    

export const CreativeWritinggeneratePoemFromArticlesOutput = z.object({
  poem: z.string().optional(),
});
export type CreativeWritinggeneratePoemFromArticlesOutput = z.infer<
  typeof CreativeWritinggeneratePoemFromArticlesOutput
>;

    

export const PromptGenerationgeneratePromptTemplateInput = z.object({
  instruction: z.string().optional(),
  expectedOutput: z.string().optional(),
  context: z.string().optional(),
});
export type PromptGenerationgeneratePromptTemplateInput = z.infer<
  typeof PromptGenerationgeneratePromptTemplateInput
>;

    

export const PromptGenerationgeneratePromptTemplateOutput = z.object({
  promptTemplate: z.string().optional(),
});
export type PromptGenerationgeneratePromptTemplateOutput = z.infer<
  typeof PromptGenerationgeneratePromptTemplateOutput
>;

    

export const PromptCreationGeneratePromptInput = z.object({
  description: z.string().optional(),
});
export type PromptCreationGeneratePromptInput = z.infer<
  typeof PromptCreationGeneratePromptInput
>;

    

export const PromptCreationGeneratePromptOutput = z.string();
export type PromptCreationGeneratePromptOutput = z.infer<
  typeof PromptCreationGeneratePromptOutput
>;

    

export const TextProcessingextractGlossaryWordsInput = z.object({
  text: z.string().optional(),
});
export type TextProcessingextractGlossaryWordsInput = z.infer<
  typeof TextProcessingextractGlossaryWordsInput
>;

    

export const TextProcessingextractGlossaryWordsOutput = z.object({
  glossaryEntries: z
    .array(
      z.object({
        term: z.string().optional(),
        definition: z.string().optional(),
        tags: z.array(z.string()).optional(),
      }),
    )
    .optional(),
});
export type TextProcessingextractGlossaryWordsOutput = z.infer<
  typeof TextProcessingextractGlossaryWordsOutput
>;

    writing: {
      writinggenerateprompt: {
        format: (inputs: writinggeneratepromptInput) => Promise<string>;
        execute: (inputs: writinggeneratepromptInput) => Promise<writinggeneratepromptOutput>;
        stream: (inputs: writinggeneratepromptInput) => Promise<IAsyncIterableStream<string>>;
        description: string;
        version: string;
      };
    };
    Creative Writing: {
      creative writinggeneratepoemfromarticles: {
        format: (inputs: creative writinggeneratepoemfromarticlesInput) => Promise<string>;
        execute: (inputs: creative writinggeneratepoemfromarticlesInput) => Promise<creative writinggeneratepoemfromarticlesOutput>;
        stream: (inputs: creative writinggeneratepoemfromarticlesInput) => Promise<IAsyncIterableStream<string>>;
        description: string;
        version: string;
      };
    };
    Prompt Generation: {
      prompt generationgenerateprompttemplate: {
        format: (inputs: prompt generationgenerateprompttemplateInput) => Promise<string>;
        execute: (inputs: prompt generationgenerateprompttemplateInput) => Promise<prompt generationgenerateprompttemplateOutput>;
        stream: (inputs: prompt generationgenerateprompttemplateInput) => Promise<IAsyncIterableStream<string>>;
        description: string;
        version: string;
      };
    };
    Prompt Creation: {
      prompt creationgenerate prompt: {
        format: (inputs: prompt creationgenerate promptInput) => Promise<string>;
        execute: (inputs: prompt creationgenerate promptInput) => Promise<prompt creationgenerate promptOutput>;
        stream: (inputs: prompt creationgenerate promptInput) => Promise<IAsyncIterableStream<string>>;
        description: string;
        version: string;
      };
    };
    Text Processing: {
      text processingextractglossarywords: {
        format: (inputs: text processingextractglossarywordsInput) => Promise<string>;
        execute: (inputs: text processingextractglossarywordsInput) => Promise<text processingextractglossarywordsOutput>;
        stream: (inputs: text processingextractglossarywordsInput) => Promise<IAsyncIterableStream<string>>;
        description: string;
        version: string;
      };
    };
  }

  export const promptManager: PromptManagerClient;
}
