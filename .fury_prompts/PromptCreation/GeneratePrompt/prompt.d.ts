import {z} from "zod";
export interface Generate PromptInput 

export const GeneratePromptInput = z.object({
  description: z.string().optional(),
});
export type GeneratePromptInput = z.infer<typeof GeneratePromptInput>;


export interface Generate PromptOutput 

export const GeneratePromptOutput = z.string();
export type GeneratePromptOutput = z.infer<typeof GeneratePromptOutput>;