import {z} from "zod";
export interface generate_promptInput 

export const generatePromptInput = z.object({
  themes: z.string().optional(),
  setting: z.string().optional(),
  main_character: z.string().optional(),
  conflict: z.string().optional(),
});
export type GeneratePromptInput = z.infer<typeof generatePromptInput>;


export interface generate_promptOutput 

export const generatePromptOutput = z.object({ story: z.string().optional() });
export type GeneratePromptOutput = z.infer<typeof generatePromptOutput>;