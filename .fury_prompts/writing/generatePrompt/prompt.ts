import {z} from "zod";


export const generatePromptInput = z.object({
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
export type GeneratePromptInput = z.infer<typeof generatePromptInput>;




export const generatePromptOutput = z.object({
  story: z
    .string()
    .describe(
      "The generated story based on the provided themes, setting, and character.",
    )
    .optional(),
});
export type GeneratePromptOutput = z.infer<typeof generatePromptOutput>;

