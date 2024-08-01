import {z} from "zod";


export const generatePoemFromArticlesInput = z.object({
  articles: z.array(z.string()),
});
export type GeneratePoemFromArticlesInput = z.infer<
  typeof generatePoemFromArticlesInput
>;




export const generatePoemFromArticlesOutput = z.object({
  poem: z.string().optional(),
});
export type GeneratePoemFromArticlesOutput = z.infer<
  typeof generatePoemFromArticlesOutput
>;

