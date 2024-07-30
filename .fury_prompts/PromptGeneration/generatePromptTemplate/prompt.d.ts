import {z} from "zod";
export interface generate_prompt_templateInput 

export const generatePromptTemplateInput = z.object({
  instruction: z.string().optional(),
  expectedOutput: z.string().optional(),
  context: z.string().optional(),
});
export type GeneratePromptTemplateInput = z.infer<
  typeof generatePromptTemplateInput
>;


export interface generate_prompt_templateOutput 

export const generatePromptTemplateOutput = z.object({
  promptTemplate: z.string().optional(),
});
export type GeneratePromptTemplateOutput = z.infer<
  typeof generatePromptTemplateOutput
>;