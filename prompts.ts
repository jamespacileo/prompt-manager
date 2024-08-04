import { z } from "zod";
type IAsyncIterableStream<T> = AsyncIterable<T> & ReadableStream<T>;

export const writinggeneratepromptInput = z.object({
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
export type WritinggeneratepromptInput = z.infer<
  typeof writinggeneratepromptInput
>;

export const writinggeneratepromptOutput = z.object({
  story: z
    .string()
    .describe(
      "The generated story based on the provided themes, setting, and character.",
    )
    .optional(),
});
export type WritinggeneratepromptOutput = z.infer<
  typeof writinggeneratepromptOutput
>;

export const creativewritinggeneratepoemfromarticlesInput = z.object({
  articles: z.array(z.string()),
});
export type CreativewritinggeneratepoemfromarticlesInput = z.infer<
  typeof creativewritinggeneratepoemfromarticlesInput
>;

export const creativewritinggeneratepoemfromarticlesOutput = z.object({
  poem: z.string().optional(),
});
export type CreativewritinggeneratepoemfromarticlesOutput = z.infer<
  typeof creativewritinggeneratepoemfromarticlesOutput
>;

export const promptgenerationgenerateprompttemplateInput = z.object({
  instruction: z.string().optional(),
  expectedOutput: z.string().optional(),
  context: z.string().optional(),
});
export type PromptgenerationgenerateprompttemplateInput = z.infer<
  typeof promptgenerationgenerateprompttemplateInput
>;

export const promptgenerationgenerateprompttemplateOutput = z.object({
  promptTemplate: z.string().optional(),
});
export type PromptgenerationgenerateprompttemplateOutput = z.infer<
  typeof promptgenerationgenerateprompttemplateOutput
>;

export const promptcreationgeneratepromptInput = z.object({
  description: z.string().optional(),
});
export type PromptcreationgeneratepromptInput = z.infer<
  typeof promptcreationgeneratepromptInput
>;

export const promptcreationgeneratepromptOutput = z.string();
export type PromptcreationgeneratepromptOutput = z.infer<
  typeof promptcreationgeneratepromptOutput
>;

export const textprocessingextractglossarywordsInput = z.object({
  text: z.string().optional(),
});
export type TextprocessingextractglossarywordsInput = z.infer<
  typeof textprocessingextractglossarywordsInput
>;

export const textprocessingextractglossarywordsOutput = z.object({
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
export type TextprocessingextractglossarywordsOutput = z.infer<
  typeof textprocessingextractglossarywordsOutput
>;

declare module "prompt-manager" {
  export class IPromptManagerClient {
    Writing: {
      WritingGeneratePrompt: {
        format: (inputs: WritinggeneratepromptInput) => Promise<string>;
        execute: (
          inputs: WritinggeneratepromptInput,
        ) => Promise<WritinggeneratepromptOutput>;
        stream: (
          inputs: WritinggeneratepromptInput,
        ) => Promise<IAsyncIterableStream<string>>;
        description: string;
        version: string;
      };
    };

    CreativeWriting: {
      CreativeWritingGeneratePoemFromArticles: {
        format: (
          inputs: CreativewritinggeneratepoemfromarticlesInput,
        ) => Promise<string>;
        execute: (
          inputs: CreativewritinggeneratepoemfromarticlesInput,
        ) => Promise<CreativewritinggeneratepoemfromarticlesOutput>;
        stream: (
          inputs: CreativewritinggeneratepoemfromarticlesInput,
        ) => Promise<IAsyncIterableStream<string>>;
        description: string;
        version: string;
      };
    };

    PromptGeneration: {
      PromptGenerationGeneratePromptTemplate: {
        format: (
          inputs: PromptgenerationgenerateprompttemplateInput,
        ) => Promise<string>;
        execute: (
          inputs: PromptgenerationgenerateprompttemplateInput,
        ) => Promise<PromptgenerationgenerateprompttemplateOutput>;
        stream: (
          inputs: PromptgenerationgenerateprompttemplateInput,
        ) => Promise<IAsyncIterableStream<string>>;
        description: string;
        version: string;
      };
    };

    PromptCreation: {
      PromptCreationGeneratePrompt: {
        format: (inputs: PromptcreationgeneratepromptInput) => Promise<string>;
        execute: (
          inputs: PromptcreationgeneratepromptInput,
        ) => Promise<PromptcreationgeneratepromptOutput>;
        stream: (
          inputs: PromptcreationgeneratepromptInput,
        ) => Promise<IAsyncIterableStream<string>>;
        description: string;
        version: string;
      };
    };

    TextProcessing: {
      TextProcessingExtractGlossaryWords: {
        format: (
          inputs: TextprocessingextractglossarywordsInput,
        ) => Promise<string>;
        execute: (
          inputs: TextprocessingextractglossarywordsInput,
        ) => Promise<TextprocessingextractglossarywordsOutput>;
        stream: (
          inputs: TextprocessingextractglossarywordsInput,
        ) => Promise<IAsyncIterableStream<string>>;
        description: string;
        version: string;
      };
    };
  }

  export const promptManager: PromptManagerClient;
}
