import {z} from "zod";
export interface extract_glossary_wordsInput 

export const extractGlossaryWordsInput = z.object({
  text: z.string().optional(),
});
export type ExtractGlossaryWordsInput = z.infer<
  typeof extractGlossaryWordsInput
>;


export interface extract_glossary_wordsOutput 

export const extractGlossaryWordsOutput = z.object({
  glossaryEntries: z
    .array(
      z.object({
        term: z.string().optional(),
        definition: z.string().optional(),
      }),
    )
    .optional(),
});
export type ExtractGlossaryWordsOutput = z.infer<
  typeof extractGlossaryWordsOutput
>;